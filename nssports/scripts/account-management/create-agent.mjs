/**
 * Create Agent Account Script
 * 
 * Creates a test agent account for testing the agent dashboard
 * Username: agent
 * Password: admin123
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAgentAccount() {
  try {
    console.log('🔐 Creating agent account...\n');

    // Check if agent already exists
    const existingAgent = await prisma.user.findUnique({
      where: { username: 'agent' }
    });

    if (existingAgent) {
      console.log('⚠️  Agent account already exists!');
      console.log(`   Username: agent`);
      console.log(`   User Type: ${existingAgent.userType}`);
      console.log(`   Active: ${existingAgent.isActive}`);
      console.log('\nℹ️  To reset password, delete this user and run the script again.');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create agent account
    const agent = await prisma.user.create({
      data: {
        username: 'agent',
        password: hashedPassword,
        name: 'Test Agent',
        userType: 'agent',
        isActive: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    console.log('✅ Agent account created successfully!\n');
    console.log('📋 Account Details:');
    console.log(`   Username: agent`);
    console.log(`   Password: admin123`);
    console.log(`   User Type: ${agent.userType}`);
    console.log(`   User ID: ${agent.id}`);
    console.log(`   Active: ${agent.isActive}`);
    console.log('\n🚀 You can now login at: http://localhost:3000/auth/login');
    console.log('   1. Click "Agent Login"');
    console.log('   2. Enter username: agent');
    console.log('   3. Enter password: admin123');
    console.log('   4. You will be redirected to /agent dashboard\n');

  } catch (error) {
    console.error('❌ Error creating agent account:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAgentAccount()
  .then(() => {
    console.log('✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
