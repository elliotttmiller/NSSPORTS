# NSSPORTS Scripts

This directory contains utility scripts for managing the NSSPORTS development environment.

## Scripts

### start.py - Full System Launcher

**Purpose:** Launches the complete NSSPORTS development environment with proper sequencing and health checks.

**What it does:**
1. Cleans up existing processes on port 3000
2. Starts Next.js development server (with Turbopack)
3. Waits for server to fully compile and stabilize (40-90 seconds)
4. Establishes ngrok tunnel with verification
5. Starts BullMQ settlement worker system

**Usage:**
```bash
python scripts/start.py
# or from project root:
cd /path/to/NSSPORTS
python scripts/start.py
```

**Important Notes:**
- **First-time startup:** Expect 40-60 seconds for Next.js compilation
- **Subsequent startups:** May be faster with cached compilation
- The script includes a 3-second stabilization period after server responds
- Ngrok tunnel verification ensures reliable connectivity
- If ngrok verification fails, the system will continue but display troubleshooting tips

**Troubleshooting ERR_NGROK_8012:**

This error means ngrok established a tunnel but cannot reach your local server. The updated script addresses this by:

1. **Extended stabilization period**: 3-second wait after server responds ensures it's fully ready
2. **Ngrok initialization delay**: 5-second wait for ngrok to establish tunnel properly
3. **Tunnel verification**: Tests that ngrok can successfully reach localhost:3000
4. **Retry logic**: 3 attempts to verify tunnel connectivity with exponential backoff

If you still see this error:
- Check that no firewall is blocking localhost connections
- Ensure Next.js dev server is fully running (`curl http://localhost:3000`)
- Verify ngrok is properly installed and authenticated
- Try restarting the script

**Process Management:**
- Press `Ctrl+C` for graceful shutdown of all services
- Services shut down in reverse order: settlement → ngrok → dev server
- Cleanup is performed on each startup

### clean.py - Process Cleanup

**Purpose:** Forcefully terminates all NSSPORTS-related processes.

**What it does:**
1. Kills processes on port 3000
2. Terminates ngrok instances
3. Cleans up settlement worker processes

**Usage:**
```bash
python scripts/clean.py
```

**When to use:**
- After crashes or interrupted startups
- Before running start.py if you have orphaned processes
- To completely reset the development environment

## Environment Requirements

### Python Dependencies
- Python 3.6+
- `requests` library (for HTTP health checks)

Install dependencies:
```bash
pip install requests
```

### System Requirements
- Node.js 18.18.0+
- npm 10.0.0+
- ngrok installed and authenticated
- Redis instance (for settlement system)

### Environment Variables

Required in `/nssports/.env.local`:
```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
AUTH_SECRET="your-secret-key"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Redis (for settlement system)
REDIS_HOST="your-redis-host"
REDIS_PORT="6379"
REDIS_PASSWORD="your-password"
REDIS_TLS="true"

# SportsGameOdds API
SPORTSGAMEODDS_API_KEY="your-api-key"
```

## Architecture

### Startup Sequence

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLEANUP PHASE (1-2 seconds)                              │
│    • Kill processes on port 3000                            │
│    • Terminate existing ngrok instances                     │
│    • Clean up settlement workers                            │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. NEXT.JS SERVER STARTUP (40-90 seconds)                   │
│    • Launch: npm run dev                                    │
│    • Wait: Initial 10 seconds                               │
│    • Poll: Check localhost:3000 every 4 seconds            │
│    • Verify: Accept any 2xx-4xx response                   │
│    • Stabilize: Additional 3-second wait                    │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. NGROK TUNNEL ESTABLISHMENT (8-15 seconds)               │
│    • Launch: ngrok http 3000 --domain=nssportsclub.ngrok.app│
│    • Wait: 5 seconds for tunnel initialization             │
│    • Verify: Test tunnel → localhost connectivity          │
│    • Retry: Up to 3 attempts with 3-second intervals       │
│    • Fallback: Continue with warning if verification fails  │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SETTLEMENT SYSTEM STARTUP (4-6 seconds)                  │
│    • Launch: npx tsx scripts/start-professional-settlement.ts│
│    • Initialize: BullMQ queue with Redis                    │
│    • Schedule: Recurring jobs every 5 minutes               │
│    • Start: Worker process for job processing               │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. READY STATE                                               │
│    • Next.js: http://localhost:3000                         │
│    • Tunnel: https://nssportsclub.ngrok.app                 │
│    • Settlement: Running every 5 minutes                     │
│    • Status: All systems operational                         │
└─────────────────────────────────────────────────────────────┘
```

### Health Checks

The script implements multi-layer health checks:

1. **Local Server Check** (`wait_for_server`)
   - Polls localhost:3000 until it responds
   - Accepts any non-500 status code
   - Includes 3-second stabilization period
   - Timeout: 90 seconds

2. **Ngrok Tunnel Verification** (`verify_ngrok_tunnel`)
   - Verifies local server is still responsive
   - Tests tunnel can reach local server
   - 3 retry attempts with 3-second intervals
   - Provides detailed error messages

3. **Settlement System Check**
   - Verifies process is still running after 4 seconds
   - Checks for immediate startup errors
   - Reports success/failure status

## Performance Characteristics

### Typical Startup Times

| Phase | First Run | Subsequent Runs |
|-------|-----------|-----------------|
| Cleanup | 1-2s | 1-2s |
| Next.js Server | 50-70s | 30-50s |
| Server Stabilization | 3s | 3s |
| Ngrok Tunnel | 5-8s | 5-8s |
| Tunnel Verification | 3-9s | 3-9s |
| Settlement System | 4-6s | 4-6s |
| **Total** | **66-100s** | **46-78s** |

### Network Requirements

- **Outbound HTTP/HTTPS**: For SportsGameOdds API
- **Ngrok Tunnel**: Stable internet connection required
- **Redis Connection**: Must be reachable (cloud or local)
- **Port 3000**: Must be available for Next.js

## Best Practices

1. **Always use start.py**: Don't manually start services to ensure proper sequencing
2. **Wait for "ENVIRONMENT READY"**: Don't attempt to use the system until this message appears
3. **Check tunnel verification**: If it fails, consider restarting
4. **Monitor logs**: Watch for errors during startup
5. **Use clean.py first**: If experiencing issues, clean up before restarting

## Common Issues

### Issue: "ERR_NGROK_8012"

**Cause:** Ngrok tunnel cannot reach local server

**Solutions:**
- Wait for the new verification system to complete
- If verification fails repeatedly, check firewall settings
- Ensure localhost:3000 is accessible
- Try: `curl http://localhost:3000` manually

**Prevention:** The updated script now includes:
- Extended stabilization period
- Ngrok tunnel health checks
- Retry logic with exponential backoff

### Issue: "Settlement system failed to start"

**Cause:** Redis connection error or environment variables missing

**Solutions:**
- Verify Redis environment variables in `.env.local`
- Test Redis connection separately
- Check Redis is running and accessible
- Review Redis credentials

### Issue: "Server initialization failed"

**Cause:** Next.js failed to start within 90 seconds

**Solutions:**
- Check for compilation errors in Next.js output
- Verify all dependencies are installed
- Try: `cd nssports && npm install`
- Check for syntax errors in code
- Increase `SERVER_TIMEOUT` if needed

### Issue: Port 3000 already in use

**Cause:** Previous process didn't shut down properly

**Solutions:**
- Run `python scripts/clean.py` first
- Manually kill process: `lsof -ti:3000 | xargs kill -9` (Mac/Linux)
- Manually kill process: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F` (Windows)

## Windows vs Unix Differences

The script includes platform-specific logic:

**Windows:**
- Uses `npm.cmd` instead of `npm`
- Uses `taskkill` for process termination
- Uses `netstat` and `findstr` for port checking
- Uses `CREATE_NEW_PROCESS_GROUP` for settlement worker

**Unix/Mac:**
- Uses `npm` directly
- Uses `kill` for process termination
- Uses `lsof` for port checking
- Standard subprocess flags

## Changelog

### 2024-11-21 - Enhanced Ngrok Reliability
- Added 3-second stabilization period after server responds
- Increased ngrok initialization delay from 2s to 5s
- Implemented `verify_ngrok_tunnel()` function with health checks
- Added retry logic (3 attempts) for tunnel verification
- Improved error messages with troubleshooting guidance
- Added graceful fallback when verification fails

### Previous
- Initial implementation with basic health checks
- Added settlement system integration
- Implemented graceful shutdown handling
