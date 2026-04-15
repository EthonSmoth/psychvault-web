import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCSRFToken } from "@/lib/csrf";
import { AccountForm } from "@/components/forms/account-form";

export const metadata = {
  title: "Account settings",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?redirectTo=/account");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      passwordHash: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const csrfToken = generateCSRFToken(user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-[var(--text-light)]">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Account settings
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Manage your display name, avatar, and password.
        </p>
      </div>

      <AccountForm
        user={{
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          hasPassword: Boolean(user.passwordHash),
        }}
        csrfToken={csrfToken}
      />

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--text)]">Quick links</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/library"
            className="inline-flex rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            My library
          </Link>
          <Link
            href="/messages"
            className="inline-flex rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            Messages
          </Link>
          {user.role === "CREATOR" || user.role === "ADMIN" ? (
            <Link
              href="/creator"
              className="inline-flex rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
            >
              Creator dashboard
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
