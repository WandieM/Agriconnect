/** Runs schema.sql to create tables. Safe to run every start (CREATE TABLE IF NOT EXISTS). */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pool } from './pool';

export async function migrate(): Promise<void> {
  const sql = readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration complete');
      return pool.end();
    })
    .catch((err) => {
      console.error('Migration failed', err);
      process.exit(1);
    });
}
