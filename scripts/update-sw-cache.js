// scripts/update-sw-cache.js
// Automatically updates CACHE_NAME in sw.js with a unique version for each build

const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../nssports/public/sw.js');
const cacheVersion = `nssports-v${Date.now()}`;

let swContent = fs.readFileSync(swPath, 'utf8');
swContent = swContent.replace(/const CACHE_NAME = '.*?';/, `const CACHE_NAME = '${cacheVersion}';`);
fs.writeFileSync(swPath, swContent);
console.log(`Updated CACHE_NAME to ${cacheVersion}`);
