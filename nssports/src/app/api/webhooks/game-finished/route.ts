/**
 * Real-Time Game Finish Webhook Handler
 * ────────────────────────────────────────────────────────────────
 * Receives instant notifications when games finish from SDK webhooks
 * Triggers immediate bet settlement (no 5-minute delay)
 * 
 * Flow:
 * 1. SDK sends webhook when game status changes to "completed"
 * 2. This endpoint receives notification
 * 3. Adds high-priority settlement job to Redis Queue
 * 4. Worker processes immediately (< 1 second settlement)
 * 
 * Setup:
 * Configure webhook URL in SportsGameOdds dashboard:
 * https://your-domain.com/api/webhooks/game-finished
 */

import { NextResponse } from 'next/server';
import { addSettleBetsJob } from '@/lib/queues/settlement';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

/**
 * Webhook signature verification
 * Validates request is from SportsGameOdds
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Implement HMAC SHA256 signature verification
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', secret)
  //   .update(payload)
  //   .digest('hex');
  // return signature === expectedSignature;
  
  // For now, verify secret token
  return signature === secret;
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-webhook-signature');
    const webhookSecret = process.env.SPORTSGAMEODDS_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      logger.error('[Webhook] SPORTSGAMEODDS_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }
    
    const payload = await req.text();
    const data = JSON.parse(payload);
    
    // Verify webhook authenticity
    if (signature && !verifyWebhookSignature(payload, signature, webhookSecret)) {
      logger.warn('[Webhook] Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    logger.info('[Webhook] Received game finish notification', {
      eventId: data.eventID,
      status: data.status,
    });
    
    // Validate event data
    if (!data.eventID || !data.status?.completed) {
      logger.warn('[Webhook] Invalid webhook payload - missing required fields');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    
    // Update game status in database immediately
    const homeScore = data.results?.game?.home?.points;
    const awayScore = data.results?.game?.away?.points;
    
    if (homeScore == null || awayScore == null) {
      logger.warn('[Webhook] Game finished but scores not available yet', {
        eventId: data.eventID,
      });
      // Still trigger settlement - it will wait for scores
    }
    
    // Update game to finished status
    await prisma.game.update({
      where: { id: data.eventID },
      data: {
        status: 'finished',
        homeScore: homeScore ?? undefined,
        awayScore: awayScore ?? undefined,
        updatedAt: new Date(),
      },
    });
    
    logger.info('[Webhook] Updated game to finished', {
      eventId: data.eventID,
      homeScore,
      awayScore,
    });
    
    // Trigger IMMEDIATE high-priority settlement
    await addSettleBetsJob(
      {},
      {
        priority: 1, // Highest priority (process immediately)
        jobId: `webhook-settlement-${data.eventID}-${Date.now()}`,
      }
    );
    
    logger.info('[Webhook] ✅ Triggered immediate settlement for game', {
      eventId: data.eventID,
    });
    
    return NextResponse.json({
      success: true,
      eventId: data.eventID,
      settlementTriggered: true,
    });
    
  } catch (error) {
    logger.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for webhook verification (some providers require this)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    // Echo back challenge for webhook verification
    return NextResponse.json({ challenge });
  }
  
  return NextResponse.json({ status: 'Webhook endpoint active' });
}
