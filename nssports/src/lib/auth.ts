import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { z } from "zod";

/**
 * NextAuth.js v5 Configuration
 * 
 * Official Next.js Authentication Best Practices:
 * - JWT-based session strategy for scalability
 * - Secure credential validation with Zod
 * - Proper error handling
 * - Type-safe callbacks
 * 
 * Reference: https://nextjs.org/docs/app/guides/authentication
 */

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const { username, password } = loginSchema.parse(credentials);

          const user = await prisma.user.findUnique({
            where: { username },
          });

          if (!user || !user.password) return null;

          // Check if account is locked
          if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
            console.error(`Account locked until ${user.accountLockedUntil}`);
            return null;
          }

          // Check if account is active
          if (!user.isActive) {
            console.error(`Account is inactive: ${username}`);
            return null;
          }

          const isValidPassword = await bcrypt.compare(password, user.password);
          
          if (!isValidPassword) {
            // Increment login attempts
            const attempts = user.loginAttempts + 1;
            const shouldLock = attempts >= 5;
            
            await prisma.user.update({
              where: { id: user.id },
              data: {
                loginAttempts: attempts,
                accountLockedUntil: shouldLock 
                  ? new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
                  : null,
              },
            });
            
            return null;
          }

          // Successful login - reset attempts and update lastLogin
          await prisma.user.update({
            where: { id: user.id },
            data: {
              loginAttempts: 0,
              accountLockedUntil: null,
              lastLogin: new Date(),
            },
          });

          return {
            id: user.id,
            username: user.username,
            name: user.name,
            image: user.image,
            userType: user.userType,
            tenantId: user.tenantId ?? undefined,
            isAgent: user.userType === 'agent',
            isAdmin: ['client_admin', 'platform_admin'].includes(user.userType),
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in
      if (user) {
        // Type assertion for our extended user properties
        const extendedUser = user as typeof user & {
          userType?: string;
          tenantId?: string;
          isAgent?: boolean;
          isAdmin?: boolean;
        };
        
        token.id = user.id as string;
        token.username = user.username;
        token.name = user.name;
        token.picture = user.image;
        token.userType = extendedUser.userType;
        token.tenantId = extendedUser.tenantId;
        token.isAgent = extendedUser.isAgent;
        token.isAdmin = extendedUser.isAdmin;
        
        // Ensure account exists for this user with default balance (only for players)
        if (!extendedUser.isAgent && !extendedUser.isAdmin) {
          try {
            await prisma.account.upsert({
              where: { userId: user.id as string },
              update: {}, // Don't update if exists
              create: {
                userId: user.id as string,
                balance: 1000.00, // Starting balance for new users
              },
            });
          } catch (error) {
            console.error("Failed to create/verify account:", error);
          }
        }
      }
      
      // Session refresh/update
      if (trigger === "update") {
        // Could refresh user data from DB here if needed
        const refreshedUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { 
            id: true, 
            username: true, 
            name: true, 
            image: true,
            userType: true,
            tenantId: true,
          },
        });
        
        if (refreshedUser) {
          token.username = refreshedUser.username;
          token.name = refreshedUser.name;
          token.picture = refreshedUser.image;
          token.userType = refreshedUser.userType;
          token.tenantId = refreshedUser.tenantId;
          token.isAgent = refreshedUser.userType === 'agent';
          token.isAdmin = ['client_admin', 'platform_admin'].includes(refreshedUser.userType);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.username = token.username as string;
        session.user.image = token.picture as string;
        session.user.userType = token.userType as string;
        session.user.tenantId = token.tenantId as string;
        session.user.isAgent = token.isAgent as boolean;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
});
