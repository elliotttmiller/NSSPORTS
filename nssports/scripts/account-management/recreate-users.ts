/**
 * Recreate Production Users
 * Restores the users that were deleted during database reset
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function recreateUsers() {
  console.log('👥 Upserting production users (create or update)...\n');
  
  const users = [
    {
      username: 'slime',
      password: 'wells123', // You'll need to confirm the actual password
      name: 'Slime',
      balance: 10000.00,
    },
    {
      username: 'tony_admin',
      password: 'nssports', // You'll need to confirm the actual password
      name: 'Tony Admin',
      balance: 50000.00,
    },
    {
      username: 'yayzer',
      password: 'breezer123', // You'll need to confirm the actual password
      name: 'Yayzer',
      balance: 10000.00,
    },
  ];
  
  console.log('📝 This will create new users or update existing ones with the passwords above.\n');
  
  for (const userData of users) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Upsert user (create or update)
      const user = await prisma.user.upsert({
        where: { username: userData.username },
        update: {
          password: hashedPassword,
          name: userData.name,
        },
        create: {
          username: userData.username,
          password: hashedPassword,
          name: userData.name,
        }
      });
      
      // Upsert account with balance (create or update)
      await prisma.account.upsert({
        where: { userId: user.id },
        update: {
          balance: userData.balance,
        },
        create: {
          userId: user.id,
          balance: userData.balance,
        }
      });
      
      console.log(`✅ Updated: ${userData.username}`);
      console.log(`   Password: ${userData.password}`);
      console.log(`   Balance: $${userData.balance.toFixed(2)}\n`);
      
    } catch (error) {
      console.error(`❌ Error creating user ${userData.username}:`, error);
    }
  }
  
  console.log('\n🎉 Users upserted successfully! You can now login with the credentials above.');
  
  await prisma.$disconnect();
}

recreateUsers();
