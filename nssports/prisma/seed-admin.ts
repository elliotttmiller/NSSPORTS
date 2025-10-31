import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding admin dashboard data...");

  // Create default admin user
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

  // Create sample agents
  const agentPassword = await bcrypt.hash("agent123", 10);
  
  const agent1 = await prisma.agent.upsert({
    where: { username: "john_smith" },
    update: {},
    create: {
      username: "john_smith",
      displayName: "John Smith",
      password: agentPassword,
      maxSingleAdjustment: 1000,
      dailyAdjustmentLimit: 5000,
      canSuspendPlayers: true,
      status: "active",
      createdBy: admin.id,
    },
  });
  console.log("✅ Agent created:", agent1.username);

  const agent2 = await prisma.agent.upsert({
    where: { username: "lisa_ops" },
    update: {},
    create: {
      username: "lisa_ops",
      displayName: "Lisa Operations",
      password: agentPassword,
      maxSingleAdjustment: 1000,
      dailyAdjustmentLimit: 5000,
      canSuspendPlayers: true,
      status: "active",
      createdBy: admin.id,
    },
  });
  console.log("✅ Agent created:", agent2.username);

  // Create sample players
  const playerPassword = await bcrypt.hash("player123", 10);

  const player1 = await prisma.dashboardPlayer.upsert({
    where: { username: "mike_2024" },
    update: {},
    create: {
      username: "mike_2024",
      displayName: "Mike Johnson",
      password: playerPassword,
      agentId: agent1.id,
      balance: 450,
      bettingLimits: {
        maxBetAmount: 10000,
        maxDailyBets: 50,
        minBetAmount: 5,
      },
      status: "active",
    },
  });
  console.log("✅ Player created:", player1.username);

  const player2 = await prisma.dashboardPlayer.upsert({
    where: { username: "sara_player" },
    update: {},
    create: {
      username: "sara_player",
      displayName: "Sara Smith",
      password: playerPassword,
      agentId: agent2.id,
      balance: 1200,
      bettingLimits: {
        maxBetAmount: 10000,
        maxDailyBets: 50,
        minBetAmount: 5,
      },
      status: "active",
    },
  });
  console.log("✅ Player created:", player2.username);

  console.log("\n🎉 Seeding completed successfully!");
  console.log("\n📝 Default credentials:");
  console.log("Admin:");
  console.log("  Username: admin");
  console.log("  Password: admin123");
  console.log("\nAgent:");
  console.log("  Username: john_smith or lisa_ops");
  console.log("  Password: agent123");
  console.log("\nPlayer:");
  console.log("  Username: mike_2024 or sara_player");
  console.log("  Password: player123");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
