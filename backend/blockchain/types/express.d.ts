
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      db: any;
      rawBody?: Buffer;
      user?: { id: number; username: string; role: 'ADMIN' | 'AMIL' | 'AUDITOR' | 'DONOR' | 'USER' };
    }
  }
}
