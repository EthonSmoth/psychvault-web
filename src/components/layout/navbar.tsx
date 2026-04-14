import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";

const NavbarSessionBanner = dynamic(
  () =>
    import("@/components/layout/navbar-session").then((module) => module.NavbarSessionBanner),
  {
    ssr: false,
  }
);

const NavbarSessionControls = dynamic(
  () =>
    import("@/components/layout/navbar-session").then((module) => module.NavbarSessionControls),
  {
    ssr: false,
    loading: () => <NavbarSessionControlsFallback />,
  }
);

function NavbarSessionControlsFallback() {
  return (
    <>
      <div className="flex items-center gap-2 md:hidden">
        <div
          className="h-10 w-18 animate-pulse rounded-xl border border-soft bg-[var(--surface-alt)]"
          aria-hidden="true"
        />
        <div
          className="h-10 w-18 animate-pulse rounded-xl border border-soft bg-[var(--surface-alt)]"
          aria-hidden="true"
        />
        <div
          className="h-10 w-14 animate-pulse rounded-2xl border border-soft bg-[var(--surface-alt)]"
          aria-hidden="true"
        />
      </div>

      <div className="hidden items-center gap-3 md:flex">
        <div
          className="h-10 w-24 animate-pulse rounded-xl border border-soft bg-[var(--surface-alt)]"
          aria-hidden="true"
        />
        <div
          className="h-10 w-28 animate-pulse rounded-xl border border-soft bg-[var(--surface-alt)]"
          aria-hidden="true"
        />
      </div>
    </>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--frame)]/95 backdrop-blur">
      <NavbarSessionBanner />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3 transition">
          <span className="inline-flex items-center justify-center transition">
            <Image
              src="/logo-optimized.webp"
              alt="PsychVault"
              width={100}
              height={100}
              sizes="(max-width: 640px) 64px, 100px"
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
            href="/blog"
            className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]"
          >
            Blog
          </Link>

          <Link
            href="/creator"
            className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]"
          >
            Sell
          </Link>

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
              </div>
            </div>
          </div>
        </nav>

        <NavbarSessionControls />
      </div>
    </header>
  );
}
