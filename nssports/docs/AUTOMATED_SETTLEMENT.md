# Automated Bet Settlement System

## Overview

NSSPORTS now uses **PM2** for automated bet settlement. The system runs continuously in the background, checking for finished games and settling bets every **5 minutes**.

## How It Works

### Architecture

```
PM2 Process Manager
    ↓
settlement-scheduler.ts (runs every 5 minutes)
    ↓
1. syncFinishedGames() - Updates game status from SDK
    ↓
2. settleAllFinishedGames() - Settles all pending bets
    ↓
Updates database + user balances
```

### Settlement Flow

1. **Game Status Sync**
   - Checks all pending games in database
   - Queries SportsGameOdds SDK for final scores
   - Updates game status to "finished" when complete

2. **Bet Settlement**
   - Finds all pending bets on finished games
   - Grades each bet (spread, moneyline, total, props, parlays)
   - Fetches player stats for player props
   - Fetches period scores for quarter/half props
   - Updates bet status (won/lost/push)
   - Credits winning payouts to user accounts

3. **Push Logic** (Fixed!)
   - Decimal lines (48.5, 9.5, 110.5) → **Cannot push** (win or loss only)
   - Whole number lines (48, 10, 110) → **Can push** if exact match

## Installation

### Prerequisites

```bash
# Install PM2 globally (one-time setup)
npm install -g pm2
```

### Verify Installation

```bash
pm2 --version
```

## Usage

### Development (Automatic)

The settlement scheduler starts automatically with the development environment:

```bash
python ../scripts/start.py
```

This will:
- Start Next.js dev server
- Start ngrok tunnel
- **Start PM2 settlement scheduler** (runs in background)

### Manual Control

#### Start Settlement Scheduler

```bash
# Using npm script
npm run pm2:settlement:start

# Or directly with PM2
pm2 start ecosystem.config.js --only nssports-settlement
```

#### View Status

```bash
# Check if scheduler is running
npm run pm2:status
# or
pm2 list
```

Expected output:
```
┌────┬──────────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name                     │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼──────────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ nssports-settlement      │ fork     │ 0    │ online    │ 0%       │ 45.2mb   │
└────┴──────────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

#### View Logs

```bash
# Watch settlement logs in real-time
npm run pm2:settlement:logs

# Or directly
pm2 logs nssports-settlement
```

#### Stop Scheduler

```bash
# Stop the scheduler
npm run pm2:settlement:stop

# Or directly
pm2 stop nssports-settlement
```

#### Restart Scheduler

```bash
# Restart (e.g., after code changes)
npm run pm2:settlement:restart

# Or directly
pm2 restart nssports-settlement
```

#### Delete Process

```bash
# Completely remove from PM2
npm run pm2:settlement:delete

# Or directly
pm2 delete nssports-settlement
```

### Python Helper Script

For convenience, use the Python helper script:

```bash
cd ../scripts

# Start scheduler
python pm2-settlement.py start

# Stop scheduler
python pm2-settlement.py stop

# Restart scheduler
python pm2-settlement.py restart

# View logs
python pm2-settlement.py logs

# Check status
python pm2-settlement.py status
```

## Production Deployment

### Option 1: Startup on Boot (Recommended)

Make PM2 start automatically when server boots:

```bash
# Generate startup script
pm2 startup

# Follow the instructions (run the command it shows)

# Start your settlement scheduler
npm run pm2:settlement:start

# Save the process list
pm2 save
```

Now PM2 will automatically start the settlement scheduler on system reboot.

### Option 2: Docker

Add to your `docker-compose.yml`:

```yaml
services:
  settlement-scheduler:
    build: .
    command: npm run settlement:scheduler
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    restart: always
    depends_on:
      - db
```

### Option 3: Cloud Services

#### Railway/Render/Heroku
Add a worker dyno/process:
```
npm run settlement:scheduler
```

#### AWS/GCP/Azure
Use their scheduled job services or run as separate container.

## Monitoring

### View Settlement Activity

```bash
# Real-time logs
pm2 logs nssports-settlement

# Logs location
./logs/settlement-out.log
./logs/settlement-error.log
```

### Expected Log Output

```
[SettlementScheduler] ========================================
[SettlementScheduler] Starting settlement cycle
[SettlementScheduler] ========================================
[SettlementScheduler] Step 1: Syncing game status from SDK...
[SettlementScheduler] Sync complete {
  gamesChecked: 45,
  gamesUpdated: 3,
  betsSettled: 12,
  errors: 0
}
[SettlementScheduler] Step 2: Running settlement for all finished games...
[SettlementScheduler] Settlement complete {
  gamesProcessed: 3,
  betsSettled: 12
}
[SettlementScheduler] ========================================
[SettlementScheduler] Cycle complete {
  duration: '2847ms',
  totalGamesUpdated: 3,
  totalBetsSettled: 12,
  wonBets: 5,
  lostBets: 6,
  pushBets: 1
}
[SettlementScheduler] ========================================
```

### Check System Resources

```bash
# Monitor CPU/Memory usage
pm2 monit
```

## Troubleshooting

### Scheduler Not Running

```bash
# Check status
pm2 list

# If not listed, start it
npm run pm2:settlement:start
```

### Scheduler Errors

```bash
# View error logs
pm2 logs nssports-settlement --err

# Check log files
cat logs/settlement-error.log
```

### Restart After Code Changes

```bash
# Restart to pick up new code
npm run pm2:settlement:restart
```

### Memory Issues

PM2 automatically restarts the process if it exceeds 512MB (configured in `ecosystem.config.js`).

To change the limit:
```javascript
// ecosystem.config.js
max_memory_restart: '1G'  // Increase to 1GB
```

### Manual Settlement

If you need to manually trigger settlement immediately:

```bash
# Run settlement once
npm run settlement:once

# Or test in dry-run mode
npm run settle-bets:dry-run
```

## Configuration

### Settlement Interval

Default: 5 minutes

To change, edit `src/scripts/settlement-scheduler.ts`:

```typescript
const SETTLEMENT_INTERVAL_MS = 5 * 60 * 1000; // Change to desired interval
```

### Memory Limits

Edit `ecosystem.config.js`:

```javascript
{
  name: 'nssports-settlement',
  max_memory_restart: '512M',  // Adjust as needed
}
```

### Log Rotation

PM2 automatically manages logs. Configure in `ecosystem.config.js`:

```javascript
{
  error_file: './logs/settlement-error.log',
  out_file: './logs/settlement-out.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  merge_logs: true
}
```

## Benefits Over Manual Settlement

✅ **Fully Automated** - No manual intervention needed  
✅ **Continuous Operation** - Runs 24/7 in background  
✅ **Process Management** - PM2 auto-restarts on crashes  
✅ **Resource Monitoring** - Built-in memory/CPU tracking  
✅ **Log Management** - Automatic log rotation and storage  
✅ **Production Ready** - Used by thousands of Node.js apps  
✅ **Startup on Boot** - Survives server restarts  
✅ **Zero Downtime** - Operates independently of web server  

## API Endpoint (Alternative)

The cron API endpoint still exists for external schedulers:

```bash
# Call settlement via HTTP (requires auth)
curl -X POST http://localhost:3000/api/cron/settle-bets \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Configure `CRON_SECRET` in `.env`:
```
CRON_SECRET=your-secure-secret-here
```

However, **PM2 scheduler is the recommended approach** as it's more reliable and doesn't depend on the web server.

## Summary

The PM2-based settlement system provides:
- Automated, continuous bet settlement
- Production-grade process management
- Real-time monitoring and logging
- Automatic restarts on failure
- Easy deployment to any environment

For most deployments, simply run:
```bash
npm run pm2:settlement:start
pm2 save
```

And the system will handle everything automatically! 🚀
