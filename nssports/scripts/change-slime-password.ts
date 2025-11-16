import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function changeSlimePassword() {
  console.log("🔐 Changing password for agent 'slime'...\n");
  
  const username = "slime";
  const newPassword = "wells123";
  
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { username },
    });
    
    if (!user) {
      console.log(`❌ User '${username}' not found!`);
      console.log("   Creating new agent user...\n");
      
      // Create the agent user
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const newUser = await prisma.user.create({
        data: {
          username: username,
          password: hashedPassword,
          name: "Slime",
          userType: "agent",
          isActive: true,
        },
      });
      
      // Create account for the agent
      await prisma.account.create({
        data: {
          userId: newUser.id,
          balance: 0,
          freePlay: 0,
        },
      });
      
      console.log("✅ Agent user created successfully:");
      console.log(`   Username: ${newUser.username}`);
      console.log(`   Password: ${newPassword}`);
      console.log(`   User Type: ${newUser.userType}`);
      console.log(`   ID: ${newUser.id}`);
      
      return;
    }
    
    console.log("✅ User found:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   UserType: ${user.userType}`);
    console.log(`   IsActive: ${user.isActive}`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        loginAttempts: 0,
        accountLockedUntil: null,
      },
    });
    
    console.log("\n✅ Password updated successfully!");
    console.log(`   New password: ${newPassword}`);
    console.log("   Login attempts reset");
    console.log("   Account unlocked");
    
    // Verify the new password
    const updatedUser = await prisma.user.findUnique({
      where: { username },
    });
    
    if (updatedUser) {
      const isValid = await bcrypt.compare(newPassword, updatedUser.password);
      if (isValid) {
        console.log("\n✅ Password verification: SUCCESS");
        console.log("   The new password is working correctly!");
      } else {
        console.log("\n❌ Password verification: FAILED");
        console.log("   Something went wrong!");
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

changeSlimePassword();
