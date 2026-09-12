#!/usr/bin/env bash
set -e

# The host comes from the injected env file, so this one script serves both the
# dev stack (postgres) and the isolated test stack (postgres-test) — Epic 4.2
# §4.1. Hardcoding it here is what would make the test stack silently talk to
# the dev database.
/opt/wait-for-it.sh "${DATABASE_HOST:-postgres}:${DATABASE_PORT:-5432}"
npm run migration:run
npm run seed:run:relational
npm run start:prod
