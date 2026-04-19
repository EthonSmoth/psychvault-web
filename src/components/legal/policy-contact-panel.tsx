import Link from"next/link";
import { getBusinessAddress, getSupportEmail, getSupportPhone } from"@/lib/env";

function toTelephoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g,"")}`;
}

export function PolicyContactPanel() {
  const supportEmail = getSupportEmail();
  const supportPhone = getSupportPhone();
  const businessAddress = getBusinessAddress();

  return (
    <section className="card-panel">
      <h2 className="text-xl font-semibold text-[var(--text)]">Contact and support</h2>
      <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
        If you need help with billing, downloads, refunds, privacy, or a policy question,
        contact the PsychVault team directly or use our{" "}
        <Link href="/contact" className="font-medium text-[var(--text)] underline">
          contact page
        </Link>
        .
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-[var(--surface-alt)] p-5">
          <div className="text-sm font-semibold text-[var(--text)]">Support email</div>
          <a
            href={`mailto:${supportEmail}`}
            className="mt-2 block text-sm text-[var(--text-muted)] underline"
          >
            {supportEmail}
          </a>
        </div>

        {supportPhone ? (
          <div className="rounded-2xl bg-[var(--surface-alt)] p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Support phone</div>
            <a
              href={toTelephoneHref(supportPhone)}
              className="mt-2 block text-sm text-[var(--text-muted)] underline"
            >
              {supportPhone}
            </a>
          </div>
        ) : null}

        {businessAddress ? (
          <div className="rounded-2xl bg-[var(--surface-alt)] p-5 sm:col-span-2">
            <div className="text-sm font-semibold text-[var(--text)]">Business address</div>
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--text-muted)]">
              {businessAddress}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
