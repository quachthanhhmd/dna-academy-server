export const APP_URL = `http://localhost:${process.env.APP_PORT}`;
export const TESTER_EMAIL = 'john.doe@example.com';
export const TESTER_PASSWORD = 'secret';
export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_PASSWORD = 'secret';
/**
 * Where the *test runner* reaches maildev's web API, which is not where the
 * *API container* reaches its SMTP port. MAIL_HOST is `maildev` — a name that
 * only resolves on the compose network — so a suite running on the host has to
 * use the published port instead. MAIL_CLIENT_HOST exists to say so; it
 * defaults to localhost, which is right for `npm run test:e2e` from a shell,
 * and can be set to `maildev` when the suite runs inside the compose network.
 */
export const MAIL_HOST = process.env.MAIL_CLIENT_HOST ?? 'localhost';
export const MAIL_PORT = process.env.MAIL_CLIENT_PORT;

/**
 * Where the *test runner* reaches Postgres, which — exactly like `MAIL_HOST`
 * above — is not where the *API container* reaches it. `DATABASE_HOST` is
 * `postgres-test`, a name that only resolves on the compose network, so a
 * suite running on the host uses the published port instead.
 *
 * Only the dashboard metric specs need this. They assert rules that depend on
 * exact timestamps — which Vietnam day an enrolment lands on, which cohort a
 * completion belongs to — and no endpoint lets a caller set
 * `enrollment_date`. Seeding those rows through the API is not possible;
 * seeding them through SQL is.
 */
export const DB_HOST = process.env.DATABASE_CLIENT_HOST ?? 'localhost';
export const DB_PORT = Number(process.env.DATABASE_CLIENT_PORT ?? 5433);
export const DB_USER = process.env.DATABASE_USERNAME ?? 'admin';
export const DB_PASSWORD = process.env.DATABASE_PASSWORD ?? 'admin';
export const DB_NAME = process.env.DATABASE_NAME ?? 'dna_academy_test';
