import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixAdmin() {
  try {
    // Hash the correct password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Update or create admin with correct role and password
    const admin = await prisma.adminUser.upsert({
      where: { username: 'admin' },
      update: {
        password: hashedPassword,
        role: 'superadmin',
        status: 'active',
      },
      create: {
        username: 'admin',
        password: hashedPassword,
        role: 'superadmin',
        status: 'active',
      },
    });
    
    console.log('✅ Admin account fixed:');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Status: ${admin.status}`);
    console.log(`   Password: admin123 (hashed)`);
    
    // Test the password
    const testPassword = await bcrypt.compare('admin123', admin.password);
    console.log(`\n✅ Password verification test: ${testPassword ? 'PASSED' : 'FAILED'}`);
  } catch (error) {
    console.error('Error fixing admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdmin();
