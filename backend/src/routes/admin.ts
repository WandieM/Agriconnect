/**
 * ADMIN ROUTES  (/api/v1/admin, admin only)
 *   GET   /opportunities                    list open / closed / all, with save and application counts
 *   POST  /opportunities                    create
 *   PATCH /opportunities/:id                edit (send only the fields you change)
 *   PATCH /opportunities/:id/expire         close it now
 *   GET   /opportunities/:id/applications   who applied
 *   GET   /stats                            numbers for the Manage screen
 */
import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { findOpportunity, OPEN_SQL, OPP_COLUMNS, OppRow, toOpportunity } from '../db/opportunities';
import { asyncHandler } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { dateSchema, levelSchema, opportunityFieldSchema, opportunityProvinceSchema, parse, todaySA, typeSchema, uuidSchema } from '../utils/validate';
import { badRequest, notFound } from '../utils/errors';

export const adminRouter = Router();

// Every route in this file needs a signed-in admin.
adminRouter.use(requireAuth, requireRole('admin'));

/** All the fields of an opportunity. */
const opportunitySchema = z.object({
  title: z.string().trim().min(5).max(140),
  type: typeSchema,
  organisation: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20).max(3000),
  field: opportunityFieldSchema,
  province: opportunityProvinceSchema,
  minLevel: levelSchema.default(0),
  stipend: z.string().trim().max(80).nullable().optional(),
  closingDate: dateSchema,
  applyMethod: z.enum(['link', 'form']),
  applyUrl: z.string().trim().url().max(500).nullable().optional(),
  status: z.enum(['active', 'expired']).default('active'),
});
type OpportunityInput = z.infer<typeof opportunitySchema>;

/** Business rules that need more than one field. Returns field errors (empty = fine). */
function checkRules(o: OpportunityInput, isNew: boolean): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (o.applyMethod === 'link' && !o.applyUrl) errors.applyUrl = ['A link opportunity needs an apply URL'];
  if (isNew && o.closingDate < todaySA()) errors.closingDate = ['Closing date cannot be in the past'];
  return errors;
}

// ---------------------------------------------------------------- GET /opportunities

const listSchema = z.object({ status: z.enum(['open', 'closed', 'all']).default('open') });

adminRouter.get(
  '/opportunities',
  asyncHandler(async (req, res) => {
    const { status } = parse(listSchema, req.query);
    const where = status === 'open' ? `WHERE ${OPEN_SQL}` : status === 'closed' ? `WHERE NOT (${OPEN_SQL})` : '';
    const { rows } = await query<OppRow & { saves: number; applications: number }>(
      `SELECT ${OPP_COLUMNS},
         (SELECT COUNT(*)::int FROM saved_opportunities s WHERE s.opportunity_id = o.id) AS saves,
         (SELECT COUNT(*)::int FROM applications a WHERE a.opportunity_id = o.id) AS applications
       FROM opportunities o ${where}
       ORDER BY closing_date ASC`,
    );
    res.json({ items: rows.map((r) => ({ ...toOpportunity(r), saves: r.saves, applications: r.applications })) });
  }),
);

// ---------------------------------------------------------------- POST /opportunities

adminRouter.post(
  '/opportunities',
  asyncHandler(async (req, res) => {
    const o = parse(opportunitySchema, req.body);
    const errors = checkRules(o, true);
    if (Object.keys(errors).length) throw badRequest('Validation failed', errors);

    const { rows } = await query<{ id: string }>(
      `INSERT INTO opportunities
         (title, type, organisation, description, field, province, min_level, stipend, closing_date, apply_method, apply_url, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [o.title, o.type, o.organisation, o.description, o.field, o.province, o.minLevel, o.stipend ?? null,
       o.closingDate, o.applyMethod, o.applyUrl ?? null, o.status, req.user!.id],
    );
    res.status(201).json({ opportunity: toOpportunity((await findOpportunity(rows[0].id))!) });
  }),
);

// ---------------------------------------------------------------- PATCH /opportunities/:id

adminRouter.patch(
  '/opportunities/:id',
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id);
    const existing = await findOpportunity(id);
    if (!existing) throw notFound('Opportunity not found');

    // Start from what is saved now, apply the changes that were sent, then check the whole thing.
    const current: OpportunityInput = {
      title: existing.title,
      type: existing.type,
      organisation: existing.organisation,
      description: existing.description,
      field: existing.field,
      province: existing.province,
      minLevel: existing.min_level,
      stipend: existing.stipend,
      closingDate: existing.closing_date,
      applyMethod: existing.apply_method,
      applyUrl: existing.apply_url,
      status: existing.status,
    };
    const o = parse(opportunitySchema, { ...current, ...req.body });
    const errors = checkRules(o, false);
    if (Object.keys(errors).length) throw badRequest('Validation failed', errors);

    await query(
      `UPDATE opportunities SET
         title = $2, type = $3, organisation = $4, description = $5, field = $6, province = $7, min_level = $8,
         stipend = $9, closing_date = $10, apply_method = $11, apply_url = $12, status = $13, updated_at = now()
       WHERE id = $1`,
      [id, o.title, o.type, o.organisation, o.description, o.field, o.province, o.minLevel,
       o.stipend ?? null, o.closingDate, o.applyMethod, o.applyUrl ?? null, o.status],
    );
    // If the closing date moved, move every reminder with it.
    await query('UPDATE alerts SET remind_on = $2::date - days_before WHERE opportunity_id = $1', [id, o.closingDate]);

    res.json({ opportunity: toOpportunity((await findOpportunity(id))!) });
  }),
);

// ---------------------------------------------------------------- PATCH /opportunities/:id/expire

adminRouter.patch(
  '/opportunities/:id/expire',
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id);
    const result = await query(`UPDATE opportunities SET status = 'expired', updated_at = now() WHERE id = $1`, [id]);
    if (!result.rowCount) throw notFound('Opportunity not found');
    res.json({ opportunity: toOpportunity((await findOpportunity(id))!) });
  }),
);

// ---------------------------------------------------------------- GET /opportunities/:id/applications

adminRouter.get(
  '/opportunities/:id/applications',
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id);
    const { rows } = await query(
      `SELECT a.id, a.motivation, a.phone, a.status, a.created_at, u.name, u.email
       FROM applications a JOIN users u ON u.id = a.user_id
       WHERE a.opportunity_id = $1 ORDER BY a.created_at DESC`,
      [id],
    );
    res.json({
      items: rows.map((r) => ({
        id: r.id,
        motivation: r.motivation,
        phone: r.phone,
        status: r.status,
        createdAt: r.created_at,
        applicant: { name: r.name, email: r.email },
      })),
    });
  }),
);

// ---------------------------------------------------------------- GET /stats

adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const count = async (sql: string) => Number((await query<{ n: string }>(`SELECT COUNT(*) AS n FROM ${sql}`)).rows[0].n);
    res.json({
      youth: await count(`users WHERE role = 'youth'`),
      profiles: await count('profiles'),
      openOpportunities: await count(`opportunities WHERE ${OPEN_SQL}`),
      closingThisWeek: await count(`opportunities WHERE ${OPEN_SQL} AND closing_date <= (now() AT TIME ZONE 'Africa/Johannesburg')::date + 7`),
      saves: await count('saved_opportunities'),
      applications: await count('applications'),
    });
  }),
);
