#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
});

redis.on('connect', () => console.log('✅ Connected'));
redis.on('ready', async () => {
  console.log('✅ Ready');
  const pong = await redis.ping();
  console.log(`✅ PING: ${pong}`);
  process.exit(0);
});
redis.on('error', (err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
