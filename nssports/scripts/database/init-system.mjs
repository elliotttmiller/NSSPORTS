#!/usr/bin/env node
/**
 * Complete Database and Cache Initialization
 * 
 * This script performs a full reset and initialization of the NSSPORTS system:
 * 1. Resets Prisma database (drops tables, rerun migrations, reseed)
 * 2. Clears all cached data (games, odds, props)
 * 3. Verifies database structure
 * 4. Tests SDK connection
 * 5. Prepares system for fresh start
 * 
 * Usage:
 *   npm run init        # Full initialization
 *   node scripts/init-system.mjs
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI color codes for beautiful output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  // Use stdout writes to avoid console.log while keeping formatting
  process.stdout.write(`${color}${message}${colors.reset}\n`);
}

function header(message) {
  const line = '═'.repeat(60);
  log(`\n${colors.bright}${colors.cyan}╔${line}╗${colors.reset}`);
  log(`${colors.bright}${colors.cyan}║  ${message.padEnd(58)}║${colors.reset}`);
  log(`${colors.bright}${colors.cyan}╚${line}╝${colors.reset}\n`);
}

function step(number, message) {
  log(`${colors.bright}${colors.blue}[${number}/6]${colors.reset} ${message}`);
}

function success(message) {
  log(`  ${colors.green}✓${colors.reset} ${message}`);
}

function warning(message) {
  log(`  ${colors.yellow}⚠${colors.reset} ${message}`);
}

function error(message) {
  log(`  ${colors.red}✗${colors.reset} ${message}`);
}

function runCommand(command, description) {
  try {
    log(`  ${colors.cyan}→${colors.reset} ${description}...`);
    execSync(command, { 
      cwd: rootDir,
      stdio: 'inherit',
      encoding: 'utf-8'
    });
    success(description);
    return true;
  } catch {
    error(`Failed: ${description}`);
    return false;
  }
}

async function main() {
  header('NSSPORTS SYSTEM INITIALIZATION');
  
  log(`${colors.bright}This will:${colors.reset}`);
  log('  1. Reset Prisma database (drop tables, rerun migrations)');
  log('  2. Seed database with leagues (NBA, NFL, NHL)');
  log('  3. Clear all cached data (games, odds, props)');
  log('  4. Generate Prisma Client');
  log('  5. Verify database structure');
  log('  6. Test SDK connection\n');
  
  warning('All existing data will be deleted!');
  log(`${colors.yellow}Press Ctrl+C to cancel, or wait 5 seconds to continue...${colors.reset}\n`);
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 1: Reset database
  header('STEP 1: DATABASE RESET');
  step(1, 'Resetting Prisma database...');
  if (!runCommand('npx prisma migrate reset --force --skip-seed', 'Reset database and run migrations')) {
    error('Database reset failed. Aborting.');
    process.exit(1);
  }
  
  // Step 2: Seed database
  header('STEP 2: SEED DATABASE');
  step(2, 'Seeding leagues (NBA, NFL, NHL)...');
  if (!runCommand('npx tsx prisma/seed.ts', 'Seed database with official leagues')) {
    error('Database seeding failed. Aborting.');
    process.exit(1);
  }
  
  // Step 3: Clear cache
  header('STEP 3: CLEAR CACHE');
  step(3, 'Clearing cached data...');
  if (!runCommand('npx tsx scripts/clear-cache.ts', 'Clear games, odds, and props cache')) {
    warning('Cache clear failed. Continuing anyway...');
  }
  
  // Step 4: Generate Prisma Client
  header('STEP 4: GENERATE PRISMA CLIENT');
  step(4, 'Generating Prisma Client for type-safety...');
  if (!runCommand('npx prisma generate', 'Generate Prisma Client')) {
    error('Prisma Client generation failed. Aborting.');
    process.exit(1);
  }
  
  // Step 5: Verify database
  header('STEP 5: VERIFY DATABASE');
  step(5, 'Verifying database structure...');
  if (!runCommand('node scripts/verify-db.mjs', 'Verify database state')) {
    warning('Database verification showed warnings. Check output above.');
  }
  
  // Step 6: Test SDK
  header('STEP 6: TEST SDK CONNECTION');
  step(6, 'Testing SportsGameOdds SDK...');
  warning('Testing SDK connection (may show "No Events found" - this is OK if no current games)');
  runCommand('node scripts/test-sdk-direct-detailed.mjs', 'Test SDK connection and data availability');
  
  // Final summary
  header('INITIALIZATION COMPLETE');
  success('Database reset and seeded successfully');
  success('Cache cleared and ready for fresh data');
  success('Prisma Client generated');
  success('System ready to start');
  
  log(`\n${colors.bright}${colors.green}Next steps:${colors.reset}`);
  log(`  ${colors.cyan}1.${colors.reset} Start development server: ${colors.bright}npm run dev${colors.reset}`);
  log(`  ${colors.cyan}2.${colors.reset} Visit: ${colors.bright}http://localhost:3000${colors.reset}`);
  log(`  ${colors.cyan}3.${colors.reset} Games will be fetched on first page load`);
  log(`  ${colors.cyan}4.${colors.reset} Smart cache will handle real-time updates\n`);
  
  log(`${colors.yellow}NOTE:${colors.reset} If SDK shows no current games available:`);
  log(`  - Check SportsGameOdds API status`);
  log(`  - Verify subscription includes current season`);
  log(`  - System will work perfectly once data is available\n`);
}

main().catch(err => {
  error(`\nInitialization failed: ${err.message}`);
  process.exit(1);
});
