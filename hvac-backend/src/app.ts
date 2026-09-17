import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import hvacRoutes from './routes/hvac.routes';
import { createRateLimiter } from './middleware/rate_limiter';

dotenv.config();

const app = express();

// Production CORS — ALLOWED_ORIGINS must be set in Railway environment variables.
// Format: comma-separated list of allowed frontend origins.
// Example: https://hvac-bis.vercel.app,https://yourdomain.com
// In development (NODE_ENV !== 'production'), all origins are allowed for convenience.
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins: string[] = rawAllowedOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Always allow localhost origins for local development
const devOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:21893',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:21893',
];

const isProduction = process.env.NODE_ENV === 'production';

app.use(
  cors({
    origin: (origin, callback) => {
      // Server-to-server (SNS webhook calls) or curl — no origin header
      if (!origin) {
        callback(null, true);
        return;
      }
      // Development: allow all
      if (!isProduction) {
        callback(null, true);
        return;
      }
      // Production: check against explicit allowlist
      const permitted = [...allowedOrigins, ...devOrigins];
      if (permitted.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error(`CORS policy: origin "${origin}" is not permitted.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Trust Railway / Vercel reverse proxy for accurate client IP in rate limiter
app.set('trust proxy', 1);

// Global Rate Limiter: 100 requests per 15 minutes
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Rate limit exceeded: Too many API requests from this IP address.',
});

app.use(apiRateLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', hvacRoutes);
app.use('/', hvacRoutes);

app.use((_req, res) => {
  res.status(404).json({
    status: 'FAILED',
    message: 'Endpoint not found.',
  });
});

export default app;
