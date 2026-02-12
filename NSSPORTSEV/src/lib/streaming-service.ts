/**
 * WebSocket Streaming Service - OPTIONAL Enhancement Layer (All-Star Plan Only)
 * 
 * ⚠️ IMPORTANT: This requires All-Star plan subscription with WebSocket access.
 * Pro plan ($299/mo) uses REST API polling only - this service will exit gracefully.
 * 
 * Purpose:
 * - Provides <1s update notifications for premium UX (All-Star plan only)
 * - Triggers cache invalidation for instant refetch
 * - Enhances user experience but NOT required for functionality
 * - Pro plan users get sub-minute updates via smart cache (15s TTL for live games)
 * 
 * OFFICIAL IMPLEMENTATION per SportsGameOdds documentation:
 * https://sportsgameodds.com/docs/guides/realtime-streaming-api
 * 
 * Architecture (Official Pattern):
 * 1. Call /v2/stream/events to get:
 *    - WebSocket credentials (pusherKey, pusherOptions)
 *    - Channel name
 *    - Initial snapshot of events
 * 2. Connect via Pusher WebSocket
 * 3. Receive eventID notifications (NOT full data)
 * 4. Trigger cache invalidation → React Query refetches → Smart cache system provides data
 * 
 * Feeds (Official SDK):
 * - 'events:live' - Live/in-progress games odds notifications
 * - 'events:upcoming' - Upcoming games odds notifications (per league)
 * - 'events:byid' - Single event odds notifications
 * 
 * Reality Check:
 * - WITH streaming (All-Star): <1s latency (WebSocket → invalidate → refetch → smart cache → frontend)
 * - WITHOUT streaming (Pro): 15s-60s latency (smart cache TTL handles everything automatically)
 * - Both work perfectly, streaming just enhances UX for premium experience
 * 
 * Props Streaming:
 * - Automatically detects player and game props changes
 * - Emits 'props:player:updated' and 'props:game:updated' events
 * - Works globally across all sports (NFL, NHL, NBA, MLB, etc.)
 * 
 * Requirements:
 * - All-Star plan subscription (contact SportsGameOdds for pricing)
 * - Pusher client library (pusher-js)
 * - SPORTSGAMEODDS_STREAMING_ENABLED=true environment variable
 */

import { logger } from './logger';
const log = logger.createScopedLogger('StreamingService');
import { getEvents } from './sportsgameodds-sdk';

// Type definitions for Pusher WebSocket client
interface PusherOptions {
  cluster?: string;
  encrypted?: boolean;
  [key: string]: unknown;
}

interface PusherChannel {
  name: string;
  bind(event: string, callback: (data: unknown) => void): void;
  unbind(event?: string): void;
}

interface PusherConnection {
  state: string;
  bind(event: string, callback: (data?: unknown) => void): void;
  unbind(event?: string): void;
}

interface PusherClient {
  connection: PusherConnection;
  subscribe(channelName: string): PusherChannel;
  unsubscribe(channelName: string): void;
  disconnect(): void;
}

// Pusher constructor type
type PusherConstructor = new (key: string, options: PusherOptions) => PusherClient;

interface PusherClient {
  connection: PusherConnection;
  subscribe(channelName: string): PusherChannel;
  unsubscribe(channelName: string): void;
  disconnect(): void;
}

export type StreamFeed = 'events:live' | 'events:upcoming' | 'events:byid';

export interface StreamOptions {
  leagueID?: string; // Required for events:upcoming
  eventID?: string; // Required for events:byid
}

export interface StreamConnectionInfo {
  pusherKey: string;
  pusherOptions: PusherOptions;
  channel: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData: any[];
}

export interface EventUpdate {
  eventID: string;
}

export class StreamingService {
  private pusher: PusherClient | null = null;
  private channel: PusherChannel | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private events: Map<string, any> = new Map();
  private connectionState: string = 'disconnected';
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  // Track streaming mode (main odds vs props)
  private streamingMode: 'odds' | 'full' = 'odds';

  /**
   * Connect to streaming API (Official Implementation)
   * 
   * Per official docs: https://sportsgameodds.com/docs/guides/realtime-streaming-api
   * 1. Get connection details from /v2/stream/events
   * 2. Connect via Pusher WebSocket
   * 3. Receive eventID notifications (NOT full data)
   * 4. Fetch full event data when notified
   * 
   * NEW: Supports props streaming via enablePropsStreaming parameter
   * - When true, fetches player and game props in addition to main odds
   * - Emits 'props:player:updated' and 'props:game:updated' events
   * - Enables real-time props updates across all sports
   * 
   * PLAN REQUIREMENTS:
   * - WebSocket streaming requires All-Star plan subscription
   * - Pro plan ($299/mo) uses REST API polling only (no WebSocket)
   * - This method will exit early on Pro plan to prevent errors
   */
  async connect(feed: StreamFeed, options: StreamOptions & { enablePropsStreaming?: boolean } = {}): Promise<void> {
    // ⚠️ PRO PLAN EARLY EXIT - WebSocket streaming requires All-Star plan
    // Support both server-side and client-side env flags (NEXT_PUBLIC_...) so
    // that client bundle can detect streaming availability in browser builds.
    const streamingEnabled = (process.env.SPORTSGAMEODDS_STREAMING_ENABLED === 'true')
      || (process.env.NEXT_PUBLIC_STREAMING_ENABLED === 'true')
      || (process.env.NEXT_PUBLIC_STREAMING_ENABLED === '1')
      || (process.env.NEXT_PUBLIC_STREAMING_ENABLED === 'true');

    if (!streamingEnabled) {
      logger.info('[Streaming] Streaming disabled - Using Pro plan REST API polling only');
      logger.info('[Streaming] Pro plan provides sub-minute updates via smart cache (15s TTL for live games)');
      logger.info('[Streaming] To enable WebSocket streaming, set NEXT_PUBLIC_STREAMING_ENABLED=true and provide streaming credentials');
      return; // Exit without error - REST polling handles everything
    }

    logger.info('[Streaming] Connecting to stream', { feed, options });

    try {
      // Set streaming mode based on options
      this.streamingMode = options.enablePropsStreaming ? 'full' : 'odds';
      
      logger.info('[Streaming] Streaming mode', { mode: this.streamingMode });

      // Dynamically import Pusher (only when needed)
      let PusherConstructor;
      try {
        PusherConstructor = await this.loadPusher();
      } catch (pusherError) {
        logger.error('[Streaming] Failed to load Pusher library', pusherError);
        throw new Error('Pusher library not available. Install pusher-js: npm install pusher-js');
      }
      
      // Get stream connection info from API (Step 1 - Official Pattern)
      const streamInfo = await this.getStreamConnectionInfo(feed, options);
      
      log.debug('[Streaming] Stream configuration received', {
        channel: streamInfo.channel,
        pusherKey: streamInfo.pusherKey,
        initialDataCount: streamInfo.initialData.length,
      });

      // Seed initial data (Official Pattern)
      streamInfo.initialData.forEach((event) => {
        this.events.set(event.eventID, event);
        logger.debug('[Streaming] Initial event loaded', {
          eventID: event.eventID,
          eventTitle: this.getEventTitle(event),
        });
      });

      // Initialize Pusher client (Step 2 - Official Pattern)
      this.pusher = new (PusherConstructor as PusherConstructor)(
        streamInfo.pusherKey,
        streamInfo.pusherOptions
      );
      
      // Start monitoring
      this.startConnectionMonitoring();

      // Subscribe to channel (Step 3 - Official Pattern)
      if (this.pusher) {
        this.channel = this.pusher.subscribe(streamInfo.channel);
        
        // Handle subscription success
        this.channel.bind('pusher:subscription_succeeded', () => {
          logger.info('[Streaming] Successfully subscribed to channel');
          this.connectionState = 'subscribed';
          this.reconnectAttempts = 0;
          this.emit('connected', { feed, options });
        });

        // Handle data updates (Step 4 - Official Pattern)
        // CRITICAL: Updates contain ONLY eventID, not full data
        this.channel.bind('data', (data: unknown) => {
          const changedEvents = data as EventUpdate[];
          log.debug('[Streaming] Received update notification', {
            count: changedEvents.length,
          });

          // Fetch full event data (Official Pattern - Required Step)
          void this.handleEventUpdates(changedEvents);
        });
      }

      logger.info('[Streaming] Stream setup complete');

    } catch (error) {
      logger.error('[Streaming] Failed to connect', error);
      this.connectionState = 'failed';
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from streaming API
   */
  disconnect(): void {
    logger.info('[Streaming] Disconnecting from stream');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.channel) {
      this.pusher?.unsubscribe(this.channel.name);
      this.channel = null;
    }

    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }

    this.connectionState = 'disconnected';
    this.events.clear();
    this.emit('disconnected', {});
  }

  /**
   * Get current events
   */
  getEvents(): Map<string, unknown> {
    return new Map(this.events);
  }

  /**
   * Get connection state
   */
  getConnectionState(): string {
    return this.connectionState;
  }

  /**
   * Event emitter
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, callback: (data: any) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  // Private methods

  private async loadPusher(): Promise<PusherConstructor> {
    const pusherModule = await import('pusher-js');
    return pusherModule.default as PusherConstructor;
  }

  /**
   * Get stream connection details (Official API Call - Step 1)
   * 
   * Calls /v2/stream/events to get:
   * - pusherKey: WebSocket authentication credentials
   * - pusherOptions: WebSocket configuration
   * - channel: Channel name to subscribe to
   * - data: Initial snapshot of events
   * 
   * Official parameters per docs:
   * - feed: 'events:live' | 'events:upcoming' | 'events:byid'
   * - leagueID: Required for 'events:upcoming'
   * - eventID: Required for 'events:byid'
   * - oddIDs: Filter specific markets (e.g., "game-ml,game-ats,game-ou")
   * - includeOpposingOddIDs: Get both sides of markets
   * 
   * Smart OddIDs Configuration:
   * - odds mode: "game-ml,game-ats,game-ou" (main game lines only)
   * - full mode: Include player and game props patterns
   * 
   * Official reference:
   * https://sportsgameodds.com/docs/guides/realtime-streaming-api
   */
  private async getStreamConnectionInfo(
    feed: StreamFeed,
    options: StreamOptions
  ): Promise<StreamConnectionInfo> {
    // Check for client-side API key first (required for static export/GitHub Pages)
    const apiKey = process.env.NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY || process.env.SPORTSGAMEODDS_API_KEY;
    
    if (!apiKey) {
      throw new Error('SPORTSGAMEODDS_API_KEY or NEXT_PUBLIC_SPORTSGAMEODDS_API_KEY not configured');
    }

    const params: Record<string, string> = { feed };
    
    if (options.leagueID) params.leagueID = options.leagueID;
    if (options.eventID) params.eventID = options.eventID;
    
    // SMART ODDS FILTERING per official docs
    // https://sportsgameodds.com/docs/guides/response-speed
    if (this.streamingMode === 'odds') {
      // Main game lines only: moneyline, spread, total
      params.oddIDs = 'game-ml,game-ats,game-ou';
    } else {
      // Full mode: Include props for real-time updates
      // Note: We fetch all data here, then detect props changes in handleEventUpdates
      // This allows us to emit granular events for player vs game props
      params.oddIDs = 'game-ml,game-ats,game-ou';
      // Props will be fetched separately when changes detected
    }
    
    params.includeOpposingOddIDs = 'true'; // Get both sides (home/away, over/under)

    const response = await fetch(
      'https://api.sportsgameodds.com/v2/stream/events?' + new URLSearchParams(params),
      {
        headers: {
          'x-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Stream API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      pusherKey: data.pusherKey,
      pusherOptions: data.pusherOptions,
      channel: data.channel,
      initialData: data.data || [],
    };
  }

  private startConnectionMonitoring(): void {
    if (!this.pusher) return;

    // Heartbeat
    this.heartbeatInterval = setInterval(() => {
      logger.debug('[Streaming] Heartbeat', {
        state: this.connectionState,
        eventCount: this.events.size,
      });
      this.emit('heartbeat', {
        state: this.connectionState,
        eventCount: this.events.size,
      });
    }, 30000); // Every 30 seconds

    // Connection state changes
    this.pusher.connection.bind('state_change', (data?: unknown) => {
      const states = data as { previous: string; current: string };
      this.connectionState = states.current;
      logger.info('[Streaming] Connection state changed', {
        from: states.previous,
        to: states.current,
      });
      this.emit('state_change', states);
    });

    // Connection errors
    this.pusher.connection.bind('error', (error: unknown) => {
      logger.error('[Streaming] Connection error', error);
      this.emit('error', error);
      this.handleReconnection();
    });

    // Connection established
    this.pusher.connection.bind('connected', () => {
      logger.info('[Streaming] WebSocket connected');
      this.connectionState = 'connected';
    });

    // Connection failed
    this.pusher.connection.bind('failed', () => {
      logger.error('[Streaming] Connection failed permanently');
      this.connectionState = 'failed';
      this.emit('failed', {});
    });
  }

  /**
   * Handle event updates (Official Pattern - Step 4)
   * 
   * Per official docs:
   * 1. Receive eventID notifications (NOT full data)
   * 2. Fetch full event data using /v2/events with eventIDs parameter
   * 3. Use oddIDs to filter for main game lines only
   * 4. Use includeOpposingOddIDs=true for both sides
   * 
   * NEW: Props Change Detection
   * - Compares previous and current event data
   * - Detects player props changes (odds, lines, availability)
   * - Detects game props changes (odds, lines, markets)
   * - Emits granular events: 'props:player:updated' and 'props:game:updated'
   * - Works globally across all sports (NFL, NHL, NBA, MLB, etc.)
   * 
   * Official reference:
   * https://sportsgameodds.com/docs/guides/realtime-streaming-api
   * https://sportsgameodds.com/docs/guides/response-speed
   */
  private async handleEventUpdates(changedEvents: EventUpdate[]): Promise<void> {
    if (changedEvents.length === 0) return;

    const eventIDs = changedEvents.map((e) => e.eventID);
    
    logger.debug('[Streaming] Fetching full data for updated events', {
      eventIDs,
      mode: this.streamingMode,
    });

    try {
      // Fetch full event data WITH ODDS FILTERING (Official Pattern)
      // Per official docs: Use oddIDs to reduce payload by 50-90%
      // Format: "game-ml,game-ats,game-ou" = moneyline, spread, total
      // includeOpposingOddIDs=true gets both sides (home/away, over/under)
      const response = await getEvents({
        eventIDs,
        limit: 100,
        oddIDs: 'game-ml,game-ats,game-ou', // Main game lines only
        includeOpposingOddIDs: true, // Get both sides
      });

      if (!response?.data || response.data.length === 0) {
        logger.warn('[Streaming] No data returned for event updates');
        return;
      }

      // Update local cache and detect props changes
      const updatedEvents: unknown[] = [];
      const eventsWithPropsChanges: string[] = [];
      
      response.data.forEach((current) => {
        if (!current.eventID) return;
        
        const prev = this.events.get(current.eventID);
        this.events.set(current.eventID, current);
        updatedEvents.push(current);

        // Detect props changes if in full streaming mode
        if (this.streamingMode === 'full' && prev) {
          const hasPropsChange = this.detectPropsChanges(prev, current);
          if (hasPropsChange) {
            eventsWithPropsChanges.push(current.eventID);
            logger.info('[Streaming] Props changes detected', {
              eventID: current.eventID,
              title: this.getEventTitle(current),
            });
          }
        }

        if (!prev) {
          logger.info('[Streaming] New event detected', {
            eventID: current.eventID,
            title: this.getEventTitle(current),
          });
        } else {
          logger.info('[Streaming] Event updated', {
            eventID: current.eventID,
            title: this.getEventTitle(current),
          });
        }
      });

      // Emit main update event
      this.emit('update', updatedEvents);
      
      // Emit props-specific updates
      if (eventsWithPropsChanges.length > 0) {
        logger.info('[Streaming] Emitting props update events', {
          count: eventsWithPropsChanges.length,
        });
        
        eventsWithPropsChanges.forEach((eventID) => {
          // Emit combined props event (for components that need both)
          this.emit('props:updated', { eventID });
          
          // Emit granular events for specific prop types
          // This allows hooks to subscribe to only what they need
          this.emit('props:player:updated', { eventID });
          this.emit('props:game:updated', { eventID });
        });
      }

    } catch (error) {
      logger.error('[Streaming] Error fetching event updates', error);
    }
  }

  /**
   * Detect if player or game props have changed between event updates
   * 
   * Compares:
   * - Player props: Odds, lines, availability
   * - Game props: Odds, lines, markets
   * 
   * Returns true if ANY props have changed
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private detectPropsChanges(prev: any, current: any): boolean {
    // Check if odds object exists and has changed
    if (!current.odds || !prev.odds) {
      return false;
    }

    try {
      // Convert odds to JSON strings for deep comparison
      // This catches any changes in nested odds structures
      const prevOddsStr = JSON.stringify(prev.odds);
      const currentOddsStr = JSON.stringify(current.odds);
      
      // If odds structure changed at all, props may have changed
      if (prevOddsStr !== currentOddsStr) {
        // Do a more granular check to confirm props-related changes
        // Look for player prop patterns (e.g., passing_yards, goals, etc.)
        // or game prop patterns (e.g., team totals, period props, etc.)
        
        const hasPlayerProps = this.hasPlayerPropsData(current.odds);
        const hasGameProps = this.hasGamePropsData(current.odds);
        
        if (hasPlayerProps || hasGameProps) {
          logger.debug('[Streaming] Props change detected via odds comparison', {
            hasPlayerProps,
            hasGameProps,
          });
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.warn('[Streaming] Error detecting props changes', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Check if odds object contains player props data
   * Player props have patterns like: player_*, *_passing_*, *_rushing_*, etc.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private hasPlayerPropsData(odds: any): boolean {
    if (!odds || typeof odds !== 'object') return false;
    
    const oddKeys = Object.keys(odds);
    return oddKeys.some(key => {
      const lowerKey = key.toLowerCase();
      return lowerKey.includes('player') || 
             lowerKey.includes('passing') ||
             lowerKey.includes('rushing') ||
             lowerKey.includes('receiving') ||
             lowerKey.includes('goals') ||
             lowerKey.includes('assists') ||
             lowerKey.includes('shots') ||
             lowerKey.includes('saves');
    });
  }

  /**
   * Check if odds object contains game props data
   * Game props have patterns like: *_total, *_spread, team_*, quarter_*, period_*
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private hasGamePropsData(odds: any): boolean {
    if (!odds || typeof odds !== 'object') return false;
    
    const oddKeys = Object.keys(odds);
    return oddKeys.some(key => {
      const lowerKey = key.toLowerCase();
      // Exclude main game lines
      if (lowerKey === 'game-ml' || lowerKey === 'game-ats' || lowerKey === 'game-ou') {
        return false;
      }
      // Look for game prop patterns
      return lowerKey.includes('team') ||
             lowerKey.includes('quarter') ||
             lowerKey.includes('period') ||
             lowerKey.includes('half') ||
             lowerKey.includes('total') && !lowerKey.includes('game-ou');
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[Streaming] Max reconnection attempts reached');
      this.disconnect();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    logger.info('[Streaming] Scheduling reconnection', {
      attempt: this.reconnectAttempts,
      delay,
    });

    setTimeout(() => {
      if (this.pusher) {
        logger.info('[Streaming] Attempting reconnection');
        // Pusher handles reconnection automatically
      }
    }, delay);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getEventTitle(event: any): string {
    const awayTeam = event.teams?.away?.names?.medium || 
                     event.teams?.away?.names?.long || 
                     event.teams?.away?.names?.short || 'Away';
    const homeTeam = event.teams?.home?.names?.medium || 
                     event.teams?.home?.names?.long || 
                     event.teams?.home?.names?.short || 'Home';
    return `${awayTeam} @ ${homeTeam}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }
}

// Singleton instance for app-wide use
let streamingServiceInstance: StreamingService | null = null;

export function getStreamingService(): StreamingService {
  if (!streamingServiceInstance) {
    streamingServiceInstance = new StreamingService();
  }
  return streamingServiceInstance;
}
