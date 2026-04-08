/**
 * Streaming Service – Real-Time Odds Updates via Pusher
 *
 * Implements the SportsGameOdds real-time streaming API using the official
 * Pusher WebSocket transport.
 *
 * Plan requirements:
 * - On `connect()` call `getStreamConnection()` from the SDK to obtain Pusher
 *   credentials and the channel name.
 * - Use `pusher-js` (already a project dependency) to connect and subscribe.
 * - Re-emit Pusher binding events as normalised events so the rest of the app
 *   (liveDataStore, streaming-worker) can listen with the same interface they
 *   use today.
 *
 * Supported events emitted by this service:
 *   'connected'          – WebSocket has successfully connected
 *   'disconnected'       – WebSocket has disconnected
 *   'error'              – connection or subscription error
 *   'event:updated'      – a game/event was updated (payload: SDK event object)
 *   'props:updated'      – player props were updated (payload: { eventID })
 *   'update'             – alias fired alongside 'event:updated' for legacy listeners
 *
 * Official docs: https://sportsgameodds.com/docs/guides/realtime-streaming-api
 *
 * NOTE: Streaming requires an AllStar plan subscription.
 * Pro plan users should use REST polling instead (see liveDataStore.ts).
 */

import Pusher, { type Channel } from 'pusher-js';
import { getStreamConnection } from './sportsgameodds-sdk';
import { logger } from './logger';

const log = logger.createScopedLogger('StreamingService');

// Event emitter callback type
type EventHandler = (data: unknown) => void;

export class StreamingService {
  private pusher: Pusher | null = null;
  private channel: Channel | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private connected = false;

  // -------------------------------------------------------------------------
  // Public interface
  // -------------------------------------------------------------------------

  /**
   * Connect to the real-time streaming service.
   *
   * @param feed    Feed type per SDK docs ('events:live', 'events:upcoming',
   *                'events:byid').  Defaults to 'events:live'.
   * @param options Optional parameters forwarded to getStreamConnection().
   */
  async connect(
    feed: 'events:live' | 'events:upcoming' | 'events:byid' = 'events:live',
    options: {
      leagueID?: string;
      eventID?: string;
      oddID?: string;
      includeOpposingOdds?: boolean;
      enablePropsStreaming?: boolean;
    } = {},
  ): Promise<void> {
    if (this.connected) {
      log.info('Already connected – skipping duplicate connect()');
      return;
    }

    try {
      log.info(`Connecting to streaming feed: ${feed}`, options);

      // Obtain Pusher credentials from the SDK
      const { pusherKey, pusherOptions, channel: channelName, initialData } =
        await getStreamConnection(feed, {
          leagueID: options.leagueID,
          eventID: options.eventID,
          oddID: options.oddID,
          includeOpposingOdds: options.includeOpposingOdds,
        });

      if (!pusherKey || !channelName) {
        throw new Error('SportsGameOdds stream connection did not return Pusher credentials');
      }

      // Initialise Pusher client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.pusher = new Pusher(pusherKey, pusherOptions as any ?? {});

      // Track connection state
      this.pusher.connection.bind('connected', () => {
        this.connected = true;
        log.info('Pusher connection established');
        this._emit('connected', null);
      });

      this.pusher.connection.bind('disconnected', () => {
        this.connected = false;
        log.warn('Pusher connection lost');
        this._emit('disconnected', null);
      });

      this.pusher.connection.bind('error', (err: unknown) => {
        log.error('Pusher connection error', err);
        this._emit('error', err);
      });

      // Subscribe to the channel
      this.channel = this.pusher.subscribe(channelName);

      // Bind to the SDK's standard update event names
      this.channel.bind('event:updated', (data: unknown) => {
        this._emit('event:updated', data);
        this._emit('update', data); // legacy alias
      });

      if (options.enablePropsStreaming) {
        this.channel.bind('props:updated', (data: unknown) => {
          this._emit('props:updated', data);
        });
      }

      // If the SDK returned initial data, emit it so the store can hydrate
      if (Array.isArray(initialData) && initialData.length > 0) {
        log.info(`Hydrating store with ${initialData.length} initial events from stream`);
        for (const event of initialData) {
          this._emit('event:updated', event);
        }
      }

      log.info(`Subscribed to channel: ${channelName}`);
    } catch (error) {
      log.error('Failed to connect to streaming service', error);
      this._emit('error', error);
      throw error;
    }
  }

  /** Disconnect from the streaming service and clean up resources. */
  disconnect(): void {
    if (this.channel) {
      this.channel.unbind_all();
      this.pusher?.unsubscribe(this.channel.name);
      this.channel = null;
    }
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }
    this.connected = false;
    log.info('Streaming service disconnected');
    this._emit('disconnected', null);
  }

  /**
   * Subscribe to a named event.
   * @returns An unsubscribe function.
   */
  subscribe(event: string, handler: EventHandler): () => void {
    this.on(event, handler);
    return () => this.off(event, handler);
  }

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  isConnected(): boolean {
    return this.connected;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _emit(event: string, data: unknown): void {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        log.error(`Error in "${event}" handler`, err);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton helpers (used by liveDataStore and streaming-worker)
// ---------------------------------------------------------------------------

let _instance: StreamingService | null = null;

/** Return the module-level singleton StreamingService instance. */
export function getStreamingService(): StreamingService {
  if (!_instance) {
    _instance = new StreamingService();
  }
  return _instance;
}

/** Shared singleton (pre-created for convenience). */
export const streamingService = new StreamingService();

/** No-op placeholder kept for interface compatibility. */
export async function initStreamingService(): Promise<void> {}

/** Disconnect and destroy the module-level singleton. */
export async function closeStreamingService(): Promise<void> {
  _instance?.disconnect();
  _instance = null;
}
