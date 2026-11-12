/**
 * STARTING DATA
 *
 * Two kinds of opportunities:
 *  1. SAMPLE opportunities: invented organisations (links use example.org). Their closing dates are
 *     "X days from today" and are moved forward every time the server starts (refreshDemoDates),
 *     so the demo never goes stale. Every province has a learnership and a job or graduate placement.
 *  2. REAL opportunities: copied from official pages on 12 November 2026, with the real closing date
 *     and a link to the official advert. They close by themselves after their closing date.
 *
 * People are always invented (demo logins below). Never put real personal details here.
 *   admin@agriopportunity.test  / Admin@1234
 *   lerato@agriopportunity.test / Youth@1234  (profile set: Crop production, Limpopo, Diploma)
 *   thabo@agriopportunity.test  / Youth@1234  (no profile yet)
 */
import bcrypt from 'bcryptjs';
import { pool, query } from './pool';
import { migrate } from './migrate';

export const DEMO_USERS = {
  admin: { email: 'admin@agriopportunity.test', password: 'Admin@1234' },
  youth: { email: 'lerato@agriopportunity.test', password: 'Youth@1234' },
  newYouth: { email: 'thabo@agriopportunity.test', password: 'Youth@1234' },
};

interface SeedOpportunity {
  title: string;
  type: 'bursary' | 'internship' | 'learnership' | 'graduate_placement' | 'programme' | 'job';
  organisation: string;
  description: string;
  field: string; // field slug, or 'any'
  province: string; // province, or 'National'
  minLevel: number; // 0 below Grade 12 ... 5 postgraduate
  stipend: string | null;
  applyMethod: 'link' | 'form';
  applyUrl: string | null;
  closesInDays?: number; // demo: days from today (negative = already closed)
  closingDate?: string; // real: fixed date YYYY-MM-DD
}

const demo = (o: Omit<SeedOpportunity, 'closingDate'>): SeedOpportunity => o;

// ------------------------------------------------------------------ DEMO (invented)
const DEMO_OPPORTUNITIES: SeedOpportunity[] = [
  // Limpopo
  demo({ title: 'Crop Production Internship 2027', type: 'internship', organisation: 'Mopani Fresh Produce', description: '12-month internship on a 400 ha vegetable and citrus farm near Tzaneen. Rotations in irrigation, crop protection and pack-house quality control.', field: 'crop-production', province: 'Limpopo', minLevel: 3, stipend: 'R6 500 per month', closesInDays: 2, applyMethod: 'form', applyUrl: null }),
  demo({ title: 'Young Farmer Incubator Programme', type: 'programme', organisation: 'Limpopo Agri Hub', description: 'Six-month incubator with mentorship, a starter input pack and market linkage for young crop farmers with access to land.', field: 'crop-production', province: 'Limpopo', minLevel: 1, stipend: null, closesInDays: 30, applyMethod: 'form', applyUrl: null }),
  demo({ title: 'Junior Irrigation Technician', type: 'job', organisation: 'Letaba Water Users', description: "Install and maintain drip and centre-pivot systems. Driver's licence required.", field: 'agri-engineering', province: 'Limpopo', minLevel: 2, stipend: 'R9 800 per month', closesInDays: 9, applyMethod: 'link', applyUrl: 'https://example.org/letaba-jobs' }),
  demo({ title: 'Poultry Production Learnership NQF 2', type: 'learnership', organisation: 'Vhembe Poultry Academy', description: '12-month learnership in broiler and layer production: feeding, biosecurity, vaccination and record keeping.', field: 'animal-production', province: 'Limpopo', minLevel: 0, stipend: 'R3 000 allowance', closesInDays: 19, applyMethod: 'form', applyUrl: null }),
  demo({ title: 'Graduate Placement: Packhouse Quality Controller', type: 'graduate_placement', organisation: 'Tzaneen Fruit Packers', description: '12-month placement checking fruit quality, export standards and cold-chain records in a citrus and avocado packhouse.', field: 'agri-processing', province: 'Limpopo', minLevel: 3, stipend: 'R8 000 per month', closesInDays: 17, applyMethod: 'link', applyUrl: 'https://example.org/tzaneen-packers' }),

  // Gauteng
  demo({ title: 'Hydroponic Vegetables Learnership NQF 2', type: 'learnership', organisation: 'Soweto Urban Farms', description: 'Learn to grow vegetables in tunnels and hydroponic systems, from seedlings to harvest and selling to local shops.', field: 'horticulture', province: 'Gauteng', minLevel: 1, stipend: 'R3 200 allowance', closesInDays: 18, applyMethod: 'form', applyUrl: null }),
  demo({ title: 'Graduate Placement: Food Safety Officer', type: 'graduate_placement', organisation: 'Highveld Foods', description: 'Two-year placement in a food factory: HACCP audits, lab sampling and supplier checks.', field: 'agri-processing', province: 'Gauteng', minLevel: 4, stipend: 'R12 500 per month', closesInDays: 22, applyMethod: 'link', applyUrl: 'https://example.org/highveld-foods' }),
  demo({ title: 'Junior Agri Sales Representative', type: 'job', organisation: 'Agri Inputs Direct', description: 'Sell seed, fertiliser and crop-protection products to small farmers around Gauteng. Training provided.', field: 'agri-economics', province: 'Gauteng', minLevel: 1, stipend: 'R8 500 per month + commission', closesInDays: 14, applyMethod: 'link', applyUrl: 'https://example.org/agri-inputs' }),

  // Mpumalanga
  demo({ title: 'Learnership: Plant Production NQF 4', type: 'learnership', organisation: 'Highveld Skills Centre', description: '12-month learnership with classroom blocks and on-farm practice. Open to matriculants interested in crop farming.', field: 'crop-production', province: 'Mpumalanga', minLevel: 1, stipend: 'R3 500 allowance', closesInDays: 20, applyMethod: 'form', applyUrl: null }),
  demo({ title: 'Forestry Field Worker', type: 'job', organisation: 'Lowveld Timber', description: 'Plant, prune and protect pine and eucalyptus plantations. Outdoor work; transport from Sabie provided.', field: 'natural-resources', province: 'Mpumalanga', minLevel: 0, stipend: 'R5 200 per month', closesInDays: 15, applyMethod: 'link', applyUrl: 'https://example.org/lowveld-timber' }),
  demo({ title: 'Graduate Placement: Agricultural Extension', type: 'graduate_placement', organisation: 'Nkomazi Farmer Support', description: 'Visit small-scale farmers, give advice on crops and animals, and keep farm visit records. Any agriculture diploma or degree.', field: 'any', province: 'Mpumalanga', minLevel: 3, stipend: 'R9 000 per month', closesInDays: 23, applyMethod: 'link', applyUrl: 'https://example.org/nkomazi' }),

  // KwaZulu-Natal
  demo({ title: 'Animal Production Learnership NQF 2', type: 'learnership', organisation: 'KZN Livestock College', description: 'Hands-on learnership in beef and goat production, animal health and record keeping.', field: 'animal-production', province: 'KwaZulu-Natal', minLevel: 0, stipend: 'R2 800 allowance', closesInDays: 40, applyMethod: 'form', applyUrl: null }),
  demo({ title: 'Sugarcane Field Assistant', type: 'job', organisation: 'Midlands Cane Growers', description: 'Help with planting, weed control and harvest planning on sugarcane farms near Eshowe.', field: 'crop-production', province: 'KwaZulu-Natal', minLevel: 1, stipend: 'R6 800 per month', closesInDays: 13, applyMethod: 'link', applyUrl: 'https://example.org/midlands-cane' }),
  demo({ title: 'Graduate Placement: Agronomist', type: 'graduate_placement', organisation: 'Zululand Grain', description: 'Two-year placement doing soil sampling, crop trials and farmer advice for maize and soya growers.', field: 'crop-production', province: 'KwaZulu-Natal', minLevel: 4, stipend: 'R13 000 per month', closesInDays: 28, applyMethod: 'link', applyUrl: 'https://example.org/zululand-grain' }),

  // Free State
  demo({ title: 'Graduate Placement: Agri-economist', type: 'graduate_placement', organisation: 'Vaal Grain Co-operative', description: 'Two-year graduate programme in market analysis and farmer finance. Requires a degree in agricultural economics.', field: 'agri-economics', province: 'Free State', minLevel: 4, stipend: 'R14 000 per month', closesInDays: 25, applyMethod: 'link', applyUrl: 'https://example.org/vaal-graduates' }),
  demo({ title: 'Grain Handling Learnership NQF 2', type: 'learnership', organisation: 'Free State Silo Training', description: 'Learn grain grading, storage and silo safety. Practical blocks at a working silo in Bethlehem.', field: 'crop-production', province: 'Free State', minLevel: 1, stipend: 'R3 300 allowance', closesInDays: 24, applyMethod: 'form', applyUrl: null }),
  demo({ title: 'Silo Operator Trainee', type: 'job', organisation: 'Eastern Free State Agri', description: 'Operate conveyors and dryers, take grain samples and keep intake records during harvest.', field: 'agri-engineering', province: 'Free State', minLevel: 1, stipend: 'R7 000 per month', closesInDays: 8, applyMethod: 'link', applyUrl: 'https://example.org/efs-agri' }),

  // North West
  demo({ title: 'Agri-Business Internship', type: 'internship', organisation: 'Thaba Agri Finance', description: 'Support credit officers who assess loans for small farmers. Rotations in risk and client support.', field: 'agri-economics', province: 'North West', minLevel: 3, stipend: 'R7 500 per month', closesInDays: 5, applyMethod: 'form', applyUrl: null }),
  demo({ title: 'Mixed Farming Learnership NQF 1', type: 'learnership', organisation: 'Bojanala Farmer Academy', description: 'Entry-level learnership in vegetables, maize and small livestock. No matric needed.', field: 'crop-production', province: 'North West', minLevel: 0, stipend: 'R2 600 allowance', closesInDays: 27, applyMethod: 'form', applyUrl: null }),
  demo({ title: 'Tractor Driver and Implement Operator', type: 'job', organisation: 'Ditsobotla Grain Farm', description: "Drive tractors for planting and harvest, do daily machine checks. Code EC1 driver's licence needed.", field: 'agri-engineering', province: 'North West', minLevel: 0, stipend: 'R6 000 per month', closesInDays: 10, applyMethod: 'link', applyUrl: 'https://example.org/ditsobotla' }),

  // Northern Cape
  demo({ title: 'Mechanisation Apprenticeship', type: 'programme', organisation: 'Karoo Tractor Academy', description: 'Two-year apprenticeship in tractor and implement maintenance, ending in a trade test.', field: 'agri-engineering', province: 'Northern Cape', minLevel: 1, stipend: 'R4 200 per month', closesInDays: 60, applyMethod: 'link', applyUrl: 'https://example.org/karoo-academy' }),
  demo({ title: 'Irrigation Learnership NQF 2', type: 'learnership', organisation: 'Orange River Skills', description: 'Learn to install, run and repair irrigation for vineyards and lucerne along the Orange River.', field: 'agri-engineering', province: 'Northern Cape', minLevel: 1, stipend: 'R3 100 allowance', closesInDays: 33, applyMethod: 'form', applyUrl: null }),
  demo({ title: 'Table-Grape Packhouse Supervisor', type: 'job', organisation: 'Kakamas Grape Exporters', description: 'Supervise a packing line of 40 people during the grape season; quality and export paperwork.', field: 'agri-processing', province: 'Northern Cape', minLevel: 2, stipend: 'R11 000 per month', closesInDays: 12, applyMethod: 'link', applyUrl: 'https://example.org/kakamas' }),

  // Western Cape
  demo({ title: 'Food Science Internship', type: 'internship', organisation: 'Cape Agro Foods', description: 'Quality assurance internship in a fruit-processing plant: HACCP, lab testing and packaging trials.', field: 'agri-processing', province: 'Western Cape', minLevel: 3, stipend: 'R7 000 per month', closesInDays: 16, applyMethod: 'link', applyUrl: 'https://example.org/cape-agro' }),
  demo({ title: 'Horticulture Assistant', type: 'job', organisation: 'Garden Route Nurseries', description: 'Propagation and greenhouse work in a wholesale nursery.', field: 'horticulture', province: 'Western Cape', minLevel: 1, stipend: 'R6 000 per month', closesInDays: 21, applyMethod: 'link', applyUrl: 'https://example.org/garden-route' }),
  demo({ title: 'Vineyard and Wine Learnership NQF 2', type: 'learnership', organisation: 'Winelands Skills Hub', description: 'Pruning, canopy work, harvest and cellar basics on wine farms near Stellenbosch.', field: 'horticulture', province: 'Western Cape', minLevel: 1, stipend: 'R3 400 allowance', closesInDays: 29, applyMethod: 'form', applyUrl: null }),

  // Eastern Cape
  demo({ title: 'Dairy Production Learnership NQF 2', type: 'learnership', organisation: 'Tsitsikamma Dairy Academy', description: 'Milking, calf rearing, pasture and herd health on pasture-based dairy farms.', field: 'animal-production', province: 'Eastern Cape', minLevel: 0, stipend: 'R3 000 allowance', closesInDays: 26, applyMethod: 'form', applyUrl: null }),
  demo({ title: 'Citrus Farm Supervisor', type: 'job', organisation: 'Sundays River Citrus', description: 'Lead a team of farm workers through spraying, irrigation and picking schedules.', field: 'crop-production', province: 'Eastern Cape', minLevel: 2, stipend: 'R9 500 per month', closesInDays: 11, applyMethod: 'link', applyUrl: 'https://example.org/sundays-river' }),
  demo({ title: 'Expired: Winter Harvest Casual Work', type: 'job', organisation: 'Eastern Cape Citrus', description: 'Seasonal picking work (closed - kept to show expiry).', field: 'any', province: 'Eastern Cape', minLevel: 0, stipend: 'R250 per day', closesInDays: -3, applyMethod: 'link', applyUrl: 'https://example.org/ec-citrus' }),

  // National
  demo({ title: 'Agricultural Bursary: BSc Agriculture', type: 'bursary', organisation: 'Bushveld Agri Trust', description: 'Full bursary covering tuition, residence and books for students entering 2nd or 3rd year of a BSc in agriculture. Work-back of one year per year funded.', field: 'any', province: 'National', minLevel: 1, stipend: 'Full cost of study', closesInDays: 12, applyMethod: 'link', applyUrl: 'https://example.org/bushveld-bursary' }),
  demo({ title: 'Postgraduate Research Bursary: Soil Health', type: 'bursary', organisation: 'Agri Research Fund', description: 'Bursary for MSc or PhD research on soil health in smallholder systems.', field: 'natural-resources', province: 'National', minLevel: 5, stipend: 'R120 000 per year', closesInDays: 45, applyMethod: 'link', applyUrl: 'https://example.org/soil-bursary' }),
  demo({ title: 'Livestock Learnership NQF 4 (blended)', type: 'learnership', organisation: 'National Agri Skills Network', description: 'Online theory plus farm practice near your home. Cattle, sheep and goats; open in every province.', field: 'animal-production', province: 'National', minLevel: 1, stipend: 'R3 500 allowance', closesInDays: 35, applyMethod: 'form', applyUrl: null }),
  demo({ title: 'Agri Advice Centre Agent (remote)', type: 'job', organisation: 'FarmLine Advisory', description: 'Answer farmers by phone and WhatsApp about prices, inputs and weather. Work from home with training.', field: 'agri-economics', province: 'National', minLevel: 1, stipend: 'R7 800 per month', closesInDays: 16, applyMethod: 'link', applyUrl: 'https://example.org/farmline' }),
];

// ------------------------------------------------------------------ REAL (checked 12 Nov 2026)
const CHECKED = 'Real opportunity: details copied from the official page on 12 Nov 2026. Always confirm on the official advert before applying.';

const REAL_OPPORTUNITIES: SeedOpportunity[] = [
  {
    title: 'DLRRD Internship: Agriculture (2026-2028)',
    type: 'internship',
    organisation: 'Department of Land Reform and Rural Development',
    description: `24-month internship for unemployed graduates with a National Diploma or Degree in agriculture. Posts at provincial offices and National Office. Apply with a Z83 form, CV and supporting documents as the official advert describes, quoting the reference number for your office. Closes 30 November 2026 at 16:00. ${CHECKED}`,
    field: 'any',
    province: 'National',
    minLevel: 3,
    stipend: 'Monthly stipend (see advert)',
    closingDate: '2026-11-30',
    applyMethod: 'link',
    applyUrl: 'https://www.dlrrd.gov.za/images/Vacancies/2026/dlrrd_internship_opportunities_06nov2026.pdf',
  },
  {
    title: 'SITFE Bursary 2027',
    type: 'bursary',
    organisation: 'Sugar Industry Trust Fund for Education (SITFE)',
    description: `For students registered or applying in Science, Engineering or Agriculture at a university, university of technology or college of agriculture (including Owen Sithole and Cedara). Applicants must come from sugarcane-growing areas of KwaZulu-Natal or Mpumalanga. "Missing middle" family income R350 000 to R600 000; children of sugarcane farm workers are exempt from the income rule. Email the form to bursaries@sasa.org.za. ${CHECKED}`,
    field: 'any',
    province: 'KwaZulu-Natal',
    minLevel: 1,
    stipend: null,
    closingDate: '2026-11-30',
    applyMethod: 'link',
    applyUrl: 'https://sitfe.co.za',
  },
  {
    title: 'Agbiz Centenary Bursary 2027 (Master\'s / PhD)',
    type: 'bursary',
    organisation: 'Agricultural Business Chamber (Agbiz)',
    description: `Annual bursary for a South African student registered for a master's or PhD in an agribusiness management-related field at a South African university. Send the application form and documents to policy@agbiz.co.za. ${CHECKED}`,
    field: 'agri-economics',
    province: 'National',
    minLevel: 4,
    stipend: null,
    closingDate: '2026-12-06',
    applyMethod: 'link',
    applyUrl: 'https://agbiz.co.za/bursary',
  },
  {
    title: 'Agricultural Economist: Macro and Resource Economics (AGR 63/2026)',
    type: 'job',
    organisation: 'Western Cape Department of Agriculture',
    description: `Permanent post at Elsenburg. Apply online through the Western Cape Government e-recruitment site (reference AGR 63/2026). Check the advert for the exact qualification and experience needed. ${CHECKED}`,
    field: 'agri-economics',
    province: 'Western Cape',
    minLevel: 4,
    stipend: null,
    closingDate: '2026-11-30',
    applyMethod: 'link',
    applyUrl: 'https://westerncapegov.erecruit.co/candidateapp/Jobs/Categories/Agriculture/5b360dff84834cdea9c5c8eeee2bcd3e',
  },
  {
    title: 'Candidate Scientist (Food Science): Plant Sciences (AGR 60/2026)',
    type: 'job',
    organisation: 'Western Cape Department of Agriculture',
    description: `3-year contract post at Elsenburg for a candidate scientist in food science. Apply online through the Western Cape Government e-recruitment site (reference AGR 60/2026). Check the advert for requirements. ${CHECKED}`,
    field: 'agri-processing',
    province: 'Western Cape',
    minLevel: 4,
    stipend: null,
    closingDate: '2026-11-30',
    applyMethod: 'link',
    applyUrl: 'https://westerncapegov.erecruit.co/candidateapp/Jobs/Categories/Agriculture/5b360dff84834cdea9c5c8eeee2bcd3e',
  },
  {
    title: 'Agricultural Equipment Mechanic (Reitz)',
    type: 'job',
    organisation: 'VKB Mechanisation',
    description: `Agricultural equipment mechanic post at VKB Mechanisation in Reitz. Apply on the VKB Group careers page and check the advert for the trade qualification needed. ${CHECKED}`,
    field: 'agri-engineering',
    province: 'Free State',
    minLevel: 1,
    stipend: null,
    closingDate: '2026-11-30',
    applyMethod: 'link',
    applyUrl: 'https://www.vkb.co.za/careers/',
  },
  {
    title: 'Lucerne Marketer and Acquirer (Vaalharts)',
    type: 'job',
    organisation: 'GWK Trading',
    description: `Buying and marketing lucerne in the Vaalharts area (Jan Kempdorp). Listed on the VKB Group careers page; check the advert for requirements. ${CHECKED}`,
    field: 'agri-economics',
    province: 'Northern Cape',
    minLevel: 1,
    stipend: null,
    closingDate: '2026-11-20',
    applyMethod: 'link',
    applyUrl: 'https://www.vkb.co.za/careers/',
  },
];

export const ALL_SEED_OPPORTUNITIES = [...DEMO_OPPORTUNITIES, ...REAL_OPPORTUNITIES];

/** Adds any seed opportunity that is not in the database yet (matched by title). Safe to run on every start. */
export async function addMissingOpportunities(): Promise<number> {
  const admin = await query<{ id: string }>(`SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1`);
  const adminId = admin.rows[0]?.id ?? null;
  let added = 0;
  for (const o of ALL_SEED_OPPORTUNITIES) {
    const exists = await query('SELECT 1 FROM opportunities WHERE title = $1', [o.title]);
    if (exists.rowCount) continue;
    // Demo items close X days from today; real items have a fixed date.
    const closing = o.closingDate ?? (await query<{ d: string }>(`SELECT to_char((now() AT TIME ZONE 'Africa/Johannesburg')::date + $1::int, 'YYYY-MM-DD') AS d`, [o.closesInDays])).rows[0].d;
    const status = o.closesInDays !== undefined && o.closesInDays < 0 ? 'expired' : 'active';
    await query(
      `INSERT INTO opportunities (title, type, organisation, description, field, province, min_level, stipend, closing_date, apply_method, apply_url, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [o.title, o.type, o.organisation, o.description, o.field, o.province, o.minLevel, o.stipend, closing, o.applyMethod, o.applyUrl, status, adminId],
    );
    added++;
  }
  return added;
}

/**
 * Moves every demo closing date to "X days from today" again, and moves their reminders with them.
 * Runs on every server start so the demo (e.g. "closes in 2 days" + a due alert) always works.
 */
export async function refreshDemoDates(): Promise<void> {
  // Older databases had " (demo)" after the organisation name. Remove it.
  await query(`UPDATE opportunities SET organisation = left(organisation, length(organisation) - 7) WHERE organisation LIKE '% (demo)'`);
  for (const o of DEMO_OPPORTUNITIES) {
    await query(
      `UPDATE opportunities SET closing_date = (now() AT TIME ZONE 'Africa/Johannesburg')::date + $3::int WHERE title = $1 AND organisation = $2`,
      [o.title, o.organisation, o.closesInDays],
    );
    await query(
      `UPDATE alerts SET remind_on = o.closing_date - alerts.days_before
       FROM opportunities o WHERE o.id = alerts.opportunity_id AND o.title = $1 AND o.organisation = $2`,
      [o.title, o.organisation],
    );
  }
}

/** Creates the demo users the first time (empty database), then the opportunities. */
export async function seed(): Promise<void> {
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  const addUser = async (name: string, email: string, pw: string, role: string) =>
    (await query<{ id: string }>(`INSERT INTO users (name, email, password_hash, role, consent_at) VALUES ($1, $2, $3, $4, now()) RETURNING id`, [name, email, hash(pw), role])).rows[0].id;

  await addUser('Programme Admin', DEMO_USERS.admin.email, DEMO_USERS.admin.password, 'admin');
  const lerato = await addUser('Lerato Mokoena', DEMO_USERS.youth.email, DEMO_USERS.youth.password, 'youth');
  await addUser('Thabo Nkosi', DEMO_USERS.newYouth.email, DEMO_USERS.newYouth.password, 'youth');
  await query(`INSERT INTO profiles (user_id, field, province, level, phone) VALUES ($1, 'crop-production', 'Limpopo', 3, '+27 72 000 0101')`, [lerato]);

  await addMissingOpportunities();

  // Lerato saved the internship that closes in 2 days, with a 3-day alert, so her alert is due now.
  const internship = await query<{ id: string }>(`SELECT id FROM opportunities WHERE title = 'Crop Production Internship 2027'`);
  await query('INSERT INTO saved_opportunities (user_id, opportunity_id) VALUES ($1, $2)', [lerato, internship.rows[0].id]);
  await query(
    `INSERT INTO alerts (user_id, opportunity_id, days_before, remind_on) SELECT $1, id, 3, closing_date - 3 FROM opportunities WHERE id = $2`,
    [lerato, internship.rows[0].id],
  );
}

export async function seedIfEmpty(): Promise<boolean> {
  const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
  if (Number(rows[0].count) > 0) return false;
  await seed();
  return true;
}

if (require.main === module) {
  migrate()
    .then(() => seedIfEmpty())
    .then(() => addMissingOpportunities())
    .then(() => refreshDemoDates())
    .then(() => {
      console.log('Seed data is up to date');
      return pool.end();
    })
    .catch((err) => {
      console.error('Seed failed', err);
      process.exit(1);
    });
}
