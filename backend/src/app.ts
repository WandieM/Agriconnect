/** Builds the Express app: security middleware, then one router per area of the API under /api/v1. */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { pool } from './db/pool';
import { authRouter } from './routes/auth';
import { profileRouter } from './routes/profile';
import { opportunitiesRouter } from './routes/opportunities';
import { meRouter } from './routes/me';
import { adminRouter } from './routes/admin';
import { metaRouter } from './routes/meta';
import { errorHandler, notFoundHandler } from './middleware/error';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // behind Render/Railway/Azure load balancers
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(',').map((o) => o.trim()),
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  if (config.nodeEnv !== 'test') app.use(morgan('tiny'));

  app.get('/', (_req, res) => {
    res.json({ name: 'AgriOpportunity API', version: '1.0.0', docs: '/api/v1/health', product: 'AgriConnect 360 · A4 AgriOpportunity' });
  });

  app.get('/api/v1/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'up', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'down', time: new Date().toISOString() });
    }
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/profile', profileRouter);
  app.use('/api/v1/opportunities', opportunitiesRouter);
  app.use('/api/v1/me', meRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1', metaRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
