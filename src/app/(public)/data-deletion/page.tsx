import type { Metadata } from "next";
import Link from "next/link";
import { PolicyContactPanel } from "@/components/legal/policy-contact-panel";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Data Deletion Instructions",
  description:
    "How to request deletion of your personal data from PsychVault, including data collected via Facebook Login.",
  robots: { index: true, follow: true },
};

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-light)]">
            Last updated {LEGAL_LAST_UPDATED}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Data Deletion Instructions
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            This page explains how to request deletion of personal data that PsychVault
            holds about you, including data associated with accounts created or accessed
            via Facebook Login.
          </p>
        </div>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">What data PsychVault holds</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              When you create an account — including via Facebook Login — PsychVault may
              store the following information:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Your name and email address</li>
              <li>Your account profile and any creator store details you have set up</li>
              <li>Purchase history and download access records</li>
              <li>Reviews, reports, and messages submitted through the platform</li>
              <li>Login activity and account security records</li>
            </ul>
            <p>
              PsychVault does not store your Facebook password or payment card details.
              Card processing is handled by Stripe and subject to their own data
              practices.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">How to request deletion</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              To request that PsychVault delete your personal data, send an email to:
            </p>
            <p className="font-medium">
              <a
                href="mailto:hello@psychvault.com.au?subject=Data%20Deletion%20Request"
                className="text-[var(--primary)] underline"
              >
                hello@psychvault.com.au
              </a>
            </p>
            <p>
              Use the subject line <strong>Data Deletion Request</strong> and include the
              email address associated with your PsychVault account. If you signed in
              with Facebook, please also include your Facebook display name so we can
              locate your account.
            </p>
            <p>
              We will acknowledge your request within <strong>5 business days</strong>{" "}
              and complete the deletion within <strong>30 days</strong>, unless we are
              legally required to retain certain records (see below).
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Removing Facebook Login access</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              You can revoke PsychVault&apos;s access to your Facebook account at any time
              from your Facebook settings:
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Go to{" "}
                <strong>Facebook → Settings &amp; Privacy → Settings → Apps and Websites</strong>
              </li>
              <li>Find <strong>PsychVault</strong> in the list and click <strong>Remove</strong></li>
            </ol>
            <p>
              Removing the app from your Facebook settings will stop any further data
              sharing via Facebook Login. However, it does <strong>not</strong>{" "}
              automatically delete data already held by PsychVault — you must also send
              the email request described above.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Data we may retain after a deletion request</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              We will delete your personal data as requested. However, we may retain
              limited information where we are legally required to do so, including:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Transaction and payment records required for tax, GST, and financial
                reporting obligations under Australian law
              </li>
              <li>
                Evidence needed to investigate fraud, chargebacks, or unresolved disputes
              </li>
              <li>
                Records required by any applicable court order or legal process
              </li>
            </ul>
            <p>
              Where retention is required, we will inform you of what is being kept and
              the reason. Retained data will not be used for marketing or shared beyond
              what is legally required.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">More information</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            For full details of how PsychVault collects and uses personal information,
            see our{" "}
            <Link href="/privacy-policy" className="font-medium text-[var(--text)] underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <PolicyContactPanel />
      </div>
    </main>
  );
}
