#!/usr/bin/env bash
set -e

# Production entrypoint. Point the Dockerfile's CMD (or your orchestrator's
# command) at this instead of startup.relational.dev.sh when deploying.
#
# `seed:run:relational` still runs, and has to: statuses 1/2 (Active/Inactive)
# are created only by StatusSeedService, not by any migration, so a fresh
# database without it cannot create a single user. What must NOT run is the
# development user fixtures — a published password (`secret`) on an Admin
# account. UserSeedService guards itself on NODE_ENV with an allowlist, so
# make sure NODE_ENV=production is actually set in this environment; when it
# is unset the fixtures are skipped too, which is the safe direction.
#
# Verify after the first deploy:
#   POST /api/v1/auth/email/login {"email":"admin@example.com","password":"secret"}
# must return 422, not 200.
/opt/wait-for-it.sh "${DATABASE_HOST:-postgres}:${DATABASE_PORT:-5432}"
# Migrations and seeds run from the COMPILED output in dist/, not through
# ts-node: the image carries no TypeScript toolchain, and compiling the project
# at every boot cost ~100s before the app could start.
npm run migration:run:dist
npm run seed:run:relational:dist
npm run start:prod
