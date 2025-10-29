/**
 * Pre-build Script - Automatic Cache Cleaning & Version Management
 * 
 * Runs automatically before every build to:
 * - Clean all old build caches (.next, node_modules/.cache)
 * - Increment build version
 * - Ensure fresh build with latest code
 * 
 * This is completely automated and requires no user interaction.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION_FILE = path.join(__dirname, '../.build-version.json');
const NEXT_DIR = path.join(__dirname, '../.next');
const CACHE_DIR = path.join(__dirname, '../node_modules/.cache');
const TURBO_CACHE = path.join(__dirname, '../.turbo');

console.log('🚀 Pre-Build: Automated cache cleaning & version bump...\n');

// Clean .next build cache (ensures fresh build)
if (fs.existsSync(NEXT_DIR)) {
  console.log('🧹 Cleaning .next cache...');
  fs.rmSync(NEXT_DIR, { recursive: true, force: true });
  console.log('✅ .next cache cleaned');
}

// Clean node_modules cache
if (fs.existsSync(CACHE_DIR)) {
  console.log('🧹 Cleaning node_modules cache...');
  fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  console.log('✅ node_modules cache cleaned');
}

// Clean turbo cache (if using turbopack)
if (fs.existsSync(TURBO_CACHE)) {
  console.log('🧹 Cleaning turbo cache...');
  fs.rmSync(TURBO_CACHE, { recursive: true, force: true });
  console.log('✅ turbo cache cleaned');
}

// Load and increment build version
let version = { major: 1, minor: 0, patch: 0, build: 0, timestamp: Date.now() };
if (fs.existsSync(VERSION_FILE)) {
  try {
    version = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
  } catch {
    console.warn('⚠️  Failed to parse version file, creating new one');
  }
}

// Auto-increment build number
version.build += 1;
version.timestamp = Date.now();
fs.writeFileSync(VERSION_FILE, JSON.stringify(version, null, 2));

console.log(`✅ Build version: v${version.major}.${version.minor}.${version.patch}.${version.build}`);
console.log(`📅 Build timestamp: ${new Date(version.timestamp).toISOString()}`);
console.log('\n✨ Ready for fresh build!\n');

