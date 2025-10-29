/**
 * Post-build Script - Generate Version Assets
 * 
 * Runs after build to:
 * - Generate public version.json
 * - Update manifest with version
 * - Create build metadata
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION_FILE = path.join(__dirname, '../.build-version.json');
const PUBLIC_DIR = path.join(__dirname, '../public');
const MANIFEST_PATH = path.join(PUBLIC_DIR, 'manifest.webmanifest');

console.log('\n📦 Post-Build: Generating version assets...\n');

// Load version
let version = { major: 1, minor: 0, patch: 0, build: 0, timestamp: Date.now() };
if (fs.existsSync(VERSION_FILE)) {
  try {
    version = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
  } catch {
    console.warn('⚠️  Failed to load version file');
  }
}

// Generate build hash
const buildHash = crypto.randomBytes(8).toString('hex');

// Create version.json for runtime
const versionInfo = {
  version: `${version.major}.${version.minor}.${version.patch}`,
  build: version.build,
  fullVersion: `${version.major}.${version.minor}.${version.patch}.${version.build}`,
  hash: buildHash,
  timestamp: version.timestamp,
  buildDate: new Date(version.timestamp).toISOString(),
};

const versionPath = path.join(PUBLIC_DIR, 'version.json');
fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
console.log(`✅ Generated: ${versionPath}`);

// Update manifest with version
if (fs.existsSync(MANIFEST_PATH)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    manifest.version = versionInfo.version;
    manifest.build = versionInfo.build;
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log('✅ Updated: manifest.webmanifest');
  } catch {
    console.warn('⚠️  Failed to update manifest');
  }
}

console.log(`\n🎉 Build Complete!`);
console.log(`   Version: ${versionInfo.fullVersion}`);
console.log(`   Hash: ${versionInfo.hash}`);
console.log(`   Date: ${versionInfo.buildDate}\n`);
