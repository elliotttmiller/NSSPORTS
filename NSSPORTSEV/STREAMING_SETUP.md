# Streaming API Setup Guide

This guide explains how to configure real-time streaming with the SportsGameOdds API for the NSSPORTSEV application.

## Overview

The NSSPORTSEV app supports real-time odds streaming via WebSocket connections using the SportsGameOdds API. This provides sub-second latency for odds updates during live games.

## Prerequisites

- SportsGameOdds API account with streaming enabled (All-Star plan)
- API Key from SportsGameOdds
- GitHub repository with Actions enabled

## GitHub Actions Configuration

### Step 1: Add API Key to GitHub Secrets

1. Navigate to your GitHub repository
2. Go to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add the following secrets:

| Secret Name | Description | Required |
|------------|-------------|----------|
| `SPORTSGAMEODDS_API_KEY` | Your SportsGameOdds API key | ✅ Yes |
| `NEXT_PUBLIC_STREAMING_ENABLED` | Enable streaming (set to `true`) | ⚠️ Optional |

### Step 2: Verify Workflow Configuration

The deployment workflow is already configured to use these secrets:

```yaml
- name: Build with Next.js
  run: npm run build
  env:
    NEXT_PUBLIC_STREAMING_ENABLED: ${{ secrets.NEXT_PUBLIC_STREAMING_ENABLED || 'false' }}
    SPORTSGAMEODDS_API_KEY: ${{ secrets.SPORTSGAMEODDS_API_KEY || '' }}
    GITHUB_PAGES: 'true'
```

## Local Development Setup

### Step 1: Create Environment File

Create a `.env.local` file in the `NSSPORTSEV` directory:

```bash
# SportsGameOdds API Configuration
SPORTSGAMEODDS_API_KEY="your-api-key-here"
NEXT_PUBLIC_STREAMING_ENABLED="true"

# Optional: API Base URL
NEXT_PUBLIC_API_BASE_URL="/api"
```

### Step 2: Test Locally

```bash
cd NSSPORTSEV
npm run dev
```

Navigate to `http://localhost:3000/live-odds` and verify that streaming connects.

## Streaming Behavior

### With Streaming Enabled (All-Star Plan)

- **Latency**: <1 second for odds updates
- **Connection**: WebSocket via Pusher protocol
- **Fallback**: Automatic fallback to REST polling if connection fails
- **Detection**: Automatic opportunity detection for EV+ and arbitrage

### Without Streaming (Pro Plan or Disabled)

- **Latency**: 15-60 seconds via smart cache
- **Connection**: REST API polling
- **Behavior**: Graceful degradation, no errors
- **Detection**: Works normally with polling data

## GitHub Pages Limitations

⚠️ **Important**: GitHub Pages only serves static files, so:

1. **WebSocket Streaming**: Not available on GitHub Pages deployment
2. **Automatic Fallback**: The app automatically falls back to REST API polling
3. **Functionality**: All features work, just with higher latency
4. **Recommendation**: For full streaming support, deploy to Vercel, Railway, or similar platforms

## Troubleshooting

### Streaming Not Connecting

**Check 1: Verify API Key**
```bash
# Test API key with curl
curl -H "x-api-key: YOUR_API_KEY" \
  "https://api.sportsgameodds.com/v2/stream/events?feed=events:live"
```

**Check 2: Check Environment Variables**

Open browser console and run:
```javascript
console.log({
  streamingEnabled: process.env.NEXT_PUBLIC_STREAMING_ENABLED,
  hasApiKey: !!process.env.SPORTSGAMEODDS_API_KEY
});
```

**Check 3: Review Console Logs**

Look for streaming messages in the browser console:
```
[Streaming] Streaming disabled - Using Pro plan REST API polling only
[Streaming] Connecting to stream...
[Streaming] Successfully subscribed to channel
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Streaming disabled" message | Set `NEXT_PUBLIC_STREAMING_ENABLED=true` in GitHub secrets |
| API key errors | Verify API key is correct in GitHub secrets |
| Connection failures | Check if All-Star plan is active with SportsGameOdds |
| No updates | Verify there are live games with odds available |

## API Key Security

### Best Practices

✅ **DO:**
- Store API key in GitHub Secrets
- Use environment variables only
- Never commit `.env.local` to git
- Use different keys for dev/prod if available

❌ **DON'T:**
- Hardcode API keys in source code
- Share API keys in public channels
- Commit `.env` files to version control
- Use production keys in development

### Checking for Exposed Keys

Before committing, verify no keys are exposed:
```bash
# Check for potential API key leaks
git grep -i "sportsgameodds_api_key" 
git grep -i "api.*key.*=.*[a-zA-Z0-9]"
```

## Testing Streaming

### Test Plan

1. **Enable Streaming**
   - Set `NEXT_PUBLIC_STREAMING_ENABLED=true`
   - Add valid `SPORTSGAMEODDS_API_KEY`

2. **Deploy to GitHub Pages**
   - Push changes to main branch
   - Monitor GitHub Actions workflow
   - Check deployment logs

3. **Verify Behavior**
   - Open live-odds page
   - Check browser console for streaming messages
   - Verify odds update (even if via polling)

4. **Test Fallback**
   - Remove `NEXT_PUBLIC_STREAMING_ENABLED`
   - Verify app still works with polling
   - Confirm no errors in console

## Support

For issues with the SportsGameOdds API:
- Documentation: https://sportsgameodds.com/docs
- Support: Contact SportsGameOdds support team
- GitHub Issues: Create an issue in this repository

## References

- [SportsGameOdds API Documentation](https://sportsgameodds.com/docs)
- [Real-time Streaming Guide](https://sportsgameodds.com/docs/guides/realtime-streaming-api)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
