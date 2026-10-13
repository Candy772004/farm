import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { initDatabase, seedInitialData } from './server/src/db/db.js';
import authRoutes from './server/src/routes/authRoutes.js';
import farmerRoutes from './server/src/routes/farmerRoutes.js';
import productRoutes from './server/src/routes/productRoutes.js';
import orderRoutes from './server/src/routes/orderRoutes.js';
import traceabilityRoutes from './server/src/routes/traceabilityRoutes.js';
import reviewRoutes from './server/src/routes/reviewRoutes.js';
import adminRoutes from './server/src/routes/adminRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Database initialization
  await initDatabase();

  // Basic middleware
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(cookieParser());

  // API Routes under /api/v1
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/farmers', farmerRoutes);
  app.use('/api/v1', productRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/traceability', traceabilityRoutes);
  app.use('/api/v1/reviews', reviewRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // Development utility: Reset / re-seed data
  app.post('/api/v1/seed/reset', async (_req, res) => {
    try {
      await seedInitialData(true);
      res.json({ success: true, message: 'Database reset and re-seeded with demo records.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Seed reset failed.' });
    }
  });

  // Health check endpoint
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Farm2Trust API', timestamp: new Date().toISOString() });
  });

  // Vite middleware in development vs Static serving in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Farm2Trust] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Farm2Trust] Fatal startup error:', err);
  process.exit(1);
});
