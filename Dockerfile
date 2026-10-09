# Two stages. Everything needed to COMPILE (devDependencies, the Nest CLI,
# TypeScript, the source tree) stays in `build`; the runtime image gets only
# dist/, production node_modules and the few files read from disk at runtime.
#
# Before this split the image was ~2.4GB: node_modules twice (/tmp/app and a
# full copy in /usr/src/app, 521MB each, dev dependencies included) plus a
# global Nest CLI/TypeScript/ts-node. And every boot ran migrations and seeds
# through ts-node, compiling the project twice — ~100s before the app, which
# itself starts in ~2s.

# ---------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------
FROM node:24.14.1-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
# `npm ci`, not `npm install`: installs exactly package-lock.json and fails if
# it disagrees with package.json, so CI cannot quietly resolve new versions.
RUN npm ci

COPY . .
RUN npm run build \
 && npm prune --omit=dev

# ---------------------------------------------------------------------------
# runtime
# ---------------------------------------------------------------------------
FROM node:24.14.1-alpine

# tzdata is what makes the TZ env var mean anything: without the zone
# database, Alpine silently ignores TZ and the container stays on UTC.
RUN apk add --no-cache bash tzdata

# Epic 7 BE-7 — the dashboard's PDF export renders through headless Chromium,
# which this image does not otherwise contain.
#
# `font-noto` is not optional decoration: without a font carrying Vietnamese
# coverage, Chromium prints every diacritic as an empty box, so a report full
# of student names comes out unreadable. Verify with stacked marks —
# `Nguyễn Thị Hường` — not with ASCII.
RUN apk add --no-cache \
      chromium nss freetype harfbuzz ca-certificates \
      font-noto font-noto-extra

# `puppeteer-core` never downloads a browser; this is the one it drives.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
# Read from disk at runtime, relative to the working directory
# (MailService → <cwd>/src/mail/mail-templates). The i18n files are already
# copied into dist/ by nest-cli's `assets`.
COPY --from=build /usr/src/app/src/mail/mail-templates ./src/mail/mail-templates

COPY ./wait-for-it.sh ./startup.relational.dev.sh ./startup.relational.prod.sh /opt/
RUN sed -i 's/\r//g' /opt/*.sh \
 && chmod +x /opt/*.sh

# No env file is baked into the image: docker-compose injects the selected
# env/.env.<name> file at runtime via `env_file:`.
CMD ["/opt/startup.relational.dev.sh"]
