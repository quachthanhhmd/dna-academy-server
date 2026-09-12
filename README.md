# NestJS REST API boilerplate 🇺🇦

[![image](https://github.com/brocoders/nestjs-boilerplate/assets/72293912/197da43e-02f4-4895-8d3e-b7a42a591c26)](https://github.com/new?template_name=nestjs-boilerplate&template_owner=brocoders)

![github action status](https://github.com/brocoders/nestjs-boilerplate/actions/workflows/docker-e2e.yml/badge.svg)
[![renovate](https://img.shields.io/badge/renovate-enabled-%231A1F6C?logo=renovatebot)](https://app.renovatebot.com/dashboard)
[![Static Badge](https://img.shields.io/badge/supported_by-brocoders-d91965?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTMwIiBoZWlnaHQ9IjE4NyIgdmlld0JveD0iMCAwIDEzMCAxODciIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI%2BCjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF83NzExXzQ4OTEpIj4KPHBhdGggZD0iTTc1Ljk5NjcgNDUuNzUwNkM2NS4xMDg5IDQ2Ljg2MSA1Ny45MjMgNTguNDA5NyA2Mi4yNzgxIDY4Ljg0OEwxMDguNDQyIDE4N0w3My42MDEzIDE1NS4wMTlIMzQuODQwOUMyMC42ODY4IDE1NS4wMTkgOS4zNjM0OSAxNDMuNDcgOS4zNjM0OSAxMjkuMDM0Vjk0LjYxMDVDOS4zNjM0OSA5Mi4xNjc1IDguNDkyNDYgODkuNzI0NSA2Ljc1MDQyIDg3Ljk0NzdMMCA4MS4wNjNMNi43NTA0MiA3NC4xNzgxQzguNDkyNDYgNzIuNDAxNCA5LjM2MzQ5IDY5Ljk1ODQgOS4zNjM0OSA2Ny41MTU0VjMxLjA5MjZDOS4zNjM0OSAxMy43Njk2IDIzLjA4MjEgMCAzOS44NDkyIDBINTguMTQwN0w3NS45OTY3IDQ1Ljc1MDZaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTI1LjY0NiAxMTIuMzc4Vjk0LjgzMjdDMTI1LjY0NiA5My43MjIyIDEyNi4wODEgOTIuNjExOCAxMjYuOTUyIDkxLjcyMzRMMTMwLjAwMSA4OC4zOTIxTDEyNi45NTIgODUuMDYwN0MxMjYuMDgxIDg0LjE3MjQgMTI1LjY0NiA4My4wNjE5IDEyNS42NDYgODEuOTUxNFY2OS43MzY1QzEyNS42NDYgNTYuNDExMSAxMTQuOTc2IDQ1Ljc1MDcgMTAyLjEyOCA0NS43NTA3SDc1Ljk5NzNMMTA1LjYxMiAxMzAuODExQzEwNS42MTIgMTMwLjgxMSAxMTAuNjIgMTMwLjgxMSAxMTAuODM4IDEzMC44MTFDMTE5LjExMyAxMjkuMDM1IDEyNS42NDYgMTIxLjQ4NCAxMjUuNjQ2IDExMi4zNzhaIiBmaWxsPSJ3aGl0ZSIvPgo8L2c%2BCjxkZWZzPgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzc3MTFfNDg5MSI%2BCjxyZWN0IHdpZHRoPSIxMzAiIGhlaWdodD0iMTg3IiBmaWxsPSJ3aGl0ZSIvPgo8L2NsaXBQYXRoPgo8L2RlZnM%2BCjwvc3ZnPgo%3D&logoColor=d91965)](https://brocoders.com/)
[![Discord Badge](https://img.shields.io/badge/discord-NodeJS_boilerplate-d91965?style=flat&labelColor=5866f2&logo=discord&logoColor=white&link=https://discord.com/channels/520622812742811698/1197293125434093701)](https://discord.com/channels/520622812742811698/1197293125434093701)

<br />
<p align="center"><a href="https://discord.com/channels/520622812742811698/1197293125434093701"><img src="https://github.com/brocoders/nestjs-boilerplate/assets/72293912/c9d5fbf0-b56d-46b5-bb30-f96f44764bae" width="300"/></a></p>
<br />

## Description <!-- omit in toc -->

NestJS REST API boilerplate for a typical project

[Full documentation here](/docs/readme.md)

Demo: <https://nestjs-boilerplate-test.herokuapp.com/docs>

A fully compatible frontend boilerplate: <https://github.com/brocoders/extensive-react-boilerplate>

Belongs to the [bc boilerplates](https://bcboilerplates.com/) ecosystem

<https://github.com/user-attachments/assets/a66f114a-c714-4036-8eeb-20cbf04ae985>

## Table of Contents <!-- omit in toc -->

- [Features](#features)
- [Environments](#environments)
- [Database migrations & master data](#database-migrations--master-data)
- [File uploads](#file-uploads)
- [Contributors](#contributors)
- [Support](#support)

## Features

- [x] Database. Support [TypeORM](https://www.npmjs.com/package/typeorm) and [Mongoose](https://www.npmjs.com/package/mongoose).
- [x] Seeding.
- [x] Config Service ([@nestjs/config](https://www.npmjs.com/package/@nestjs/config)).
- [x] Mailing ([nodemailer](https://www.npmjs.com/package/nodemailer)).
- [x] Sign in and sign up via email.
- [x] Social sign in (Apple, Facebook, Google).
- [x] Admin and User roles.
- [x] Internationalization/Translations (I18N) ([nestjs-i18n](https://www.npmjs.com/package/nestjs-i18n)).
- [x] File uploads. Support local and Amazon S3 drivers.
- [x] Swagger.
- [x] E2E and units tests.
- [x] Docker.
- [x] CI (Github Actions).

## Environments

Every environment has its own file in `env/`:

```
env/.env.example   # committed template
env/.env.local     # default environment (git-ignored)
env/.env.develop   # (git-ignored)
```

Add a new one by copying the template, e.g. `cp env/.env.example env/.env.staging`,
then update `APP_ENV` and `ENV_FILE` inside it.

### Running with Docker

`scripts/compose.sh` wraps `docker compose`: it attaches the selected env file
(both for interpolation inside `docker-compose.yaml` and as the container
environment of the `api` service) and namespaces the compose project per
environment. `local` is the default.

```bash
npm run docker:up                 # env/.env.local
npm run docker:up:develop         # env/.env.develop
npm run docker:down
npm run docker:logs

# any other docker compose command:
npm run compose -- up -d          # local
npm run compose -- develop ps
npm run compose -- staging exec api sh

# or call the script directly
./scripts/compose.sh develop up -d --build
```

Running plain `docker compose` works too, as long as the env file is attached:

```bash
docker compose --env-file ./env/.env.develop up -d
```

`ENV_FILE` is declared inside each env file, so the `api` container receives the
same file that compose used for interpolation. Note that this form reuses a
single compose project name, so use the script when you want `local` and
`develop` stacks side by side (they also need different host ports).

### Running on the host

The app picks its env file the same way — `ENV_FILE` first, then
`env/.env.$APP_ENV`, defaulting to `env/.env.local` (see
[src/config/env-files.ts](src/config/env-files.ts)). Variables already present in
the environment always win over the file.

```bash
npm run start:dev                        # env/.env.local
APP_ENV=develop npm run start:dev        # env/.env.develop
APP_ENV=develop npm run migration:run
ENV_FILE=./env/.env.staging npm run seed:run:relational
```

## Database migrations & master data

Schema changes live in [src/database/migrations](src/database/migrations) and
run through the TypeORM CLI. Reference data (roles, statuses, permission
modules, and the bilingual master data of Epic 6) lives in
[src/database/seeds/relational](src/database/seeds/relational).

### Deploying to the develop site

Run these two commands, in this order, after pulling the new build:

```bash
APP_ENV=develop npm run migration:run          # 1. schema + data backfill
APP_ENV=develop npm run seed:run:relational    # 2. reference data (upsert)
```

Swap `APP_ENV=develop` for `ENV_FILE=./env/.env.staging` (or any other env
file) to target a different environment.

> Running the app also triggers the master data seed automatically on boot
> (`MasterDataStartupSeedService`), so step 2 is only needed when you want the
> new labels in place *before* the new build starts serving traffic. Running it
> twice is harmless.

### Both commands are safe to re-run

- `migration:run` only executes migrations absent from the `migrations` table.
- The seeds **upsert — they never delete and re-insert**. A master data row
  keeps its `id` across every run, which matters because `course.levelId`,
  `course.categoryId`, `course_group_assignment.groupId`,
  `instructor_expertise.expertiseCodeId`, `student_profile.educationStageCodeId`
  and `student_career_interest.careerInterestId` all reference it. Deleting and
  re-inserting would orphan every one of those foreign keys.
- A translation an admin edited through `/admin/master-data` is **never**
  overwritten by a later seed run. The only exception is documented in
  [merge-seed-translations.ts](src/database/seeds/relational/shared/merge-seed-translations.ts):
  a `vi` value still byte-identical to the seed's English wording is the
  artifact of the Epic 6 backfill and gets replaced with the real Vietnamese.

### Rolling back

```bash
APP_ENV=develop npm run migration:revert       # reverts the last migration only
```

`AddI18nMasterData` drops the translation columns and `user.locale`. The plain
`name` / `description` columns are kept in sync with the default locale
throughout, so a revert loses the non-default translations but never the
Vietnamese text the app renders.

### Bilingual master data (Epic 6)

`master_data_group` and `master_data_code` carry `nameTranslations` and
`descriptionTranslations` JSONB columns (`{"vi": "Cơ bản", "en": "Beginner"}`).
The plain `name` / `description` columns hold the **default locale (`vi`)** and
act as the last-resort fallback; a DB CHECK constraint guarantees the `vi` key
is always present.

Request locale is resolved in this order — first match wins:

1. `?locale=` query parameter
2. `X-Locale` request header
3. the authenticated user's `users.locale`
4. `Accept-Language`
5. `vi`

The resolved value is echoed back as `Content-Language`, and every localized
response sends `Vary: X-Locale, Accept-Language` — **make sure any CDN or
reverse proxy in front of the API honours it**, or one visitor's language will
be cached for everyone.

```bash
curl localhost:3001/api/v1/i18n/locales                        # supported locales
curl localhost:3001/api/v1/master-data/codes?groupKey=course_level            # vi
curl -H 'X-Locale: en' localhost:3001/api/v1/master-data/codes?groupKey=course_level   # en
```

Supported locales come from `APP_SUPPORTED_LOCALES` (default `vi,en`). Adding a
locale is a config change plus translation data — never a schema change.

## File uploads

Uploads go to **Cloudflare R2** (`FILE_DRIVER=r2`). R2 speaks the S3 API, so it
reuses the AWS SDK with `region: auto` and the account endpoint; the driver is
selected in [src/files/files.module.ts](src/files/files.module.ts) and lives in
`src/files/infrastructure/uploader/r2` (+ `r2-presigned`).

| Variable | Meaning |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare account id — used to derive the S3 endpoint |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API token (R2 → Manage API tokens) |
| `R2_BUCKET` | Bucket name |
| `R2_ENDPOINT` | Optional, overrides `https://<account>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_URL` | Optional public base URL (r2.dev or custom domain) |
| `FILE_MAX_SIZE` | Max upload size in bytes (default 25mb) |

Two drivers are available:

- `r2` — `POST /api/v1/files/upload` with `multipart/form-data` (field `file`);
  the API streams it to R2 and returns `{ file: { id, path } }`.
- `r2-presigned` — `POST /api/v1/files/upload` with
  `{ fileName, fileSize, contentType }` returns `{ file, uploadSignedUrl }`;
  the browser `PUT`s the bytes straight to R2. Better for large PDFs.

`file.path` is a permanent public URL when `R2_PUBLIC_URL` is set, otherwise a
presigned GET URL valid for one hour. That value is what the epics store in
`Course.thumbnailUrl`, `MasterDataCode.thumbnailUrl` and the `pdf_document`
lecture content `fileUrl`. Allowed extensions: `jpg`, `jpeg`, `png`, `gif`,
`webp`, `avif`, `svg`, `pdf`.

The `local`, `s3` and `s3-presigned` drivers still work — set `FILE_DRIVER`
accordingly (e.g. `local` to develop without R2 credentials).

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Shchepotin"><img src="https://avatars.githubusercontent.com/u/6001723?v=4?s=100" width="100px;" alt="Vladyslav Shchepotin"/><br /><sub><b>Vladyslav Shchepotin</b></sub></a><br /><a href="#maintenance-Shchepotin" title="Maintenance">🚧</a> <a href="#doc-Shchepotin" title="Documentation">📖</a> <a href="#code-Shchepotin" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/SergeiLomako"><img src="https://avatars.githubusercontent.com/u/31205374?v=4?s=100" width="100px;" alt="SergeiLomako"/><br /><sub><b>SergeiLomako</b></sub></a><br /><a href="#code-SergeiLomako" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ElenVlass"><img src="https://avatars.githubusercontent.com/u/72293912?v=4?s=100" width="100px;" alt="Elena Vlasenko"/><br /><sub><b>Elena Vlasenko</b></sub></a><br /><a href="#doc-ElenVlass" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://brocoders.com"><img src="https://avatars.githubusercontent.com/u/226194?v=4?s=100" width="100px;" alt="Rodion"/><br /><sub><b>Rodion</b></sub></a><br /><a href="#business-sars" title="Business development">💼</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## Support

If you seek consulting, support, or wish to collaborate, please contact us via [boilerplates@brocoders.com](mailto:boilerplates@brocoders.com). For any inquiries regarding boilerplates, feel free to ask on [GitHub Discussions](https://github.com/brocoders/nestjs-boilerplate/discussions) or [Discord](https://discord.com/channels/520622812742811698/1197293125434093701).
