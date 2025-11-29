import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';

(async () => {
  // Load .env.local if REDIS_* not already set
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!process.env.REDIS_HOST && fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const l = line.trim();
      if (!l || l.startsWith('#')) return;
      const m = l.match(/^\s*([^=]+)=(.*)$/);
      if (!m) return;
      const name = m[1].trim();
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length-1);
      }
      // remove inline comments after a # (common in edited env files)
      const hashIndex = value.indexOf(' #');
      if (hashIndex !== -1) {
        value = value.substring(0, hashIndex).trim();
      }
      if (!process.env[name]) process.env[name] = value;
    });
  }
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  const tls = (String(process.env.REDIS_TLS || '').toLowerCase() === 'true') ? {} : undefined;

  console.log('Attempting ioredis ping with:', {host, port, tls: !!tls});

  const r = new Redis({ host, port, password, tls, connectTimeout: 5000, commandTimeout: 5000 });
  const timer = setTimeout(() => {
    console.error('PING TIMEOUT after 15s');
    try { r.disconnect(); } catch (e) {}
    process.exit(2);
  }, 15000);

  try {
    const res = await r.ping();
    console.log('PING ->', res);
    process.exit(0);
  } catch (e) {
    console.error('PING ERROR ->', e && e.message ? e.message : e);
    console.error(e);
    process.exit(1);
  } finally {
    clearTimeout(timer);
    try { r.disconnect(); } catch (e) {}
  }
})();
