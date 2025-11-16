#!/usr/bin/env tsx
/**
 * Streaming Worker
 * Connects to SportsGameOdds streaming service and triggers targeted sync
 * for updated events to mark finished games and settle bets quickly.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getStreamingService } from '../lib/streaming-service';
import { syncFinishedGames } from '../scripts/sync-game-status';
import { logger } from '../lib/logger';

async function main() {
  const streamingEnabled = process.env.SPORTSGAMEODDS_STREAMING_ENABLED === 'true';
  if (!streamingEnabled) {
    logger.info('[streaming-worker] Streaming disabled by env (SPORTSGAMEODDS_STREAMING_ENABLED=false). Exiting.');
    process.exit(0);
  }

  const service = getStreamingService();

  service.on('connected', () => logger.info('[streaming-worker] Streaming service connected'));
  service.on('disconnected', () => logger.warn('[streaming-worker] Streaming service disconnected'));
  service.on('error', (err) => logger.error('[streaming-worker] Streaming service error', err));

  // Listen to update events emitted by StreamingService (full event objects)
  service.on('update', async () => {
    try {
      logger.info('[streaming-worker] Received update event');
      const res = await syncFinishedGames();
      logger.info('[streaming-worker] syncFinishedGames result', { result: res });
    } catch (error) {
      logger.error('[streaming-worker] Error handling update event', error);
    }
  });

  // Also listen to props-specific events which provide { eventID }
  service.on('props:updated', async () => {
    try {
      logger.info('[streaming-worker] Props update event received');
      const res = await syncFinishedGames();
      logger.info('[streaming-worker] syncFinishedGames result', { result: res });
    } catch (error) {
      logger.error('[streaming-worker] Error handling props:updated', error);
    }
  });

  // Start connection (enable props streaming if env set)
  try {
    const enableProps = process.env.STREAMING_ENABLE_PROPS === 'true';
    await service.connect('events:live', { enablePropsStreaming: enableProps });
    logger.info('[streaming-worker] Connected and listening for updates');
  } catch (error) {
    logger.error('[streaming-worker] Failed to start streaming service', error);
    process.exit(1);
  }
}

main().catch((err) => {
  // Top-level error
  console.error('[streaming-worker] Fatal error', err);
  process.exit(1);
});
