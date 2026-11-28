import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type Role = 'ADMIN' | 'AMIL' | 'AUDITOR' | 'USER';
export const ALLOWED_ROLES: readonly Role[] = ['ADMIN', 'AMIL', 'AUDITOR', 'USER'];
export const SESSION_COOKIE_NAME = 'zakat_session';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: Role };
}

export const getJwtSecret = (): string | undefined => process.env.JWT_SECRET;

export const readSessionCookie = (req: Request): string | null => {
  const raw = req.headers.cookie;
  if (!raw || typeof raw !== 'string') return null;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (name === SESSION_COOKIE_NAME) {
      const value = part.slice(idx + 1).trim();
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
};

export const setSessionCookie = (res: Response, token: string) => {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
};

const extractToken = (req: Request): string | null => {
  const cookieToken = readSessionCookie(req);
  if (cookieToken) return cookieToken;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring('Bearer '.length).trim() || null;
  }
  return null;
};

type VerifyTokenResult =
  | { ok: true; user: { id: number; username: string; role: Role } }
  | { ok: false; status: 401 | 503; error: string };

const verifyActiveUserToken = async (req: Request): Promise<VerifyTokenResult> => {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    return { ok: false, status: 503, error: 'Authentication is not configured' };
  }
  const token = extractToken(req);
  if (!token) {
    return { ok: false, status: 401, error: 'Authentication token required' };
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as any;
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      typeof decoded.id !== 'number' ||
      typeof decoded.tv !== 'number' ||
      typeof decoded.role !== 'string' ||
      !ALLOWED_ROLES.includes(decoded.role as Role)
    ) {
      return { ok: false, status: 401, error: 'Invalid or expired token' };
    }

    const db = (req as any).db;
    if (!db) {
      return { ok: false, status: 503, error: 'Database is unavailable' };
    }
    const userRow = await db.get(
      'SELECT id, username, role, COALESCE(token_version, 1) AS token_version FROM users WHERE id = ?',
      [decoded.id]
    );
    if (
      !userRow ||
      typeof userRow.role !== 'string' ||
      !ALLOWED_ROLES.includes(userRow.role as Role) ||
      Number(userRow.token_version) !== decoded.tv
    ) {
      return { ok: false, status: 401, error: 'Session expired or revoked' };
    }

    return { ok: true, user: { id: userRow.id, username: userRow.username, role: userRow.role as Role } };
  } catch {
    return { ok: false, status: 401, error: 'Invalid or expired token' };
  }
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const outcome = await verifyActiveUserToken(req);
  if (!outcome.ok) {
    return res.status(outcome.status).json({ error: outcome.error });
  }
  req.user = outcome.user;
  next();
};

/** Populates `req.user` when a valid session exists without rejecting anonymous callers. */
export const optionalAuthenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const outcome = await verifyActiveUserToken(req);
  if (outcome.ok) {
    req.user = outcome.user;
  }
  next();
};

export const authorize = (roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

/**
 * Allows access when the requester is the resource owner or holds one of the
 * privileged roles. Prevents one authenticated donor from reading another
 * donor's history by changing the id in the URL.
 */
export const authorizeSelfOr = (roles: Role[], paramName: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication token required' });
    if (roles.includes(req.user.role)) return next();
    const paramValue = Number(req.params[paramName]);
    if (Number.isSafeInteger(paramValue) && paramValue === req.user.id) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};
