import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 menit
export const DEFAULT_LIMIT = 100;
export const AUTH_LIMIT = 20;

const store = new Map<string, RateLimitEntry>();

// Bersihkan entri jendela yang sudah lewat agar memori tidak tumbuh tanpa batas.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, WINDOW_MS).unref();

const clientKey = (req: Request): string =>
  req.ip ?? req.socket?.remoteAddress ?? 'unknown';

const checkLimit = (req: Request, limit: number): { allowed: boolean; retryAfter?: number } => {
  const key = clientKey(req);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true };
};

export const rateLimit = (options?: { limit?: number }) => {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  // Dalam lingkungan tes, nonaktifkan pematok agar aliran integrasi cepat
  // tidak terhalang dan hasil tes deterministic.
  if (process.env.NODE_ENV === 'test') {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  return (req: Request, res: Response, next: NextFunction) => {
    const result = checkLimit(req, limit);
    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfter));
      return res.status(429).json({
        error: 'Terlalu banyak permintaan. Coba lagi nanti.',
      });
    }
    next();
  };
};
