import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/env";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Receipt | PsychVault",
  robots: { index: false, follow: false },
};

function formatMoney(cents: number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ReceiptPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?redirectTo=/purchases/${id}/receipt`);
  }

  const purchase = await db.purchase.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      resource: {
        select: {
          id: true,
          title: true,
          slug: true,
          store: { select: { name: true } },
        },
      },
    },
  });

  if (!purchase || purchase.buyerId !== session.user.id) {
    notFound();
  }

  const appBaseUrl = getAppBaseUrl();
  const receiptNumber = `PV-${purchase.id.slice(-8).toUpperCase()}`;
  const isFree = purchase.amountCents === 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Print/back bar */}
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <Link
          href="/library"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition"
        >
          ← Back to library
        </Link>
        <PrintButton />
      </div>

      {/* Receipt card */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
              Receipt
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text)]">
              PsychVault
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{appBaseUrl}</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
              Receipt no.
            </div>
            <div className="mt-1 font-mono text-sm font-medium text-[var(--text)]">
              {receiptNumber}
            </div>
          </div>
        </div>

        <hr className="my-6 border-[var(--border)]" />

        {/* Bill to */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
              Bill to
            </div>
            <div className="mt-2 text-sm text-[var(--text)]">
              {purchase.buyer.name || purchase.buyer.email}
            </div>
            <div className="text-sm text-[var(--text-muted)]">{purchase.buyer.email}</div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
              Date
            </div>
            <div className="mt-2 text-sm text-[var(--text)]">
              {formatDate(purchase.createdAt)}
            </div>
          </div>
        </div>

        <hr className="my-6 border-[var(--border)]" />

        {/* Line items */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-light)]">
                Description
              </th>
              <th className="pb-3 text-right text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-light)]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-4 text-[var(--text)]">
                <div className="font-medium">{purchase.resource.title}</div>
                <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Creator: {purchase.resource.store?.name ?? "PsychVault creator"}
                </div>
              </td>
              <td className="py-4 text-right font-medium text-[var(--text)]">
                {isFree ? "Free" : formatMoney(purchase.amountCents, purchase.currency)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-[var(--border)]">
              <td className="pt-4 font-semibold text-[var(--text)]">Total</td>
              <td className="pt-4 text-right font-semibold text-[var(--text)]">
                {isFree ? "Free" : formatMoney(purchase.amountCents, purchase.currency)}
              </td>
            </tr>
            {purchase.stripePaymentId && (
              <tr>
                <td className="pt-2 text-xs text-[var(--text-muted)]">Payment ref</td>
                <td className="pt-2 text-right font-mono text-xs text-[var(--text-muted)]">
                  {purchase.stripePaymentId}
                </td>
              </tr>
            )}
          </tfoot>
        </table>

        <hr className="my-6 border-[var(--border)]" />

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-muted)]">
          Questions? Contact us at{" "}
          <a href="mailto:support@psychvault.com.au" className="underline">
            support@psychvault.com.au
          </a>
        </p>
      </div>

      {/* Download link */}
      <div className="mt-6 text-center print:hidden">
        <Link
          href={`/api/downloads/${purchase.resource.id}`}
          className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
        >
          Download resource
        </Link>
      </div>
    </div>
  );
}
