#!/usr/bin/env node

/**
 * Prebuild Script - Full Clean Cache Clear + Prisma Generate
 * 
 * Clears all Next.js, TypeScript, and build caches before building
 * Regenerates Prisma client after clearing cache
 * Ensures a completely fresh, clean rebuild every time
 * 
 * Usage: npm run prebuild (automatically runs before npm run build)
 */

import { rm, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
  // Use direct stdout/stderr writes to avoid console.log while preserving color codes
  info: (msg) => process.stdout.write(`${colors.blue}ℹ${colors.reset} ${msg}\n`),
  success: (msg) => process.stdout.write(`${colors.green}✓${colors.reset} ${msg}\n`),
  warning: (msg) => process.stdout.write(`${colors.yellow}⚠${colors.reset} ${msg}\n`),
  error: (msg) => process.stderr.write(`${colors.red}✗${colors.reset} ${msg}\n`),
  header: (msg) => process.stdout.write(`\n${colors.bright}${colors.blue}${msg}${colors.reset}\n`),
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
      // Get size before deletion for reporting
      let sizeMB = 0;
      try {
        const { execSync } = await import('child_process');
        if (process.platform === 'win32') {
          // Windows - use PowerShell to get folder size
          const cmd = `powershell -Command "(Get-ChildItem '${fullPath}' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB"`;
          const output = execSync(cmd, { encoding: 'utf8' });
          sizeMB = parseFloat(output) || 0;
        }
      } catch {
        // Ignore size calculation errors
      }
      
      await rm(fullPath, { recursive: true, force: true });
      
      if (sizeMB > 0) {
        log.success(`Cleared: ${name} (${sizeMB.toFixed(2)} MB)`);
      } else {
        log.success(`Cleared: ${name}`);
      }
      return { cleared: true, size: sizeMB };
    } catch (error) {
      log.error(`Failed to clear ${name}: ${error.message}`);
      return { cleared: false, size: 0 };
    }
  } else {
    log.info(`Skipped: ${name} (doesn't exist)`);
    return { cleared: false, size: 0 };
  }
}

/**
 * Check available disk space (Windows only)
 */
async function checkDiskSpace() {
  if (process.platform !== 'win32') return;
  
  try {
    const { execSync } = await import('child_process');
    const cmd = `powershell -Command "(Get-PSDrive C).Free / 1GB"`;
    const output = execSync(cmd, { encoding: 'utf8' });
    const freeGB = parseFloat(output);
    
    if (!isNaN(freeGB)) {
      if (freeGB < 2) {
        log.warning(`Low disk space: ${freeGB.toFixed(2)} GB free (recommend 5+ GB for builds)`);
      } else {
        log.info(`Disk space available: ${freeGB.toFixed(2)} GB`);
      }
    }
  } catch {
    // Ignore disk space check errors
  }
}

/**
 * Main prebuild cache clearing function
 */
async function prebuild() {
  log.header('🧹 PREBUILD: Clearing All Caches');
  
  // Check disk space first
  await checkDiskSpace();
  
  const startTime = Date.now();
  let clearedCount = 0;
  let totalSpaceFreed = 0;
  
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
    
    // Webpack cache (legacy builds)
    { path: 'node_modules/.cache/webpack', name: 'Webpack cache' },
    
    // Babel cache
    { path: 'node_modules/.cache/babel-loader', name: 'Babel cache' },
    
    // Next.js trace files
    { path: '.next/trace', name: 'Next.js trace files' },
    
    // Build info files
    { path: '.next/build-manifest.json', name: 'Build manifest' },
    { path: '.next/build-id', name: 'Build ID' },
    
    // TypeScript incremental build
    { path: '.tsbuildinfo', name: 'TS build info' },
  ];
  
  log.info(`Scanning ${cachesToClear.length} cache locations...\n`);
  
  // Clear all caches
  for (const cache of cachesToClear) {
    const result = await removeIfExists(cache.path, cache.name);
    if (result.cleared) {
      clearedCount++;
      totalSpaceFreed += result.size;
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  log.header('✨ PREBUILD COMPLETE');
  log.info(`Cleared ${clearedCount} cache location(s) in ${duration}s`);
  if (totalSpaceFreed > 0) {
    log.success(`Freed ${totalSpaceFreed.toFixed(2)} MB of disk space`);
  }
  log.info('Ready for fresh build!\n');
  
  // Regenerate Prisma client after clearing cache
  log.header('🔄 REGENERATING PRISMA CLIENT');
  try {
    log.info('Running: npx prisma generate...');
    const { stdout, stderr } = await execAsync('npx prisma generate', { 
      cwd: projectRoot,
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    
  if (stdout) process.stdout.write(stdout);
  if (stderr && !stderr.includes('warn')) process.stderr.write(stderr);
    
    log.success('Prisma client generated successfully');
    log.info('Build environment ready!\n');
  } catch (error) {
    log.error(`Failed to generate Prisma client: ${error.message}`);
    throw error;
  }
}

// Run the prebuild script
prebuild().catch((error) => {
  log.error(`Prebuild failed: ${error.message}`);
  process.exit(1);
});
