import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCSRFToken } from "@/lib/csrf";
import { requireVerifiedEmailOrRedirect } from "@/lib/require-email-verification";
import { redirect } from "next/navigation";
import ResourceForm from "@/components/forms/resource-form";

const defaultCategories = [
  { name: "Assessment Tools", slug: "assessment-tools" },
  { name: "Report Templates", slug: "report-templates" },
  { name: "Psychoeducation", slug: "psychoeducation" },
  { name: "Parent Handouts", slug: "parent-handouts" },
  { name: "NDIS Resources", slug: "ndis-resources" },
  { name: "Therapy Worksheets", slug: "therapy-worksheets" },
];

const defaultTags = [
  { name: "ADHD", slug: "adhd" },
  { name: "Autism", slug: "autism" },
  { name: "Alexithymia", slug: "alexithymia" },
  { name: "Trauma", slug: "trauma" },
  { name: "Anxiety", slug: "anxiety" },
  { name: "NDIS", slug: "ndis" },
  { name: "Child", slug: "child" },
  { name: "Adolescent", slug: "adolescent" },
  { name: "Parent", slug: "parent" },
  { name: "CBT", slug: "cbt" },
  { name: "DBT", slug: "dbt" },
  { name: "Emotional Regulation", slug: "emotional-regulation" },
];

export default async function NewCreatorResourcePage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      store: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  await requireVerifiedEmailOrRedirect(user.id, "/creator/resources/new");

  if (!user.store) {
    redirect("/creator/store");
  }

  const existingCategoryCount = await db.category.count();
  if (existingCategoryCount === 0) {
    await db.category.createMany({
      data: defaultCategories,
      skipDuplicates: true,
    });
  }

  const existingTagCount = await db.tag.count();
  if (existingTagCount === 0) {
    await db.tag.createMany({
      data: defaultTags,
      skipDuplicates: true,
    });
  }

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
  });

  const tags = await db.tag.findMany({
    orderBy: { name: "asc" },
  });
  const csrfToken = generateCSRFToken(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
          New resource
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
          Create a new resource
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Add a clear title, concise description, useful tags, and a fair price.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ResourceForm categories={categories} tags={tags} csrfToken={csrfToken} />
      </div>
    </div>
  );
}
