/** Reads settings from environment variables (.env locally, the dashboard on Render). */
import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const config = {
  nodeEnv,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL', nodeEnv === 'production' ? undefined : 'postgres://postgres:postgres@localhost:5432/agriopportunity'),
  databaseSsl: (process.env.DATABASE_SSL ?? 'false').toLowerCase() === 'true',
  jwtSecret: required('JWT_SECRET', nodeEnv === 'production' ? undefined : 'dev-only-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  seedOnStart: (process.env.SEED_ON_START ?? 'false').toLowerCase() === 'true',
  maxImageBytes: 500 * 1024,
};
