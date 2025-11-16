#!/usr/bin/env tsx
/**
 * Comprehensive Redis Diagnostics
 * Tests various connection scenarios to identify the issue
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import Redis from 'ioredis';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Redis Comprehensive Diagnostics');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const tests = [
  {
    name: 'Test 1: Connection WITH TLS',
    config: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      tls: {},
      connectTimeout: 10000,
      commandTimeout: 5000,
    }
  },
  {
    name: 'Test 2: Connection WITHOUT TLS',
    config: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 10000,
      commandTimeout: 5000,
    }
  },
  {
    name: 'Test 3: Connection with TLS and rejectUnauthorized=false',
    config: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      tls: {
        rejectUnauthorized: false
      },
      connectTimeout: 10000,
      commandTimeout: 5000,
    }
  }
];

async function runTest(test: typeof tests[0]) {
  console.log(`\n${test.name}`);
  console.log('─'.repeat(60));
  
  const redis = new Redis(test.config);
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('❌ TIMEOUT (10 seconds)');
      redis.disconnect();
      resolve(false);
    }, 10000);

    redis.on('connect', () => {
      console.log('🔗 TCP connection established');
    });

    redis.on('ready', async () => {
      clearTimeout(timeout);
      console.log('✅ Redis client ready');
      
      try {
        const pong = await redis.ping();
        console.log(`✅ PING successful: ${pong}`);
        await redis.disconnect();
        resolve(true);
      } catch (error) {
        console.log(`❌ PING failed: ${error instanceof Error ? error.message : error}`);
        await redis.disconnect();
        resolve(false);
      }
    });

    redis.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`❌ Connection error: ${error.message}`);
      redis.disconnect();
      resolve(false);
    });
  });
}

async function main() {
  console.log('📋 Configuration:');
  console.log(`   Host: ${process.env.REDIS_HOST}`);
  console.log(`   Port: ${process.env.REDIS_PORT}`);
  console.log(`   Username: ${process.env.REDIS_USERNAME}`);
  console.log(`   Password: ${process.env.REDIS_PASSWORD ? '***' + process.env.REDIS_PASSWORD.slice(-4) : 'NOT SET'}\n`);

  for (const test of tests) {
    await runTest(test);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Diagnostics Complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(0);
}

main();
