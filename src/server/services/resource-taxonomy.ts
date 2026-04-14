import { db } from "@/lib/db";
import {
  DEFAULT_RESOURCE_CATEGORIES,
  DEFAULT_RESOURCE_TAGS,
} from "@/lib/resource-taxonomy";

export async function ensureDefaultResourceTaxonomy() {
  const [existingCategories, existingTags] = await Promise.all([
    db.category.findMany({
      select: {
        slug: true,
        name: true,
      },
    }),
    db.tag.findMany({
      select: {
        slug: true,
        name: true,
      },
    }),
  ]);

  const existingCategoryMap = new Map(existingCategories.map((item) => [item.slug, item.name]));
  const existingTagMap = new Map(existingTags.map((item) => [item.slug, item.name]));

  const categoryCreates = DEFAULT_RESOURCE_CATEGORIES.filter(
    (category) => !existingCategoryMap.has(category.slug)
  );
  const categoryUpdates = DEFAULT_RESOURCE_CATEGORIES.filter(
    (category) =>
      existingCategoryMap.has(category.slug) &&
      existingCategoryMap.get(category.slug) !== category.name
  );

  const tagCreates = DEFAULT_RESOURCE_TAGS.filter((tag) => !existingTagMap.has(tag.slug));
  const tagUpdates = DEFAULT_RESOURCE_TAGS.filter(
    (tag) => existingTagMap.has(tag.slug) && existingTagMap.get(tag.slug) !== tag.name
  );

  if (
    categoryCreates.length === 0 &&
    categoryUpdates.length === 0 &&
    tagCreates.length === 0 &&
    tagUpdates.length === 0
  ) {
    return;
  }

  await db.$transaction([
    ...(categoryCreates.length > 0
      ? [
          db.category.createMany({
            data: categoryCreates,
            skipDuplicates: true,
          }),
        ]
      : []),
    ...categoryUpdates.map((category) =>
      db.category.update({
        where: { slug: category.slug },
        data: { name: category.name },
      })
    ),
    ...(tagCreates.length > 0
      ? [
          db.tag.createMany({
            data: tagCreates,
            skipDuplicates: true,
          }),
        ]
      : []),
    ...tagUpdates.map((tag) =>
      db.tag.update({
        where: { slug: tag.slug },
        data: { name: tag.name },
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
