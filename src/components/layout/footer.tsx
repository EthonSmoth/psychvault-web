import Link from"next/link";
import { getSupportEmail, getSupportPhone } from"@/lib/env";

const currentYear = new Date().getFullYear();

export function Footer() {
  const supportEmail = getSupportEmail();
  const supportPhone = getSupportPhone();

  return (
    <footer className="border-t border-soft bg-[var(--frame)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 text-center lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:text-left">
          <div className="flex flex-col items-center lg:items-start">
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
              Legal
            </h3>

            <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
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
              <a
                href="/feed.xml"
                className="footer-link"
              >
                RSS feed
              </a>
              <a
                href="/sitemap.xml"
                className="footer-link"
              >
                Sitemap
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-soft pt-8 text-center">
          <div className="mb-6 flex flex-col gap-2">
            <p className="text-xs text-[var(--text-muted)]">(c) {currentYear} PsychVault</p>
            <p className="text-sm font-medium text-[var(--text)]">
              Handcrafted resources by practicing clinicians for your practice.
            </p>
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
