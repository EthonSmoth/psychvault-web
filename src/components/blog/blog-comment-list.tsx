'use client';

import { useEffect, useState } from 'react';
import { getBlogComments, deleteBlogComment } from '@/server/actions/blog-comment-actions';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

interface CommentAuthor {
  id: string;
  name: string;
  image?: string | null;
  store?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface Comment {
  id: string;
  body: string;
  createdAt: Date;
  author: CommentAuthor;
}

interface BlogCommentListProps {
  slug: string;
  refreshToken?: number;
  currentUserId?: string;
  currentUserRole?: string;
}

export function BlogCommentList({
  slug,
  refreshToken = 0,
  currentUserId,
  currentUserRole,
}: BlogCommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadComments() {
      try {
        setIsLoading(true);
        const result = await getBlogComments(slug, 100);
        setComments(result.comments as Comment[]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load comments'
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadComments();
  }, [slug, refreshToken]);

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      setDeletingId(commentId);
      await deleteBlogComment(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 animate-pulse"
          >
            <div className="h-4 w-32 bg-[var(--border)] rounded"></div>
            <div className="mt-2 h-3 w-24 bg-[var(--border)] rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
        {error}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-alt)] p-8 text-center">
        <p className="text-[var(--text-muted)]">No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        const canDelete =
          currentUserId === comment.author.id || currentUserRole === 'ADMIN';

        return (
          <div
            key={comment.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
          >
            {/* Author info */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {comment.author.image ? (
                  <Image
                    src={comment.author.image}
                    alt={comment.author.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-semibold">
                    {comment.author.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  {comment.author.store ? (
                    <Link
                      href={`/stores/${comment.author.store.slug}`}
                      className="font-medium text-[var(--primary)] hover:text-[var(--primary-dark)]"
                    >
                      {comment.author.name}
                    </Link>
                  ) : (
                    <p className="font-medium text-[var(--text)]">
                      {comment.author.name}
                    </p>
                  )}

                  {comment.author.store && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Store: {comment.author.store.name}
                    </p>
                  )}

                  <p className="text-xs text-[var(--text-light)]">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>

              {canDelete && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  disabled={deletingId === comment.id}
                  className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === comment.id ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>

            {/* Comment body */}
            <p className="mt-3 text-[var(--text)] leading-relaxed whitespace-pre-wrap break-words">
              {comment.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}
