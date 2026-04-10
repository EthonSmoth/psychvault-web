"use client";

import Image from "next/image";
import { useState } from "react";

type GalleryImage = {
  id: string;
  url: string;
  alt: string;
  label?: string;
};

type ResourceGalleryProps = {
  images: GalleryImage[];
  title: string;
};

export function ResourceGallery({ images, title }: ResourceGalleryProps) {
  const [activeImageId, setActiveImageId] = useState(images[0]?.id ?? "");
  const activeImage =
    images.find((image) => image.id === activeImageId) ?? images[0] ?? null;

  if (!activeImage) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-[var(--surface)] to-[var(--surface-strong)] text-sm font-medium text-[var(--text-light)]">
        Preview coming soon
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-[var(--surface)] shadow-sm">
        <Image
          key={activeImage.id}
          src={activeImage.url}
          alt={activeImage.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 ? (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--text)]">{title} preview gallery</p>
            <p className="text-xs text-[var(--text-light)]">
              {images.findIndex((image) => image.id === activeImage.id) + 1} / {images.length}
            </p>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
            {images.map((image, index) => {
              const isActive = image.id === activeImage.id;

              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImageId(image.id)}
                  className={`group shrink-0 rounded-2xl border bg-[var(--card)] p-1.5 text-left transition ${
                    isActive
                      ? "border-[var(--primary)] shadow-sm"
                      : "border-[var(--border)] hover:border-[var(--accent)]"
                  }`}
                  aria-label={`Show preview ${index + 1}`}
                  aria-pressed={isActive}
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-[var(--surface)] sm:h-24 sm:w-24">
                    <Image
                      src={image.url}
                      alt={image.alt}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div className="px-1 pt-2 text-[11px] font-medium text-[var(--text-muted)]">
                    {image.label || `Preview ${index + 1}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
