import Link from"next/link";
import { Fragment, createElement, type ReactNode } from"react";
import { slugifyHeading, type BlogHeading } from"@/lib/blog";

type MarkdownRendererProps = {
  content: string;
  headings?: BlogHeading[];
};

function isExternalUrl(href: string) {
  return /^https?:\/\//i.test(href);
}

function renderMarkdownImage({
  alt,
  src,
  title,
  key,
  inline = false,
}: {
  alt: string;
  src: string;
  title?: string;
  key: string;
  inline?: boolean;
}) {
  const image = (
    <img
      key={`${key}-img`}
      src={src}
      alt={alt}
      loading="lazy"
      className={
        inline
          ?"inline-block max-h-64 rounded-2xl border border-[var(--border)] align-middle shadow-sm"
          :"w-full rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-alt)] object-cover shadow-sm"
      }
    />
  );

  if (inline) {
    return image;
  }

  return (
    <figure key={key} className="space-y-3">
      {image}
      {title ? (
        <figcaption className="px-1 text-sm text-[var(--text-light)]">
          {title}
        </figcaption>
      ) : null}
    </figure>
  );
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const tokens = [
    { type:"image", regex: /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/ },
    { type:"code", regex: /`([^`]+)`/ },
    { type:"link", regex: /\[([^\]]+)\]\(([^)]+)\)/ },
    { type:"strong", regex: /\*\*([^*\n]+)\*\*/ },
    { type:"em", regex: /\*(?!\*)([^*\n]+)\*(?!\*)/ },
  ] as const;

  const parts: ReactNode[] = [];
  let remaining = text;
  let index = 0;

  while (remaining.length > 0) {
    let earliest:
      | {
          type: (typeof tokens)[number]["type"];
          match: RegExpExecArray;
          index: number;
        }
      | undefined;

    for (const token of tokens) {
      const match = token.regex.exec(remaining);

      if (!match) {
        continue;
      }

      if (!earliest || match.index < earliest.index) {
        earliest = {
          type: token.type,
          match,
          index: match.index,
        };
      }
    }

    if (!earliest) {
      parts.push(remaining);
      break;
    }

    if (earliest.index > 0) {
      parts.push(remaining.slice(0, earliest.index));
    }

    const key = `${keyPrefix}-${index}`;
    const [fullMatch, firstGroup, secondGroup, thirdGroup] = earliest.match;

    if (earliest.type ==="image") {
      parts.push(
        renderMarkdownImage({
          alt: firstGroup ||"Blog image",
          src: secondGroup.trim(),
          title: thirdGroup?.trim(),
          key,
          inline: true,
        })
      );
    } else if (earliest.type ==="code") {
      parts.push(
        <code
          key={key}
          className="rounded-md bg-[var(--surface-alt)] px-1.5 py-1 font-mono text-[0.92em] text-[var(--text)]"
        >
          {firstGroup}
        </code>
      );
    } else if (earliest.type ==="link") {
      const href = secondGroup.trim();
      const label = renderInlineMarkdown(firstGroup, `${key}-label`);

      parts.push(
        isExternalUrl(href) ? (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--accent)] underline decoration-[var(--border-strong)] underline-offset-4"
          >
            {label}
          </a>
        ) : (
          <Link
            key={key}
            href={href}
            className="font-medium text-[var(--accent)] underline decoration-[var(--border-strong)] underline-offset-4"
          >
            {label}
          </Link>
        )
      );
    } else if (earliest.type ==="strong") {
      parts.push(
        <strong key={key} className="font-semibold text-[var(--text)]">
          {renderInlineMarkdown(firstGroup, `${key}-strong`)}
        </strong>
      );
    } else if (earliest.type ==="em") {
      parts.push(
        <em key={key} className="italic text-[var(--text)]">
          {renderInlineMarkdown(firstGroup, `${key}-em`)}
        </em>
      );
    }

    remaining = remaining.slice(earliest.index + fullMatch.length);
    index += 1;
  }

  return parts;
}

function isBlockBoundary(line: string) {
  const trimmed = line.trim();

  return (
    !trimmed ||
    trimmed.startsWith("```") ||
    /^#{1,6}\s+/.test(trimmed) ||
    /^>\s?/.test(trimmed) ||
    /^[-*]\s+/.test(trimmed) ||
    /^\d+\.\s+/.test(trimmed) ||
    /^---+$/.test(trimmed)
  );
}

function renderMarkdownBlocks(content: string, headings: BlogHeading[] = []) {
  const blocks: ReactNode[] = [];
  const lines = content.split("\n");
  let index = 0;
  let key = 0;
  let headingIndex = 0;

  while (index < lines.length) {
    const currentLine = lines[index];
    const trimmed = currentLine.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push(
        <div
          key={`block-${key}`}
          className="overflow-hidden rounded-3xl border border-[var(--border)] bg-slate-950 shadow-sm"
        >
          {language ? (
            <div className="border-b border-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              {language}
            </div>
          ) : null}
          <pre className="overflow-x-auto px-4 py-4 text-sm leading-7 text-slate-100">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );

      key += 1;
      index += 1;
      continue;
    }

    const imageMatch = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)$/.exec(trimmed);

    if (imageMatch) {
      const [, alt, src, title] = imageMatch;

      blocks.push(
        renderMarkdownImage({
          alt: alt ||"Blog image",
          src: src.trim(),
          title: title?.trim(),
          key: `block-${key}`,
        })
      );

      key += 1;
      index += 1;
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);

    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 4);
      const text = headingMatch[2].trim();
      const id =
        headings[headingIndex]?.id || slugifyHeading(text) || `section-${key}`;
      const className =
        level === 1
          ?"text-4xl font-semibold tracking-tight text-[var(--text)]"
          : level === 2
          ?"scroll-mt-28 text-2xl font-semibold tracking-tight text-[var(--text)]"
          : level === 3
          ?"scroll-mt-28 text-xl font-semibold text-[var(--text)]"
          :"scroll-mt-28 text-lg font-semibold text-[var(--text)]";

      blocks.push(
        createElement(
          `h${level}`,
          {
            key: `block-${key}`,
            id,
            className,
          },
          renderInlineMarkdown(text, `heading-${key}`)
        )
      );

      headingIndex += 1;
      key += 1;
      index += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push(
        <hr key={`block-${key}`} className="border-0 border-t border-[var(--border)]" />
      );
      key += 1;
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];

      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/,""));
        index += 1;
      }

      blocks.push(
        <blockquote
          key={`block-${key}`}
          className="rounded-r-3xl border-l-4 border-[var(--accent)] bg-[var(--surface-alt)] px-5 py-4 text-base leading-7 text-[var(--text-muted)]"
        >
          {renderInlineMarkdown(quoteLines.join(""), `quote-${key}`)}
        </blockquote>
      );

      key += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/,""));
        index += 1;
      }

      blocks.push(
        <ul
          key={`block-${key}`}
          className="space-y-3 rounded-3xl border border-[var(--border)] bg-[var(--card)] px-6 py-5 text-base leading-7 text-[var(--text-muted)] shadow-sm"
        >
          {items.map((item, itemIndex) => (
            <li key={`bullet-${key}-${itemIndex}`} className="flex items-start gap-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
              <span>{renderInlineMarkdown(item, `bullet-${key}-${itemIndex}`)}</span>
            </li>
          ))}
        </ul>
      );

      key += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/,""));
        index += 1;
      }

      blocks.push(
        <ol
          key={`block-${key}`}
          className="space-y-3 rounded-3xl border border-[var(--border)] bg-[var(--card)] px-6 py-5 text-base leading-7 text-[var(--text-muted)] shadow-sm"
        >
          {items.map((item, itemIndex) => (
            <li key={`ordered-${key}-${itemIndex}`} className="flex items-start gap-4">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-alt)] text-sm font-semibold text-[var(--text)]">
                {itemIndex + 1}
              </span>
              <span>{renderInlineMarkdown(item, `ordered-${key}-${itemIndex}`)}</span>
            </li>
          ))}
        </ol>
      );

      key += 1;
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;

    while (index < lines.length && !isBlockBoundary(lines[index])) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push(
      <p key={`block-${key}`} className="text-lg leading-8 text-[var(--text-muted)]">
        {renderInlineMarkdown(paragraphLines.join(""), `paragraph-${key}`)}
      </p>
    );
    key += 1;
  }

  return blocks;
}

export function MarkdownRenderer({ content, headings }: MarkdownRendererProps) {
  return <div className="space-y-6">{renderMarkdownBlocks(content, headings)}</div>;
}

export function BlogTableOfContents({ headings }: { headings: BlogHeading[] }) {
  const visibleHeadings = headings.filter((heading) => heading.level <= 3);

  if (visibleHeadings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
        On this page
      </div>
      <div className="mt-4 space-y-2">
        {visibleHeadings.map((heading) => (
          <Fragment key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={`block rounded-2xl px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--accent)] ${
                heading.level === 3 ?"ml-4 text-[var(--text-muted)]" :""
              }`}
            >
              {heading.text}
            </a>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
