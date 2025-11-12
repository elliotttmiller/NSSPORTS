import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/agent/users/[userId]
 * 
 * Delete/deactivate a player
 * Only accessible by agents who manage this player
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Authenticate
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is an agent or admin
    if (!session.user.isAgent && !session.user.isAdmin) {
      return NextResponse.json(
        { error: "Access denied. Agent or admin role required" },
        { status: 403 }
      );
    }

    const { userId } = await params;

    // Verify the user exists and belongs to this agent
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        username: true,
        parentAgentId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    // Verify ownership (unless admin)
    if (session.user.isAgent && !session.user.isAdmin) {
      if (user.parentAgentId !== session.user.id) {
        return NextResponse.json(
          { error: "Player not found or not managed by you" },
          { status: 404 }
        );
      }
    }

    // Soft delete by deactivating the user instead of hard delete
    // This preserves bet history and transaction records
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        actionType: "player_deactivated",
        targetUserId: userId,
        metadata: {
          playerId: userId,
          playerUsername: user.username,
          agentId: session.user.id,
          agentUsername: session.user.username,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Player deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating player:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
