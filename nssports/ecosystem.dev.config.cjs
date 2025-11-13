/**
 * PM2 Configuration for Development
 * 
 * Tests production setup in development environment
 * Useful for validating PM2 configuration before production
 * 
 * Usage:
 *   pm2 start ecosystem.dev.config.js
 *   pm2 logs
 *   pm2 stop all
 */

module.exports = {
  apps: [
    {
      name: 'nssports-dev',
      script: 'npm',
      args: 'run dev',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,  // Don't watch in PM2, Next.js handles hot reload
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: './logs/dev-error.log',
      out_file: './logs/dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'nssports-settlement-dev',
      script: 'npm',
      args: 'run settlement:scheduler',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development'
      },
      error_file: './logs/settlement-dev-error.log',
      out_file: './logs/settlement-dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
