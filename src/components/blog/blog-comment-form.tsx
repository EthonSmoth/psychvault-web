'use client';

import { useState } from 'react';
import { submitBlogComment } from '@/server/actions/blog-comment-actions';
import Link from 'next/link';

interface BlogCommentFormProps {
  slug: string;
  isLoggedIn: boolean;
  onCommentSubmitted?: () => void;
}

export function BlogCommentForm({
  slug,
  isLoggedIn,
  onCommentSubmitted,
}: BlogCommentFormProps) {
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!body.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitBlogComment(slug, body);
      setBody('');
      setSuccess(true);
      onCommentSubmitted?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit comment';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <p className="text-[var(--text)]">
          <Link
            href="/login"
            className="font-medium text-[var(--primary)] hover:text-[var(--primary-dark)]"
          >
            Sign in
          </Link>{' '}
          to leave a comment
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="comment"
          className="block text-sm font-medium text-[var(--text)]"
        >
          Leave a comment
        </label>
        <textarea
          id="comment"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts about this post..."
          maxLength={2000}
          rows={4}
          className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
          disabled={isSubmitting}
        />
        <div className="mt-1 text-right text-xs text-[var(--text-light)]">
          {body.length}/2000
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-200">
          Comment submitted! Your comment will appear after moderation.
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !body.trim()}
        className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Submitting...' : 'Post Comment'}
      </button>
    </form>
  );
}
