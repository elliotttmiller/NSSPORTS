/**
 * PM2 Configuration for Production Process Management
 * 
 * PM2 is a production-grade process manager for Node.js applications.
 * It handles: auto-restart, monitoring, log management, and clustering.
 * 
 * Installation:
 *   npm install -g pm2
 * 
 * Usage:
 *   pm2 start ecosystem.config.js              # Start all processes
 *   pm2 start ecosystem.config.js --only web   # Start only Next.js
 *   pm2 start ecosystem.config.js --only scheduler # Start only settlement
 *   pm2 logs                                   # View logs
 *   pm2 monit                                  # Monitor processes
 *   pm2 restart all                            # Restart all
 *   pm2 stop all                               # Stop all
 *   pm2 delete all                             # Remove all
 * 
 * Startup on boot:
 *   pm2 startup                                # Follow instructions
 *   pm2 save                                   # Save current process list
 */

module.exports = {
  apps: [
    {
      name: 'nssports-web',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'nssports-settlement',
      script: 'src/scripts/settlement-scheduler.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx/esm --no-warnings',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info'
      },
      error_file: './logs/settlement-error.log',
      out_file: './logs/settlement-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
