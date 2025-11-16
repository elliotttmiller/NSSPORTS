import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function GET() {
  try {
    const redis = getRedisClient();
    const lastSync = await redis.get('sync:games:lastSync');
    const lastRun = await redis.get('sync:games:lastRunSuccess');
    const checked = await redis.get('sync:games:checked') || '0';
    const updated = await redis.get('sync:games:updated') || '0';
    const errors = await redis.get('sync:games:errors') || '0';

    return NextResponse.json({
      ok: true,
      lastSync,
      lastRun,
      metrics: {
        gamesChecked: Number(checked),
        gamesUpdated: Number(updated),
        errors: Number(errors),
      }
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
