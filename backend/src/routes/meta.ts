/** GET /api/v1/meta — the fixed lists the app needs for its dropdowns, in one small call. */
import { Router } from 'express';
import { FIELDS, LEVELS, PROVINCES, TYPES } from '../utils/validate';

export const metaRouter = Router();

/** Reference lists for forms and filters, in one call (low data). */
metaRouter.get('/meta', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({ provinces: PROVINCES, fields: FIELDS, levels: LEVELS, types: TYPES });
});
