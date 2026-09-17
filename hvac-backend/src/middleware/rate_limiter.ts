import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const store: RateLimitStore = {};
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 100;
  const message = options.message || 'Too many requests, please try again later.';

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    if (!store[ip] || store[ip].resetTime < now) {
      store[ip] = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      store[ip].count += 1;
    }

    const current = store[ip];
    const remaining = Math.max(0, max - current.count);
    const resetSeconds = Math.ceil((current.resetTime - now) / 1000);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (current.count > max) {
      res.status(429).json({
        status: 'FAILED',
        message,
        retry_after_seconds: resetSeconds,
      });
      return;
    }

    next();
  };
}
