#!/usr/bin/env tsx
/**
 * Test Redis Connection
 * Quick script to verify Redis is accessible with current configuration
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { getRedisClient, healthCheck } from '../src/lib/redis';
import { logger } from '../src/lib/logger';

async function testRedisConnection() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Redis Connection Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 Configuration:');
  console.log(`   Host: ${process.env.REDIS_HOST || 'NOT SET'}`);
  console.log(`   Port: ${process.env.REDIS_PORT || 'NOT SET'}`);
  console.log(`   TLS: ${process.env.REDIS_TLS || 'NOT SET'}`);
  console.log(`   Username: ${process.env.REDIS_USERNAME || 'NOT SET'}`);
  console.log(`   Password: ${process.env.REDIS_PASSWORD ? '***' + process.env.REDIS_PASSWORD.slice(-4) : 'NOT SET'}\n`);

  try {
    console.log('🔌 Attempting to connect to Redis...\n');

    const redis = getRedisClient();

    // Wait for connection to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout after 15 seconds'));
      }, 15000);

      redis.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      redis.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    console.log('✅ Redis connection established\n');

    // Test basic operations
    console.log('📝 Testing PING command...');
    const pong = await redis.ping();
    console.log(`   ✅ PING response: ${pong}\n`);

    console.log('📝 Testing SET command...');
    await redis.set('test:key', 'Hello from NSSPORTS!', 'EX', 60);
    console.log('   ✅ SET successful\n');

    console.log('📝 Testing GET command...');
    const value = await redis.get('test:key');
    console.log(`   ✅ GET response: ${value}\n`);

    console.log('📝 Testing DEL command...');
    await redis.del('test:key');
    console.log('   ✅ DEL successful\n');

    console.log('🏥 Running health check...');
    const isHealthy = await healthCheck();
    console.log(`   ${isHealthy ? '✅' : '❌'} Health check: ${isHealthy ? 'PASSED' : 'FAILED'}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Redis Connection Test PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Redis Connection Test FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error('Error:', error instanceof Error ? error.message : error);
    
    if (error instanceof Error && error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check REDIS_HOST is correct');
      console.error('   - Verify your internet connection');
      console.error('   - Ensure Redis Cloud instance is active');
    } else if (error instanceof Error && error.message.includes('timeout')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check if REDIS_TLS should be "true"');
      console.error('   - Verify firewall/network settings');
      console.error('   - Ensure Redis Cloud allows your IP');
    } else if (error instanceof Error && error.message.includes('WRONGPASS')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Verify REDIS_PASSWORD is correct');
      console.error('   - Check REDIS_USERNAME (usually "default")');
    }

    console.error('');
    process.exit(1);
  }
}

testRedisConnection();
