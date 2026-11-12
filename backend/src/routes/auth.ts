/**
 * AUTH ROUTES  (/api/v1/auth)
 *   POST   /register  create a youth account (needs POPIA consent)
 *   POST   /login     returns a token (JWT) the app sends with every request
 *   GET    /me        who am I + my profile
 *   DELETE /me        delete my account and all my data
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool';
import { getProfile, Profile } from '../db/opportunities';
import { asyncHandler } from '../middleware/error';
import { AuthUser, requireAuth, signToken } from '../middleware/auth';
import { parse } from '../utils/validate';
import { conflict, notFound, unauthorized } from '../utils/errors';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Try again in 15 minutes.' } },
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[A-Za-z]/, 'Password needs a letter')
    .regex(/[0-9]/, 'Password needs a number'),
  consent: z.literal(true, { errorMap: () => ({ message: 'You must accept the privacy notice (POPIA consent)' }) }),
});

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: AuthUser['role'];
  password_hash: string;
}

export function publicUser(u: UserRow, profile: Profile | null) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, profile };
}

authRouter.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = parse(registerSchema, req.body);
    const existing = await query('SELECT 1 FROM users WHERE email = $1', [body.email]);
    if (existing.rowCount) throw conflict('An account with this email already exists');
    const hash = await bcrypt.hash(body.password, 10);
    const { rows } = await query<UserRow>(
      `INSERT INTO users (name, email, password_hash, role, consent_at) VALUES ($1, $2, $3, 'youth', now())
       RETURNING id, name, email, role, password_hash`,
      [body.name, body.email, hash],
    );
    const u = rows[0];
    res.status(201).json({ token: signToken({ id: u.id, email: u.email, role: u.role, name: u.name }), user: publicUser(u, null) });
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = parse(loginSchema, req.body);
    const u = (await query<UserRow>('SELECT id, name, email, role, password_hash FROM users WHERE email = $1', [body.email])).rows[0];
    // Same message for unknown email and wrong password, so accounts cannot be discovered.
    if (!u || !(await bcrypt.compare(body.password, u.password_hash))) throw unauthorized('Email or password is incorrect');
    res.json({ token: signToken({ id: u.id, email: u.email, role: u.role, name: u.name }), user: publicUser(u, await getProfile(u.id)) });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const u = (await query<UserRow>('SELECT id, name, email, role, password_hash FROM users WHERE id = $1', [req.user!.id])).rows[0];
    if (!u) throw notFound('User no longer exists');
    res.json({ user: publicUser(u, await getProfile(u.id)) });
  }),
);

authRouter.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    // POPIA: a user can delete their account and all their data (profile, saved, alerts, applications cascade).
    if (req.user!.role === 'admin') throw conflict('Admin accounts are removed by the programme team');
    await query('DELETE FROM users WHERE id = $1', [req.user!.id]);
    res.status(204).send();
  }),
);
