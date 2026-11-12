/**
 * Login checks.
 * requireAuth: the request must carry a valid token (Authorization: Bearer <token>).
 * requireRole('admin'): the signed-in user must have that role. Checked on the server, not just hidden in the app.
 */
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { forbidden, unauthorized } from '../utils/errors';

export type Role = 'youth' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, name: user.name }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/** Verifies the Bearer token and attaches req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized());
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as jwt.JwtPayload;
    req.user = { id: String(payload.sub), email: payload.email, role: payload.role, name: payload.name };
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}

/** Attaches req.user when a valid token is present; continues anonymously otherwise. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), config.jwtSecret) as jwt.JwtPayload;
      req.user = { id: String(payload.sub), email: payload.email, role: payload.role, name: payload.name };
    } catch {
      // ignore invalid token on public routes
    }
  }
  next();
}

/** Server-side role check. Always use after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden(`This action needs the ${roles.join(' or ')} role`));
    next();
  };
}
