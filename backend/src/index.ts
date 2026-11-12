/** START HERE: creates the database tables, adds demo data (if empty), then starts the web server. */
import { createApp } from './app';
import { config } from './config';
import { migrate } from './db/migrate';
import { seedIfEmpty } from './db/seed';

async function main() {
  await migrate();
  if (config.seedOnStart) {
    const seeded = await seedIfEmpty();
    if (seeded) console.log('Seeded synthetic demo data');
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
