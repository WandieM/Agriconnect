/**
 * Synthetic demo data only. Organisations and people are invented.
 * Closing dates are relative to the day the seed runs, so the demo always has open opportunities.
 * Demo logins:
 *   admin@agriopportunity.test  / Admin@1234
 *   lerato@agriopportunity.test / Youth@1234  (profile set: Crop production, Limpopo, Diploma)
 *   thabo@agriopportunity.test  / Youth@1234  (no profile yet)
 */
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from './pool';
import { migrate } from './migrate';

export const DEMO_USERS = {
  admin: { email: 'admin@agriopportunity.test', password: 'Admin@1234' },
  youth: { email: 'lerato@agriopportunity.test', password: 'Youth@1234' },
  newYouth: { email: 'thabo@agriopportunity.test', password: 'Youth@1234' },
};

type Seed = [title: string, type: string, org: string, desc: string, field: string, province: string, minLevel: number, stipend: string | null, closesInDays: number, method: 'link' | 'form', url: string | null];

const OPPS: Seed[] = [
  ['Crop Production Internship 2027', 'internship', 'Mopani Fresh Produce (demo)', '12-month internship on a 400 ha vegetable and citrus farm near Tzaneen. Rotations in irrigation, crop protection and pack-house quality control.', 'crop-production', 'Limpopo', 3, 'R6 500 per month', 2, 'form', null],
  ['Agricultural Bursary: BSc Agriculture', 'bursary', 'Bushveld Agri Trust (demo)', 'Full bursary covering tuition, residence and books for students entering 2nd or 3rd year of a BSc in agriculture. Work-back of one year per year funded.', 'any', 'National', 1, 'Full cost of study', 12, 'link', 'https://example.org/bushveld-bursary'],
  ['Learnership: Plant Production NQF 4', 'learnership', 'Highveld Skills Centre (demo)', '12-month learnership with classroom blocks and on-farm practice. Open to matriculants interested in crop farming.', 'crop-production', 'Mpumalanga', 1, 'R3 500 allowance', 20, 'form', null],
  ['Graduate Placement: Agri-economist', 'graduate_placement', 'Vaal Grain Co-operative (demo)', 'Two-year graduate programme in market analysis and farmer finance. Requires a degree in agricultural economics.', 'agri-economics', 'Free State', 4, 'R14 000 per month', 25, 'link', 'https://example.org/vaal-graduates'],
  ['Young Farmer Incubator Programme', 'programme', 'Limpopo Agri Hub (demo)', 'Six-month incubator with mentorship, a starter input pack and market linkage for young crop farmers with access to land.', 'crop-production', 'Limpopo', 1, null, 30, 'form', null],
  ['Junior Irrigation Technician', 'job', 'Letaba Water Users (demo)', 'Install and maintain drip and centre-pivot systems. Driver\'s licence required.', 'agri-engineering', 'Limpopo', 2, 'R9 800 per month', 9, 'link', 'https://example.org/letaba-jobs'],
  ['Food Science Internship', 'internship', 'Cape Agro Foods (demo)', 'Quality assurance internship in a fruit-processing plant: HACCP, lab testing and packaging trials.', 'agri-processing', 'Western Cape', 3, 'R7 000 per month', 16, 'link', 'https://example.org/cape-agro'],
  ['Animal Production Learnership NQF 2', 'learnership', 'KZN Livestock College (demo)', 'Hands-on learnership in beef and goat production, animal health and record keeping.', 'animal-production', 'KwaZulu-Natal', 0, 'R2 800 allowance', 40, 'form', null],
  ['Horticulture Assistant', 'job', 'Garden Route Nurseries (demo)', 'Propagation and greenhouse work in a wholesale nursery.', 'horticulture', 'Western Cape', 1, 'R6 000 per month', 21, 'link', 'https://example.org/garden-route'],
  ['Postgraduate Research Bursary: Soil Health', 'bursary', 'Agri Research Fund (demo)', 'Bursary for MSc or PhD research on soil health in smallholder systems.', 'natural-resources', 'National', 5, 'R120 000 per year', 45, 'link', 'https://example.org/soil-bursary'],
  ['Agri-Business Internship', 'internship', 'Thaba Agri Finance (demo)', 'Support credit officers who assess loans for small farmers. Rotations in risk and client support.', 'agri-economics', 'North West', 3, 'R7 500 per month', 5, 'form', null],
  ['Mechanisation Apprenticeship', 'programme', 'Karoo Tractor Academy (demo)', 'Two-year apprenticeship in tractor and implement maintenance, ending in a trade test.', 'agri-engineering', 'Northern Cape', 1, 'R4 200 per month', 60, 'link', 'https://example.org/karoo-academy'],
  ['Expired: Winter Harvest Casual Work', 'job', 'Eastern Cape Citrus (demo)', 'Seasonal picking work (closed - kept to show expiry).', 'any', 'Eastern Cape', 0, 'R250 per day', -3, 'link', 'https://example.org/ec-citrus'],
];

export async function seedIfEmpty(): Promise<boolean> {
  const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
  if (Number(rows[0].count) > 0) return false;
  await seed();
  return true;
}

export async function seed(): Promise<void> {
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  await withTransaction(async (c) => {
    const user = async (name: string, email: string, pw: string, role: string) =>
      (await c.query<{ id: string }>(`INSERT INTO users (name, email, password_hash, role, consent_at) VALUES ($1, $2, $3, $4, now()) RETURNING id`, [name, email, hash(pw), role])).rows[0].id;

    const admin = await user('Programme Admin', DEMO_USERS.admin.email, DEMO_USERS.admin.password, 'admin');
    const lerato = await user('Lerato Mokoena', DEMO_USERS.youth.email, DEMO_USERS.youth.password, 'youth');
    await user('Thabo Nkosi', DEMO_USERS.newYouth.email, DEMO_USERS.newYouth.password, 'youth');

    await c.query(`INSERT INTO profiles (user_id, field, province, level, phone) VALUES ($1, 'crop-production', 'Limpopo', 3, '+27 72 000 0101')`, [lerato]);

    const ids: string[] = [];
    for (const [title, type, org, desc, field, province, minLevel, stipend, days, method, url] of OPPS) {
      const { rows } = await c.query<{ id: string }>(
        `INSERT INTO opportunities (title, type, organisation, description, field, province, min_level, stipend, closing_date, apply_method, apply_url, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, (now() AT TIME ZONE 'Africa/Johannesburg')::date + $9::int, $10, $11, $12, $13)
         RETURNING id`,
        [title, type, org, desc, field, province, minLevel, stipend, days, method, url, days < 0 ? 'expired' : 'active', admin],
      );
      ids.push(rows[0].id);
    }
    // Lerato saved the internship that closes in 2 days with a 3-day alert, so the alert is due now (golden journey demo).
    await c.query(`INSERT INTO saved_opportunities (user_id, opportunity_id) VALUES ($1, $2)`, [lerato, ids[0]]);
    await c.query(
      `INSERT INTO alerts (user_id, opportunity_id, days_before, remind_on) SELECT $1, id, 3, closing_date - 3 FROM opportunities WHERE id = $2`,
      [lerato, ids[0]],
    );
  });
}

if (require.main === module) {
  migrate()
    .then(() => seedIfEmpty())
    .then((seeded) => {
      console.log(seeded ? 'Seed complete' : 'Database already has users; seed skipped');
      return pool.end();
    })
    .catch((err) => {
      console.error('Seed failed', err);
      process.exit(1);
    });
}
