/**
 * Test syncing a single game to verify score fetching works
 */
import { getEvents } from './src/lib/sportsgameodds-sdk';
import { prisma } from './src/lib/prisma';

async function testSync() {
  try {
    console.log('\n========================================');
    console.log('Testing Score Sync for Game yns3eOasN7aV5euaRRTk');
    console.log('========================================\n');
    
    // Fetch from SDK
    console.log('1. Fetching from SDK...');
    const response = await getEvents({
      eventIDs: 'yns3eOasN7aV5euaRRTk',
      finalized: true // Get finished games
    });
    
    if (response.data.length === 0) {
      console.log('❌ Game not found in SDK');
      return;
    }
    
    const event = response.data[0];
    console.log('\n✅ SDK Event Data:');
    console.log('  Event ID:', event.eventID);
    console.log('  Status completed:', event.status?.completed);
    console.log('  results?.game?.home?.points:', event.results?.game?.home?.points);
    console.log('  results?.game?.away?.points:', event.results?.game?.away?.points);
    console.log('  teams?.home?.score:', (event as any).teams?.home?.score);
    console.log('  teams?.away?.score:', (event as any).teams?.away?.score);
    
    // Check database
    console.log('\n2. Current Database State:');
    const dbGame = await prisma.game.findUnique({
      where: { id: 'yns3eOasN7aV5euaRRTk' }
    });
    
    console.log('  Status:', dbGame?.status);
    console.log('  Home Score:', dbGame?.homeScore);
    console.log('  Away Score:', dbGame?.awayScore);
    
    // Show what would be updated
    const homeScore = event.results?.game?.home?.points;
    const awayScore = event.results?.game?.away?.points;
    
    console.log('\n3. Scores to Update:');
    console.log('  Home Score:', homeScore);
    console.log('  Away Score:', awayScore);
    console.log('  Can Update:', homeScore != null && awayScore != null ? '✅ YES' : '❌ NO');
    
    console.log('\n========================================\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSync();
