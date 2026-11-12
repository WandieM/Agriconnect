/**
 * START HERE: creates the database tables, makes sure the starting data is there, then starts the web server.
 * With SEED_ON_START=true:
 *   1. empty database -> create the demo users and opportunities
 *   2. add any opportunity from seed.ts that is missing (new demo or real listings)
 *   3. move demo closing dates forward so the demo never goes stale
 */
import { createApp } from './app';
import { config } from './config';
import { migrate } from './db/migrate';
import { addMissingOpportunities, refreshDemoDates, seedIfEmpty } from './db/seed';

async function main() {
  await migrate();
  if (config.seedOnStart) {
    if (await seedIfEmpty()) console.log('Created demo users and opportunities');
    const added = await addMissingOpportunities();
    if (added) console.log(`Added ${added} new opportunities`);
    await refreshDemoDates();
  }
  const app = createApp();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`AgriOpportunity API listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start', err);
  process.exit(1);
});
