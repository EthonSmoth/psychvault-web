"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from"react";
import { useRouter } from"next/navigation";
import {
  saveResourceAction,
  type ResourceFormState,
} from"@/server/actions/resource-actions";
import { TAG_GROUPS } from"@/lib/resource-taxonomy";

const initialState: ResourceFormState = {};

type Category = { id: string; name: string };
type Tag = { id: string; name: string; slug: string };

type ResourceTag = {
  tagId: string;
};

type ResourceCategory = {
  categoryId: string;
};

type ExistingFile = {
  id?: string;
  url?: string;
  fileUrl?: string;
  name?: string;
  fileName?: string;
  mime?: string | null;
  mimeType?: string | null;
  size?: number | null;
  fileSizeBytes?: number | null;
  kind?: string;
};

type ResourceData = {
  id: string;
  title: string;
  shortDescription?: string | null;
  description: string;
  status?: string;
  moderationStatus?: string;
  moderationReason?: string | null;
  priceCents: number;
  thumbnailUrl?: string | null;
  tags?: ResourceTag[];
  categories?: ResourceCategory[];
  files?: ExistingFile[];
};

type Props = {
  categories: Category[];
  tags: Tag[];
  resource?: ResourceData;
  csrfToken: string;
  paidResourcePayoutRequired?: boolean;
  isTrusted?: boolean;
};

type UploadedFile = {
  url: string;
  name: string;
  mime: string;
  size: number;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadFile(file: File, uploadKind:"thumbnail" |"preview" |"main"): Promise<UploadedFile> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("uploadKind", uploadKind);

  const res = await fetch("/api/upload", {
    method:"POST",
    body: fd,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error ||"Upload failed");
  }

  return res.json();
}

export default function ResourceForm({
  categories,
  tags,
  resource,
  csrfToken,
  paidResourcePayoutRequired = true,
  isTrusted = false,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveResourceAction,
    initialState
  );

  const existingMainFile =
    resource?.files?.find((file) => file.kind ==="MAIN_DOWNLOAD") ?? null;

  const existingPreviews =
    resource?.files?.filter((file) => file.kind ==="PREVIEW") ?? [];

  const [thumbnail, setThumbnail] = useState<UploadedFile | null>(
    resource?.thumbnailUrl
      ? {
          url: resource.thumbnailUrl,
          name:"thumbnail",
          mime:"image/*",
          size: 0,
        }
      : null
  );
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState("");
  const [thumbnailStatus, setThumbnailStatus] = useState("");

  const [mainFile, setMainFile] = useState<UploadedFile | null>(
    existingMainFile
      ? {
          url: existingMainFile.fileUrl || existingMainFile.url ||"",
          name: existingMainFile.fileName || existingMainFile.name ||"download",
          mime: existingMainFile.mimeType || existingMainFile.mime ||"",
          size: existingMainFile.fileSizeBytes || existingMainFile.size || 0,
        }
      : null
  );
  const [mainFileLoading, setMainFileLoading] = useState(false);
  const [mainFileError, setMainFileError] = useState("");
  const [mainFileStatus, setMainFileStatus] = useState("");

  const [previews, setPreviews] = useState<UploadedFile[]>(
    existingPreviews.map((file, index) => ({
      url: file.fileUrl || file.url ||"",
      name: file.fileName || file.name || `preview-${index + 1}`,
      mime: file.mimeType || file.mime ||"image/*",
      size: file.fileSizeBytes || file.size || 0,
    }))
  );
  const [previewsLoading, setPreviewsLoading] = useState(false);
  const [previewsError, setPreviewsError] = useState("");
  const [previewsStatus, setPreviewsStatus] = useState("");
  const [publishResource, setPublishResource] = useState(
    resource ? resource.status ==="PUBLISHED" : true
  );

  const thumbnailRef = useRef<HTMLInputElement>(null);
  const mainFileRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<HTMLInputElement>(null);

  const isUploading = thumbnailLoading || mainFileLoading || previewsLoading;
  const isSubmitDisabled = pending || isUploading;
  const activeUploadMessages = [
    thumbnailLoading ? thumbnailStatus ||"Uploading thumbnail..." : null,
    mainFileLoading ? mainFileStatus ||"Uploading main file..." : null,
    previewsLoading ? previewsStatus ||"Uploading preview images..." : null,
  ].filter(Boolean) as string[];

  useEffect(() => {
    if (state.success) {
      router.push("/creator/resources");
      router.refresh();
    }
  }, [router, state.success]);

  const previewSlotsRemaining = useMemo(() => 4 - previews.length, [previews.length]);

  // Controlled field state — persists across form action failures (React 19 resets defaultValue)
  const [title, setTitle] = useState(resource?.title ??"");
  const [shortDescription, setShortDescription] = useState(resource?.shortDescription ??"");
  const [description, setDescription] = useState(resource?.description ??"");
  const [price, setPrice] = useState(
    resource ? (resource.priceCents / 100).toFixed(2) :"0.00"
  );
  const [categoryId, setCategoryId] = useState(
    resource?.categories?.[0]?.categoryId ??""
  );
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(resource?.tags?.map((tag) => tag.tagId) ?? [])
  );
  const [customTags, setCustomTags] = useState<{ name: string; tempId: string }[]>([]);
  const [tagQuery, setTagQuery] = useState("");

  const tagsBySlug = useMemo(
    () => new Map(tags.map((tag) => [tag.slug, tag])),
    [tags]
  );

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  const filteredTags = useMemo(() => {
    const query = tagQuery.trim().toLowerCase();
    if (!query) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [tagQuery, tags]);

  const exactTagMatch =
    tagQuery.trim().length > 0 &&
    filteredTags.some(
      (t) => t.name.toLowerCase() === tagQuery.trim().toLowerCase()
    );
  const showAddTagButton = isTrusted && tagQuery.trim().length > 0 && !exactTagMatch;

  async function handleThumbnail(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbnailLoading(true);
    setThumbnailError("");
    setThumbnailStatus(`Uploading ${file.name}...`);

    try {
      const result = await uploadFile(file,"thumbnail");
      setThumbnail(result);
      setThumbnailStatus(`Thumbnail uploaded: ${result.name}`);
    } catch (error) {
      setThumbnailStatus("");
      setThumbnailError(error instanceof Error ? error.message :"Thumbnail upload failed. Try again.");
    } finally {
      setThumbnailLoading(false);
    }
  }

  async function handleMainFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setMainFileLoading(true);
    setMainFileError("");
    setMainFileStatus(`Uploading ${file.name}...`);

    try {
      const result = await uploadFile(file,"main");
      setMainFile(result);
      setMainFileStatus(`Main file uploaded: ${result.name}`);
    } catch (error) {
      setMainFileStatus("");
      setMainFileError(error instanceof Error ? error.message :"Main file upload failed. Try again.");
    } finally {
      setMainFileLoading(false);
    }
  }

  async function handlePreviews(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowedFiles = files.slice(0, Math.max(0, 4 - previews.length));
    if (allowedFiles.length === 0) return;

    setPreviewsLoading(true);
    setPreviewsError("");
    setPreviewsStatus(
      `Uploading ${allowedFiles.length} preview image${allowedFiles.length === 1 ?"" :"s"}...`
    );

    try {
      const results = await Promise.all(allowedFiles.map((file) => uploadFile(file,"preview")));
      setPreviews((prev) => [...prev, ...results].slice(0, 4));
      setPreviewsStatus(
        `${results.length} preview image${results.length === 1 ?"" :"s"} uploaded.`
      );
    } catch (error) {
      setPreviewsStatus("");
      setPreviewsError(error instanceof Error ? error.message :"One or more preview uploads failed. Try again.");
    } finally {
      setPreviewsLoading(false);
      if (previewsRef.current) previewsRef.current.value ="";
    }
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="_csrf" value={csrfToken} />
      {resource?.id ? <input type="hidden" name="resourceId" value={resource.id} /> : null}

      <div className="card-section">
        <h2 className="heading-section">
          {resource ?"Edit resource" :"Create resource"}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Add the core details buyers will see before download or purchase.
        </p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Listings may stay in draft if they are new, flagged by moderation rules, or
          need manual review before public sale.
        </p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {paidResourcePayoutRequired
            ?"Paid resources also require completed Stripe payout onboarding for the creator account before they can be published."
            :"This admin-owned creator account can publish paid resources without completed Stripe payout onboarding."}
        </p>

        {resource?.moderationStatus ==="PENDING_REVIEW" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="font-semibold">Moderation status: Pending review</div>
            <div className="mt-1">
              {resource.moderationReason ||
"This resource is waiting for admin review before it can be published again."}
            </div>
          </div>
        ) : null}

        {resource?.moderationStatus ==="REJECTED" ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <div className="font-semibold">Moderation status: Rejected</div>
            <div className="mt-1">
              {resource.moderationReason ||
"This resource was rejected during moderation. Update it before trying to publish again."}
            </div>
          </div>
        ) : null}

        {resource?.moderationStatus ==="APPROVED" && resource?.status ==="DRAFT" ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <div className="font-semibold">Moderation status: Approved</div>
            <div className="mt-1">
              This resource has passed moderation and can be published when you are ready.
            </div>
          </div>
        ) : null}

        {activeUploadMessages.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text)]">
            <div className="font-semibold">Uploading files</div>
            <div className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
              {activeUploadMessages.map((message) => (
                <div key={message}>{message}</div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-6">
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-[var(--text)]"
            >
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CBT Thought Record Worksheet"
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring-focus)]"
            />
          </div>

          <div>
            <label
              htmlFor="shortDescription"
              className="mb-2 block text-sm font-medium text-[var(--text)]"
            >
              Short description
            </label>
            <input
              id="shortDescription"
              name="shortDescription"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="One sentence summary shown on browse cards"
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring-focus)]"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-[var(--text)]"
            >
              Full description
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what's included, who it's for, and how to use it."
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring-focus)]"
            />
          </div>

          <div>
            <label
              htmlFor="price"
              className="mb-2 block text-sm font-medium text-[var(--text)]"
            >
              Price (AUD)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00 for free"
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring-focus)]"
            />
            <p className="mt-2 text-xs text-[var(--text-light)]">
              {paidResourcePayoutRequired
                ?"Free resources can go live without payout setup. Paid resources require Stripe payout onboarding first."
                :"Free and paid resources can both go live on this admin-owned account without Stripe payout onboarding."}
            </p>
          </div>

          <div>
            <label
              htmlFor="categoryId"
              className="mb-2 block text-sm font-medium text-[var(--text)]"
            >
              Category
            </label>
            <p className="mb-2 text-xs text-[var(--text-light)]">
              Choose the main home for this listing. Use tags below for profession, funding
              model, audience, and document type.
            </p>
            <select
              id="categoryId"
              name="categoryId"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring-focus)]"
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-[var(--text)]">Tags</span>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--text-light)]">
                Layer in profession, scheme, population, and format details.
              </p>
              <div className="text-xs text-[var(--text-light)]">
                {selectedTagIds.size} selected
              </div>
            </div>

            {/* Hidden inputs to submit selected tags */}
            {Array.from(selectedTagIds).map((tagId) => (
              <input key={tagId} type="hidden" name="tagIds" value={tagId} />
            ))}

            {/* Hidden inputs for custom tags (trusted users only) */}
            {customTags.map((tag) => (
              <input key={tag.tempId} type="hidden" name="customTagName" value={tag.name} />
            ))}

            <input
              type="search"
              value={tagQuery}
              onChange={(event) => setTagQuery(event.target.value)}
              placeholder="Search tags by profession, funding, topic, or format"
              className="mb-3 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--ring-focus)]"
            />

            {/* Custom tag badges */}
            {customTags.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {customTags.map((tag) => (
                  <span
                    key={tag.tempId}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)] bg-[var(--card)] px-3 py-1 text-xs font-medium text-[var(--primary)]"
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() =>
                        setCustomTags((prev) => prev.filter((t) => t.tempId !== tag.tempId))
                      }
                      className="ml-0.5 text-[var(--primary)] hover:text-[var(--primary-dark)]"
                      aria-label={`Remove custom tag ${tag.name}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            {tagQuery ? (
              // Flat filtered list when searching
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {filteredTags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface)]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTagIds.has(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                        className="h-4 w-4 rounded border-[var(--border-strong)]"
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
                {filteredTags.length === 0 ? (
                  <p className="mt-3 text-xs text-[var(--text-light)]">
                    No tags matched that search.
                  </p>
                ) : null}
                {showAddTagButton ? (
                  <button
                    type="button"
                    onClick={() => {
                      const name = tagQuery.trim();
                      if (!name) return;
                      setCustomTags((prev) => [
                        ...prev,
                        { name, tempId: crypto.randomUUID() },
                      ]);
                      setTagQuery("");
                    }}
                    className="mt-3 inline-flex items-center rounded-xl border border-dashed border-[var(--primary)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--primary)] transition hover:bg-[var(--surface-alt)]"
                  >
                    + Add tag &ldquo;{tagQuery.trim()}&rdquo;
                  </button>
                ) : null}
              </>
            ) : (
              // Grouped accordion when not searching
              <div className="space-y-1.5">
                {TAG_GROUPS.map((group) => {
                  const groupTags = group.slugs
                    .map((slug) => tagsBySlug.get(slug))
                    .filter((t): t is Tag => t !== undefined);
                  if (groupTags.length === 0) return null;
                  const selectedCount = groupTags.filter((t) =>
                    selectedTagIds.has(t.id)
                  ).length;
                  return (
                    <details
                      key={group.label}
                      open={selectedCount > 0}
                      className="group rounded-xl border border-[var(--border)] bg-[var(--surface-alt)]"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
                        <span className="text-sm font-medium text-[var(--text)]">
                          {group.label}
                        </span>
                        <div className="flex items-center gap-2">
                          {selectedCount > 0 ? (
                            <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-[11px] font-semibold text-white">
                              {selectedCount} selected
                            </span>
                          ) : null}
                          <svg
                            className="h-4 w-4 text-[var(--text-muted)] transition-transform group-open:rotate-180"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </summary>
                      <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-1 sm:grid-cols-3 xl:grid-cols-4">
                        {groupTags.map((tag) => (
                          <label
                            key={tag.id}
                            className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface)]"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTagIds.has(tag.id)}
                              onChange={() => toggleTag(tag.id)}
                              className="h-4 w-4 rounded border-[var(--border-strong)]"
                            />
                            {tag.name}
                          </label>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3">
            <input
              type="checkbox"
              name="isPublished"
              checked={publishResource}
              onChange={(event) => setPublishResource(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--border-strong)]"
            />
            <div>
              <div className="text-sm font-medium text-[var(--text)]">Publish resource</div>
              <div className="text-xs text-[var(--text-light)]">
                Make this resource visible on the public site.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <input
              type="checkbox"
              name="creatorAttestation"
              value="yes"
              className="mt-1 h-4 w-4 rounded border-[var(--border-strong)]"
            />
            <div>
              <div className="text-sm font-medium text-[var(--text)]">Creator attestation</div>
              <div className="text-xs leading-5 text-[var(--text-light)]">
                I confirm I own this content or have rights to sell it, and it does not contain explicit,
                hateful, illegal, unsafe, or misleading material.
              </div>
              {publishResource ? (
                <div className="mt-1 text-[11px] font-medium text-[var(--warning)]">
                  Required before this resource can be published.
                </div>
              ) : null}
            </div>
          </label>

          {publishResource ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
              Publishing checks for creator trust, moderation flags, and whether a valid
              download is attached. If review is needed, your resource stays saved as a
              draft instead of going live immediately.
            </div>
          ) : null}
        </div>
      </div>

      <div className="card-section">
        <h2 className="heading-section">Files and media</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Manage the main download, browse thumbnail, and preview images.
        </p>

        <div className="mt-6 space-y-8">
          <div>
            <span className="mb-2 block text-sm font-medium text-[var(--text)]">
              Thumbnail image
            </span>
            <p className="mb-3 text-xs text-[var(--text-light)]">
              This appears on browse cards and the resource header. Recommended 800×500px — JPG, PNG or WEBP.
            </p>

            {thumbnail ? (
              <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)]">
                <img
                  src={thumbnail.url}
                  alt="Thumbnail preview"
                  className="aspect-[16/10] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setThumbnail(null);
                    setThumbnailStatus("");
                    if (thumbnailRef.current) thumbnailRef.current.value ="";
                  }}
                  className="absolute right-3 top-3 rounded-lg bg-[var(--card)]/90 px-2 py-1 text-xs font-medium text-[var(--text)] shadow transition hover:bg-[var(--card)]"
                >
                  Remove
                </button>
                <input type="hidden" name="thumbnailUrl" value={thumbnail.url} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => thumbnailRef.current?.click()}
                disabled={thumbnailLoading || pending}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] py-10 text-sm text-[var(--text-light)] transition hover:border-[var(--accent)] hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {thumbnailLoading ? (
                  <>
                    <span className="font-medium text-[var(--text)]">Uploading thumbnail...</span>
                    <span className="text-xs">{thumbnailStatus}</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">🖼️</span>
                    <span className="font-medium text-[var(--text)]">
                      Click to upload thumbnail
                    </span>
                    <span className="text-xs">Recommended 800×500px · JPG, PNG or WEBP up to 10MB</span>
                  </>
                )}
              </button>
            )}

            <input
              ref={thumbnailRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnail}
              className="hidden"
            />

            {thumbnailError ? (
              <p className="mt-2 text-xs text-red-600">{thumbnailError}</p>
            ) : null}
            {!thumbnailLoading && thumbnailStatus ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">{thumbnailStatus}</p>
            ) : null}
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-[var(--text)]">
              Main download file
            </span>
            <p className="mb-3 text-xs text-[var(--text-light)]">
              The file buyers receive after purchase. PDF, DOCX, ZIP, PPTX, XLSX, etc.
            </p>

            {mainFile ? (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[var(--text)]">
                    {mainFile.name}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--text-light)]">
                    {mainFile.size > 0 ? formatBytes(mainFile.size) :"Existing file"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMainFile(null);
                    setMainFileStatus("");
                    if (mainFileRef.current) mainFileRef.current.value ="";
                  }}
                  className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface)]"
                >
                  Remove
                </button>

                <input type="hidden" name="mainFileUrl" value={mainFile.url} />
                <input type="hidden" name="mainFileName" value={mainFile.name} />
                <input type="hidden" name="mainFileMime" value={mainFile.mime} />
                <input type="hidden" name="mainFileSize" value={mainFile.size} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => mainFileRef.current?.click()}
                disabled={mainFileLoading || pending}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] py-10 text-sm text-[var(--text-light)] transition hover:border-[var(--accent)] hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mainFileLoading ? (
                  <>
                    <span className="font-medium text-[var(--text)]">Uploading main file...</span>
                    <span className="text-xs">{mainFileStatus}</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">📄</span>
                    <span className="font-medium text-[var(--text)]">
                      Click to upload main file
                    </span>
                    <span className="text-xs">PDF, DOCX, ZIP, PPTX, XLSX up to 50MB</span>
                  </>
                )}
              </button>
            )}

            <input
              ref={mainFileRef}
              type="file"
              accept=".pdf,.doc,.docx,.zip,.pptx,.xlsx"
              onChange={handleMainFile}
              className="hidden"
            />

            {mainFileError ? (
              <p className="mt-2 text-xs text-red-600">{mainFileError}</p>
            ) : null}
            {!mainFileLoading && mainFileStatus ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">{mainFileStatus}</p>
            ) : null}
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-[var(--text)]">
              Preview images
              <span className="ml-2 text-xs font-normal text-[var(--text-light)]">up to 4</span>
            </span>
            <p className="mb-3 text-xs text-[var(--text-light)]">
              Sample pages or screenshots shown to buyers before purchase. Recommended 1200×900px.
            </p>

            {previews.length > 0 ? (
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {previews.map((p, i) => (
                  <div
                    key={`${p.url}-${i}`}
                    className="relative overflow-hidden rounded-xl border border-[var(--border)]"
                  >
                    <img
                      src={p.url}
                      alt={`Preview ${i + 1}`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPreviews((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="absolute right-1.5 top-1.5 rounded bg-[var(--card)]/90 px-1.5 py-0.5 text-xs font-medium text-[var(--text)] shadow"
                    >
                      ✕
                    </button>
                    <input type="hidden" name="previewUrl" value={p.url} />
                  </div>
                ))}
              </div>
            ) : null}

            {previews.length < 4 ? (
              <button
                type="button"
                onClick={() => previewsRef.current?.click()}
                disabled={previewsLoading || pending}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] py-8 text-sm text-[var(--text-light)] transition hover:border-[var(--accent)] hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {previewsLoading ? (
                  <>
                    <span className="font-medium text-[var(--text)]">Uploading previews...</span>
                    <span className="text-xs">{previewsStatus}</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">🖼️</span>
                    <span className="font-medium text-[var(--text)]">
                      {previews.length === 0 ?"Add preview images" :"Add more previews"}
                    </span>
                    <span className="text-xs">{previewSlotsRemaining} remaining · min 400×300px</span>
                  </>
                )}
              </button>
            ) : null}

            <input
              ref={previewsRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePreviews}
              className="hidden"
            />

            {previewsError ? (
              <p className="mt-2 text-xs text-red-600">{previewsError}</p>
            ) : null}
            {!previewsLoading && previewsStatus ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">{previewsStatus}</p>
            ) : null}
          </div>
        </div>
      </div>

      {isUploading ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Uploads are in progress. The save button will unlock as soon as everything finishes.
        </div>
      ) : null}

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.success}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ?"Saving..." : isUploading ?"Waiting for uploads..." : resource ?"Update resource" :"Save resource"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/creator/resources")}
          className="inline-flex rounded-xl border border-[var(--border-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
