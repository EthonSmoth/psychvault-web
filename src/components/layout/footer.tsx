import Link from"next/link";
import { getSupportEmail, getSupportPhone } from"@/lib/env";

const currentYear = new Date().getFullYear();

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
    >
      <path d="M13.5 9H16V6h-2.5C10.7 6 9 7.7 9 10.5V13H7v3h2v6h3v-6h2.5l.5-3H12v-2.5c0-.9.6-1.5 1.5-1.5Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Footer() {
  const supportEmail = getSupportEmail();
  const supportPhone = getSupportPhone();
  const facebookUrl = "https://www.facebook.com/PsychVaultHQ";
  const instagramUrl = "https://www.instagram.com/psychvaulthq";

  return (
    <footer className="border-t border-soft bg-[var(--frame)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-8 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-10">
          <div className="flex flex-col items-center sm:items-start">
            <Link
              href="/"
              className="text-xl font-semibold tracking-tight text-[var(--text)] transition-colors hover:text-[var(--accent)]"
            >
              PsychVault
            </Link>

            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--text-muted)]">
              Discover and sell psychology resources that save time in real clinical work.
            </p>

            <div className="mt-4 space-y-1 text-sm text-[var(--text-muted)]">
              <a href={`mailto:${supportEmail}`} className="block underline transition-colors hover:text-[var(--accent)]">
                {supportEmail}
              </a>
              {supportPhone ? (
                <a
                  href={`tel:${supportPhone.replace(/[^\d+]/g,"")}`}
                  className="block underline transition-colors hover:text-[var(--accent)]"
                >
                  {supportPhone}
                </a>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-center gap-4 sm:justify-start">
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="PsychVault on Facebook"
                className="footer-social-link"
              >
                <FacebookIcon />
                <span className="text-xs">Facebook</span>
              </a>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="PsychVault on Instagram"
                className="footer-social-link"
              >
                <InstagramIcon />
                <span className="text-xs">Instagram</span>
              </a>
            </div>

          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text)]">
              Browse
            </h3>

            <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
              <Link href="/resources" className="footer-link">
                All resources
              </Link>
              <Link href="/stores" className="footer-link">
                Creator stores
              </Link>
              <Link href="/blog" className="footer-link">
                Blog
              </Link>
              <Link
                href="/templates"
                className="footer-link"
              >
                Templates
              </Link>
              <Link
                href="/resources?price=free"
                className="footer-link"
              >
                Free resources
              </Link>
              <Link
                href="/resources?sort=popular"
                className="footer-link"
              >
                Best sellers
              </Link>
              <Link
                href="/resources?sort=rating"
                className="footer-link"
              >
                Top rated
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text)]">
              Creators
            </h3>

            <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
              <Link href="/creator" className="footer-link">
                Dashboard
              </Link>
              <Link
                href="/creator/resources/new"
                className="footer-link"
              >
                Upload
              </Link>
              <Link
                href="/creator/store"
                className="footer-link"
              >
                Store
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text)]">
              Support
            </h3>

            <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
              <Link href="/contact" className="footer-link">
                Contact
              </Link>
              <Link href="/faq" className="footer-link">
                FAQ
              </Link>
              <Link href="/feedback" className="footer-link">
                Feedback
              </Link>
              <Link href="/careers" className="footer-link">
                Careers
              </Link>
              <Link
                href="/privacy-policy"
                className="footer-link"
              >
                Privacy policy
              </Link>
              <Link
                href="/terms-of-service"
                className="footer-link"
              >
                Terms of service
              </Link>
              <Link
                href="/refund-policy"
                className="footer-link"
              >
                Refund policy
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-soft pt-6 sm:mt-12 sm:pt-8">
          <div className="mb-5 flex flex-col items-center gap-1 text-center sm:mb-6">
            <p className="text-sm font-medium text-[var(--text)]">
              Handcrafted resources by practising clinicians for your practice.
            </p>
            <p className="text-xs text-[var(--text-muted)]">&copy; {currentYear} PsychVault &middot; <a href="/feed.xml" className="underline hover:text-[var(--accent)]">RSS</a> &middot; <a href="/sitemap.xml" className="underline hover:text-[var(--accent)]">Sitemap</a></p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <a
              href="https://www.ahpra.gov.au/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="AHPRA - Australian Health Practitioner Regulation Authority"
              className="inline-flex items-center gap-1 rounded-xl border border-[#b7cce5] bg-[#edf5ff] px-3 py-2 text-xs font-medium text-[#1f5f99] transition hover:bg-[#dfeeff] hover:shadow-sm"
            >
              AHPRA
              <span className="text-[10px]">External</span>
            </a>

            <a
              href="https://www.psychology.org.au/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="APS - Australian Psychological Society"
              className="inline-flex items-center gap-1 rounded-xl border border-[#c7d7bb] bg-[#eff7e7] px-3 py-2 text-xs font-medium text-[#4d6f2d] transition hover:bg-[#e3f0d6] hover:shadow-sm"
            >
              APS Aligned
              <span className="text-[10px]">External</span>
            </a>

            <a
              href="https://www.aapi.org.au/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="AAPI - Australian Association for Psychology Inc"
              className="inline-flex items-center gap-1 rounded-xl border border-[#d7c8e6] bg-[#f5edfb] px-3 py-2 text-xs font-medium text-[#76549b] transition hover:bg-[#ebdef7] hover:shadow-sm"
            >
              AAPI Member
              <span className="text-[10px]">External</span>
            </a>

            <div className="inline-flex items-center gap-1 rounded-xl border border-soft bg-[var(--surface-alt)] px-3 py-2 text-xs font-medium text-[var(--text-muted)]">
              Free Resources
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
