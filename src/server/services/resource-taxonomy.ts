import { db } from "@/lib/db";
import {
  DEFAULT_RESOURCE_CATEGORIES,
  DEFAULT_RESOURCE_TAGS,
} from "@/lib/resource-taxonomy";

export async function ensureDefaultResourceTaxonomy() {
  await db.$transaction([
    ...DEFAULT_RESOURCE_CATEGORIES.map((category) =>
      db.category.upsert({
        where: { slug: category.slug },
        update: { name: category.name },
        create: category,
      })
    ),
    ...DEFAULT_RESOURCE_TAGS.map((tag) =>
      db.tag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name },
        create: tag,
      })
    ),
  ]);
}

export async function getCreatorResourceTaxonomy() {
  await ensureDefaultResourceTaxonomy();

  const [categories, tags] = await Promise.all([
    db.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    db.tag.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return {
    categories,
    tags,
  };
}
