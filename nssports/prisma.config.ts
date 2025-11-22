// prisma.config.ts - updated for Prisma 7.0.0

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // Prisma v7 expects a single `datasource` object (singular).
  // Use the `env()` helper so Prisma loads and validates env vars from `.env`.
  datasource: {
    url: env('DATABASE_URL'),
  },
});
