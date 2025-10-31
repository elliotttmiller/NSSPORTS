import prisma from "@/lib/prisma";
import { withErrorHandling, successResponse, ApiErrors } from "@/lib/apiResponse";
import { auth } from "@/lib/auth";
import { z } from "zod";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Validation schema
const AdjustBalanceSchema = z.object({
  playerId: z.string().min(1, "Player ID is required"),
  adjustmentType: z.enum(["deposit", "withdrawal", "correction"], {
    errorMap: () => ({ message: "Invalid adjustment type" }),
  }),
  amount: z.number().positive("Amount must be positive"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

/**
 * Adjust player balance
 * POST /api/agent/adjust-balance
 */
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    // Get the authenticated session
    const session = await auth();
    
    if (!session?.user) {
      throw ApiErrors.unauthorized('Authentication required');
    }

    // Check if user is an agent or admin
    if (!session.user.isAgent && !session.user.isAdmin) {
      throw ApiErrors.forbidden('Access denied. Agent or admin role required');
    }

    const agentId = session.user.id;

    try {
      // Parse and validate request body
      const body = await request.json();
      const validated = AdjustBalanceSchema.parse(body);

      const { playerId, adjustmentType, amount, reason } = validated;

      // Verify the player belongs to this agent
      const player = await prisma.user.findUnique({
        where: { id: playerId },
        include: {
          account: true,
        },
      });

      if (!player) {
        throw ApiErrors.notFound('Player not found');
      }

      if (player.parentAgentId !== agentId) {
        throw ApiErrors.forbidden('You can only adjust balances for your own players');
      }

      if (!player.account) {
        throw ApiErrors.notFound('Player account not found');
      }

      const currentBalance = Number(player.account.balance);

      // Calculate new balance based on adjustment type
      let newBalance: number;
      if (adjustmentType === "deposit" || adjustmentType === "correction") {
        newBalance = currentBalance + amount;
      } else if (adjustmentType === "withdrawal") {
        if (amount > currentBalance) {
          throw ApiErrors.badRequest(
            `Insufficient balance. Current balance: $${currentBalance.toFixed(2)}, Withdrawal amount: $${amount.toFixed(2)}`
          );
        }
        newBalance = currentBalance - amount;
      } else {
        throw ApiErrors.badRequest('Invalid adjustment type');
      }

      // Perform the adjustment in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update account balance
        await tx.account.update({
          where: { userId: playerId },
          data: {
            balance: newBalance,
          },
        });

        // Log the adjustment in BalanceAdjustment table
        const adjustment = await tx.balanceAdjustment.create({
          data: {
            playerId,
            agentId,
            adjustmentType,
            amount,
            previousBalance: currentBalance,
            newBalance,
            reason,
            tenantId: session.user.tenantId || null,
          },
        });

        // Create audit log entry
        await tx.auditLog.create({
          data: {
            userId: agentId,
            actionType: 'balance_adjusted',
            targetUserId: playerId,
            oldValue: currentBalance.toString(),
            newValue: newBalance.toString(),
            metadata: {
              adjustmentType,
              amount,
              reason,
              adjustmentId: adjustment.id,
            },
            tenantId: session.user.tenantId || null,
          },
        });

        return adjustment;
      });

      return successResponse({
        adjustmentId: result.id,
        playerId,
        playerUsername: player.username,
        adjustmentType,
        amount,
        previousBalance: currentBalance,
        newBalance,
        reason,
        timestamp: result.createdAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ApiErrors.unprocessable('Validation failed', error.errors);
      }
      
      // Re-throw ApiErrors
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      console.error('[API /agent/adjust-balance] Error:', error);
      throw ApiErrors.internal('Failed to adjust balance');
    }
  });
}
