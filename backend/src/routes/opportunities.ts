/**
 * OPPORTUNITY ROUTES  (/api/v1/opportunities)
 *   GET    /                 search open opportunities (anyone)
 *   GET    /matches          match count + ranked list for my profile (youth)
 *   GET    /:id              one opportunity (anyone)
 *   GET    /:id/calendar.ics calendar file with a closing-date reminder (anyone)
 *   POST   /:id/save         save + set a closing-date alert (youth)
 *   DELETE /:id/save         unsave + remove the alert (youth)
 *   POST   /:id/apply        apply with the simple form (youth)
 */
import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { findOpportunity, getProfile, getUserState, isOpen, OPEN_SQL, OPP_COLUMNS, OppRow, toOpportunity } from '../db/opportunities';
import { asyncHandler } from '../middleware/error';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth';
import { opportunityFieldSchema, opportunityProvinceSchema, parse, typeSchema, uuidSchema } from '../utils/validate';
import { badRequest, conflict, notFound } from '../utils/errors';

export const opportunitiesRouter = Router();

// ---------------------------------------------------------------- GET /  (search)

const searchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: typeSchema.optional(),
  province: opportunityProvinceSchema.optional(),
  field: opportunityFieldSchema.optional(),
  closingWithin: z.coerce.number().int().min(0).max(365).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

opportunitiesRouter.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const f = parse(searchSchema, req.query);

    // Build the WHERE clause one filter at a time. Values go in `params`, never into the SQL text.
    const conditions = [OPEN_SQL];
    const params: unknown[] = [];

    if (f.q) {
      params.push(`%${f.q}%`);
      conditions.push(`(title ILIKE $${params.length} OR organisation ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }
    if (f.type) {
      params.push(f.type);
      conditions.push(`type = $${params.length}`);
    }
    if (f.province) {
      // Picking a province also shows national opportunities, because people there can apply too.
      params.push(f.province);
      conditions.push(`(province = $${params.length} OR province = 'National')`);
    }
    if (f.field) {
      // Picking a field also shows opportunities open to any field.
      params.push(f.field);
      conditions.push(`(field = $${params.length} OR field = 'any')`);
    }
    if (f.closingWithin !== undefined) {
      params.push(f.closingWithin);
      conditions.push(`closing_date <= (now() AT TIME ZONE 'Africa/Johannesburg')::date + $${params.length}::int`);
    }
    params.push(f.limit);

    const { rows } = await query<OppRow>(
      `SELECT ${OPP_COLUMNS} FROM opportunities WHERE ${conditions.join(' AND ')} ORDER BY closing_date ASC LIMIT $${params.length}`,
      params,
    );

    // Signed-in youth also see their match score and what they saved.
    const youthId = req.user?.role === 'youth' ? req.user.id : null;
    const profile = youthId ? await getProfile(youthId) : null;
    const state = youthId ? await getUserState(youthId) : null;

    res.json({ items: rows.map((r) => toOpportunity(r, profile, state)), total: rows.length });
  }),
);

// ---------------------------------------------------------------- GET /matches

opportunitiesRouter.get(
  '/matches',
  requireAuth,
  requireRole('youth'),
  asyncHandler(async (req, res) => {
    const profile = await getProfile(req.user!.id);
    if (!profile) throw conflict('Set up your profile first to see matches');

    // 1. Get every open opportunity (already sorted by soonest closing).
    const { rows } = await query<OppRow>(`SELECT ${OPP_COLUMNS} FROM opportunities WHERE ${OPEN_SQL} ORDER BY closing_date ASC`);
    const state = await getUserState(req.user!.id);

    // 2. Score each one against the profile (see src/matching.ts).
    const scored = rows.map((r) => toOpportunity(r, profile, state));

    // 3. Keep full matches (3/3) and close matches (2/3). Highest score first;
    //    sort() keeps the closing-date order for equal scores.
    const items = scored.filter((o) => o.match!.score >= 2).sort((a, b) => b.match!.score - a.match!.score);

    const matchCount = items.filter((o) => o.match!.isFullMatch).length;
    res.json({ matchCount, partialCount: items.length - matchCount, profile, items });
  }),
);

// ---------------------------------------------------------------- GET /:id

opportunitiesRouter.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id);
    const row = await findOpportunity(id);
    if (!row) throw notFound('Opportunity not found');

    const youthId = req.user?.role === 'youth' ? req.user.id : null;
    const profile = youthId ? await getProfile(youthId) : null;
    const state = youthId ? await getUserState(youthId) : null;
    res.json({ opportunity: toOpportunity(row, profile, state) });
  }),
);

// ---------------------------------------------------------------- GET /:id/calendar.ics

/** Escape text for the iCalendar format. */
function icsText(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

opportunitiesRouter.get(
  '/:id/calendar.ics',
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id);
    const row = await findOpportunity(id);
    if (!row) throw notFound('Opportunity not found');

    const daysBefore = Math.min(30, Math.max(0, Number(req.query.daysBefore ?? 3) || 3));
    const day = row.closing_date.replace(/-/g, ''); // 2026-11-13 -> 20261113
    const nextDay = new Date(Date.parse(row.closing_date) + 86400000).toISOString().slice(0, 10).replace(/-/g, '');

    // An all-day event on the closing date, with a reminder (VALARM) some days before.
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AgriConnect 360//AgriOpportunity//EN',
      'BEGIN:VEVENT',
      `UID:${row.id}@agriopportunity`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${nextDay}`,
      `SUMMARY:${icsText(`Closing: ${row.title}`)}`,
      `DESCRIPTION:${icsText(`${row.organisation}. Applications close today.`)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsText(`${row.title} closes in ${daysBefore} day(s)`)}`,
      `TRIGGER:-P${daysBefore}D`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ];
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="closing-${row.id.slice(0, 8)}.ics"`);
    res.send(lines.join('\r\n'));
  }),
);

// ---------------------------------------------------------------- POST /:id/save

const saveSchema = z.object({ daysBefore: z.number().int().min(0).max(30).default(3) });

opportunitiesRouter.post(
  '/:id/save',
  requireAuth,
  requireRole('youth'),
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id);
    const { daysBefore } = parse(saveSchema, req.body ?? {});
    const row = await findOpportunity(id);
    if (!row) throw notFound('Opportunity not found');
    if (!isOpen(row)) throw conflict('This opportunity has closed');

    // Save it (ignore if already saved).
    await query('INSERT INTO saved_opportunities (user_id, opportunity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user!.id, id]);

    // Set the alert: remind_on = closing date minus daysBefore. Saving again replaces the old alert.
    await query('DELETE FROM alerts WHERE user_id = $1 AND opportunity_id = $2', [req.user!.id, id]);
    await query(
      `INSERT INTO alerts (user_id, opportunity_id, days_before, remind_on) VALUES ($1, $2, $3, $4::date - $5::int)`,
      [req.user!.id, id, daysBefore, row.closing_date, daysBefore],
    );

    const profile = await getProfile(req.user!.id);
    res.status(201).json({ opportunity: toOpportunity(row, profile, await getUserState(req.user!.id)) });
  }),
);

// ---------------------------------------------------------------- DELETE /:id/save

opportunitiesRouter.delete(
  '/:id/save',
  requireAuth,
  requireRole('youth'),
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id);
    await query('DELETE FROM saved_opportunities WHERE user_id = $1 AND opportunity_id = $2', [req.user!.id, id]);
    await query('DELETE FROM alerts WHERE user_id = $1 AND opportunity_id = $2', [req.user!.id, id]);
    res.status(204).send();
  }),
);

// ---------------------------------------------------------------- POST /:id/apply

const applySchema = z.object({
  motivation: z.string().trim().min(20, 'Tell them why you are a good fit (20+ characters)').max(1500),
  phone: z.string().trim().max(20).optional(),
});

opportunitiesRouter.post(
  '/:id/apply',
  requireAuth,
  requireRole('youth'),
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id);
    const body = parse(applySchema, req.body);
    const row = await findOpportunity(id);
    if (!row) throw notFound('Opportunity not found');
    if (!isOpen(row)) throw conflict('This opportunity has closed');
    if (row.apply_method !== 'form') throw badRequest('Apply on the organisation website using the link');

    const already = await query('SELECT 1 FROM applications WHERE user_id = $1 AND opportunity_id = $2', [req.user!.id, id]);
    if (already.rowCount) throw conflict('You have already applied');

    const { rows } = await query(
      'INSERT INTO applications (user_id, opportunity_id, motivation, phone) VALUES ($1, $2, $3, $4) RETURNING id, status, created_at',
      [req.user!.id, id, body.motivation, body.phone ?? null],
    );
    res.status(201).json({ application: { id: rows[0].id, opportunityId: id, status: rows[0].status, createdAt: rows[0].created_at } });
  }),
);
