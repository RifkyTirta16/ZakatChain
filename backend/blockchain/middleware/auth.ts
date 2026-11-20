import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type Role = 'ADMIN' | 'AMIL' | 'AUDITOR' | 'USER';

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: Role };
}

export const getJwtSecret = (): string | undefined => process.env.JWT_SECRET;

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    return res.status(503).json({ error: 'Authentication is not configured' });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const token = authHeader.substring('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    // A token must carry a usable identity; reject anything malformed rather
    // than trusting arbitrary payload fields downstream.
    if (!decoded || typeof decoded !== 'object' || typeof decoded.id !== 'number' || typeof decoded.role !== 'string') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
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
