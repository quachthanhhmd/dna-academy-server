/**
 * Resolves which env files the app loads, in priority order.
 *
 * Selection:
 *   ENV_FILE=./env/.env.staging  -> that exact file
 *   APP_ENV=develop              -> env/.env.develop
 *   (nothing)                    -> env/.env.local
 *
 * `.env` at the repo root is kept last as a fallback for older setups.
 * Variables already present in process.env (e.g. injected by docker compose
 * `env_file:`) always win over anything read from these files.
 */
export const envFilePaths: string[] = [
  process.env.ENV_FILE,
  `env/.env.${process.env.APP_ENV ?? 'local'}`,
  '.env',
].filter((path): path is string => Boolean(path));
