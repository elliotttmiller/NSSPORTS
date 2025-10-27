/**
 * Real-Time ODDS Streaming Service - SportsGameOdds API
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
 * 4. Fetch full event data using /v2/events with eventIDs parameter
 * 
 * CRITICAL: Streaming updates contain ONLY eventID, must fetch full data separately
 * 
 * Feeds:
 * - 'events:live' - All live games with changing odds
 * - 'events:upcoming' - Upcoming games odds (requires leagueID)
 * - 'events:byid' - Single event odds updates (requires eventID)
 * 
 * Optimization:
 * - Use oddIDs parameter: "game-ml,game-ats,game-ou" (50-90% payload reduction)
 * - Use includeOpposingOddIDs=true for both sides (home/away, over/under)
 * 
 * Requirements:
 * - AllStar plan subscription
 * - Pusher client library (pusher-js)
 */

import { logger } from './logger';
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

  /**
   * Connect to streaming API (Official Implementation)
   * 
   * Per official docs: https://sportsgameodds.com/docs/guides/realtime-streaming-api
   * 1. Get connection details from /v2/stream/events
   * 2. Connect via Pusher WebSocket
   * 3. Receive eventID notifications (NOT full data)
   * 4. Fetch full event data when notified
   */
  async connect(feed: StreamFeed, options: StreamOptions = {}): Promise<void> {
    logger.info('[Streaming] Connecting to stream', { feed, options });

    try {
      // Check if feature is available
      if (!process.env.SPORTSGAMEODDS_STREAMING_ENABLED) {
        throw new Error(
          'Streaming API requires AllStar or custom plan. ' +
          'Set SPORTSGAMEODDS_STREAMING_ENABLED=true after upgrading.'
        );
      }

      // Dynamically import Pusher (only when needed)
      const PusherConstructor = await this.loadPusher();
      
      // Get stream connection info from API (Step 1 - Official Pattern)
      const streamInfo = await this.getStreamConnectionInfo(feed, options);
      
      logger.info('[Streaming] Stream configuration received', {
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
          logger.info('[Streaming] Received update notification', {
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
   * Official reference:
   * https://sportsgameodds.com/docs/guides/realtime-streaming-api
   */
  private async getStreamConnectionInfo(
    feed: StreamFeed,
    options: StreamOptions
  ): Promise<StreamConnectionInfo> {
    const apiKey = process.env.SPORTSGAMEODDS_API_KEY;
    
    if (!apiKey) {
      throw new Error('SPORTSGAMEODDS_API_KEY not configured');
    }

    const params: Record<string, string> = { feed };
    
    if (options.leagueID) params.leagueID = options.leagueID;
    if (options.eventID) params.eventID = options.eventID;
    
    // CRITICAL: Filter only main game lines per official docs
    // https://sportsgameodds.com/docs/guides/response-speed
    // Format: "game-ml,game-ats,game-ou" (moneyline, spread, total)
    params.oddIDs = 'game-ml,game-ats,game-ou';
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
   * Official reference:
   * https://sportsgameodds.com/docs/guides/realtime-streaming-api
   * https://sportsgameodds.com/docs/guides/response-speed
   */
  private async handleEventUpdates(changedEvents: EventUpdate[]): Promise<void> {
    if (changedEvents.length === 0) return;

    const eventIDs = changedEvents.map((e) => e.eventID);
    
    logger.debug('[Streaming] Fetching full data for updated events', {
      eventIDs,
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

      // Update local cache
      const updatedEvents: unknown[] = [];
      
      response.data.forEach((current) => {
        if (!current.eventID) return;
        
        const prev = this.events.get(current.eventID);
        this.events.set(current.eventID, current);
        updatedEvents.push(current);

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

      // Emit update event
      this.emit('update', updatedEvents);

    } catch (error) {
      logger.error('[Streaming] Error fetching event updates', error);
    }
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
