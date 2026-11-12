/**
 * PROFILE ROUTES  (/api/v1/profile, youth only)
 *   GET  /   my matching profile
 *   PUT  /   save my field, province and qualification level
 */
import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { getProfile } from '../db/opportunities';
import { asyncHandler } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { fieldSchema, levelSchema, parse, provinceSchema } from '../utils/validate';

export const profileRouter = Router();

profileRouter.use(requireAuth, requireRole('youth'));

profileRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ profile: await getProfile(req.user!.id) });
  }),
);

const profileSchema = z.object({
  field: fieldSchema,
  province: provinceSchema,
  level: levelSchema,
  phone: z.string().trim().max(20).nullable().optional(),
});

/** Create or replace the matching profile. */
profileRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const body = parse(profileSchema, req.body);
    await query(
      `INSERT INTO profiles (user_id, field, province, level, phone) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET field = $2, province = $3, level = $4, phone = $5, updated_at = now()`,
      [req.user!.id, body.field, body.province, body.level, body.phone ?? null],
    );
    res.json({ profile: await getProfile(req.user!.id) });
  }),
);
