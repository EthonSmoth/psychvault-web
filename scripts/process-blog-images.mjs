/**
 * Blog image processor
 *
 * Drop raw PNG/JPG exports from ChatGPT into public/blog/raw/
 * Run: npm run blog:images
 *
 * What it does for each file:
 *   - Hero images (filename ends with -hero):  resize to 1200×630, convert to JPG, quality 82
 *   - Section images (everything else):        resize to 800×500,  convert to JPG, quality 80
 *   - Moves the processed file to public/blog/
 *   - Leaves the raw file in place (so you can re-run safely)
 */

import sharp from "sharp";
import { readdir, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, basename, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, "../public/blog/raw");
const OUT_DIR = join(__dirname, "../public/blog");

const HERO_WIDTH = 1200;
const HERO_HEIGHT = 630;
const SECTION_WIDTH = 800;
const SECTION_HEIGHT = 500;
const HERO_QUALITY = 82;
const SECTION_QUALITY = 80;

const SUPPORTED = new Set([".png", ".jpg", ".jpeg", ".webp"]);

async function run() {
  if (!existsSync(RAW_DIR)) {
    await mkdir(RAW_DIR, { recursive: true });
    console.log(`Created public/blog/raw/ — drop your raw images there and re-run.`);
    return;
  }

  const files = await readdir(RAW_DIR);
  const images = files.filter((f) => SUPPORTED.has(extname(f).toLowerCase()));

  if (images.length === 0) {
    console.log("No images found in public/blog/raw/ — nothing to process.");
    return;
  }

  let processed = 0;
  let skipped = 0;

  for (const file of images) {
    const stem = basename(file, extname(file));
    const outName = `${stem}.jpg`;
    const outPath = join(OUT_DIR, outName);

    if (existsSync(outPath)) {
      console.log(`  skip  ${outName} (already exists in public/blog/)`);
      skipped++;
      continue;
    }

    const isHero = stem.endsWith("-hero");
    const width = isHero ? HERO_WIDTH : SECTION_WIDTH;
    const height = isHero ? HERO_HEIGHT : SECTION_HEIGHT;
    const quality = isHero ? HERO_QUALITY : SECTION_QUALITY;

    await sharp(join(RAW_DIR, file))
      .resize(width, height, { fit: "cover", position: "centre" })
      .jpeg({ quality, mozjpeg: true })
      .toFile(outPath);

    const sizeKb = Math.round(
      (await import("fs")).statSync(outPath).size / 1024
    );
    console.log(`  done  ${outName}  (${width}x${height}, ${sizeKb}kb)`);
    processed++;
  }

  console.log(`\n${processed} processed, ${skipped} skipped.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
