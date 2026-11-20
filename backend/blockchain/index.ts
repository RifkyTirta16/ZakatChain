
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from './models/db.js';
import transactionRoutes from './routes/transactionRoutes.js';
import authRoutes from './routes/authRoutes.js';
import anomalyRoutes from './routes/anomalyRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import explorerRoutes from './routes/explorerRoutes.js';
import proofRoutes from './routes/proofRoutes.js';
import mappingRoutes from './routes/mappingRoutes.js';
import reconciliationRoutes from './routes/reconciliationRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import { createPaymentSession } from './controllers/paymentController.js';
import { authenticate } from './middleware/auth.js';
import { rateLimit, AUTH_LIMIT } from './middleware/rateLimit.js';

const backendEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
dotenv.config({ path: backendEnvPath });

const app = express();
const PORT = process.env.PORT || 5000;

const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');

const corsOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (mobile apps, curl, dll) dan origin dalam allowlist.
    if (!origin || corsOrigin.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin tidak diizinkan oleh kebijakan CORS: ${origin}`));
    }
  },
  credentials: true,
}));

// Rate limit global: 100 permintaan per 15 menit per IP. Rute auth lebih ketat.
app.use(rateLimit());
app.use('/api/auth', rateLimit({ limit: AUTH_LIMIT }), authRoutes);
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buffer) => {
    // Raw body retained for HMAC webhook signature verification.
    (req as any).rawBody = Buffer.from(buffer);
  }
}));

// Serve uploaded proof files. `dotfiles: deny` and the absence of directory
// listing prevent the uploads directory from acting as a file browser.
app.use('/uploads', express.static(uploadDirectory, {
  dotfiles: 'deny',
  index: false,
  maxAge: '1h',
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

let dbInstance: any;

/** Close the cached database between HTTP integration tests using temp files. */
export const resetDbForTests = async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Database reset is only available in the test environment');
  }
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = undefined;
  }
};

app.use(async (req, res, next) => {
  try {
    if (!dbInstance) {
      dbInstance = await initDb();
    }
    (req as any).db = dbInstance;
    next();
  } catch (error: any) {
    console.error('[DATABASE INITIALIZATION ERROR]', error);
    res.status(503).json({ error: 'Database is unavailable' });
  }
});

app.use('/api/transactions', transactionRoutes);
app.use('/api/anomalies', anomalyRoutes);
app.use('/api/payments', paymentRoutes);

// Legacy singular path used by CampaignDetail.tsx (POST /api/payment/generate).
app.post('/api/payment/generate', authenticate, createPaymentSession);

app.use('/api/explorer', explorerRoutes);
app.use('/api/proofs', proofRoutes);
app.use('/api/mapping', mappingRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/campaigns', campaignRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Central error handler. Multer errors (file too large, wrong type) become 4xx
// responses instead of an unhandled rejection or a generic 500.
app.use((error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Ukuran berkas melebihi batas 5 MB.'
      : 'Berkas yang diunggah tidak valid.';
    return res.status(400).json({ error: message });
  }
  if (typeof error?.message === 'string' && error.message.includes('Format berkas tidak didukung')) {
    return res.status(400).json({ error: error.message });
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload terlalu besar.' });
  }
  console.error('[UNHANDLED ERROR]', error?.stack || error?.message);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  if (!process.env.JWT_SECRET?.trim()) {
    console.warn(`[CONFIG WARNING] JWT_SECRET is not configured. Server will start, but login and protected API routes will return 503. Configure the process environment or ${backendEnvPath}.`);
  }
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
