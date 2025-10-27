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
