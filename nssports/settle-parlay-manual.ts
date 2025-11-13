import { PrismaClient } from '@prisma/client';
import { settleBet } from './src/services/bet-settlement';

const prisma = new PrismaClient();

async function settlePendingParlays() {
  console.log('=== MANUAL PARLAY SETTLEMENT ===\n');

  // Find all pending parlay bets
  const pendingParlays = await prisma.bet.findMany({
    where: {
      betType: 'parlay',
      status: 'pending'
    },
  });

  console.log(`Found ${pendingParlays.length} pending parlays\n`);

  for (const parlay of pendingParlays) {
    console.log(`\nChecking parlay ${parlay.id.slice(0, 20)}...`);
    
    if (!parlay.legs || !Array.isArray(parlay.legs)) {
      console.log('  ⚠️ No legs found, skipping');
      continue;
    }

    const legs = parlay.legs as any[];
    console.log(`  Has ${legs.length} legs`);

    // Check if all leg games exist and are finished
    let allGamesFinished = true;
    let missingGames = 0;

    for (const leg of legs) {
      if (!leg.gameId) continue;

      const game = await prisma.game.findUnique({
        where: { id: leg.gameId },
        select: { id: true, status: true }
      });

      if (!game) {
        console.log(`  ⚠️ Game ${leg.gameId} not found`);
        missingGames++;
        allGamesFinished = false;
      } else if (game.status !== 'finished') {
        console.log(`  ⏳ Game ${leg.gameId} status: ${game.status}`);
        allGamesFinished = false;
      } else {
        console.log(`  ✓ Game ${leg.gameId} is finished`);
      }
    }

    if (missingGames > 0) {
      console.log(`  ❌ Cannot settle: ${missingGames} games missing from database`);
      continue;
    }

    if (!allGamesFinished) {
      console.log(`  ⏳ Cannot settle: Not all games finished`);
      continue;
    }

    // All games are finished, settle the parlay
    console.log(`  ✅ All games finished, settling parlay...`);
    
    try {
      const result = await settleBet(parlay.id);
      console.log(`  ✅ Settled:`, result);
    } catch (error) {
      console.error(`  ❌ Error settling:`, error);
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ Parlay settlement complete!');
}

settlePendingParlays().catch(console.error);
