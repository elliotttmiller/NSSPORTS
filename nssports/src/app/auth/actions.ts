"use server";

/**
 * Authentication Server Actions
 * 
 * Official Next.js Server Actions Pattern:
 * - Progressive enhancement with useFormState/useFormStatus
 * - Type-safe with Zod validation
 * - Integrated with NextAuth for authentication
 * - Returns structured state for client-side UI updates
 * 
 * References:
 * - https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
 * - https://nextjs.org/docs/app/api-reference/functions/server-actions
 */

import { signIn } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { AuthError } from "next-auth";

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

// Action return types for type safety
export type LoginState = {
  success: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
};

export type RegisterState = {
  success: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
};

/**
 * Login Server Action
 * 
 * Progressive enhancement ready:
 * - Works without JavaScript (form submission)
 * - Returns structured state for useFormState
 * - Integrates with NextAuth signIn
 */
export async function loginAction(
  prevState: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  try {
    // Extract and validate form data
    const rawData = {
      username: formData.get("username"),
      password: formData.get("password"),
    };

    const validatedData = loginSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        error: "Validation failed",
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    const { username, password } = validatedData.data;

    // Attempt to sign in using NextAuth
    try {
      await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      // If signIn doesn't throw an error, login was successful
      return {
        success: true,
        message: "Logged in successfully!",
      };
    } catch (error) {
      // NextAuth throws AuthError on failed login
      if (error instanceof AuthError) {
        return {
          success: false,
          error: "Invalid username or password",
        };
      }
      throw error;
    }
  } catch (error) {
    console.error("Login action error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during login",
    };
  }
}

/**
 * Register Server Action
 * 
 * Progressive enhancement ready:
 * - Works without JavaScript (form submission)
 * - Returns structured state for useFormState
 * - Creates user with initial account balance
 * - Automatically logs in after successful registration
 */
export async function registerAction(
  prevState: RegisterState | null,
  formData: FormData
): Promise<RegisterState> {
  try {
    // Extract and validate form data
    const rawData = {
      username: formData.get("username"),
      password: formData.get("password"),
      name: formData.get("name"),
    };

    const validatedData = registerSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        error: "Validation failed",
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    const { username, password, name } = validatedData.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return {
        success: false,
        error: "User with this username already exists",
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and account in a transaction
    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          name: name || null,
        },
      });

      // Create account with initial balance
      await tx.account.create({
        data: {
          userId: newUser.id,
          balance: 1000.0, // Starting balance
        },
      });
    });

    // Automatically log in after successful registration
    try {
      await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      return {
        success: true,
        message: "Account created successfully!",
      };
    } catch (_error) {
      // Registration succeeded but auto-login failed
      return {
        success: true,
        message: "Account created! Please log in.",
      };
    }
  } catch (error) {
    console.error("Register action error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during registration",
    };
  }
}
