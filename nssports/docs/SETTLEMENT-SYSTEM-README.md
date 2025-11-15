# Automated Bet Settlement System

## Overview

Professional, production-ready automated bet settlement system using **BullMQ** and **Redis**. Automatically settles user bets when games finish with comprehensive error handling, retry logic, and horizontal scaling support.

## Features

✅ **Fully Automated** - Bets settle automatically every 5 minutes  
✅ **Real-Time Settlement** - Webhook support for instant settlement (< 10s)  
✅ **Reliable** - Persistent Redis queue with automatic retries  
✅ **Scalable** - Horizontal scaling with distributed locking  
✅ **Observable** - Health checks, metrics, and comprehensive logging  
✅ **Production-Ready** - Error handling, graceful shutdown, and monitoring  

## Quick Start

### 1. Install Dependencies

```bash
cd nssports
npm install
```

### 2. Configure Environment

Create `.env` file with required variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/database
DIRECT_URL=postgresql://user:pass@host/database

# Redis (REQUIRED)
REDIS_HOST=your-redis-host.com
REDIS_PORT=15342
REDIS_USERNAME=default
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true

# API
SPORTSGAMEODDS_API_KEY=your-api-key

# Optional
SETTLEMENT_WORKER_CONCURRENCY=1
NODE_ENV=production
```

### 3. Start Settlement System

```bash
npm run settlement:start
```

That's it! The system will:
- Initialize the Redis queue
- Schedule recurring jobs (every 5 min)
- Start processing settlement jobs
- Settle bets automatically

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│          PROFESSIONAL SETTLEMENT SYSTEM                       │
│          (BullMQ + Redis)                                    │
└──────────────────────────────────────────────────────────────┘

┌─────────────┐      ┌──────────────┐      ┌────────────────┐
│   Triggers  │─────>│ Redis Queue  │─────>│ Worker Process │
└─────────────┘      └──────────────┘      └────────────────┘
                            │                       │
┌────────────────────────────┼───────────────────────┼──────────┐
│  • Recurring (5 min)       │                       │          │
│  • Webhook (instant)       │   Persistent Storage  │  Settles │
│  • Manual trigger          │   Priority Queue      │   Bets   │
│  • Cache update            │   Retry Logic         │  Updates │
└────────────────────────────┴───────────────────────┴─────────┘
```

## How It Works

### 1. Game Finishes
- Game status changes to "finished" in database
- Final scores recorded

### 2. Settlement Triggered
Three ways to trigger:
- **Automatic**: Recurring job every 5 minutes
- **Webhook**: Real-time when SDK sends game finished event
- **Manual**: API call or script execution

### 3. Job Processing
- Worker picks up job from Redis queue
- Syncs game status from SDK
- Grades each pending bet
- Calculates payouts
- Updates database atomically

### 4. Settlement Complete
- Bet status updated (won/lost/push)
- User balance adjusted
- Settlement timestamp recorded

## Usage

### Development

```bash
# Start all-in-one system (recommended)
npm run settlement:start

# Or separate processes
npm run settlement:init    # Initialize once
npm run settlement:worker  # Start worker
```

### Production

**Option 1: All-in-One Process**
```bash
npm run settlement:start
```

**Option 2: Docker**
```bash
docker-compose -f docker-compose.settlement.yml up -d
```

**Option 3: Systemd (Linux)**
```bash
sudo cp docs/deployment/nssports-settlement.service /etc/systemd/system/
sudo systemctl enable nssports-settlement
sudo systemctl start nssports-settlement
```

See [docs/deployment/BET-SETTLEMENT-DEPLOYMENT.md](docs/deployment/BET-SETTLEMENT-DEPLOYMENT.md) for detailed instructions.

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/settlement/health
```

Returns:
- Queue statistics
- Worker status
- Health score (0-100)
- Recurring job info

### Queue Statistics

```bash
npm run settlement:init
```

Shows:
- Waiting jobs
- Active jobs
- Completed jobs
- Failed jobs

### Logs

Structured JSON logging with context:

```json
{
  "timestamp": "2025-11-15T22:30:00.000Z",
  "level": "info",
  "message": "Job completed",
  "jobId": "12345",
  "type": "sync-and-settle",
  "duration": 1234,
  "result": {
    "gamesProcessed": 5,
    "betsSettled": 12
  }
}
```

## Manual Operations

### Settle All Pending Bets

```bash
npm run settle-bets
```

### Dry Run (Preview Only)

```bash
npm run settle-bets:dry-run
```

### Check for Unsettled Bets

```bash
node diagnose-settlement.mjs
```

### Trigger Settlement via API

```bash
POST /api/cron/settle-bets
Authorization: Bearer YOUR_CRON_SECRET
```

## Testing

See [docs/testing/SETTLEMENT-TESTING-GUIDE.md](docs/testing/SETTLEMENT-TESTING-GUIDE.md) for comprehensive testing instructions.

Quick test:
1. Start system: `npm run settlement:start`
2. Check health: `curl http://localhost:3000/api/settlement/health`
3. Place a test bet
4. Mark game as finished
5. Wait 5 minutes (or trigger manually)
6. Verify bet is settled

## Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `REDIS_HOST` | Yes | Redis host | - |
| `REDIS_PORT` | Yes | Redis port | - |
| `REDIS_PASSWORD` | Yes | Redis password | - |
| `DATABASE_URL` | Yes | PostgreSQL connection string | - |
| `SPORTSGAMEODDS_API_KEY` | Yes | API key for game data | - |
| `SETTLEMENT_WORKER_CONCURRENCY` | No | Jobs processed simultaneously | 1 |
| `NODE_ENV` | No | Environment | development |
| `CRON_SECRET` | No | API auth secret | dev-secret |

### Queue Configuration

Edit `src/services/settlement-queue.service.ts`:

```typescript
// Job schedule (every 5 minutes)
pattern: '*/5 * * * *'

// Retry attempts
attempts: 3

// Backoff strategy
backoff: {
  type: 'exponential',
  delay: 2000 // 2s, 4s, 8s
}
```

## Troubleshooting

### Bets Not Settling

1. **Check if system is running**
   ```bash
   ps aux | grep settlement
   ```

2. **Check Redis connection**
   ```bash
   redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
   ```

3. **Check queue health**
   ```bash
   curl http://localhost:3000/api/settlement/health
   ```

4. **Check logs**
   - Look for errors in console
   - Check failed job count

5. **Restart system**
   ```bash
   pkill -f settlement
   npm run settlement:start
   ```

### High Failure Rate

If > 10% of jobs are failing:

1. Check logs for error patterns
2. Verify Redis/Database connections
3. Check API rate limits
4. Verify game data integrity

### Duplicate Settlements

Should never happen (BullMQ prevents this), but if it does:

1. Stop all workers
2. Check for multiple running processes
3. Clear Redis queue
4. Re-initialize and start single worker

## Performance

### Benchmarks

- **Settlement Speed**: < 1 second per bet
- **Job Processing**: 10 jobs/second max
- **Automatic Settlement**: Within 5-10 minutes of game finish
- **Webhook Settlement**: < 10 seconds from game finish

### Scaling

**Vertical Scaling** (single worker):
```bash
SETTLEMENT_WORKER_CONCURRENCY=3 npm run settlement:start
```

**Horizontal Scaling** (multiple workers):
```bash
# Terminal 1
WORKER_ID=worker-1 npm run settlement:worker &

# Terminal 2
WORKER_ID=worker-2 npm run settlement:worker &

# Terminal 3
WORKER_ID=worker-3 npm run settlement:worker &
```

BullMQ handles distributed locking - no duplicates.

## API Endpoints

### Health Check
```
GET /api/settlement/health
```

### Manual Settlement (Cron)
```
GET/POST /api/cron/settle-bets
Authorization: Bearer CRON_SECRET
```

## Files & Structure

```
nssports/
├── src/
│   ├── services/
│   │   └── settlement-queue.service.ts      # Main BullMQ service
│   ├── workers/
│   │   └── settlement-worker.ts             # Standalone worker
│   ├── scripts/
│   │   ├── init-settlement-scheduler.ts     # Initialize queue
│   │   └── sync-game-status.ts              # Sync from SDK
│   ├── app/api/
│   │   ├── cron/settle-bets/                # Cron endpoint
│   │   └── settlement/health/               # Health check
│   └── lib/queues/
│       └── settlement.ts                    # Compatibility layer
├── scripts/
│   ├── start-professional-settlement.ts     # All-in-one startup
│   └── settlement/
│       └── settle-bets.ts                   # Manual settlement
├── docs/
│   ├── deployment/
│   │   └── BET-SETTLEMENT-DEPLOYMENT.md     # Deployment guide
│   └── testing/
│       └── SETTLEMENT-TESTING-GUIDE.md      # Testing guide
└── package.json
```

## Support

- **Documentation**: See `docs/` directory
- **Issues**: https://github.com/elliotttmiller/NSSPORTS/issues
- **Testing**: Run `npm run settlement:start` and verify health check

## License

MIT
