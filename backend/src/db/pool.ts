/** One shared connection pool to PostgreSQL, plus a query() helper. Always pass values as params, never in the SQL text. */
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

/** Run a parameterised query. Never build SQL by concatenating user input. */
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params);
}

/** Run several statements in one transaction. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
