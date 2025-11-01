import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanup() {
  console.log("🧹 Cleaning up test accounts...\n");

  try {
    // Delete all agents except those created by seed
    const deletedAgents = await prisma.agent.deleteMany({
      where: {
        NOT: {
          username: "admin", // Keep admin if any
        },
      },
    });
    console.log(`✅ Deleted ${deletedAgents.count} agent(s) from Agent table`);

    // Delete all non-admin users from User table
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        userType: {
          in: ["agent", "player"],
        },
      },
    });
    console.log(`✅ Deleted ${deletedUsers.count} user(s) from User table`);

    // Delete all dashboard players
    const deletedPlayers = await prisma.dashboardPlayer.deleteMany({});
    console.log(`✅ Deleted ${deletedPlayers.count} player(s) from DashboardPlayer table`);

    console.log("\n🎉 Cleanup complete!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
