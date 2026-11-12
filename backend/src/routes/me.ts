/**
 * MY STUFF ROUTES  (/api/v1/me, youth only)
 *   GET   /saved               my saved opportunities (the app keeps a copy for offline use)
 *   GET   /alerts              my closing-date alerts: due now, and upcoming
 *   PATCH /alerts/:id/dismiss  hide an alert
 *   GET   /applications        what I applied for
 */
import { Router } from 'express';
import { query } from '../db/pool';
import { getProfile, getUserState, OPP_COLUMNS, OppRow, toOpportunity } from '../db/opportunities';
import { asyncHandler } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { parse, uuidSchema } from '../utils/validate';
import { notFound } from '../utils/errors';

export const meRouter = Router();

meRouter.use(requireAuth, requireRole('youth'));

meRouter.get(
  '/saved',
  asyncHandler(async (req, res) => {
    const { rows } = await query<OppRow>(
      `SELECT ${OPP_COLUMNS} FROM opportunities
       WHERE id IN (SELECT opportunity_id FROM saved_opportunities WHERE user_id = $1)
       ORDER BY closing_date ASC`,
      [req.user!.id],
    );
    const profile = await getProfile(req.user!.id);
    const state = await getUserState(req.user!.id);
    res.json({ items: rows.map((r) => toOpportunity(r, profile, state)) });
  }),
);

/**
 * Closing-date alerts. `due` = reminder date reached and the opportunity is still open (shown as a
 * notification in the app); `upcoming` = reminders still in the future.
 */
meRouter.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    const { rows } = await query<{
      id: string;
      opportunity_id: string;
      title: string;
      organisation: string;
      closing_date: string;
      remind_on: string;
      days_before: number;
      days_left: number;
      due: boolean;
    }>(
      `SELECT a.id, a.opportunity_id, o.title, o.organisation,
              to_char(o.closing_date, 'YYYY-MM-DD') AS closing_date, to_char(a.remind_on, 'YYYY-MM-DD') AS remind_on,
              a.days_before, (o.closing_date - (now() AT TIME ZONE 'Africa/Johannesburg')::date) AS days_left,
              (a.remind_on <= (now() AT TIME ZONE 'Africa/Johannesburg')::date) AS due
       FROM alerts a JOIN opportunities o ON o.id = a.opportunity_id
       WHERE a.user_id = $1 AND a.dismissed_at IS NULL AND o.status = 'active'
         AND o.closing_date >= (now() AT TIME ZONE 'Africa/Johannesburg')::date
       ORDER BY o.closing_date ASC`,
      [req.user!.id],
    );
    const shape = (r: (typeof rows)[number]) => ({
      id: r.id,
      opportunityId: r.opportunity_id,
      title: r.title,
      organisation: r.organisation,
      closingDate: r.closing_date,
      remindOn: r.remind_on,
      daysBefore: r.days_before,
      daysLeft: Number(r.days_left),
      message: Number(r.days_left) === 0 ? `${r.title} closes today` : `${r.title} closes in ${r.days_left} day${Number(r.days_left) === 1 ? '' : 's'}`,
    });
    res.json({ due: rows.filter((r) => r.due).map(shape), upcoming: rows.filter((r) => !r.due).map(shape) });
  }),
);

meRouter.patch(
  '/alerts/:id/dismiss',
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id);
    const { rowCount } = await query('UPDATE alerts SET dismissed_at = now() WHERE id = $1 AND user_id = $2', [id, req.user!.id]);
    if (!rowCount) throw notFound('Alert not found');
    res.status(204).send();
  }),
);

meRouter.get(
  '/applications',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT ap.id, ap.status, ap.created_at, o.id AS opportunity_id, o.title, o.organisation
       FROM applications ap JOIN opportunities o ON o.id = ap.opportunity_id
       WHERE ap.user_id = $1 ORDER BY ap.created_at DESC`,
      [req.user!.id],
    );
    res.json({
      items: rows.map((r) => ({ id: r.id, status: r.status, createdAt: r.created_at, opportunity: { id: r.opportunity_id, title: r.title, organisation: r.organisation } })),
    });
  }),
);
