#!/usr/bin/env bash
set -e

# The host comes from the injected env file, so this one script serves both the
# dev stack (postgres) and the isolated test stack (postgres-test) — Epic 4.2
# §4.1. Hardcoding it here is what would make the test stack silently talk to
# the dev database.
/opt/wait-for-it.sh "${DATABASE_HOST:-postgres}:${DATABASE_PORT:-5432}"
# Migrations and seeds run from the COMPILED output in dist/, not through
# ts-node: the image carries no TypeScript toolchain, and compiling the project
# at every boot cost ~100s before the app could start.
npm run migration:run:dist
npm run seed:run:relational:dist
npm run start:prod
