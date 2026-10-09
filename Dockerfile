# Three stages. Everything needed to COMPILE (devDependencies, the Nest CLI,
# TypeScript, the source tree) stays in `build`; production node_modules come
# from `prod-deps`; the runtime image gets only those, dist/ and the few files
# read from disk at runtime.
#
# No ts-node in the runtime image, so the maintenance scripts run from dist/
# too: inside the container use the `:dist` npm scripts —
#   npm run migration:revert:dist / seed:run:relational:dist / grant:admin:dist
#   npm run create:admin:dist / storage:backfill:dist / clean:master-data:dist
#
# Before this split the image was ~2.4GB: node_modules twice (/tmp/app and a
# full copy in /usr/src/app, 521MB each, dev dependencies included) plus a
# global Nest CLI/TypeScript/ts-node. And every boot ran migrations and seeds
# through ts-node, compiling the project twice — ~100s before the app, which
# itself starts in ~2s.

# ---------------------------------------------------------------------------
# prod-deps — production node_modules, from package*.json ONLY
# ---------------------------------------------------------------------------
# Its own stage so the layer depends on nothing but the lockfile: a code-only
# change rebuilds none of it, the runtime layer keeps the same digest, and the
# VPS pulls only the changed dist/ (~10MB) instead of ~250MB of node_modules on
# every deploy.
FROM node:24.14.1-alpine AS prod-deps

WORKDIR /usr/src/app

COPY package*.json ./
# `prepare` runs husky, a devDependency that --omit=dev does not install.
# Sourcemaps, type declarations and docs are never read at runtime (TypeORM's
# entity/migration globs skip .d.ts) — ~120MB of node_modules.
RUN npm pkg delete scripts.prepare \
 && npm ci --omit=dev \
 && npm cache clean --force \
 && find node_modules -type f \( -name '*.map' -o -name '*.d.ts' -o -name '*.d.mts' \
      -o -name '*.d.cts' -o -iname '*.md' -o -iname '*.markdown' \) -delete

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
# Sourcemaps and .d.ts are build by-products: node runs without
# --enable-source-maps, and nothing imports the declarations.
RUN npm run build \
 && find dist -type f \( -name '*.map' -o -name '*.d.ts' \) -delete

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
# Fonts are not optional decoration: without one carrying Vietnamese coverage,
# Chromium prints every diacritic as an empty box, so a report full of student
# names comes out unreadable. Verify with stacked marks — `Nguyễn Thị Hường` —
# not with ASCII.
#   - Be Vietnam Pro (assets/fonts, OFL, ~0.5MB): the PDF's typeface, the same
#     one the web app uses, in exactly the weights the template sets.
#   - font-noto (~9MB): fallback for what Be Vietnam Pro lacks — Greek,
#     Cyrillic, symbols in a student's name. NOT font-noto-extra: 153MB of
#     extra weights nothing renders with. CJK would need font-noto-cjk.
RUN apk add --no-cache \
      chromium nss freetype harfbuzz ca-certificates fontconfig \
      font-noto
COPY ./assets/fonts/be-vietnam-pro /usr/share/fonts/be-vietnam-pro
RUN fc-cache -f

# `puppeteer-core` never downloads a browser; this is the one it drives.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/package*.json ./
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
# Read from disk at runtime, relative to the working directory
# (MailService → <cwd>/src/mail/mail-templates). The i18n files are already
# copied into dist/ by nest-cli's `assets`.
COPY --from=build /usr/src/app/src/mail/mail-templates ./src/mail/mail-templates

COPY ./wait-for-it.sh ./startup.relational.dev.sh ./startup.relational.prod.sh /opt/
RUN sed -i 's/\r//g' /opt/*.sh \
 && chmod +x /opt/*.sh

# Last, because it changes on every commit: everything above keeps its layer
# digest across code-only changes, so a deploy pulls just this (~8MB).
COPY --from=build /usr/src/app/dist ./dist

# No env file is baked into the image: docker-compose injects the selected
# env/.env.<name> file at runtime via `env_file:`.
CMD ["/opt/startup.relational.dev.sh"]
