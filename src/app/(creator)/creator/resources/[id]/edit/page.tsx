import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCSRFToken } from "@/lib/csrf";
import { requireVerifiedEmailOrRedirect } from "@/lib/require-email-verification";
import ResourceForm from "@/components/forms/resource-form";

type EditResourcePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditResourcePage({ params }: EditResourcePageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const { id } = await params;

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: { store: true },
  });

  if (!user?.store) {
    redirect("/creator/store");
  }

  await requireVerifiedEmailOrRedirect(user.id, `/creator/resources/${id}/edit`);

  const [categories, tags, resource] = await Promise.all([
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
    db.resource.findFirst({
      where: {
        id,
        storeId: user.store.id,
        creatorId: user.id,
      },
      include: {
        categories: true,
        tags: true,
        files: true,
      },
    }),
  ]);

  if (!resource) {
    redirect("/creator/resources");
  }

  const csrfToken = generateCSRFToken(user.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
          Edit resource
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
          {resource.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Update the listing details, download file, previews, category, pricing, and publish state.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {resource.status === "PUBLISHED" ? "Published" : "Draft"}
          </span>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              resource.moderationStatus === "APPROVED"
                ? "bg-emerald-100 text-emerald-700"
                : resource.moderationStatus === "PENDING_REVIEW"
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-700"
            }`}
          >
            {resource.moderationStatus === "PENDING_REVIEW"
              ? "Pending review"
              : resource.moderationStatus === "REJECTED"
              ? "Rejected"
              : "Approved"}
          </span>
        </div>
      </div>

      <ResourceForm categories={categories} tags={tags} resource={resource} csrfToken={csrfToken} />
    </main>
  );
}
