import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPlayerData() {
  console.log('\n=== Checking Player Data Sync ===\n');
  
  // Get a sample DashboardPlayer
  const dashboardPlayer = await prisma.dashboardPlayer.findFirst({
    select: { id: true, username: true, displayName: true }
  });
  
  console.log('Sample DashboardPlayer:', dashboardPlayer);
  
  if (dashboardPlayer) {
    // Try to find matching User
    const matchingUser = await prisma.user.findFirst({
      where: { username: dashboardPlayer.username },
      select: { id: true, username: true, name: true }
    });
    
    console.log('Matching User by username:', matchingUser);
    
    // Count totals
    const dashboardCount = await prisma.dashboardPlayer.count();
    const userCount = await prisma.user.count();
    
    console.log('\nTotal DashboardPlayers:', dashboardCount);
    console.log('Total Users:', userCount);
    
    // Check for usernames in DashboardPlayer that don't exist in User
    const allDashboardPlayers = await prisma.dashboardPlayer.findMany({
      select: { username: true }
    });
    
    let missingCount = 0;
    for (const dp of allDashboardPlayers) {
      const userExists = await prisma.user.findFirst({
        where: { username: dp.username }
      });
      if (!userExists) {
        console.log(`⚠️ DashboardPlayer username "${dp.username}" has no matching User`);
        missingCount++;
      }
    }
    
    console.log(`\nResult: ${missingCount} DashboardPlayers without matching Users`);
  }
  
  await prisma.$disconnect();
}

checkPlayerData().catch(console.error);
