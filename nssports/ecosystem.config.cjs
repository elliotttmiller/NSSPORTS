/**
 * PM2 Ecosystem Configuration
 * ────────────────────────────────────────────────────────────────
 * Production-ready process management for NSSPORTS
 * 
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 status
 *   pm2 logs
 *   pm2 restart all
 *   pm2 stop all
 * 
 * Features:
 * - Auto-restart on failure
 * - Log rotation
 * - Environment variable management
 * - Separate processes for app and settlement
 */

module.exports = {
  apps: [
    {
      name: 'nssports-app',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/app-error.log',
      out_file: './logs/app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'nssports-settlement',
      script: 'npm',
      args: 'run settlement:system',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        SETTLEMENT_WORKER_CONCURRENCY: 1,
        WORKER_ID: 'settlement-worker-1',
      },
      error_file: './logs/settlement-error.log',
      out_file: './logs/settlement-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      restart_delay: 5000, // Wait 5s before restarting
      min_uptime: '10s',   // Consider app stable after 10s
      max_restarts: 10,    // Max 10 restarts in...
      restart_delay: 30000, // ...30 seconds window
    },
  ],
};
