import { withErrorHandling, successResponse } from '@/lib/apiResponse';
import { getStreamingService } from '@/lib/streaming-service';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Disconnect from streaming
 * POST /api/streaming/disconnect
 */
export async function POST() {
  return withErrorHandling(async () => {
    logger.info('[Streaming API] Disconnecting from stream');

    const streamingService = getStreamingService();
    streamingService.disconnect();

    return successResponse({
      status: 'disconnected',
    });
  });
}
