import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

/**
 * POST /api/agent/register-player
 * Register a new player under the authenticated agent
 */

const registerPlayerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  displayName: z.string().min(1, "Display name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: Request) {
  try {
    // Authenticate user
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user is an agent or admin
    if (!session.user.isAgent && !session.user.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Only agents can register players" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = registerPlayerSchema.parse(body);

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Username already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12);

    // Create player with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          username: validatedData.username,
          name: validatedData.displayName,
          password: hashedPassword,
          userType: "player",
          parentAgentId: session.user.id,
          isActive: true,
        },
      });

      // Create account with initial balance of 0
      const account = await tx.account.create({
        data: {
          userId: newUser.id,
          balance: 0,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          actionType: "player_registered",
          targetUserId: newUser.id,
          metadata: {
            playerId: newUser.id,
            playerUsername: newUser.username,
            playerName: newUser.name,
            agentId: session.user.id,
            agentUsername: session.user.username,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return { user: newUser, account };
    });

    return NextResponse.json({
      success: true,
      message: "Player registered successfully",
      data: {
        id: result.user.id,
        username: result.user.username,
        displayName: result.user.name,
        balance: result.account.balance,
        createdAt: result.user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error registering player:", error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    // Handle Prisma unique constraint errors
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { success: false, error: "Username already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to register player",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
