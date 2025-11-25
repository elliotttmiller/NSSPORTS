import 'dotenv/config';
import prisma from '../../src/lib/prisma';
import { logger } from '../../src/lib/logger';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  try {
    // Delete any existing admin user
    await prisma.user.deleteMany({ where: { username: 'admin' } });
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        id: 'admin-user', // explicit id for admin
        username: 'admin',
        password: hashedPassword,
        userType: 'admin', // use 'admin' as role
        isActive: true,
        name: 'Admin',
      },
    });
    // Create linked account
    await prisma.account.create({
      data: {
        userId: adminUser.id,
        balance: 0,
        freePlay: 0,
      },
    });
    logger.info('Admin user created: admin / admin123');
  } catch (error) {
    logger.error('Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
