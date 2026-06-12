"use client";

import { Loader2, X } from "lucide-react";
import { useSignedPhotoUrls } from "@/hooks/useSignedPhotoUrls";

interface PhotoGalleryProps {
  /** Storage paths (e.g. "user-id/2026-06-10/uuid.jpg"). NOT public URLs. */
  photos: string[];
  uploading: boolean;
  /** Called with the storage PATH of the photo to delete. */
  onDelete: (path: string) => void;
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Usuń zdjęcie"
      onClick={onClick}
      className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

function PhotoImg({
  src,
  className,
}: {
  src: string | undefined;
  className: string;
}) {
  if (!src) {
    return <div className={`${className} animate-pulse bg-muted`} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Entry photo" className={className} />
  );
}

export function PhotoGallery({ photos, uploading, onDelete }: PhotoGalleryProps) {
  // Resolve storage paths → signed URLs (owner-only, 1h TTL)
  const signedUrls = useSignedPhotoUrls(photos);

  const [firstPath, ...restPaths] = photos;

  // Only uploading spinner, no photos yet
  if (!firstPath && uploading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl bg-muted">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!firstPath) return null;

  // Single photo — full width
  if (restPaths.length === 0 && !uploading) {
    return (
      <div className="relative">
        <PhotoImg
          src={signedUrls[firstPath]}
          className="h-56 w-full rounded-xl object-cover"
        />
        <DeleteBtn onClick={() => onDelete(firstPath)} />
      </div>
    );
  }

  // Multiple photos: large main + thumbnail column on the right
  const thumbPaths = restPaths.slice(0, 2);
  const overflow = restPaths.length > 2 ? restPaths.length - 2 : 0;

  return (
    <div className="flex gap-2">
      {/* Main large photo */}
      <div className="relative flex-1">
        <PhotoImg
          src={signedUrls[firstPath]}
          className="h-48 w-full rounded-xl object-cover"
        />
        <DeleteBtn onClick={() => onDelete(firstPath)} />
      </div>

      {/* Thumbnails column — locked to same height as main photo */}
      <div className="flex h-48 w-[30%] flex-col gap-2">
        {thumbPaths.map((path, i) => {
          const isLast = i === thumbPaths.length - 1 && overflow > 0;
          return (
            <div key={path} className="relative min-h-0 flex-1">
              <PhotoImg
                src={signedUrls[path]}
                className="h-full w-full rounded-xl object-cover"
              />
              {isLast ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                  <span className="text-lg font-semibold text-white">+{overflow}</span>
                </div>
              ) : (
                <DeleteBtn onClick={() => onDelete(path)} />
              )}
            </div>
          );
        })}

        {/* Upload spinner slot */}
        {uploading && thumbPaths.length < 2 && (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
