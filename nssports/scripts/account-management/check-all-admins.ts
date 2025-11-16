import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmins() {
  try {
    const admins = await prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    
    console.log('\n=== Admin Users in Database ===');
    console.log(`Total count: ${admins.length}\n`);
    
    if (admins.length === 0) {
      console.log('❌ No admin users found in database!');
    } else {
      admins.forEach(admin => {
        console.log(`Username: ${admin.username}`);
        console.log(`Role: ${admin.role}`);
        console.log(`Status: ${admin.status}`);
        console.log(`Created: ${admin.createdAt.toISOString()}`);
        console.log('---');
      });
    }
  } catch (error) {
    console.error('Error checking admins:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmins();
