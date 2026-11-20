
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
import publicRoutes from './routes/publicRoutes.js';
import userRoutes from './routes/userRoutes.js';
import mustahikRoutes from './routes/mustahikRoutes.js';
import { createPaymentSession } from './controllers/paymentController.js';
import { authenticate, authorize } from './middleware/auth.js';
import { rateLimit, AUTH_LIMIT } from './middleware/rateLimit.js';

const backendEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
dotenv.config({ path: backendEnvPath });

const app = express();
const PORT = process.env.PORT || 5000;

// Default 'loopback' safely reads X-Forwarded-For from a local reverse proxy
// without trusting spoofed headers from untrusted external clients.
const resolveTrustProxy = (raw?: string): boolean | number | string => {
  const val = raw?.trim();
  if (!val) return 'loopback';
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^\d+$/.test(val)) return Number(val);
  return val;
};

app.disable('x-powered-by');
app.set('trust proxy', resolveTrustProxy(process.env.TRUST_PROXY));

// Security headers standar tanpa dependency eksternal.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');

const rawCorsOrigins = process.env.CORS_ORIGIN?.trim()
  || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173');

const corsOrigin = rawCorsOrigins
  .split(',')
  .map((o) => o.trim())
  .filter((o) => Boolean(o) && o !== '*');

app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (curl, native mobile) dan origin dalam allowlist.
    if (!origin || corsOrigin.includes(origin)) {
      callback(null, true);
    } else {
      const err = Object.assign(new Error('Origin tidak diizinkan oleh kebijakan CORS'), {
        statusCode: 403,
        code: 'CORS_ORIGIN_DENIED',
      });
      callback(err);
    }
  },
  credentials: true,
}));

// Rate limit global: 100 permintaan per 15 menit per IP. Rute auth lebih ketat.
app.use(rateLimit());
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buffer) => {
    // Raw body retained for HMAC webhook signature verification.
    (req as any).rawBody = Buffer.from(buffer);
  }
}));

// Serve uploaded proof files only to authorized operational/oversight roles.
// `dotfiles: deny` and `index: false` prevent directory browsing.
app.use('/uploads', authenticate, authorize(['AMIL', 'AUDITOR', 'ADMIN']), express.static(uploadDirectory, {
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

// Must stay after express.json() and the DB middleware: auth needs req.body and req.db.
app.use('/api/auth', rateLimit({ limit: AUTH_LIMIT }), authRoutes);
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
app.use('/api/public', publicRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mustahik', mustahikRoutes);

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
  if (error?.code === 'CORS_ORIGIN_DENIED' || error?.statusCode === 403) {
    return res.status(403).json({ error: error.message || 'Forbidden' });
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
  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN?.trim()) {
    console.warn('[CONFIG WARNING] CORS_ORIGIN is not configured in production; cross-origin browser requests will be rejected.');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.ZAKAT_CONTRACT_ADDRESS?.trim()) {
    console.warn('[CONFIG WARNING] ZAKAT_CONTRACT_ADDRESS is not configured in production; on-chain verification will report Degraded.');
  }
  app.listen(PORT, (err?: Error) => {
    if (err) {
      console.error('[SERVER START ERROR]', err.message);
      process.exitCode = 1;
      return;
    }
    console.log(`Server running on port ${PORT}`);
  });
}
