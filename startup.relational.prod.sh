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
npm run migration:run
npm run seed:run:relational
npm run start:prod
