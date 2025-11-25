import bcrypt from "bcryptjs";

import 'dotenv/config';
import { logger } from '../src/lib/logger';
import prisma from '../src/lib/prisma';

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!DATABASE_URL) {
  logger.error('DATABASE_URL (or DIRECT_URL) is required to run this script.');
  process.exit(1);
}

// use shared prisma client

async function main() {
  logger.info("🌱 Seeding admin dashboard data...");

  // Create default admin user ONLY
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPassword,
      role: "superadmin",
      status: "active",
    },
  });
  logger.info('✅ Admin user created', { username: admin.username });

  // Create default odds configuration
  await prisma.oddsConfiguration.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      isActive: true,
      modifiedBy: admin.id,
      spreadMargin: 0.045,      // 4.5%
      moneylineMargin: 0.05,    // 5%
      totalMargin: 0.045,       // 4.5%
      playerPropsMargin: 0.08,  // 8%
      gamePropsMargin: 0.08,    // 8%
      roundingMethod: 'nearest10',
      minOdds: -10000,
      maxOdds: 10000,
      liveGameMultiplier: 1.0,
    },
  });
  logger.info("✅ Default odds configuration created");

  logger.info("\n🎉 Seeding completed successfully!");
  logger.info("\n📝 Admin credentials:");
  logger.info("  Username: admin");
  logger.info("  Password: admin123");
  logger.info("\n💡 Use the admin dashboard to create agents and players:");
  logger.info("  Dashboard: http://localhost:3000/admin");
}

main()
  .catch((e) => {
    logger.error('❌ Error seeding database', { error: e instanceof Error ? e.message : String(e) });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
