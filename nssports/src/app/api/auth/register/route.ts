import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { withErrorHandling, successResponse, ApiErrors } from "@/lib/apiResponse";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const body = await req.json();

    // Validate input
    let validatedData;
    try {
      validatedData = registerSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiErrors.unprocessable("Validation failed", error.errors);
      }
      throw error;
    }

    const { username, password, name } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return ApiErrors.conflict("User with this username already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and account in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          name: name || null,
        },
        select: {
          id: true,
          username: true,
          name: true,
          createdAt: true,
        },
      });

      // Create account with initial balance
      await tx.account.create({
        data: {
          userId: newUser.id,
          balance: 1000.0, // Starting balance
        },
      });

      return newUser;
    });

    return successResponse(
      {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
        },
      },
      201
    );
  });
}
