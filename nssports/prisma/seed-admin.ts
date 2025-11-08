import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding admin dashboard data...");

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
  console.log("✅ Admin user created:", admin.username);

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
  console.log("✅ Default odds configuration created");

  console.log("\n🎉 Seeding completed successfully!");
  console.log("\n📝 Admin credentials:");
  console.log("  Username: admin");
  console.log("  Password: admin123");
  console.log("\n💡 Use the admin dashboard to create agents and players:");
  console.log("  Dashboard: http://localhost:3000/admin");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
