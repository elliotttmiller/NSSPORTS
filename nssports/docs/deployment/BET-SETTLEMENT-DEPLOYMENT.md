# Bet Settlement System - Deployment Guide

## Overview

The NSSPORTS automated bet settlement system uses **BullMQ with Redis** to automatically settle bets when games finish. This is the primary deployment method.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│          REDIS/BULLMQ AUTOMATED BET SETTLEMENT                   │
└─────────────────────────────────────────────────────────────────┘

1. Scheduler (Every 5 minutes)
   ├─→ Adds jobs to Redis Queue (BullMQ)
   └─→ Job Types: SYNC_GAMES, SETTLE_BETS, SETTLE_SINGLE_BET

2. Redis Queue (BullMQ)
   ├─→ Stores pending jobs
   ├─→ Manages retries with exponential backoff
   ├─→ Distributed locking (prevents duplicate settlements)
   └─→ Job persistence and reliability

3. Worker Process(es)
   ├─→ Fetches jobs from Redis queue
   ├─→ Syncs game status from SDK
   ├─→ Settles pending bets
   └─→ Updates balances & bet status

4. Settlement Logic
   ├─→ Grades each bet (won/lost/push)
   ├─→ Calculates payouts
   └─→ Updates database atomically
```

## Prerequisites

### Required Services

1. **Redis** - Job queue and distributed locking
   - Redis Cloud (recommended): https://redis.com/
   - Local Redis: `redis-server`
   - Docker Redis: `docker run -d redis:alpine`

2. **PostgreSQL** - Database
   - Neon (recommended): https://neon.tech/
   - Local PostgreSQL
   - Docker PostgreSQL

3. **Node.js** - Runtime environment
   - Version: 18.18.0 or higher

## Deployment Options

### Option 1: All-in-One Process (Recommended for Development & Small Scale)

Run the complete settlement system in a single process:

```bash
npm run settlement:system
```

This single command:
- ✅ Initializes the Redis queue
- ✅ Schedules recurring jobs (every 5 min)
- ✅ Starts the BullMQ worker
- ✅ Keeps everything running in one process
- ✅ Graceful shutdown handling

**When to use:**
- Development environment
- Small-scale production (< 1000 active users)
- Single server deployment
- Quick setup and testing

### Option 2: Separate Worker Processes (Recommended for Production)

For production environments with higher scale, run scheduler initialization and workers separately:

#### Step 1: Initialize the Queue (One-time setup or after Redis flush)

```bash
npm run settlement:init
```

This sets up the recurring schedule in Redis. Run once initially or after clearing Redis.

#### Step 2: Start Worker Process(es)

```bash
# Start a single worker
npm run settlement:worker

# Or start multiple workers for horizontal scaling
npm run settlement:worker &  # Worker 1
npm run settlement:worker &  # Worker 2
npm run settlement:worker &  # Worker 3
```

**Benefits:**
- Horizontal scaling (multiple workers process jobs simultaneously)
- BullMQ handles distributed locking automatically
- No duplicate settlements even with multiple workers
- Better fault tolerance

**When to use:**
- Production environments
- High-volume betting (> 1000 active users)
- Multiple servers/containers
- Need for horizontal scaling

### Option 3: Docker Container (Recommended for Cloud Deployment)

Use the provided Docker Compose configuration:

```bash
# Start settlement as a container
docker-compose -f docker-compose.settlement.yml up -d

# View logs
docker-compose -f docker-compose.settlement.yml logs -f settlement-scheduler

# Check status
docker-compose -f docker-compose.settlement.yml ps

# Stop
docker-compose -f docker-compose.settlement.yml down

# Restart
docker-compose -f docker-compose.settlement.yml restart settlement-scheduler
```

The Docker setup uses the all-in-one process internally for simplicity.

### Option 4: Systemd Service (Linux Servers)

For VPS or dedicated servers running Linux:

```bash
# Copy service file
sudo cp docs/deployment/nssports-settlement.service /etc/systemd/system/

# Edit service file with your paths and credentials
sudo nano /etc/systemd/system/nssports-settlement.service

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable nssports-settlement
sudo systemctl start nssports-settlement

# Check status
sudo systemctl status nssports-settlement

# View logs
sudo journalctl -u nssports-settlement -f

# Restart
sudo systemctl restart nssports-settlement

# Stop
sudo systemctl stop nssports-settlement
```

### Option 5: Vercel/Serverless with External Cron

If running on Vercel (serverless), you can't run persistent workers. Use external cron instead:

1. **Set up Vercel Cron** (calls API endpoint):

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/settle-bets",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

2. **Or use external cron service:**
   - https://cron-job.org/
   - https://easycron.com/
   - GitHub Actions (see below)

**Note:** This approach bypasses BullMQ and directly calls settlement logic. It works but doesn't provide queue benefits (retries, distributed locking, job monitoring).

### Option 6: GitHub Actions (Alternative Cron)

Create `.github/workflows/settle-bets.yml`:

```yaml
name: Settle Bets

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  settle:
    runs-on: ubuntu-latest
    steps:
      - name: Call Settlement API
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/settle-bets
```

## Environment Variables

Required environment variables for Redis/BullMQ settlement:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/database
DIRECT_URL=postgresql://user:pass@host/database

# Redis (REQUIRED for BullMQ)
REDIS_HOST=your-redis-host.com
REDIS_PORT=15342
REDIS_USERNAME=default
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true  # true for Redis Cloud, false for local

# API Keys
SPORTSGAMEODDS_API_KEY=your-sdk-api-key

# Settlement Configuration
SETTLEMENT_WORKER_CONCURRENCY=1  # Number of concurrent jobs per worker
NODE_ENV=production
CRON_SECRET=your-cron-secret     # For API endpoint security (if using cron approach)

# Optional: Logging
LOG_LEVEL=info  # debug, info, warn, error
```

## Monitoring & Health Checks

### Check Queue Status

Use the init script to view queue statistics:

```bash
npm run settlement:init
```

Output shows:
```
📊 Queue Statistics:
  • Waiting: 2
  • Active: 1
  • Completed: 145
  • Failed: 0
  • Delayed: 0
```

### Check Redis Connection

```bash
# Test Redis connectivity
redis-cli -h your-redis-host -p 15342 -a your-password ping
# Should return: PONG
```

### Check Worker Status

#### For all-in-one process:
```bash
# Check if process is running
ps aux | grep settlement-system

# View logs
tail -f logs/settlement-out.log
```

#### For Docker:
```bash
docker ps | grep settlement
docker logs -f nssports-settlement
```

#### For systemd:
```bash
sudo systemctl status nssports-settlement
sudo journalctl -u nssports-settlement -f
```

### Check Bet Settlement Status

Run diagnostic script:

```bash
node diagnose-settlement.mjs
```

Output shows:
- Total bets by status (pending/won/lost/push)
- Pending bets on finished games (⚠️ these should be settled)
- Finished games with unsettled bets

### Manual Settlement

If automatic settlement isn't working, you can manually settle bets:

```bash
# Settle all pending bets for finished games
npm run settle-bets

# Dry run (preview only, no changes)
npm run settle-bets:dry-run

# Manual settlement with interactive prompt
npm run settlement:manual
```

## Troubleshooting

### Problem: Bets not settling automatically

**Check 1: Is Redis connected?**

```bash
# Test Redis connection
redis-cli -h your-redis-host -p 15342 -a your-password ping
# Should return: PONG
```

**Check 2: Is the worker/settlement system running?**

```bash
# Check process
ps aux | grep settlement

# For Docker
docker ps | grep settlement

# For systemd
sudo systemctl status nssports-settlement
```

**Check 3: Are jobs scheduled in the queue?**

```bash
# Check queue stats
npm run settlement:init

# If queue is empty, jobs weren't scheduled
# Re-run initialization
```

**Check 4: Check worker logs for errors**

```bash
# For all-in-one process
tail -f logs/settlement-out.log

# For Docker
docker logs -f nssports-settlement

# For systemd
sudo journalctl -u nssports-settlement -n 100
```

### Problem: Settlement jobs failing

**View error logs:**

```bash
# Docker
docker logs nssports-settlement --tail 100

# Systemd
sudo journalctl -u nssports-settlement --no-pager | grep ERROR

# All-in-one
grep ERROR logs/settlement-error.log
```

**Common issues:**

1. **Redis connection timeout**
   - Check `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
   - Verify network connectivity
   - Check firewall rules

2. **Database connection issues**
   - Verify `DATABASE_URL` is correct
   - Check database is accessible
   - Verify connection pool limits

3. **Missing environment variables**
   - Ensure all required env vars are set
   - Check `.env` file exists and is loaded

4. **API rate limiting**
   - SportsGameOdds SDK calls may hit rate limits
   - Check your API key and quota

**Fix:**

```bash
# Restart the settlement system
# For all-in-one
pkill -f settlement-system
npm run settlement:system

# For Docker
docker-compose -f docker-compose.settlement.yml restart

# For systemd
sudo systemctl restart nssports-settlement
```

### Problem: Duplicate settlements

**Cause:** Multiple workers processing the same job OR queue not properly initialized

**Diagnosis:**

```bash
# Check for multiple running processes
ps aux | grep settlement | grep -v grep

# Check Redis for multiple connections
redis-cli -h your-host -p your-port -a your-pass CLIENT LIST | grep settlement
```

**Fix:**

```bash
# Stop all settlement processes
pkill -f settlement

# For Docker
docker-compose -f docker-compose.settlement.yml down

# Clear the queue if needed (⚠️ removes all pending jobs)
redis-cli -h your-host -p your-port -a your-pass DEL bull:settlement:*

# Re-initialize queue
npm run settlement:init

# Start a SINGLE worker instance
npm run settlement:system
```

**Note:** BullMQ has built-in distributed locking, so duplicate settlements should NOT happen with properly configured workers. If they do, there's likely a configuration issue.

### Problem: Jobs stuck in queue

**Check queue status:**

```bash
npm run settlement:init
```

If you see many "Waiting" or "Delayed" jobs but no "Active" jobs, the worker may not be processing them.

**Fix:**

```bash
# Restart worker
pkill -f settlement
npm run settlement:system

# Or manually process stuck jobs
npm run settle-bets
```

### Problem: Settlement system not starting

**Check 1: Verify Redis is accessible**

```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

**Check 2: Verify environment variables**

```bash
# Print environment (be careful not to expose secrets in logs)
echo "REDIS_HOST: $REDIS_HOST"
echo "DATABASE_URL: ${DATABASE_URL:0:20}..."  # Print first 20 chars only
```

**Check 3: Check for port conflicts**

```bash
# Make sure no other process is using the same Redis queue name
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD KEYS "bull:settlement:*"
```

**Fix:**

```bash
# Set environment variables explicitly
export REDIS_HOST=your-redis-host
export REDIS_PORT=15342
export REDIS_PASSWORD=your-password
export DATABASE_URL=your-database-url

# Try starting again
npm run settlement:system
```

## Production Checklist

Before going live with automated bet settlement:

**Infrastructure:**
- [ ] Redis instance running and accessible (Redis Cloud recommended)
- [ ] PostgreSQL database connected and migrated
- [ ] Environment variables configured correctly
- [ ] Network connectivity between app and Redis/DB verified

**Settlement System:**
- [ ] Settlement queue initialized (`npm run settlement:init`)
- [ ] Worker process running (`npm run settlement:system` or equivalent)
- [ ] Test settlement working (place test bet, finish game, verify settlement)
- [ ] Logs being captured properly

**Monitoring:**
- [ ] Queue statistics accessible (`npm run settlement:init`)
- [ ] Worker logs accessible and monitored
- [ ] Diagnostic tools tested (`node diagnose-settlement.mjs`)
- [ ] Alerts configured for failed jobs (optional)

**Testing:**
- [ ] Manual settlement tested (`npm run settle-bets`)
- [ ] Automated settlement tested (wait 5-10 minutes after game finishes)
- [ ] Multiple bet types tested (moneyline, spread, total, parlay)
- [ ] Edge cases tested (push, missing scores, etc.)

**Documentation:**
- [ ] Team trained on deployment process
- [ ] Troubleshooting guide accessible
- [ ] Runbooks created for common issues

## Performance Tuning

### Increase Worker Concurrency

Process more jobs simultaneously within a single worker:

```bash
# Set environment variable
export SETTLEMENT_WORKER_CONCURRENCY=3

# Restart settlement system
npm run settlement:system
```

**Recommended values:**
- Small scale (< 100 concurrent bets): 1
- Medium scale (100-1000 concurrent bets): 2-3
- Large scale (> 1000 concurrent bets): 4-5

### Adjust Schedule Frequency

Edit `src/lib/queues/settlement.ts` to change how often jobs run:

```typescript
// Current: every 5 minutes
pattern: '*/5 * * * *'

// More frequent: every 2 minutes
pattern: '*/2 * * * *'

// Less frequent: every 10 minutes
pattern: '*/10 * * * *'
```

After changing, re-initialize:
```bash
npm run settlement:init
```

### Scale Horizontally with Multiple Workers

Run multiple worker processes for higher throughput:

```bash
# Terminal 1
WORKER_ID=worker-1 npm run settlement:worker &

# Terminal 2
WORKER_ID=worker-2 npm run settlement:worker &

# Terminal 3
WORKER_ID=worker-3 npm run settlement:worker &
```

BullMQ automatically handles distributed locking - no duplicate settlements even with multiple workers.

**When to scale horizontally:**
- High bet volume (> 5000 active bets)
- Large number of simultaneous game finishes
- Need for redundancy/fault tolerance
- Multiple servers/containers

### Optimize Redis Configuration

For high-volume production:

```bash
# Redis configuration (redis.conf)
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Monitor Performance

Add these checks to your monitoring:

```bash
# Queue depth (should stay low)
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD \
  LLEN bull:settlement:wait

# Failed jobs (should be 0 or very low)
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD \
  ZCARD bull:settlement:failed

# Processing time (check worker logs)
grep "duration" logs/settlement-out.log
```

## Support

For issues or questions:
- Check logs first
- Review this guide
- Run diagnostic scripts
- Check GitHub Issues: https://github.com/elliotttmiller/NSSPORTS/issues
