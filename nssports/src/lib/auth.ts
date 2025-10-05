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
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const { email, password } = loginSchema.parse(credentials);

          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || !user.password) return null;

          const isValidPassword = await bcrypt.compare(password, user.password);
          if (!isValidPassword) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
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
        token.id = (user as any).id;
      }
      
      // Session refresh/update
      if (trigger === "update") {
        // Could refresh user data from DB here if needed
        const refreshedUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, email: true, name: true, image: true },
        });
        
        if (refreshedUser) {
          token.email = refreshedUser.email;
          token.name = refreshedUser.name;
          token.picture = refreshedUser.image;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
});
