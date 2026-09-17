import dotenv from 'dotenv';

dotenv.config();

export const AppConfig = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  backendApiUrl: process.env.BACKEND_API_URL || `http://localhost:${process.env.PORT || 3001}`,
  supabaseUrl: process.env.SUPABASE_URL || 'https://yrqrbrwfencpyttaoihs.supabase.co',
  // Secrets must be populated from environment variables in production
  hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim().length > 0),
};

/**
 * Production Deployment Instructions:
 * 1. Set BACKEND_API_URL to the public HTTPS URL of your deployed backend service
 *    (e.g., BACKEND_API_URL=https://api.hvac-bis.yourcompany.com).
 * 2. In SNS platform, configure the httpRequest node (node-19-bridge-backend) URL to:
 *    "{{ $env.BACKEND_API_URL }}/api/v1/webhook" or the public deployment endpoint.
 * 3. Never commit SUPABASE_SERVICE_ROLE_KEY or API keys directly to public repositories.
 */
