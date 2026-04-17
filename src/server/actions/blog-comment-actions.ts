'use server';

import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { requireVerifiedEmailOrRedirect } from '@/lib/require-email-verification';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeUserText } from '@/lib/input-safety';
import { revalidatePath } from 'next/cache';

function isMissingBlogCommentTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2021' &&
    error.meta?.modelName === 'BlogComment'
  );
}

/**
 * Submit a blog comment
 * Requires: verified email, rate limit check
 * Auto-approves comments from admins, queues others for moderation
 */
export async function submitBlogComment(slug: string, body: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('You must be logged in to comment');
  }

  // Require verified email for comments
  if (!session.user.emailVerified) {
    throw new Error('Please verify your email before commenting');
  }

  // Rate limit: 5 comments per 5 minutes per user
  const rateLimitKey = `blog-comment:${session.user.id}`;
  const isRateLimited = await checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000);

  if (isRateLimited) {
    throw new Error('You are commenting too frequently. Please wait a moment.');
  }

  // Sanitize input
  const sanitized = sanitizeUserText(body);

  if (!sanitized.trim()) {
    throw new Error('Comment cannot be empty');
  }

  if (sanitized.length > 2000) {
    throw new Error('Comment is too long (max 2000 characters)');
  }

  // Auto-approve for admins, queue others for moderation
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const isApproved = user?.role === 'ADMIN';

  // Create the comment
  let comment;

  try {
    comment = await db.blogComment.create({
      data: {
        slug,
        body: sanitized,
        authorId: session.user.id,
        isApproved,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            store: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    if (isMissingBlogCommentTableError(error)) {
      throw new Error('Comments are temporarily unavailable. Please try again later.');
    }

    throw error;
  }

  // Revalidate the blog post page to show the new comment
  revalidatePath(`/blog/${slug}`);

  return comment;
}

/**
 * Approve a blog comment (admin only)
 */
export async function approveBlogComment(commentId: string) {
  const session = await auth();

  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Only admins can approve comments');
  }

  let comment;

  try {
    comment = await db.blogComment.update({
      where: { id: commentId },
      data: { isApproved: true },
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
    });
  } catch (error) {
    if (isMissingBlogCommentTableError(error)) {
      throw new Error('Comments are temporarily unavailable.');
    }

    throw error;
  }

  revalidatePath(`/blog/${comment.slug}`);
  return comment;
}

/**
 * Reject/delete a blog comment (admin or author only)
 */
export async function deleteBlogComment(commentId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('You must be logged in');
  }

  // Find the comment to check ownership
  let comment;

  try {
    comment = await db.blogComment.findUnique({
      where: { id: commentId },
      select: {
        authorId: true,
        slug: true,
      },
    });
  } catch (error) {
    if (isMissingBlogCommentTableError(error)) {
      throw new Error('Comments are temporarily unavailable.');
    }

    throw error;
  }

  if (!comment) {
    throw new Error('Comment not found');
  }

  // Only author or admin can delete
  const isAuthor = comment.authorId === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';

  if (!isAuthor && !isAdmin) {
    throw new Error('You can only delete your own comments');
  }

  try {
    await db.blogComment.delete({
      where: { id: commentId },
    });
  } catch (error) {
    if (isMissingBlogCommentTableError(error)) {
      throw new Error('Comments are temporarily unavailable.');
    }

    throw error;
  }

  revalidatePath(`/blog/${comment.slug}`);
  return { success: true };
}

/**
 * Get all approved blog comments for a post
 */
export async function getBlogComments(slug: string, limit = 50, offset = 0) {
  try {
    const comments = await db.blogComment.findMany({
      where: {
        slug,
        isApproved: true,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            store: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await db.blogComment.count({
      where: {
        slug,
        isApproved: true,
      },
    });

    return {
      comments,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    if (isMissingBlogCommentTableError(error)) {
      return {
        comments: [],
        total: 0,
        hasMore: false,
      };
    }

    throw error;
  }
}

/**
 * Get pending blog comments for moderation (admin only)
 */
export async function getPendingBlogComments(limit = 20, offset = 0) {
  const session = await auth();

  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Only admins can view pending comments');
  }

  try {
    const comments = await db.blogComment.findMany({
      where: {
        isApproved: false,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
      skip: offset,
    });

    const total = await db.blogComment.count({
      where: {
        isApproved: false,
      },
    });

    return {
      comments,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    if (isMissingBlogCommentTableError(error)) {
      return {
        comments: [],
        total: 0,
        hasMore: false,
      };
    }

    throw error;
  }
}
