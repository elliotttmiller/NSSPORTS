#!/usr/bin/env node

/**
 * Prebuild Script - Full Clean Cache Clear
 * 
 * Clears all Next.js, TypeScript, and build caches before building
 * Ensures a completely fresh, clean rebuild every time
 * 
 * Usage: npm run prebuild (automatically runs before npm run build)
 */

import { rm, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// ANSI color codes for pretty console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}\n`),
};

/**
 * Check if a path exists
 */
async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a directory or file recursively
 */
async function removeIfExists(path, name) {
  const fullPath = join(projectRoot, path);
  
  if (await pathExists(fullPath)) {
    try {
      await rm(fullPath, { recursive: true, force: true });
      log.success(`Cleared: ${name}`);
      return true;
    } catch (error) {
      log.error(`Failed to clear ${name}: ${error.message}`);
      return false;
    }
  } else {
    log.info(`Skipped: ${name} (doesn't exist)`);
    return false;
  }
}

/**
 * Main prebuild cache clearing function
 */
async function prebuild() {
  log.header('🧹 PREBUILD: Clearing All Caches');
  
  const startTime = Date.now();
  let clearedCount = 0;
  
  // List of cache directories to clear
  const cachesToClear = [
    // Next.js build output and cache
    { path: '.next', name: 'Next.js build output (.next)' },
    
    // TypeScript build info
    { path: 'tsconfig.tsbuildinfo', name: 'TypeScript build info' },
    
    // Node modules cache
    { path: 'node_modules/.cache', name: 'Node modules cache' },
    
    // Turbopack cache (if using --turbopack)
    { path: '.turbo', name: 'Turbopack cache' },
    
    // ESLint cache
    { path: '.eslintcache', name: 'ESLint cache' },
    
    // Jest cache
    { path: '.jest-cache', name: 'Jest cache' },
    
    // Next.js SWC cache
    { path: 'node_modules/.cache/.swc', name: 'SWC compiler cache' },
    
    // Prisma cache
    { path: 'node_modules/.cache/prisma', name: 'Prisma cache' },
    
    // Vercel cache (if exists)
    { path: '.vercel', name: 'Vercel cache' },
  ];
  
  log.info(`Scanning ${cachesToClear.length} cache locations...\n`);
  
  // Clear all caches
  for (const cache of cachesToClear) {
    const cleared = await removeIfExists(cache.path, cache.name);
    if (cleared) clearedCount++;
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  log.header('✨ PREBUILD COMPLETE');
  log.info(`Cleared ${clearedCount} cache location(s) in ${duration}s`);
  log.info('Ready for fresh build!\n');
}

// Run the prebuild script
prebuild().catch((error) => {
  log.error(`Prebuild failed: ${error.message}`);
  process.exit(1);
});
