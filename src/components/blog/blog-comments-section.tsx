'use client';

import { useEffect, useState } from 'react';
import { BlogCommentForm } from '@/components/blog/blog-comment-form';
import { BlogCommentList } from '@/components/blog/blog-comment-list';

type CommentViewerSession =
  | {
      authenticated: false;
    }
  | {
      authenticated: true;
      user: {
        id: string;
        role: string;
      };
    };

let commentSessionCache: CommentViewerSession | undefined;
let commentSessionRequest: Promise<CommentViewerSession> | null = null;

async function fetchCommentSession() {
  if (commentSessionCache) {
    return commentSessionCache;
  }

  if (!commentSessionRequest) {
    commentSessionRequest = fetch('/api/session/nav', {
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load session');
        }

        const payload = (await response.json()) as {
          authenticated: boolean;
          user?: {
            id: string;
            role: string;
          };
        };

        if (!payload.authenticated || !payload.user) {
          return { authenticated: false } satisfies CommentViewerSession;
        }

        return {
          authenticated: true,
          user: {
            id: payload.user.id,
            role: payload.user.role,
          },
        } satisfies CommentViewerSession;
      })
      .catch(() => {
        return { authenticated: false } satisfies CommentViewerSession;
      })
      .then((payload) => {
        commentSessionCache = payload;
        return payload;
      })
      .finally(() => {
        commentSessionRequest = null;
      });
  }

  return commentSessionRequest;
}

export function BlogCommentsSection({ slug }: { slug: string }) {
  const [session, setSession] = useState<CommentViewerSession | null>(
    commentSessionCache ?? null
  );
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchCommentSession().then((payload) => {
      if (!cancelled) {
        setSession(payload);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <BlogCommentForm
        slug={slug}
        isLoggedIn={session?.authenticated === true}
        onCommentSubmitted={() => setRefreshToken((value) => value + 1)}
      />

      <div>
        <h3 className="heading-section mb-4">
          Comments
        </h3>
        <BlogCommentList
          slug={slug}
          refreshToken={refreshToken}
          currentUserId={session?.authenticated ? session.user.id : undefined}
          currentUserRole={session?.authenticated ? session.user.role : undefined}
        />
      </div>
    </>
  );
}