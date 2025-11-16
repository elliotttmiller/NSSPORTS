import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.user.findUnique({
      where: { username: 'admin' },
    });
    if (!admin) {
      console.error('Admin user does NOT exist.');
      process.exit(1);
    }
    console.log('Admin user found:');
    console.log({
      id: admin.id,
      username: admin.username,
      userType: admin.userType,
      isActive: admin.isActive,
      password: admin.password ? '(password is set)' : '(no password)'
    });
  } catch (error) {
    console.error('Error checking admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
