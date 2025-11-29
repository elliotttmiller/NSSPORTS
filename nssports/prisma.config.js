// prisma.config.js - Provide runtime JS config so Prisma CLI uses it
// This file intentionally mirrors the TypeScript `prisma.config.ts` so that
// CLI invocations that resolve JS first (like `npx prisma migrate deploy`) will
// load the expected `datasource` configuration and environment variables.

/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config');

module.exports = {
  schema: 'prisma/schema.prisma',
};
