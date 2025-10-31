import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string;
      userType?: string; // 'player', 'agent', 'client_admin', 'platform_admin'
      tenantId?: string;
      isAgent?: boolean;
      isAdmin?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username?: string;
    userType?: string;
    tenantId?: string;
    isAgent?: boolean;
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username?: string;
    userType?: string;
    tenantId?: string;
    isAgent?: boolean;
    isAdmin?: boolean;
  }
}
