import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_RESOURCE_CATEGORIES,
  DEFAULT_RESOURCE_TAGS,
} from "../src/lib/resource-taxonomy";

const prisma = new PrismaClient();

async function main() {
  await prisma.purchase.deleteMany();
  await prisma.review.deleteMany();
  await prisma.resourceTag.deleteMany();
  await prisma.resourceCategory.deleteMany();
  await prisma.resourceFile.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.store.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const categories = await Promise.all(
    DEFAULT_RESOURCE_CATEGORIES.map(({ name, slug }) =>
      prisma.category.create({
        data: { name, slug },
      })
    )
  );

  const tags = await Promise.all(
    DEFAULT_RESOURCE_TAGS.map(({ name, slug }) =>
      prisma.tag.create({
        data: { name, slug },
      })
    )
  );

  const creator = await prisma.user.create({
    data: {
      name: "Ethan Smith",
      email: "creator@psychvault.local",
      role: "CREATOR",
      store: {
        create: {
          name: "Mindful Practice Tools",
          slug: "mindful-practice-tools",
          bio: "Clinician-made resources focused on neurodiversity-affirming practice, emotional understanding, and practical report support.",
          location: "Perth, WA",
          isPublished: true,
        },
      },
    },
    include: {
      store: true,
    },
  });

  const buyer = await prisma.user.create({
    data: {
      name: "Demo Buyer",
      email: "buyer@psychvault.local",
      role: "BUYER",
    },
  });

  const resourceData = [
    {
      title: "Alexithymia Emotion Mapping Worksheet",
      slug: "alexithymia-emotion-mapping-worksheet",
      description:
        "A structured visual worksheet to support clients in identifying body cues, emotional intensity, and likely feeling states. Useful for therapy, psychoeducation, and reflective work.",
      shortDescription: "A visual support for linking body cues to possible emotions.",
      priceCents: 800,
      salesCount: 42,
      averageRating: 4.9,
      reviewCount: 18,
      categorySlugs: ["psychoeducation", "therapy-worksheets"],
      tagSlugs: ["alexithymia", "autism", "emotional-regulation"],
    },
    {
      title: "NDIS Progress Report Wording Pack",
      slug: "ndis-progress-report-wording-pack",
      description:
        "Editable report wording and structure prompts to support clear, clinically grounded NDIS progress reporting.",
      shortDescription: "Editable clinician wording for faster NDIS reporting.",
      priceCents: 1800,
      salesCount: 64,
      averageRating: 4.8,
      reviewCount: 25,
      categorySlugs: ["ndis-resources", "report-templates"],
      tagSlugs: ["ndis", "child", "parent"],
    },
    {
      title: "ADHD Parent Feedback Session Template",
      slug: "adhd-parent-feedback-session-template",
      description:
        "A practical template for structuring parent feedback sessions, including strengths, functional impacts, formulation themes, and support suggestions.",
      shortDescription: "A cleaner structure for parent feedback conversations.",
      priceCents: 1200,
      salesCount: 31,
      averageRating: 4.7,
      reviewCount: 11,
      categorySlugs: ["report-templates", "parent-handouts"],
      tagSlugs: ["adhd", "parent", "child"],
    },
    {
      title: "Child Anxiety Coping Skills Pack",
      slug: "child-anxiety-coping-skills-pack",
      description:
        "A clinician-friendly pack of coping strategies, handouts, and session supports for children experiencing anxiety.",
      shortDescription: "Practical supports for child anxiety sessions.",
      priceCents: 1400,
      salesCount: 22,
      averageRating: 4.6,
      reviewCount: 9,
      categorySlugs: ["psychoeducation", "therapy-worksheets"],
      tagSlugs: ["anxiety", "child", "cbt"],
    },
    {
      title: "Autism-Friendly Psychoeducation Handout",
      slug: "autism-friendly-psychoeducation-handout",
      description:
        "A neurodiversity-affirming handout that explains autistic differences in a respectful, practical, strengths-aware way.",
      shortDescription: "A gentle autism handout grounded in affirming language.",
      priceCents: 0,
      salesCount: 80,
      averageRating: 4.9,
      reviewCount: 33,
      categorySlugs: ["psychoeducation", "parent-handouts"],
      tagSlugs: ["autism", "parent", "adolescent"],
    },
    {
      title: "Trauma-Informed Regulation Check-In",
      slug: "trauma-informed-regulation-check-in",
      description:
        "A simple check-in tool that helps clients notice activation, shutdown, and body-based cues with less demand for perfect verbal insight.",
      shortDescription: "A regulation check-in tool for trauma-aware practice.",
      priceCents: 900,
      salesCount: 19,
      averageRating: 4.8,
      reviewCount: 7,
      categorySlugs: ["therapy-worksheets"],
      tagSlugs: ["trauma", "emotional-regulation", "dbt"],
    },
  ];

  for (const item of resourceData) {
    const resource = await prisma.resource.create({
      data: {
        storeId: creator.store!.id,
        creatorId: creator.id,
        title: item.title,
        slug: item.slug,
        description: item.description,
        shortDescription: item.shortDescription,
        priceCents: item.priceCents,
        isFree: item.priceCents === 0,
        status: "PUBLISHED",
        salesCount: item.salesCount,
        averageRating: item.averageRating,
        reviewCount: item.reviewCount,
        thumbnailUrl: null,
      },
    });

    for (const categorySlug of item.categorySlugs) {
      const category = categories.find((c) => c.slug === categorySlug);
      if (category) {
        await prisma.resourceCategory.create({
          data: {
            resourceId: resource.id,
            categoryId: category.id,
          },
        });
      }
    }

    for (const tagSlug of item.tagSlugs) {
      const tag = tags.find((t) => t.slug === tagSlug);
      if (tag) {
        await prisma.resourceTag.create({
          data: {
            resourceId: resource.id,
            tagId: tag.id,
          },
        });
      }
    }
  }

  await prisma.follow.create({
    data: {
      followerId: buyer.id,
      storeId: creator.store!.id,
    },
  });

  console.log("Seeded PsychVault demo content");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
