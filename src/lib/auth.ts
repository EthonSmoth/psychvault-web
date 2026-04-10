import NextAuth, { AuthError } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getRequiredServerEnv } from "@/lib/env";

function normalizeEmail(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function logAuthError(error: Error) {
  const name = error instanceof AuthError ? error.type : error.name;
  console.error(`[auth][error] ${name}: ${error.message}`);

  if (
    error.cause &&
    typeof error.cause === "object" &&
    "err" in error.cause &&
    error.cause.err instanceof Error
  ) {
    const { err, ...data } = error.cause as { err: Error } & Record<string, unknown>;
    console.error("[auth][cause]:", err.stack);

    if (Object.keys(data).length > 0) {
      console.error("[auth][details]:", JSON.stringify(data, null, 2));
    }

    return;
  }

  if (error.stack) {
    console.error(error.stack);
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: getRequiredServerEnv("NEXTAUTH_SECRET"),
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  logger: {
    error: logAuthError,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const email = normalizeEmail(credentials?.email as string | undefined);
          const password = credentials?.password as string | undefined;

          console.log("[auth] login attempt:", {
            email,
            hasPassword: Boolean(password),
          });

          if (!email || !password) {
            console.log("[auth] missing email or password");
            return null;
          }

          const user =
            (await db.user.findUnique({ where: { email } })) ??
            (await db.user.findFirst({
              where: {
                email: {
                  equals: email,
                  mode: "insensitive",
                },
              },
            }));

          if (!user) {
            console.log("[auth] user not found");
            return null;
          }

          if (!user.passwordHash) {
            console.log("[auth] user found but missing passwordHash");
            return null;
          }

          const matches = await bcrypt.compare(password, user.passwordHash);

          if (!matches) {
            console.log("[auth] invalid password");
            return null;
          }

          console.log("[auth] login success:", user.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          } as any;
        } catch (error) {
          console.error("[auth] authorize crash:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.sub = user.id as string;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});