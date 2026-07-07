import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://hegemonia:hegemonia_dev@localhost:5432/hegemonia'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  DEV_AUTH_BYPASS: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);

export function getCorsOrigins(): string[] | string {
  const raw = env.CORS_ORIGIN.trim();
  if (raw.includes(',')) {
    return raw.split(',').map((o) => o.trim()).filter(Boolean);
  }
  return raw;
}

export function isFirebaseConfigured(): boolean {
  return !!(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
}
