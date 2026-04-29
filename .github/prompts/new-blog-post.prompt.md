---
mode: ask
description: Generate a complete, wire-ready PsychVault blog post — full markdown file + ChatGPT image brief with exact filenames.
---

You are writing a blog post for PsychVault, an Australian marketplace for psychology and allied health resources (psychvault.com.au). The post will be published as a markdown file in `content/blog/`.

## Your output must be two blocks only — nothing else

### Block 1 — Complete markdown file

Output the full, ready-to-commit markdown file.
- Filename: `content/blog/[slug].md` — use a descriptive kebab-case slug matching the topic, max 7 words
- Frontmatter fields: `title`, `description`, `coverImage`, `coverImageAlt`, `publishedAt` (today's date), `author` ("PsychVault Editorial Team"), `category`, `tags`, `featured`
- `coverImage` must reference `/blog/[slug]-hero.jpg` using the same slug as the filename
- Inline images must use standard markdown `![alt text](/blog/filename.jpg "Optional caption")` syntax placed at natural section breaks — one per major section
- All image filenames must exactly match the filenames you specify in Block 2

### Block 2 — Image brief for ChatGPT

Output a clearly labelled image brief with one entry per image (hero + one per major section).

For each image include:
- **Filename** — follows the pattern `[slug]-[descriptor].jpg` (e.g. `neuroaffirming-templates-hero.jpg`)
- **Dimensions** — hero: 1200×630px (16:9), section images: 800×500px (16:10)
- **DALL-E prompt** — Risograph-style editorial illustration in the PsychVault visual language (see style guide below)

---

## Voice and style guide

Read the existing blog posts in `content/blog/` before writing. Match:
- Short punchy opening paragraph before the first section header — strong hook, no scene-setting preamble
- Plain declarative sentences, clinician-to-clinician tone — not academic, not corporate
- No em dashes (use commas or full stops instead)
- No AI-sounding hedges ("it is important to note", "in conclusion", "it goes without saying")
- Practical and slightly confrontational where needed — challenge the reader's assumptions
- TOC jump links after the opening paragraph
- ~2000 words target
- Close with a soft CTA to PsychVault resources + a short language/terminology note if relevant

## Risograph image style guide

All images should be Risograph-style editorial illustrations:
- Japanese-minimalist composition with heavy negative space
- 2–3 flat ink colour layers from the PsychVault palette: **deep charcoal**, **warm cream**, and one accent (choose from: dusty violet, sage green, terracotta, or amber — vary per post to distinguish visually)
- Visible riso grain texture, ink misregistration at shape edges, ink bleed
- Flat and graphic — no photorealism, no gradients
- Zine print aesthetic
- No text, no logos, no legible words in illustrations
- Abstract or gestural figures only — faceless, minimal

## Topic

{{TOPIC}}

---

*Do not add any commentary before Block 1 or between the blocks. Output Block 1, then Block 2, nothing else.*
