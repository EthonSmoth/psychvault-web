import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";
import { sanitizeUserText } from "@/lib/input-safety";

const BLOG_DIRECTORY = path.join(process.cwd(), "content", "blog");
const DEFAULT_AUTHOR = "PsychVault Editorial Team";

type FrontmatterValue = string | boolean | string[];

export type BlogHeading = {
  id: string;
  level: number;
  text: string;
};

export type BlogPostListItem = {
  slug: string;
  title: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  publishedAt: Date;
  updatedAt: Date | null;
  featured: boolean;
  readingTimeMinutes: number;
  wordCount: number;
};

export type BlogPost = BlogPostListItem & {
  content: string;
  headings: BlogHeading[];
};

function stripWrappingQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseFrontmatterValue(value: string): FrontmatterValue {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => stripWrappingQuotes(item.trim()))
      .filter(Boolean);
  }

  return stripWrappingQuotes(trimmed);
}

function parseFrontmatter(raw: string) {
  if (!raw.startsWith("---\n")) {
    throw new Error("Blog posts must start with frontmatter.");
  }

  const frontmatterEnd = raw.indexOf("\n---\n");

  if (frontmatterEnd === -1) {
    throw new Error("Blog frontmatter is missing a closing delimiter.");
  }

  const rawFrontmatter = raw.slice(4, frontmatterEnd);
  const content = raw.slice(frontmatterEnd + 5).trim();
  const data: Record<string, FrontmatterValue> = {};

  for (const line of rawFrontmatter.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    data[key] = parseFrontmatterValue(value);
  }

  return {
    data,
    content,
  };
}

function toStringList(value: FrontmatterValue | undefined) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUserText(item, { maxLength: 48 })).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => sanitizeUserText(item, { maxLength: 48 }))
      .filter(Boolean);
  }

  return [];
}

function parseRequiredTextField(
  data: Record<string, FrontmatterValue>,
  key: string,
  slug: string,
  maxLength: number
) {
  const value = data[key];

  if (typeof value !== "string") {
    throw new Error(`Blog post "${slug}" is missing required frontmatter: ${key}`);
  }

  const sanitized = sanitizeUserText(value, { maxLength });

  if (!sanitized) {
    throw new Error(`Blog post "${slug}" has an empty frontmatter field: ${key}`);
  }

  return sanitized;
}

function parseOptionalTextField(
  data: Record<string, FrontmatterValue>,
  key: string,
  maxLength: number
) {
  const value = data[key];

  if (typeof value !== "string") {
    return null;
  }

  const sanitized = sanitizeUserText(value, { maxLength });
  return sanitized || null;
}

function parseDateField(
  data: Record<string, FrontmatterValue>,
  key: string,
  slug: string,
  required: boolean
) {
  const value = data[key];

  if (typeof value !== "string") {
    if (required) {
      throw new Error(`Blog post "${slug}" is missing required frontmatter: ${key}`);
    }

    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.valueOf())) {
    throw new Error(`Blog post "${slug}" has an invalid ${key} date.`);
  }

  return parsed;
}

function stripMarkdownForWordCount(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/[#>*_\-\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWordCount(content: string) {
  const stripped = stripMarkdownForWordCount(content);
  return stripped ? stripped.split(" ").length : 0;
}

function getReadingTimeMinutes(content: string) {
  return Math.max(1, Math.ceil(getWordCount(content) / 220));
}

export function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function stripInlineMarkdown(text: string) {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHeadings(content: string): BlogHeading[] {
  const headings: BlogHeading[] = [];
  const slugCounts = new Map<string, number>();
  let inCodeBlock = false;

  for (const line of content.split("\n")) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    const match = /^(#{2,4})\s+(.+)$/.exec(line.trim());

    if (!match) {
      continue;
    }

    const level = match[1].length;
    const text = stripInlineMarkdown(match[2]);

    if (!text) {
      continue;
    }

    const baseId = slugifyHeading(text) || "section";
    const count = slugCounts.get(baseId) ?? 0;
    slugCounts.set(baseId, count + 1);

    headings.push({
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
      level,
      text,
    });
  }

  return headings;
}

function normaliseBlogPost(raw: string, slug: string): BlogPost {
  const { data, content } = parseFrontmatter(raw);
  const title = parseRequiredTextField(data, "title", slug, 140);
  const description = parseRequiredTextField(data, "description", slug, 220);
  const category =
    parseOptionalTextField(data, "category", 48) || "Practice";
  const author = parseOptionalTextField(data, "author", 80) || DEFAULT_AUTHOR;
  const publishedAt = parseDateField(data, "publishedAt", slug, true) as Date;
  const updatedAt = parseDateField(data, "updatedAt", slug, false);
  const featured = data.featured === true;
  const tags = toStringList(data.tags).slice(0, 8);
  const headings = extractHeadings(content);
  const wordCount = getWordCount(content);

  return {
    slug,
    title,
    description,
    author,
    category,
    tags,
    publishedAt,
    updatedAt,
    featured,
    readingTimeMinutes: getReadingTimeMinutes(content),
    wordCount,
    content,
    headings,
  };
}

const loadBlogPosts = cache(async () => {
  const entries = await fs.readdir(BLOG_DIRECTORY, { withFileTypes: true });

  const posts = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map(async (entry) => {
        const slug = entry.name.replace(/\.md$/, "");
        const raw = await fs.readFile(path.join(BLOG_DIRECTORY, entry.name), "utf8");
        return normaliseBlogPost(raw, slug);
      })
  );

  return posts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
});

export async function getAllBlogPosts(): Promise<BlogPostListItem[]> {
  const posts = await loadBlogPosts();
  return posts.map(({ content, headings, ...post }) => post);
}

export async function getFeaturedBlogPosts(limit = 3): Promise<BlogPostListItem[]> {
  const posts = await getAllBlogPosts();
  const featuredPosts = posts.filter((post) => post.featured);
  const fallbackPosts = posts.filter((post) => !post.featured);

  return [...featuredPosts, ...fallbackPosts].slice(0, limit);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await loadBlogPosts();
  return posts.find((post) => post.slug === slug) || null;
}

export async function getRelatedBlogPosts(
  currentSlug: string,
  limit = 3
): Promise<BlogPostListItem[]> {
  const posts = await getAllBlogPosts();
  const current = posts.find((post) => post.slug === currentSlug);

  if (!current) {
    return posts.slice(0, limit);
  }

  return posts
    .filter((post) => post.slug !== currentSlug)
    .map((post) => {
      const sharedTags = post.tags.filter((tag) => current.tags.includes(tag)).length;
      const categoryScore = post.category === current.category ? 2 : 0;

      return {
        post,
        score: categoryScore + sharedTags,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return b.post.publishedAt.getTime() - a.post.publishedAt.getTime();
    })
    .slice(0, limit)
    .map((entry) => entry.post);
}

export function formatBlogDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
