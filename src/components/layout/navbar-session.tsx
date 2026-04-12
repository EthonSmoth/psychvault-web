"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { resendVerificationEmailFormAction } from "@/server/actions/email-verification-actions";
import { logoutAction } from "@/server/actions/auth-actions";
import { MobileOverlayMenu } from "@/components/layout/mobile-overlay-menu";

type NavbarSessionResponse =
  | {
      authenticated: false;
    }
  | {
      authenticated: true;
      user: {
        id: string;
        name: string | null;
        email: string;
        role: string;
        emailVerified: boolean;
      };
    };

type NavbarSessionContextValue = {
  session: NavbarSessionResponse | null;
};

const NavbarSessionContext = createContext<NavbarSessionContextValue>({
  session: null,
});

function getInitials(name?: string | null) {
  return (
    name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PV"
  );
}

export function NavbarSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<NavbarSessionResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/session/nav", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load session");
        }

        return (await response.json()) as NavbarSessionResponse;
      })
      .then((payload) => {
        setSession(payload);
      })
      .catch(() => {
        setSession({ authenticated: false });
      });

    return () => {
      controller.abort();
    };
  }, []);

  const value = useMemo(() => ({ session }), [session]);

  return <NavbarSessionContext.Provider value={value}>{children}</NavbarSessionContext.Provider>;
}

function useNavbarSession() {
  return useContext(NavbarSessionContext).session;
}

function AccountMenuContent({
  role,
  name,
  email,
}: {
  role: string;
  name: string | null;
  email: string;
}) {
  return (
    <>
      <div className="rounded-2xl border border-soft bg-[var(--surface-alt)] px-4 py-3">
        <div className="text-sm font-semibold text-[var(--text)]">{name || "Account"}</div>
        <div className="mt-1 text-xs text-[var(--muted)]">{email}</div>
      </div>
      <Link
        href="/library"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        My library
      </Link>
      <Link
        href="/following"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        Following feed
      </Link>
      <Link
        href="/creator"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        Creator dashboard
      </Link>
      <Link
        href="/creator/store"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        Store settings
      </Link>
      <Link
        href="/creator/resources"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        Your resources
      </Link>
      <Link
        href="/creator/analytics"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        Analytics
      </Link>
      <Link
        href="/creator/payouts"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        Payouts
      </Link>
      {role === "ADMIN" ? (
        <Link
          href="/admin"
          className="block rounded-2xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          Admin dashboard
        </Link>
      ) : null}
      <form action={logoutAction} className="pt-2">
        <button
          type="submit"
          className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          Log out
        </button>
      </form>
    </>
  );
}

function MobileMenuLinks({ authenticated }: { authenticated: boolean }) {
  return (
    <>
      <Link
        href="/"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        Home
      </Link>
      <Link
        href="/resources"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        Browse
      </Link>
      <Link
        href="/stores"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        Stores
      </Link>
      <Link
        href="/creator"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        Sell
      </Link>
      <Link
        href="/about"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        About
      </Link>
      <Link
        href="/contact"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        Contact
      </Link>
      <Link
        href="/resources?category=assessment-tools"
        className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
      >
        Categories
      </Link>
      {authenticated ? (
        <>
          <Link
            href="/messages"
            className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
          >
            Messages
          </Link>
          <Link
            href="/following"
            className="block rounded-2xl px-4 py-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-strong)]"
          >
            Following
          </Link>
        </>
      ) : null}
    </>
  );
}

export function NavbarSessionBanner() {
  const session = useNavbarSession();

  if (!session?.authenticated || session.user.emailVerified) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          Verify your email to unlock creator tools, purchases, messaging, and reporting.
        </div>
        <form action={resendVerificationEmailFormAction}>
          <input type="hidden" name="redirectTo" value="/verify-email" />
          <button
            type="submit"
            className="inline-flex rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            Resend verification email
          </button>
        </form>
      </div>
    </div>
  );
}

export function NavbarSessionControls() {
  const session = useNavbarSession();

  if (session?.authenticated) {
    const { email, name, role } = session.user;
    const initials = getInitials(name);

    return (
      <>
        <div className="flex items-center gap-2 md:hidden">
          <MobileOverlayMenu
            title="Menu"
            triggerClassName="inline-flex items-center gap-2 rounded-2xl border border-soft bg-[var(--surface-alt)] px-3 py-2 text-sm font-medium text-[var(--text)] shadow-sm transition hover:bg-[var(--surface)]"
            triggerContent={<>Menu</>}
          >
            <MobileMenuLinks authenticated />
          </MobileOverlayMenu>

          <MobileOverlayMenu
            title={name || "Account"}
            triggerClassName="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-soft bg-[var(--surface-alt)] shadow-sm transition hover:bg-[var(--surface)]"
            triggerContent={
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
                {initials}
              </span>
            }
          >
            <AccountMenuContent role={role} name={name} email={email} />
          </MobileOverlayMenu>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <div className="group relative">
            <button
              type="button"
              className="flex cursor-pointer list-none items-center gap-3 rounded-2xl border border-soft bg-[var(--surface-alt)] px-3 py-2 shadow-sm transition hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
                {initials}
              </div>

              <div className="hidden text-left sm:block">
                <div className="text-sm font-medium text-[var(--text)]">{name || "Account"}</div>
                <div className="text-xs text-[var(--muted)]">{email}</div>
              </div>
            </button>

            <div className="pointer-events-none absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-soft bg-[var(--card)] opacity-0 shadow-lg transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
              <div className="p-2">
                <AccountMenuContent role={role} name={name} email={email} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 md:hidden">
        <Link
          href="/login"
          className="inline-flex rounded-xl border border-soft bg-[var(--surface-strong)] px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--card)]"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="inline-flex rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-[var(--primary-dark)] hover:text-white"
        >
          Sign up
        </Link>
        <MobileOverlayMenu
          title="Menu"
          triggerClassName="inline-flex items-center gap-2 rounded-2xl border border-soft bg-[var(--surface-alt)] px-3 py-2 text-sm font-medium text-[var(--text)] shadow-sm transition hover:bg-[var(--surface)]"
          triggerContent={<>Menu</>}
        >
          <MobileMenuLinks authenticated={false} />
        </MobileOverlayMenu>
      </div>

      <div className="hidden items-center gap-2 sm:gap-3 md:flex">
        <Link
          href="/login"
          className="inline-flex rounded-xl border border-soft bg-[var(--surface-strong)] px-3 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--card)] sm:px-4 sm:text-sm"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="inline-flex rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-[var(--primary-dark)] hover:text-white sm:px-4 sm:text-sm"
        >
          Sign up
        </Link>
      </div>
    </>
  );
}
