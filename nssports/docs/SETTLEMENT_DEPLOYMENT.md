# Bet Settlement Deployment Guide

## Universal Platform-Agnostic Solution

The settlement system now runs as a standalone Node.js process that works with **any hosting environment**.

---

## Quick Start (Any Platform)

### Local Development
```bash
# Run settlement scheduler in development
npm run settlement:scheduler

# Or run once and exit (for testing)
npm run settlement:once
```

### Production - Option 1: PM2 (Recommended)

**PM2** is a production-grade process manager that handles auto-restart, monitoring, and logging.

```bash
# Install PM2 globally
npm install -g pm2

# Start both web server and settlement scheduler
pm2 start ecosystem.config.js

# Or start only the settlement scheduler
pm2 start ecosystem.config.js --only nssports-settlement

# View logs
pm2 logs nssports-settlement

# Monitor
pm2 monit

# Setup auto-start on server boot
pm2 startup
pm2 save

# Other useful commands
pm2 restart nssports-settlement
pm2 stop nssports-settlement
pm2 delete nssports-settlement
```

### Production - Option 2: systemd (Linux)

Create a systemd service for automatic startup and management:

```bash
# Create service file
sudo nano /etc/systemd/system/nssports-settlement.service
```

```ini
[Unit]
Description=NSSPORTS Bet Settlement Scheduler
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/nssports
ExecStart=/usr/bin/npm run settlement:scheduler
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="NODE_ENV=production"
Environment="DATABASE_URL=your_database_url"
Environment="SPORTSGAMEODDS_API_KEY=your_api_key"

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable nssports-settlement
sudo systemctl start nssports-settlement

# Check status
sudo systemctl status nssports-settlement

# View logs
sudo journalctl -u nssports-settlement -f
```

### Production - Option 3: Docker

Use the provided docker-compose configuration:

```bash
# Start settlement as separate container
docker-compose -f docker-compose.settlement.yml up -d

# View logs
docker logs -f nssports-settlement

# Restart
docker restart nssports-settlement
```

### Production - Option 4: Simple Screen/Tmux

For quick deployment on VPS:

```bash
# Using screen
screen -S settlement
npm run settlement:scheduler
# Press Ctrl+A then D to detach

# Reattach later
screen -r settlement

# Or using tmux
tmux new -s settlement
npm run settlement:scheduler
# Press Ctrl+B then D to detach

# Reattach later
tmux attach -t settlement
```

### Production - Option 5: Windows Service

Use **node-windows** to run as Windows service:

```bash
npm install -g node-windows

# Create service script (service-install.js)
```

```javascript
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'NSSPORTS Settlement',
  description: 'Automated bet settlement scheduler',
  script: 'C:\\path\\to\\nssports\\node_modules\\.bin\\tsx',
  scriptOptions: 'src/scripts/settlement-scheduler.ts',
  nodeOptions: ['--max_old_space_size=4096']
});

svc.on('install', () => {
  svc.start();
});

svc.install();
```

```bash
node service-install.js
```

---

## Monitoring & Logs

### View Logs (PM2)
```bash
pm2 logs nssports-settlement
pm2 logs nssports-settlement --lines 100
pm2 logs nssports-settlement --err  # errors only
```

### View Logs (systemd)
```bash
journalctl -u nssports-settlement -f
journalctl -u nssports-settlement --since "1 hour ago"
```

### View Logs (Docker)
```bash
docker logs nssports-settlement -f
docker logs nssports-settlement --tail 100
```

### Check Settlement Status

The scheduler logs detailed information every cycle:

```
[SettlementScheduler] Starting settlement cycle
[SettlementScheduler] Step 1: Syncing game status from SDK...
[SettlementScheduler] Sync complete { gamesChecked: 45, gamesUpdated: 3, betsSettled: 12 }
[SettlementScheduler] Step 2: Running settlement for all finished games...
[SettlementScheduler] Settlement complete { gamesProcessed: 3, betsSettled: 0 }
[SettlementScheduler] Cycle complete { duration: '2341ms', totalBetsSettled: 12 }
```

---

## Environment Variables

Required environment variables (same as main app):

```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# SDK API Key
SPORTSGAMEODDS_API_KEY=your_api_key

# Optional: Cron endpoint secret (if keeping HTTP endpoint)
CRON_SECRET=your_secret
```

---

## Troubleshooting

### Settlement Not Running

1. **Check process is running:**
   ```bash
   pm2 list                          # PM2
   systemctl status nssports-settlement  # systemd
   docker ps                         # Docker
   ```

2. **Check logs for errors:**
   ```bash
   pm2 logs nssports-settlement --err
   journalctl -u nssports-settlement --since "10 minutes ago"
   docker logs nssports-settlement --tail 50
   ```

3. **Verify database connection:**
   ```bash
   npm run settlement:once
   ```

4. **Check API key:**
   ```bash
   # Test SDK connection
   curl https://api.sportsgameodds.com/v1/events \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

### Bets Not Settling

1. **Check game status in database:**
   ```sql
   SELECT id, status, homeScore, awayScore, startTime 
   FROM games 
   WHERE status = 'finished' 
   ORDER BY startTime DESC 
   LIMIT 10;
   ```

2. **Check pending bets:**
   ```sql
   SELECT b.id, b.status, b.betType, g.id as gameId, g.status as gameStatus
   FROM bets b
   JOIN games g ON b.gameId = g.id
   WHERE b.status = 'pending' AND g.status = 'finished';
   ```

3. **Manual trigger:**
   ```bash
   npm run settlement:once
   ```

4. **Check for errors in bet metadata:**
   ```sql
   SELECT id, betType, legs 
   FROM bets 
   WHERE status = 'pending' 
   AND betType IN ('player_prop', 'game_prop');
   ```

### High Memory Usage

If settlement process uses too much memory:

1. **Adjust max memory (PM2):**
   ```javascript
   // ecosystem.config.js
   max_memory_restart: '512M'  // Lower if needed
   ```

2. **Reduce batch size:**
   Edit `src/scripts/sync-game-status.ts`:
   ```typescript
   limit: 100  // Reduce from 200 if needed
   ```

3. **Add memory limit (systemd):**
   ```ini
   [Service]
   MemoryLimit=512M
   ```

---

## Performance Tuning

### Adjust Settlement Frequency

Edit `src/scripts/settlement-scheduler.ts`:

```typescript
const SETTLEMENT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes (more frequent)
// or
const SETTLEMENT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (less frequent)
```

### Optimize for High Traffic

For busy periods (e.g., during major games):

```bash
# Run settlement every 2 minutes
pm2 delete nssports-settlement
# Edit settlement-scheduler.ts to 2 minutes
pm2 start ecosystem.config.js --only nssports-settlement
```

### Multiple Instances (Advanced)

For very high traffic, run multiple instances:

```bash
pm2 start ecosystem.config.js --only nssports-settlement -i 2
```

**Warning:** Only do this if you add proper locking to prevent duplicate settlements.

---

## Health Checks

### Manual Health Check
```bash
npm run settlement:once
```

### Automated Health Check (Optional)

Add a simple HTTP health endpoint:

```typescript
// src/scripts/settlement-health.ts
import http from 'http';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date() }));
  }
});

server.listen(3001);
```

Then check:
```bash
curl http://localhost:3001/health
```

---

## Backup: HTTP Cron Endpoint (Still Available)

If you prefer external cron services, the HTTP endpoint still works:

```bash
# Call from any cron service (cron-job.org, etc.)
curl -X GET https://yourdomain.com/api/cron/settle-bets \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Recommended Setup for Production

1. **Use PM2** for process management (easiest)
2. **Enable PM2 startup** so it auto-starts on server reboot
3. **Configure PM2 monitoring** for alerts
4. **Set up log rotation** (PM2 includes this)
5. **Monitor with your existing monitoring stack** (Datadog, New Relic, etc.)

```bash
# Complete production setup
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
pm2 install pm2-logrotate
```

Done! 🎉
