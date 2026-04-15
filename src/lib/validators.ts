import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const storeSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120),
  bio: z.string().max(5000).optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  isPublished: z.boolean().optional()
});

export const resourceSchema = z.object({
  title: z.string().min(3).max(160),
  slug: z.string().min(3).max(180),
  description: z.string().min(20),
  shortDescription: z.string().max(220).optional().or(z.literal("")),
  priceCents: z.number().int().nonnegative(),
  isFree: z.boolean().default(false),
  storeId: z.string().cuid(),
  categoryIds: z.array(z.string().cuid()).default([]),
  tagIds: z.array(z.string().cuid()).default([]),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  previewUrl: z.string().url().optional().or(z.literal("")),
  downloadUrl: z.string().url().optional().or(z.literal(""))
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Missing reset token."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80, "Name is too long."),
  email: z.string().trim().email("Enter a valid email address."),
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters.")
    .max(120, "Subject is too long."),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters.")
    .max(5000, "Message is too long."),
});
