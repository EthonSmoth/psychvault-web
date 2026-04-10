import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resendVerificationEmailFormAction } from "@/server/actions/email-verification-actions";
import { logoutAction } from "@/server/actions/auth-actions";
import { getUnreadConversationCount } from "@/server/actions/message-actions";
import { MobileOverlayMenu } from "@/components/layout/mobile-overlay-menu";

function normalizeEmail(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export async function Navbar() {
  const session = await auth();
  const user = session?.user;

  let role: string | null = null;
  let unreadMessages = 0;
  let emailVerified = true;

  if (user?.email) {
    const email = normalizeEmail(user.email);
    const dbUser = await db.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: { role: true, id: true, emailVerified: true },
    });

    role = dbUser?.role ?? null;
    emailVerified = Boolean(dbUser?.emailVerified);
    if (dbUser?.id) {
      unreadMessages = await getUnreadConversationCount(dbUser.id);
    }
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PV";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--frame)]/95 backdrop-blur">
      {user && !emailVerified ? (
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
      ) : null}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3 transition">
          <span className="inline-flex items-center justify-center transition">
            <Image
              src="/logo-PNG.png"
              alt="PsychVault"
              width={100}
              height={100}
              priority
              className="h-16 w-16 object-contain sm:h-[100px] sm:w-[100px]"
            />
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/" className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]">
            Home
          </Link>

          <Link
            href="/resources"
            className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]"
          >
            Browse
          </Link>

          <Link
            href="/stores"
            className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]"
          >
            Stores
          </Link>

          <Link
            href="/creator"
            className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]"
          >
            Sell
          </Link>

          {user && (
            <Link
              href="/messages"
              className="relative text-sm font-medium text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              Messages
              {unreadMessages > 0 ? (
                <span className="ml-2 inline-flex rounded-full bg-[rgba(183,110,10,0.12)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-dark)]">
                  {unreadMessages}
                </span>
              ) : null}
            </Link>
          )}

          <div className="group relative">
            <button
              type="button"
              className="flex cursor-pointer list-none items-center gap-2 rounded-2xl border border-soft bg-[var(--surface-alt)] px-4 py-2 text-sm font-medium text-[var(--text)] shadow-sm transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            >
              More
            </button>

            <div className="pointer-events-none absolute left-0 z-20 mt-3 w-56 overflow-hidden rounded-3xl border border-soft bg-[var(--card)] opacity-0 shadow-lg transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
              <div className="flex flex-col px-3 py-3">
                <Link
                  href="/about"
                  className="rounded-2xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-strong)]"
                >
                  About
                </Link>
                <Link
                  href="/contact"
                  className="rounded-2xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-strong)]"
                >
                  Contact
                </Link>
                <Link
                  href="/resources?category=assessment-tools"
                  className="rounded-2xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-strong)]"
                >
                  Categories
                </Link>
                {user ? (
                  <>
                    <Link
                      href="/following"
                      className="rounded-2xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-strong)]"
                    >
                      Following
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </nav>

        {user ? (
          <>
            <div className="flex items-center gap-2 md:hidden">
              <MobileOverlayMenu
                title="Menu"
                triggerClassName="inline-flex items-center gap-2 rounded-2xl border border-soft bg-[var(--surface-alt)] px-3 py-2 text-sm font-medium text-[var(--text)] shadow-sm transition hover:bg-[var(--surface)]"
                triggerContent={<>Menu</>}
              >
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
              </MobileOverlayMenu>

              <MobileOverlayMenu
                title={user.name || "Account"}
                triggerClassName="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-soft bg-[var(--surface-alt)] shadow-sm transition hover:bg-[var(--surface)]"
                triggerContent={
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
                    {initials}
                  </span>
                }
              >
                <div className="rounded-2xl border border-soft bg-[var(--surface-alt)] px-4 py-3">
                  <div className="text-sm font-semibold text-[var(--text)]">
                    {user.name || "Account"}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{user.email}</div>
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
                {role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="block rounded-2xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Admin dashboard
                  </Link>
                )}
                <form action={logoutAction} className="pt-2">
                  <button
                    type="submit"
                    className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Log out
                  </button>
                </form>
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
                  <div className="text-sm font-medium text-[var(--text)]">
                    {user.name || "Account"}
                  </div>
                  <div className="text-xs text-[var(--muted)]">{user.email}</div>
                </div>
              </button>

              <div className="pointer-events-none absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-soft bg-[var(--card)] opacity-0 shadow-lg transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                <div className="border-b border-soft px-4 py-3">
                  <div className="text-sm font-semibold text-[var(--text)]">
                    {user.name || "Account"}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{user.email}</div>
                </div>

                <div className="p-2">
                  <Link
                    href="/library"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-strong)]"
                  >
                    My library
                  </Link>

                  <Link
                    href="/following"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-strong)]"
                  >
                    Following feed
                  </Link>

                  <Link
                    href="/creator"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-strong)]"
                  >
                    Creator dashboard
                  </Link>

                  <Link
                    href="/creator/store"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-strong)]"
                  >
                    Store settings
                  </Link>

                  <Link
                    href="/creator/resources"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-strong)]"
                  >
                    Your resources
                  </Link>

                  <Link
                    href="/creator/analytics"
                    className="block rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-strong)]"
                  >
                    Analytics
                  </Link>

                  {role === "ADMIN" && (
                    <>
                      <div className="my-2 border-t border-soft" />
                      <Link
                        href="/admin"
                        className="block rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Admin dashboard
                      </Link>
                    </>
                  )}

                  <form action={logoutAction} className="mt-2 border-t border-soft pt-2">
                    <button
                      type="submit"
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Log out
                    </button>
                  </form>
                </div>
              </div>
              </div>
            </div>
          </>
        ) : (
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
        )}
      </div>
    </header>
  );
}
