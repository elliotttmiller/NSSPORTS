/**
 * Create Test User Script
 * Creates a default test user for development/testing
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  console.log('👤 Creating test user...\n');
  
  const testUser = {
    username: 'test',
    password: 'test123',
    name: 'Test User',
  };
  
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: testUser.username }
    });
    
    if (existingUser) {
      console.log(`⚠️  User "${testUser.username}" already exists!`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Created: ${existingUser.createdAt.toISOString()}`);
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        username: testUser.username,
        password: hashedPassword,
        name: testUser.name,
      }
    });
    
    console.log('✅ Test user created successfully!');
    console.log(`   Username: ${testUser.username}`);
    console.log(`   Password: ${testUser.password}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${user.createdAt.toISOString()}\n`);
    
    // Create account with starting balance
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        balance: 1000.00,
      }
    });
    
    console.log('💰 Account created successfully!');
    console.log(`   Balance: $${account.balance.toFixed(2)}`);
    console.log(`   Created: ${account.createdAt.toISOString()}\n`);
    
    console.log('🎉 You can now login with:');
    console.log(`   Username: ${testUser.username}`);
    console.log(`   Password: ${testUser.password}\n`);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
