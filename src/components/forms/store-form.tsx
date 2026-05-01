"use client";

import { useActionState, useState, useRef } from"react";
import { saveStoreAction, type StoreFormState } from"@/server/actions/store-actions";

const initialState: StoreFormState = {};

type StoreFormProps = {
  store?: {
    name: string;
    slug: string;
    bio: string | null;
    location: string | null;
    isPublished: boolean;
    bannerUrl: string | null;
    logoUrl: string | null;
    moderationStatus?: string;
    moderationReason?: string | null;
    ahpraRegistrationNumber?: string | null;
  };
  csrfToken: string;
  isAdminOrSuperAdmin?: boolean;
};

type UploadedFile = { url: string };

async function uploadFile(file: File, uploadKind:"thumbnail" |"preview"): Promise<UploadedFile> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("uploadKind", uploadKind);
  const res = await fetch("/api/upload", { method:"POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export function StoreForm({ store, csrfToken, isAdminOrSuperAdmin = false }: StoreFormProps) {
  const [state, formAction, pending] = useActionState(saveStoreAction, initialState);

  const [banner, setBanner] = useState<string | null>(store?.bannerUrl ?? null);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerError, setBannerError] = useState("");

  const [logo, setLogo] = useState<string | null>(store?.logoUrl ?? null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState("");

  const bannerRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  async function handleBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerLoading(true);
    setBannerError("");
    try {
      const result = await uploadFile(file,"preview");
      setBanner(result.url);
    } catch {
      setBannerError("Upload failed. Try again.");
    } finally {
      setBannerLoading(false);
    }
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    setLogoError("");
    try {
      const result = await uploadFile(file,"thumbnail");
      setLogo(result.url);
    } catch {
      setLogoError("Upload failed. Try again.");
    } finally {
      setLogoLoading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="_csrf" value={csrfToken} />

      {store?.moderationStatus ==="PENDING_REVIEW" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">Moderation status: Pending review</div>
          <div className="mt-1">
            {store.moderationReason ||
"This store is waiting for admin review before it can be published."}
          </div>
        </div>
      ) : null}

      {store?.moderationStatus ==="REJECTED" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="font-semibold">Moderation status: Rejected</div>
          <div className="mt-1">
            {store.moderationReason ||
"This store needs changes before it can be published again."}
          </div>
        </div>
      ) : null}

      {/* Banner */}
      <div>
        <span className="mb-2 block text-sm font-medium text-[var(--text)]">
          Store banner
        </span>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Shown at the top of your public store page. Recommended 1200×300px.
        </p>

        {banner ? (
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)]">
            <img
              src={banner}
              alt="Store banner"
              className="aspect-[4/1] w-full object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setBanner(null);
                if (bannerRef.current) bannerRef.current.value ="";
              }}
              className="absolute right-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-[var(--text)] shadow transition hover:bg-white"
            >
              Remove
            </button>
            <input type="hidden" name="bannerUrl" value={banner} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => bannerRef.current?.click()}
            disabled={bannerLoading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] py-10 text-sm text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--surface)] disabled:opacity-60"
          >
            {bannerLoading ? (
              <span>Uploading...</span>
            ) : (
              <>
                <span className="text-2xl">🖼️</span>
                <span className="font-medium text-[var(--text)]">Click to upload banner</span>
                <span className="text-xs">JPG, PNG, WEBP — 1200×300px recommended</span>
              </>
            )}
          </button>
        )}

        <input
          ref={bannerRef}
          type="file"
          accept="image/*"
          onChange={handleBanner}
          className="hidden"
        />
        {bannerError && <p className="mt-2 text-xs text-red-600">{bannerError}</p>}
      </div>

      {/* Logo */}
      <div>
        <span className="mb-2 block text-sm font-medium text-[var(--text)]">
          Store logo
        </span>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Square logo shown on your store page and resource cards. Recommended 200×200px.
        </p>

        <div className="flex items-center gap-4">
          {logo ? (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)]">
              <img
                src={logo}
                alt="Store logo"
                className="h-full w-full object-cover"
              />
              <input type="hidden" name="logoUrl" value={logo} />
            </div>
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] text-2xl text-[var(--text-light)]">
              🏪
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              disabled={logoLoading}
              className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)] disabled:opacity-60"
            >
              {logoLoading ?"Uploading..." : logo ?"Change logo" :"Upload logo"}
            </button>
            {logo && (
              <button
                type="button"
                onClick={() => {
                  setLogo(null);
                  if (logoRef.current) logoRef.current.value ="";
                }}
                className="text-xs text-[var(--text-muted)] hover:text-red-600"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <input
          ref={logoRef}
          type="file"
          accept="image/*"
          onChange={handleLogo}
          className="hidden"
        />
        {logoError && <p className="mt-2 text-xs text-red-600">{logoError}</p>}
      </div>

      {/* Store name */}
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium text-[var(--text)]">
          Store name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={store?.name ??""}
          placeholder="Mindful Practice Tools"
          className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring-focus)]"
        />
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="mb-2 block text-sm font-medium text-[var(--text)]">
          Store slug
        </label>
        <input
          id="slug"
          name="slug"
          defaultValue={store?.slug ??""}
          placeholder="mindful-practice-tools"
          className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring-focus)]"
        />
        <p className="mt-2 text-xs text-[var(--text-light)]">
          Your public URL: /stores/your-store-name
        </p>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="mb-2 block text-sm font-medium text-[var(--text)]">
          Location
        </label>
        <input
          id="location"
          name="location"
          defaultValue={store?.location ??""}
          placeholder="Perth, WA"
          className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring-focus)]"
        />
      </div>

      {/* AHPRA registration number */}
      {!isAdminOrSuperAdmin ? (
        <div>
          <label htmlFor="ahpraRegistrationNumber" className="mb-2 block text-sm font-medium text-[var(--text)]">
            AHPRA registration number <span className="text-red-500">*</span>
          </label>
          <p className="mb-3 text-xs text-[var(--text-muted)]">
            Required so an admin can confirm you are a registered practitioner before your store is verified on PsychVault. Your number is never shown publicly.
          </p>
          <input
            id="ahpraRegistrationNumber"
            name="ahpraRegistrationNumber"
            defaultValue={store?.ahpraRegistrationNumber ?? ""}
            placeholder="PSY0001234567"
            className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm font-mono text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring-focus)]" 
          />
          <p className="mt-2 text-xs text-[var(--text-light)]">
            Find your number on the{" "}
            <a
              href="https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--primary)]"
            >
              AHPRA public register
            </a>
            .
          </p>
        </div>
      ) : null}

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="mb-2 block text-sm font-medium text-[var(--text)]">
          Store bio
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={store?.bio ??""}
          rows={5}
          placeholder="Describe what kind of resources you create and who they are for."
          className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring-focus)]"
        />
      </div>

      {/* Publish */}
      <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={store?.isPublished ?? false}
          className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--primary)] focus:ring-[var(--ring-focus)]"
        />
        <div>
          <div className="text-sm font-medium text-[var(--text)]">Publish store</div>
          <div className="text-xs text-[var(--text-light)]">
            Make your store visible on the public site.
          </div>
        </div>
      </label>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
        Published stores may still be paused if they are flagged by moderation, reported
        repeatedly by users, or need manual review before going live again.
      </div>

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.success}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ?"Saving..." :"Save store"}
        </button>
      </div>
    </form>
  );
}
