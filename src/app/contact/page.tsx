import ContactForm from "@/components/forms/contact-form";

// Gives buyers, creators, and reviewers a clear way to contact the marketplace team.
export default function ContactPage() {
  const supportEmail = process.env.SUPPORT_EMAIL || "support@psychvault.com";

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
            Contact us
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            Have a question about buying, selling, payouts, moderation, or how
            PsychVault works? Send us a message and our team will respond as soon
            as possible.
          </p>

          <div className="mt-10 space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">General support</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{supportEmail}</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Creator support</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                If you need help with your store, uploads, moderation, or payout
                setup, email us with the relevant store or resource details.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Response times</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                We aim to respond to genuine support enquiries as quickly as
                possible. Including the purchase, store, or resource name helps us
                investigate faster.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Marketplace policies</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Legal, privacy, and refund information is available on our public
                policy pages linked in the footer.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">Send a message</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Use this form to send a message to our support team. We will reply to
            the email address you provide.
          </p>

          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
