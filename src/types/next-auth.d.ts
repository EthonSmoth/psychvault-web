import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      isSuperAdmin?: boolean;
      emailVerified?: boolean;
    };
  }

  interface User {
    role?: string;
    isSuperAdmin?: boolean;
    emailVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    isSuperAdmin?: boolean;
    emailVerified?: boolean;
    userStateRefreshedAt?: number;
  }
}
