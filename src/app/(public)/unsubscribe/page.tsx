import Link from "next/link";
import { db } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

type Props = { searchParams: Promise<{ token?: string }> };

export const metadata = {
  title: "Unsubscribe — PsychVault",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return <UnsubscribeResult status="invalid" />;
  }

  const userId = verifyUnsubscribeToken(token);

  if (!userId) {
    return <UnsubscribeResult status="invalid" />;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, emailNotifications: true },
  });

  if (!user) {
    return <UnsubscribeResult status="invalid" />;
  }

  if (!user.emailNotifications) {
    return <UnsubscribeResult status="already" />;
  }

  await db.user.update({
    where: { id: userId },
    data: { emailNotifications: false },
  });

  return <UnsubscribeResult status="success" />;
}

function UnsubscribeResult({ status }: { status: "success" | "already" | "invalid" }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
      <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-alt)] text-2xl">
        {status === "success" ? "✅" : status === "already" ? "👍" : "⚠️"}
      </div>
      <h1 className="text-xl font-semibold text-[var(--text)]">
        {status === "success"
          ? "You've been unsubscribed"
          : status === "already"
          ? "Already unsubscribed"
          : "Invalid or expired link"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
        {status === "success"
          ? "You will no longer receive notification emails from PsychVault. You can re-enable them at any time from your account settings."
          : status === "already"
          ? "Notification emails are already turned off for your account."
          : "This unsubscribe link is invalid or has expired. You can manage notification preferences in your account settings."}
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/account"
          className="inline-flex rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
        >
          Account settings
        </Link>
        <Link href="/" className="text-sm text-[var(--text-light)] hover:text-[var(--text)]">
          Go home
        </Link>
      </div>
    </div>
  );
}
