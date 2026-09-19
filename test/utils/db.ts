import { Client } from 'pg';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } from './constants';

/** A client on the test stack's Postgres, reached from the host. */
export const connectDb = async (): Promise<Client> => {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });
  await client.connect();

  return client;
};

/**
 * Just enough of TypeORM's `QueryRunner` for a migration's `up`/`down`: the
 * migrations here only ever call `query`, and it returns rows.
 */
const asQueryRunner = (client: Client): QueryRunner =>
  ({
    query: async (sql: string, params?: unknown[]) =>
      (await client.query(sql, params)).rows,
  }) as unknown as QueryRunner;

export const runUp = (client: Client, migration: MigrationInterface) =>
  migration.up(asQueryRunner(client));

export const runDown = (client: Client, migration: MigrationInterface) =>
  migration.down(asQueryRunner(client));

/**
 * Runs `body` in a transaction that is always rolled back, so a migration can
 * be taken down, fed fixture rows and brought back up without the test
 * database remembering any of it.
 */
export const inRolledBackTransaction = async (
  client: Client,
  body: () => Promise<void>,
): Promise<void> => {
  await client.query('BEGIN');
  try {
    await body();
  } finally {
    await client.query('ROLLBACK');
  }
};

/** Inserts a bare user row and returns its id. */
export const insertUser = async (
  client: Client,
  email: string,
  roleId: number | null,
): Promise<number> => {
  const { rows } = await client.query(
    `INSERT INTO "user" ("email", "full_name", "provider", "role_id", "status_id")
     VALUES ($1, $1, 'email', $2, 1)
     RETURNING "id"`,
    [email, roleId],
  );

  return rows[0].id as number;
};
