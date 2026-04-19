"use client";

import { useActionState, useEffect, useRef, useState } from"react";
import Image from"next/image";
import {
  updateProfileAction,
  changePasswordAction,
  type AccountFormState,
  type PasswordFormState,
} from"@/server/actions/account-actions";

type AccountFormProps = {
  user: {
    name: string;
    email: string;
    avatarUrl: string | null;
    hasPassword: boolean;
    emailNotifications: boolean;
  };
  csrfToken: string;
};

export function AccountForm({ user, csrfToken }: AccountFormProps) {
  // ── Profile section ──────────────────────────────────────────────────────
  const [profileState, profileAction, profilePending] = useActionState<AccountFormState, FormData>(
    updateProfileAction,
    {}
  );
  const [name, setName] = useState(user.name);
  const [emailNotifications, setEmailNotifications] = useState(user.emailNotifications);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ??"");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("uploadKind","thumbnail");
      const res = await fetch("/api/upload", { method:"POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ??"Upload failed");
      }
      const data = await res.json();
      setAvatarUrl(data.url ??"");
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message :"Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  // ── Password section ──────────────────────────────────────────────────────
  const [passwordState, passwordAction, passwordPending] = useActionState<PasswordFormState, FormData>(
    changePasswordAction,
    {}
  );
  const passwordFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (passwordState.success) {
      passwordFormRef.current?.reset();
    }
  }, [passwordState.success]);

  return (
    <div className="space-y-8">
      {/* Profile card */}
      <div className="card-panel-md">
        <h2 className="heading-section">Profile</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Your public display name and avatar.
        </p>

        <form action={profileAction} className="mt-6 space-y-5">
          <input type="hidden" name="_csrf" value={csrfToken} />
          <input type="hidden" name="avatarUrl" value={avatarUrl} />

          {/* Avatar */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text)]">Avatar</label>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-[var(--surface-alt)]">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl text-[var(--text-light)]">
                    {name?.[0]?.toUpperCase() ??"?"}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)] disabled:opacity-50"
                >
                  {avatarUploading ?"Uploading…" :"Change photo"}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="text-xs text-[var(--text-light)] hover:text-[var(--text)]"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            {avatarError && (
              <p className="mt-2 text-xs text-red-600">{avatarError}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text)]">
              Display name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            />
          </div>

          {/* Notification preference */}
          <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3">
            <input
              id="emailNotifications"
              name="emailNotifications"
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
            />
            <div>
              <label htmlFor="emailNotifications" className="text-sm font-medium text-[var(--text)] cursor-pointer">
                Email notifications
              </label>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Receive emails for new messages and purchase confirmations.
              </p>
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)]">
              Email address
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-muted)] opacity-70"
            />
            <p className="mt-1 text-xs text-[var(--text-light)]">
              Email changes are not supported yet. Contact support if you need to change your email.
            </p>
          </div>

          {profileState.error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileState.error}
            </p>
          )}
          {profileState.success && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {profileState.success}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profilePending || avatarUploading}
              className="inline-flex rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:opacity-60"
            >
              {profilePending ?"Saving…" :"Save changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Password card */}
      <div className="card-panel-md">
        <h2 className="heading-section">Password</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {user.hasPassword
            ?"Update your password. You will remain signed in."
            :"Your account uses Google sign-in and has no password set. Use forgot password to create one."}
        </p>

        {user.hasPassword ? (
          <form ref={passwordFormRef} action={passwordAction} className="mt-6 space-y-4">
            <input type="hidden" name="_csrf" value={csrfToken} />

            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-[var(--text)]">
                Current password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--text)]">
                New password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text)]">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
              />
            </div>

            {passwordState.error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {passwordState.error}
              </p>
            )}
            {passwordState.success && (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {passwordState.success}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={passwordPending}
                className="inline-flex rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:opacity-60"
              >
                {passwordPending ?"Updating…" :"Update password"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4">
            <a
              href="/forgot-password"
              className="inline-flex rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
            >
              Set a password via forgot password
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
