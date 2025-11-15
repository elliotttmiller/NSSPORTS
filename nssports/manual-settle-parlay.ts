import { PrismaClient } from '@prisma/client';
import { settleBet } from './src/services/bet-settlement.js';

const prisma = new PrismaClient();

async function manualSettle() {
  try {
    // Bet #6 - parlay with game yns3eOasN7aV5euaRRTk (finished)
    const betId = 'cmhy8nj2t00zhudlgbgmzba7o';
    
    console.log(`Attempting to settle bet ${betId}...`);
    
    // Get bet details
    const bet = await prisma.bet.findUnique({
      where: { id: betId },
      include: { game: true }
    });
    
    if (!bet) {
      console.log('Bet not found');
      return;
    }
    
    console.log('\nBet Details:');
    console.log(`Type: ${bet.betType}`);
    console.log(`Status: ${bet.status}`);
    console.log(`Stake: $${bet.stake}`);
    console.log(`Legs:`, JSON.stringify(bet.legs, null, 2));
    
    // Check games
    const legs = bet.legs as any;
    if (Array.isArray(legs)) {
      const gameIds = legs.map((leg: any) => leg.gameId).filter(Boolean);
      console.log(`\nGame IDs in parlay: ${gameIds.join(', ')}`);
      
      const games = await prisma.game.findMany({
        where: { id: { in: gameIds } }
      });
      
      console.log(`\nGames found: ${games.length}/${gameIds.length}`);
      games.forEach(game => {
        console.log(`  ${game.id}: ${game.status} (${game.awayScore}-${game.homeScore})`);
      });
    }
    
    // Try to settle
    console.log('\n--- Attempting Settlement ---');
    const result = await settleBet(betId);
    
    if (result) {
      console.log('\n✅ Settlement successful!');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\n❌ Settlement returned null - likely not ready to settle');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualSettle();
