"use client";

import { useState } from "react";

type ContactFormState = "idle" | "sending" | "success" | "error";

type ContactErrorPayload = {
  error?: string;
  details?: {
    fieldErrors?: Record<string, string[] | undefined>;
  };
};

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<ContactFormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setStatus("sending");
    setErrorMessage(null);
    setFieldErrors({});

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      }),
    });

    if (response.ok) {
      setStatus("success");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      return;
    }

    const payload = (await response.json().catch(() => null)) as ContactErrorPayload | null;
    setFieldErrors(payload?.details?.fieldErrors || {});
    setErrorMessage(payload?.error || "Something went wrong. Please try again.");
    setStatus("error");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-[var(--text)]">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={80}
            className="w-full rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text)] ring-0 transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
          />
          {fieldErrors.name?.[0] ? (
            <span className="block text-xs text-rose-700">{fieldErrors.name[0]}</span>
          ) : null}
        </label>

        <label className="space-y-2 text-sm font-medium text-[var(--text)]">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={320}
            className="w-full rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text)] ring-0 transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
          />
          {fieldErrors.email?.[0] ? (
            <span className="block text-xs text-rose-700">{fieldErrors.email[0]}</span>
          ) : null}
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium text-[var(--text)]">
        <span>Subject</span>
        <input
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          required
          minLength={3}
          maxLength={120}
          className="w-full rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text)] ring-0 transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
        />
        {fieldErrors.subject?.[0] ? (
          <span className="block text-xs text-rose-700">{fieldErrors.subject[0]}</span>
        ) : null}
      </label>

      <label className="space-y-2 text-sm font-medium text-[var(--text)]">
        <span>Message</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          rows={6}
          minLength={10}
          maxLength={5000}
          className="w-full rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text)] ring-0 transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
        />
        {fieldErrors.message?.[0] ? (
          <span className="block text-xs text-rose-700">{fieldErrors.message[0]}</span>
        ) : null}
      </label>

      {status === "success" ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Your message has been sent. We’ll respond as soon as possible.
        </div>
      ) : null}

      {status === "error" && errorMessage ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
