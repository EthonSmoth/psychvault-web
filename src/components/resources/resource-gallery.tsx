"use client";

import Image from"next/image";
import { useState, useEffect, useRef } from"react";

type GalleryImage = {
  id: string;
  url: string;
  alt: string;
  label?: string;
};

type ResourceGalleryProps = {
  images: GalleryImage[];
  title: string;
  priority?: boolean;
};

export function ResourceGallery({ images, title, priority = false }: ResourceGalleryProps) {
  const [activeImageId, setActiveImageId] = useState(images[0]?.id ??"");
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeImage =
    images.find((image) => image.id === activeImageId) ?? images[0] ?? null;

  // Handle mouse move for hover zoom
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !isZoomed) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPosition({ x, y });
  };

  // Handle zoom level
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(1, Math.min(3, prev + delta)));
  };

  // Close zoom on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key ==="Escape" && isZoomed) {
        setIsZoomed(false);
        setZoom(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZoomed]);

  // Prevent body scroll when zoomed
  useEffect(() => {
    if (isZoomed) {
      document.body.style.overflow ="hidden";
    } else {
      document.body.style.overflow ="unset";
    }
    return () => {
      document.body.style.overflow ="unset";
    };
  }, [isZoomed]);

  // Reset zoom when changing images
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 50, y: 50 });
  }, [activeImageId]);

  if (!activeImage) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-[var(--surface)] to-[var(--surface-strong)] text-sm font-medium text-[var(--text-light)]">
        Preview coming soon
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5">
      {/* Main Image Container */}
      <div
        ref={imageRef}
        className="group relative aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-[var(--surface)] shadow-sm cursor-zoom-in transition-all duration-200"
        onClick={() => {
          setIsZoomed(true);
          setZoom(1.2);
        }}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key ==="Enter" || e.key ==="") {
            setIsZoomed(true);
            setZoom(1.2);
          }
        }}
        aria-label="Click to zoom image"
      >
        <Image
          key={activeImage.id}
          src={activeImage.url}
          alt={activeImage.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) calc(100vw - 2rem), 66vw"
          className="object-cover transition-transform duration-200"
          priority={priority && activeImage.id === images[0]?.id}
          fetchPriority={priority && activeImage.id === images[0]?.id ? "high" : undefined}
          loading={priority && activeImage.id === images[0]?.id ? "eager" : "lazy"}
          style={{
            transformOrigin: isZoomed ? `${position.x}% ${position.y}%` :"center",
            transform: isZoomed ? `scale(${Math.min(zoom, 2.5)})` :"scale(1)",
          }}
        />

        {/* Hover hint */}
        {!isZoomed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-200 group-hover:bg-black/10 flex-col gap-2">
            <div className="text-white/0 transition-all duration-200 group-hover:text-white/70 text-sm font-medium">
              Click to zoom
            </div>
            <div className="text-white/0 transition-all duration-200 group-hover:text-white/50 text-xs">
              Scroll to adjust
            </div>
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="product-title text-sm font-medium text-[var(--text)]">{title} preview gallery</p>
            <p className="text-xs text-[var(--text-light)]">
              {images.findIndex((image) => image.id === activeImage.id) + 1} / {images.length}
            </p>
          </div>

          <div className="gallery pb-1">
            {images.map((image, index) => {
              const isActive = image.id === activeImage.id;

              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImageId(image.id)}
                  className={`group shrink-0 rounded-2xl border bg-[var(--card)] p-1.5 text-left transition ${
                    isActive
                      ?"border-[var(--primary)] shadow-sm"
                      :"border-[var(--border)] hover:border-[var(--accent)]"
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
                  <div className="file-name px-1 pt-2 text-[11px] font-medium text-[var(--text-muted)]">
                    {image.label || `Preview ${index + 1}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Fullscreen Zoom Modal */}
      {isZoomed && (
        <div
          ref={containerRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => {
            setIsZoomed(false);
            setZoom(1);
          }}
        >
          <div
            className="relative h-[90vh] w-[90vw] max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative h-full w-full overflow-auto bg-black/50 rounded-lg"
              onMouseMove={handleMouseMove}
              onWheel={handleWheel}
            >
              <Image
                src={activeImage.url}
                alt={activeImage.alt}
                fill
                className="object-contain"
                style={{
                  transformOrigin: `${position.x}% ${position.y}%`,
                  transform: `scale(${zoom})`,
                }}
              />

              {/* Zoom level indicator */}
              <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-medium">
                {Math.round(zoom * 100)}%
              </div>

              {/* Instructions */}
              <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
                <div>🔍 Scroll to zoom • Drag to pan</div>
                <div>ESC to close</div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => {
                setIsZoomed(false);
                setZoom(1);
              }}
              className="absolute -top-12 right-0 text-white hover:text-white/70 transition-colors p-2"
              aria-label="Close zoom"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
