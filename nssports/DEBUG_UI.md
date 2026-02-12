# Debug UI Documentation

## Overview

A comprehensive debug panel has been implemented to provide real-time visibility into SGO API calls, errors, and system configuration for troubleshooting issues on GitHub Pages and other deployments.

## Features

### 🎯 Core Features

1. **Real-time API Monitoring**
   - Tracks all API requests and responses
   - Records timing information for performance analysis
   - Logs request/response details with expandable views

2. **Error Tracking**
   - Automatic error detection and logging
   - Auto-opens panel when errors occur
   - Detailed error messages with stack traces
   - Categorizes errors by type and source

3. **Configuration Validation**
   - Displays API key status (configured/missing)
   - Shows environment mode (development/production)
   - Indicates GitHub Pages static export mode
   - Reports Direct SDK usage status

4. **Performance Metrics**
   - Total API requests counter
   - Success rate percentage
   - Failed requests counter
   - Average response time in milliseconds

### 🎨 User Interface

#### Floating Toggle Button
- Located in bottom-right corner
- Red activity icon for visibility
- Always accessible across all pages
- Tooltip shows keyboard shortcut

#### Debug Panel Layout
- Slides up from bottom-right
- Covers ~70% of screen height
- Responsive width (full width on mobile, 600-800px on desktop)
- Dark theme with semi-transparent backdrop

#### Components
1. **Header Bar**
   - Title with activity icon
   - Error/warning badge counters
   - Clear logs button
   - Close button
   - Keyboard shortcut reminder

2. **Stats Dashboard**
   - 4-column grid with key metrics
   - Color-coded values (green=success, red=error, blue=info)
   - Real-time updates as requests complete

3. **Configuration Panel**
   - API key status with visibility indicator
   - SDK mode indicators
   - Environment information
   - Compact display in small text

4. **Filter Bar**
   - 5 filter options: All, API, SDK, Error, Warning
   - Badge counters for each filter
   - Active filter highlighted in blue

5. **Log List**
   - Scrollable container
   - Newest logs at top
   - Color-coded by type:
     - 🟢 Success: Green border
     - 🔴 Error: Red border
     - 🟡 Warning: Yellow border
     - 🔵 Info: Gray border
   - Expandable entries with click interaction

#### Log Entry Details
Each log entry displays:
- Status icon (spinner/checkmark/error/warning)
- Timestamp (HH:MM:SS.mmm format)
- Category badge
- Duration (if applicable)
- Message text
- Expandable details section with JSON formatting

### ⌨️ Keyboard Shortcuts

- **Ctrl + Shift + D**: Toggle debug panel visibility

### 📊 Log Types

1. **API Logs**
   - HTTP method and endpoint
   - Request options
   - Response status and size
   - Duration timing

2. **SDK Logs**
   - SDK function calls
   - Parameters passed
   - Results returned
   - Error states

3. **Error Logs**
   - Error messages
   - Stack traces
   - Context information
   - Recovery attempts

4. **Info Logs**
   - System state changes
   - Configuration updates
   - Successful operations

5. **Warning Logs**
   - Potential issues
   - Deprecation notices
   - Rate limit warnings

## Integration Points

### 1. API Service Layer (`src/services/api.ts`)

Every API request is automatically tracked:

```typescript
// Automatic logging on every fetch
const logId = createPendingLog('api', 'API Request', `${method} ${endpoint}`, details);

// Completion tracking
completePendingLog(logId, success, duration, responseDetails);
```

**What's logged:**
- Request URL and method
- Request options (headers, body)
- Response status code
- Response data size
- Request duration
- Error details (if failed)

### 2. Live Data Store (`src/store/liveDataStore.ts`)

Store operations are logged:

```typescript
// Start operation
useDebugStore.getState().addLog({
  type: 'info',
  category: 'LiveDataStore',
  message: 'Starting fetchAllMatches',
  details: { force }
});

// Log results
useDebugStore.getState().addLog({
  type: 'info',
  category: 'LiveDataStore',
  message: `Successfully fetched ${allMatches.length} games`,
  details: { totalGames, liveGames }
});
```

### 3. Live Page (`src/app/live/page.tsx`)

Page-level fetch operations are tracked:

```typescript
useDebugStore.getState().addLog({
  type: 'info',
  category: 'LivePage',
  message: 'Fetching live games from /api/games/live',
  details: { isBackgroundUpdate, forceUpdate }
});
```

### 4. Root Layout (`src/app/layout.tsx`)

Debug panel is globally available:

```tsx
<ErrorBoundary>
  {/* ... all providers ... */}
  <DebugPanel />
</ErrorBoundary>
```

## Usage Guide

### For Development

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Open Debug Panel**
   - Press `Ctrl + Shift + D` OR
   - Click the red activity button in bottom-right corner

3. **Monitor API Calls**
   - Navigate to any page
   - Watch logs appear in real-time
   - Click on log entries to see details

4. **Diagnose Errors**
   - Red error logs auto-open the panel
   - Expand error entries to see stack traces
   - Check configuration section for setup issues

### For Production/GitHub Pages

1. **Deploy Application**
   ```bash
   npm run build
   # Deploy to GitHub Pages
   ```

2. **Access Debug Panel**
   - Visit deployed site
   - Press `Ctrl + Shift + D`
   - Panel works on static exports

3. **Troubleshoot Issues**
   - Check API key configuration
   - Verify Direct SDK mode is active
   - Review error logs for API failures
   - Check network tab for CORS issues

### Common Debugging Scenarios

#### Scenario 1: No Games Loading

**What to check in debug panel:**
1. Look for API request logs to `/api/games/live`
2. Check if requests are returning 200 OK status
3. Verify API key is configured (green checkmark)
4. Look for error logs with 401/403 status codes

**Expected logs:**
```
✓ Success | API Request | GET /api/games/live | 234ms
✓ Success | LivePage | Successfully fetched 15 games (3 live)
```

#### Scenario 2: API Key Missing

**What you'll see:**
```
Configuration:
  API Key: ✗ Missing
  Direct SDK: ✓ Yes
  GitHub Pages: ✓ Yes
  Environment: production

❌ Error | API Request | 401 Unauthorized
Details: Missing or invalid API key
```

**Solution:** Add `NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY` to environment variables

#### Scenario 3: CORS Errors

**What you'll see:**
```
❌ Error | API Request | Failed to fetch
Details: TypeError: Failed to fetch
```

**Solution:** Check Direct SDK mode is enabled for GitHub Pages

#### Scenario 4: Slow Response Times

**What to check:**
- Average Response Time in stats (should be < 500ms)
- Individual request durations in log entries
- Look for timeout errors

**Expected behavior:**
- Live game fetches: 200-500ms
- Background updates: 100-300ms
- Initial load: 500-1000ms

## Performance Considerations

### Log Retention
- Maximum 100 logs kept in memory
- Oldest logs automatically removed
- Prevents memory leaks on long-running sessions

### Conditional Logging
- Browser-only (no SSR overhead)
- Silent background updates (no spam)
- Expandable details (lazy rendering)

### State Management
- Zustand for efficient updates
- No re-renders on log additions
- Minimal React reconciliation

## Security Considerations

### API Key Display
- Shows first 8 characters only
- Never logs full API keys
- Sanitized in production builds

### Error Details
- Stack traces only in development
- Sensitive data filtered
- No credentials in logs

### Production Optimizations
- Console.log removal via Next.js compiler
- Error-only logging recommended
- Debug panel can be disabled

## Customization

### Adjust Log Limit

Edit `src/store/debugStore.ts`:

```typescript
export const useDebugStore = create<DebugState>((set, get) => ({
  maxLogs: 200, // Increase from 100
  // ...
}));
```

### Add Custom Log Categories

```typescript
useDebugStore.getState().addLog({
  type: 'info',
  category: 'MyFeature',
  message: 'Custom operation completed',
  details: { customData: true }
});
```

### Disable Auto-Open on Errors

Edit `src/store/debugStore.ts`:

```typescript
addLog: (entry) => {
  // ...
  
  // Comment out auto-show
  // if (entry.type === 'error') {
  //   set({ isVisible: true });
  // }
}
```

## Future Enhancements

Potential additions:
- [ ] Export logs to JSON file
- [ ] Search/filter logs by text
- [ ] WebSocket connection status indicator
- [ ] Network waterfall visualization
- [ ] Performance flame graphs
- [ ] Log level filtering (debug/info/warn/error)
- [ ] Persistent logs across page reloads
- [ ] Remote logging to external service

## Troubleshooting the Debug Panel

### Panel Not Appearing
1. Check if `DebugPanel` is imported in `layout.tsx`
2. Verify keyboard shortcut (Ctrl+Shift+D)
3. Look for JavaScript console errors
4. Check if `useDebugStore` is properly initialized

### Logs Not Showing
1. Verify API calls are being made (Network tab)
2. Check if `typeof window !== 'undefined'` guards are working
3. Look for errors in browser console
4. Ensure debug store is accessible in browser context

### TypeScript Errors
1. Run `npx tsc --noEmit` to check
2. Verify all imports are correct
3. Check for type mismatches in log details

## Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Verify environment variables are set
4. Test in incognito mode to rule out extensions
5. Clear browser cache and reload

## Summary

The debug UI provides essential visibility into the SGO API integration, making it easy to diagnose configuration issues, API failures, and performance problems in both development and production environments, including GitHub Pages static exports.

**Key Benefits:**
- ✅ Real-time API monitoring
- ✅ Automatic error detection
- ✅ Configuration validation
- ✅ Performance metrics
- ✅ GitHub Pages compatible
- ✅ Non-intrusive design
- ✅ Mobile friendly
- ✅ Zero production overhead (when closed)
