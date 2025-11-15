# Settlement System Testing & Verification Guide

This guide walks you through testing the automated bet settlement system end-to-end.

## Prerequisites

Before testing, ensure:

- [ ] Redis is running and accessible
- [ ] PostgreSQL database is connected
- [ ] Environment variables are set (`.env` file)
- [ ] Dependencies installed (`npm install`)
- [ ] Prisma client generated (`npx prisma generate`)

## Quick Start Test

### 1. Start the Settlement System

```bash
npm run settlement:start
```

You should see:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚡ NSSPORTS Professional Settlement System
  Powered by BullMQ + Redis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Settlement System Ready

📡 Status:
   • Queue: Active and scheduled
   • Worker: Processing jobs
   • System: Fully operational

ℹ️  Jobs run automatically every 5 minutes
💡 Press Ctrl+C for graceful shutdown
```

### 2. Verify Health Check

In another terminal:
```bash
curl http://localhost:3000/api/settlement/health | jq
```

Expected response:
```json
{
  "status": "healthy",
  "healthScore": 100,
  "timestamp": "2025-11-15T22:30:00.000Z",
  "queue": {
    "waiting": 0,
    "active": 0,
    "completed": 5,
    "failed": 0,
    "delayed": 0,
    "paused": false,
    "total": 5
  },
  "recurring": [
    {
      "name": "sync-and-settle",
      "pattern": "*/5 * * * *",
      "nextRun": "2025-11-15T22:35:00.000Z"
    }
  ],
  "indicators": {
    "queueNotPaused": true,
    "hasRecurringJobs": true,
    "lowFailureRate": true,
    "hasActiveJobs": false
  }
}
```

### 3. Check Queue Statistics

```bash
npm run settlement:init
```

This will show current queue stats without starting a new worker.

## Manual Settlement Test

### Test 1: Manual Full Settlement

Trigger settlement manually to test the system:

```bash
npm run settle-bets
```

This will:
1. Sync all finished games from SDK
2. Settle all pending bets
3. Print a summary

Expected output:
```
[Settlement] Starting manual settlement...
[Settlement] Synced 12 games
[Settlement] Settled 45 bets
  • Won: 23
  • Lost: 18
  • Push: 4
```

### Test 2: Dry Run (Safe)

Test without actually settling bets:

```bash
npm run settle-bets:dry-run
```

This shows what WOULD happen without making changes.

## Automated Settlement Test

### Scenario: Place bet and verify automatic settlement

#### Step 1: Find an upcoming game

```bash
# Query database for upcoming games
npx prisma studio
# Or use your app UI
```

#### Step 2: Place a test bet

Use your app's betting interface to place a bet on an upcoming game.

Note:
- Bet ID
- Game ID
- Bet type
- Selection

#### Step 3: Wait for game to finish

Monitor the game status in your database:

```sql
SELECT id, status, homeScore, awayScore, startTime
FROM games
WHERE id = 'YOUR_GAME_ID';
```

#### Step 4: Verify automatic settlement

After the game finishes and the recurring job runs (within 5 minutes):

```sql
-- Check bet status
SELECT id, status, settledAt, potentialPayout
FROM bets
WHERE id = 'YOUR_BET_ID';

-- Check user account balance
SELECT balance FROM accounts WHERE userId = 'YOUR_USER_ID';
```

The bet should be automatically settled with:
- `status` changed to `won`, `lost`, or `push`
- `settledAt` timestamp populated
- User balance updated accordingly

## Diagnostic Tools

### Check for Unsettled Bets

Run the diagnostic script to find bets that should be settled:

```bash
node diagnose-settlement.mjs
```

Output shows:
- Total bets by status
- **Pending bets on finished games** (these should be 0 if system is working)
- Total finished games

### Check Worker Logs

```bash
# If running in terminal
# Logs appear in console

# If running with systemd
sudo journalctl -u nssports-settlement -f

# If running with Docker
docker logs -f nssports-settlement
```

Look for:
- `✅ Job completed` - Successful settlements
- `❌ Job failed` - Errors (investigate)
- `⏭️ Skipped bet` - Bet not ready (normal)

### Check Redis Queue

```bash
# Connect to Redis
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD

# Check queue keys
KEYS "bull:settlement:*"

# Check waiting jobs
LLEN bull:settlement:wait

# Check failed jobs
ZCARD bull:settlement:failed

# Check recurring jobs
KEYS "bull:settlement:repeat:*"
```

## Performance Testing

### Load Test: Multiple Bets

1. Place 10+ bets on different games
2. Mark multiple games as finished simultaneously
3. Monitor settlement processing time
4. Verify all bets settle within expected time

Expected:
- < 5 minutes for scheduled job
- < 10 seconds for webhook-triggered
- < 1 second per bet processing

### Concurrency Test

Test with multiple workers:

```bash
# Terminal 1
WORKER_ID=worker-1 npm run settlement:worker &

# Terminal 2
WORKER_ID=worker-2 npm run settlement:worker &

# Terminal 3
WORKER_ID=worker-3 npm run settlement:worker &
```

Place bets, finish games, verify:
- No duplicate settlements
- All bets settled exactly once
- Distributed processing across workers

## Edge Cases to Test

### 1. Missing Scores

Place bet on a game, then manually mark it finished WITHOUT scores:

```sql
UPDATE games SET status = 'finished' WHERE id = 'GAME_ID';
-- Don't set homeScore or awayScore
```

Expected: Bet remains pending until scores are available.

### 2. Push (Tie)

Find a game where the spread results in an exact push.

Expected: Bet marked as `push`, stake refunded.

### 3. Parlay Bet

Place a parlay bet on 3 games. Test:
- All legs win → Parlay wins
- One leg loses → Parlay loses
- One leg pushes → Parlay adjusted, payout recalculated

### 4. Player Props

Place player prop bet. After game finishes, verify:
- System fetches player stats from SDK
- Bet graded based on actual performance
- Correct settlement (over/under)

### 5. API Errors

Simulate API failure:
- Disconnect from SDK temporarily
- Observe retry behavior
- Verify eventual settlement when connection restored

## Troubleshooting Common Issues

### Issue: Bets not settling

**Check:**
1. Is settlement system running?
   ```bash
   ps aux | grep settlement
   ```

2. Are jobs being added to queue?
   ```bash
   redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD LLEN bull:settlement:wait
   ```

3. Are there failed jobs?
   ```bash
   redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ZCARD bull:settlement:failed
   ```

4. Check worker logs for errors

**Fix:**
```bash
# Restart settlement system
pkill -f settlement
npm run settlement:start
```

### Issue: Duplicate settlements

**Check:**
```sql
-- Look for duplicate settlement transactions
SELECT betId, COUNT(*) as count
FROM bets
WHERE settledAt IS NOT NULL
GROUP BY betId
HAVING COUNT(*) > 1;
```

**Fix:**
This shouldn't happen with BullMQ's built-in locking, but if it does:
1. Stop all workers
2. Clear queue
3. Re-initialize
4. Start single worker

### Issue: High failure rate

**Check:**
```bash
curl http://localhost:3000/api/settlement/health | jq '.queue.failed'
```

If > 10% of jobs failing:
1. Check logs for error patterns
2. Verify Redis/DB connections
3. Check API rate limits
4. Verify game data integrity

## Monitoring in Production

### Health Check Monitoring

Set up monitoring to call health check endpoint:

```bash
# Every minute
*/1 * * * * curl -f http://localhost:3000/api/settlement/health || alert
```

Alert if:
- Health score < 50
- Status is "unhealthy"
- Failed job count > 50

### Queue Depth Monitoring

Monitor queue depth to prevent backlogs:

```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD LLEN bull:settlement:wait
```

Alert if waiting jobs > 100

### Settlement Lag Monitoring

Track time between game finish and bet settlement:

```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (b.settledAt - g.finishedAt))) as avg_lag_seconds
FROM bets b
JOIN games g ON b.gameId = g.id
WHERE b.settledAt > NOW() - INTERVAL '24 hours';
```

Alert if avg lag > 600 seconds (10 minutes)

## Success Criteria

✅ System is working correctly if:

1. **Health check returns "healthy"**
2. **Recurring jobs are scheduled** (visible in health check)
3. **Worker is processing jobs** (logs show activity)
4. **Bets settle automatically** within 5-10 minutes of game finishing
5. **No unsettled bets** on finished games (run `diagnose-settlement.mjs`)
6. **Low failure rate** (< 5% of jobs fail)
7. **User balances update correctly** after settlements
8. **No duplicate settlements**

## Support

If issues persist after following this guide:
1. Gather logs from last 24 hours
2. Run diagnostic script
3. Export queue statistics
4. Create GitHub issue with details
