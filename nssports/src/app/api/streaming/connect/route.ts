import { NextRequest } from 'next/server';
import { withErrorHandling, successResponse } from '@/lib/apiResponse';
import { getStreamingService } from '@/lib/streaming-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ConnectSchema = z.object({
  feed: z.enum(['events:live', 'events:upcoming', 'events:byid']),
  leagueID: z.string().optional(),
  eventID: z.string().optional(),
});

/**
 * Establish streaming connection
 * POST /api/streaming/connect
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const { feed, leagueID, eventID } = ConnectSchema.parse(body);

    logger.info('[Streaming API] Connecting to stream', { feed, leagueID, eventID });

    // Check if streaming is enabled (All-Star plan feature)
    if (!process.env.SPORTSGAMEODDS_STREAMING_ENABLED || process.env.SPORTSGAMEODDS_STREAMING_ENABLED === 'false') {
      logger.info('[Streaming API] Streaming disabled - Pro plan uses REST API polling');
      return successResponse({
        status: 'disabled',
        message: 'Streaming requires All-Star plan. Using REST API polling.',
        feed,
        leagueID,
        eventID,
      });
    }

    const streamingService = getStreamingService();
    
    await streamingService.connect(feed, {
      leagueID,
      eventID,
    });

    return successResponse({
      status: 'connected',
      feed,
      leagueID,
      eventID,
    });
  });
}
