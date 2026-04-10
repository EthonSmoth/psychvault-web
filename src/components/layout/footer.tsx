import Link from "next/link";

const currentYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t border-soft bg-[var(--frame)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 text-center lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:text-left">
          
          {/* BRAND */}
          <div className="flex flex-col items-center lg:items-start">
            <Link
              href="/"
              className="text-xl font-semibold tracking-tight text-[var(--text)] transition-colors hover:text-[var(--accent)]"
            >
              PsychVault
            </Link>

            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--text-muted)]">
              Discover and sell psychology resources that save time in real
              clinical work.
            </p>

            {/* SOCIAL LINKS */}
            <div className="mt-5 flex items-center justify-center gap-4 text-sm text-[var(--text-muted)] lg:justify-start">
              <a
                href="https://twitter.com"
                target="_blank"
                className="hover:text-[var(--accent)] transition-colors"
              >
                Twitter
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                className="hover:text-[var(--accent)] transition-colors"
              >
                Instagram
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                className="hover:text-[var(--accent)] transition-colors"
              >
                YouTube
              </a>
            </div>

          </div>

          {/* BROWSE */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text)]">
              Browse
            </h3>

            <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
              <Link href="/resources" className="block hover:text-[var(--accent)] transition-colors">
                All resources
              </Link>
              <Link href="/resources?price=free" className="block hover:text-[var(--accent)] transition-colors">
                Free resources
              </Link>
              <Link href="/resources?sort=popular" className="block hover:text-[var(--accent)] transition-colors">
                Best sellers
              </Link>
              <Link href="/resources?sort=rating" className="block hover:text-[var(--accent)] transition-colors">
                Top rated
              </Link>
            </div>
          </div>

          {/* CREATORS */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text)]">
              Creators
            </h3>

            <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
              <Link href="/creator" className="block hover:text-[var(--accent)] transition-colors">
                Dashboard
              </Link>
              <Link href="/creator/resources/new" className="block hover:text-[var(--accent)] transition-colors">
                Upload
              </Link>
              <Link href="/creator/store" className="block hover:text-[var(--accent)] transition-colors">
                Store
              </Link>
            </div>
          </div>

          {/* LEGAL */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text)]">
              Legal
            </h3>

            <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
              <Link href="/privacy-policy" className="block hover:text-[var(--accent)] transition-colors">
                Privacy policy
              </Link>
              <Link href="/terms-of-service" className="block hover:text-[var(--accent)] transition-colors">
                Terms of service
              </Link>
              <Link href="/refund-policy" className="block hover:text-[var(--accent)] transition-colors">
                Refund policy
              </Link>
              <Link href="/contact" className="block hover:text-[var(--accent)] transition-colors">
                Contact
              </Link>
              <Link href="/sitemap.xml" className="block hover:text-[var(--accent)] transition-colors">
                Sitemap
              </Link>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="mt-10 flex flex-col gap-3 border-t border-soft pt-6 text-center text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© {currentYear} PsychVault</p>
          <p>Built for clinicians and creators.</p>
        </div>
      </div>
    </footer>
  );
}
