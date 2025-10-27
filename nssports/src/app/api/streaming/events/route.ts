import { NextRequest } from 'next/server';
import { getStreamingService } from '@/lib/streaming-service';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Type for streaming events
interface StreamEvent {
  eventID: string;
  [key: string]: unknown;
}

/**
 * Server-Sent Events (SSE) endpoint for streaming odds updates
 * GET /api/streaming/events
 * 
 * Returns a stream of odds updates as they occur in real-time
 */
export async function GET(request: NextRequest) {
  logger.info('[Streaming API] Client connected to SSE stream');

  const encoder = new TextEncoder();
  const streamingService = getStreamingService();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const connectMessage = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));

      // Listen for odds updates
      streamingService.on('update', (events: StreamEvent[]) => {
        logger.info('[Streaming API] Broadcasting update to client', {
          eventCount: events.length,
        });

        events.forEach((event: StreamEvent) => {
          const message = `data: ${JSON.stringify({
            type: 'update',
            eventID: event.eventID,
            event,
            timestamp: new Date().toISOString(),
          })}\n\n`;
          
          try {
            controller.enqueue(encoder.encode(message));
          } catch (err) {
            logger.warn('[Streaming API] Failed to send update, client may have disconnected', { 
              error: err instanceof Error ? err.message : String(err) 
            });
          }
        });
      });

      // Listen for state changes
      streamingService.on('state_change', (states: { previous: string; current: string }) => {
        const message = `data: ${JSON.stringify({
          type: 'state_change',
          state: states.current,
          timestamp: new Date().toISOString(),
        })}\n\n`;
        
        try {
          controller.enqueue(encoder.encode(message));
        } catch (err) {
          logger.warn('[Streaming API] Failed to send state change', { 
            error: err instanceof Error ? err.message : String(err) 
          });
        }
      });

      // Listen for errors
      streamingService.on('error', (err: unknown) => {
        const message = `data: ${JSON.stringify({
          type: 'error',
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        })}\n\n`;
        
        try {
          controller.enqueue(encoder.encode(message));
        } catch (sendError) {
          logger.error('[Streaming API] Failed to send error message', { 
            error: sendError instanceof Error ? sendError.message : String(sendError) 
          });
        }
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        logger.info('[Streaming API] Client disconnected from SSE stream');
        controller.close();
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        const heartbeat = `data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
        })}\n\n`;
        
        try {
          controller.enqueue(encoder.encode(heartbeat));
        } catch (err) {
          logger.warn('[Streaming API] Heartbeat failed, clearing interval', { 
            error: err instanceof Error ? err.message : String(err) 
          });
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Clean up on close
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        logger.info('[Streaming API] Cleaning up SSE connection');
      };

      // Store cleanup function on controller
      (controller as unknown as { cleanup?: () => void }).cleanup = cleanup;
    },

    cancel() {
      logger.info('[Streaming API] Stream cancelled');
      const cleanup = (this as unknown as { cleanup?: () => void }).cleanup;
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
