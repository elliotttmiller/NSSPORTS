import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBadBet() {
  const betId = 'cmhykkc6w0001ud7kdrxvpcgw';
  
  console.log(`\n🔧 Fixing bet with negative payout: ${betId}\n`);
  
  // Get the bet
  const bet = await prisma.bet.findUnique({
    where: { id: betId }
  });
  
  if (!bet) {
    console.log('❌ Bet not found');
    return;
  }
  
  console.log('Current state:');
  console.log(`  Odds: ${bet.odds}`);
  console.log(`  Stake: $${bet.stake}`);
  console.log(`  Potential Payout: $${bet.potentialPayout} ❌ (WRONG)`);
  
  // Calculate correct payout
  const correctPayout = bet.stake * (1 + (100 / Math.abs(bet.odds)));
  
  console.log(`\nCorrected payout should be: $${correctPayout.toFixed(2)}`);
  
  // Update the bet
  await prisma.bet.update({
    where: { id: betId },
    data: {
      potentialPayout: correctPayout
    }
  });
  
  console.log(`\n✅ Bet updated successfully!\n`);
  
  await prisma.$disconnect();
}

fixBadBet();
