import NextAuth, { AuthError } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { getRequiredServerEnv, isGoogleOAuthEnabled } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getSafeAuthRedirectUrl } from "@/lib/redirects";

function normalizeEmail(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function logAuthError(error: Error) {
  const name = error instanceof AuthError ? error.type : error.name;
  logger.error(`[auth] ${name}: ${error.message}`);

  if (
    "cause" in error &&
    error.cause &&
    typeof error.cause === "object" &&
    "err" in error.cause &&
    error.cause.err instanceof Error
  ) {
    const { err, ...data } = error.cause as { err: Error } & Record<string, unknown>;
    logger.debug("[auth][cause]", err);

    if (Object.keys(data).length > 0) {
      logger.debug("[auth][details]", data);
    }

    return;
  }

  if (error.stack) {
    logger.debug("[auth][stack]", error);
  }
}

const AUTH_USER_STATE_REFRESH_MS = 30 * 1000;

function applyAuthUserStateToToken(
  token: Record<string, unknown>,
  authUser: Awaited<ReturnType<typeof getAuthUserState>>
) {
  if (!authUser) {
    delete token.sub;
    delete token.email;
    delete token.name;
    delete token.role;
    delete token.isSuperAdmin;
    delete token.emailVerified;
    delete token.userStateRefreshedAt;
    return token;
  }

  token.sub = authUser.id;
  token.email = authUser.email;
  token.name = authUser.name;
  token.role = authUser.role;
  token.isSuperAdmin = authUser.isSuperAdmin;
  token.emailVerified = Boolean(authUser.emailVerified);
  token.userStateRefreshedAt = Date.now();
  return token;
}

async function getAuthUserState(input: { id?: string | null; email?: string | null }) {
  const email = normalizeEmail(input.email ?? undefined);

  if (!input.id && !email) {
    return null;
  }

  return db.user.findFirst({
    where: input.id
      ? { id: input.id }
      : {
          email,
        },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isSuperAdmin: true,
      emailVerified: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Linked Prisma adapter
//
// When a new OAuth user signs in for the first time, the PrismaAdapter calls
// createUser() to insert a row. We override that method to first look up (or
// create) the matching Supabase auth.users entry by email so that the Prisma
// User.id is pinned to the Supabase auth UUID — the same guarantee we enforce
// in the credentials sign-up routes.
//
// allowDangerousEmailAccountLinking on the Google provider already prevents a
// second User row being created when an existing credentials account shares
// the same email: NextAuth finds the Prisma user via getUserByEmail and links
// the OAuth account to it instead of calling createUser.
// ---------------------------------------------------------------------------

async function getOrCreateSupabaseAuthId(
  email: string,
  emailVerified: boolean
): Promise<string> {
  // Query auth.users directly via Prisma raw — reliable regardless of SDK version.
  const existing = await db.$queryRaw<Array<{ id: string }>>` 
    SELECT id FROM auth.users WHERE lower(email) = lower(${email}) LIMIT 1
  `;

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create a new Supabase auth entry. The user will continue to authenticate
  // through NextAuth credentials (bcrypt), so no Supabase password is needed.
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: emailVerified,
  });

  if (error || !data?.user) {
    throw new Error(`[auth] Failed to create Supabase auth user for ${email}: ${error?.message}`);
  }

  return data.user.id;
}

function createLinkedPrismaAdapter() {
  const base = PrismaAdapter(db);
  return {
    ...base,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createUser: async (user: any) => {
      const supabaseUserId = await getOrCreateSupabaseAuthId(
        user.email as string,
        !!user.emailVerified
      );

      return db.user.create({
        data: {
          id: supabaseUserId,
          name: (user.name as string | null) ?? (user.email as string).split("@")[0],
          email: user.email as string,
          emailVerified: user.emailVerified as Date | null,
          image: user.image as string | null,
        },
      });
    },
  };
}

const providers = [
  ...(isGoogleOAuthEnabled()
    ? [
        Google({
          clientId: getRequiredServerEnv("AUTH_GOOGLE_ID"),
          clientSecret: getRequiredServerEnv("AUTH_GOOGLE_SECRET"),
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      try {
        const email = normalizeEmail(credentials?.email as string | undefined);
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            isSuperAdmin: true,
            emailVerified: true,
          },
        });

        if (!user) {
          return null;
        }

        if (!user.passwordHash) {
          return null;
        }

        const matches = await bcrypt.compare(password, user.passwordHash);

        if (!matches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
          emailVerified: Boolean(user.emailVerified),
        } as any;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2024"
        ) {
          logger.error("[auth] prisma connection pool timeout.", error);
          throw error;
        }

        logger.error("[auth] authorize crash.", error);
        return null;
      }
    },
  }),
];

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: getRequiredServerEnv("NEXTAUTH_SECRET"),
  adapter: createLinkedPrismaAdapter(),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 12,
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 7,
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  logger: {
    error: logAuthError,
  },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        await db.user.updateMany({
          where: {
            email: normalizeEmail(user.email),
            emailVerified: null,
          },
          data: {
            emailVerified: new Date(),
          },
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id as string;
      }

      const lastRefreshAt =
        typeof token.userStateRefreshedAt === "number" ? token.userStateRefreshedAt : 0;
      const shouldRefreshFromDatabase =
        Boolean(user) ||
        !token.sub ||
        !token.email ||
        Date.now() - lastRefreshAt > AUTH_USER_STATE_REFRESH_MS;

      if (!shouldRefreshFromDatabase) {
        return token;
      }

      const authUser = await getAuthUserState({
        id: (user?.id as string | undefined) ?? token.sub,
        email: user?.email ?? token.email,
      });

      return applyAuthUserStateToToken(token, authUser);
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).isSuperAdmin = Boolean(token.isSuperAdmin);
        (session.user as any).emailVerified = Boolean(token.emailVerified);
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      return getSafeAuthRedirectUrl(url, baseUrl);
    },
  },
});
