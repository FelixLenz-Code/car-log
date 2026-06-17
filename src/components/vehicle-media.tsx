"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Props = {
  status: "NONE" | "PENDING" | "READY" | "FAILED";
  videoId: string | null;
  posterId: string | null;
  coverImageId: string | null;
  alt: string;
  className?: string;
};

/**
 * Renders a vehicle's media: the 3D intro animation (plays once on load, then
 * holds the final frame) when ready, otherwise the cover image. While a render
 * is pending it shows a placeholder and refreshes the route until it's done.
 */
export function VehicleMedia({ status, videoId, posterId, coverImageId, alt, className }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "PENDING") return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [status, router]);

  if (status === "READY" && videoId) {
    return (
      <video
        className={className}
        src={`/api/images/${videoId}`}
        poster={posterId ? `/api/images/${posterId}` : undefined}
        autoPlay
        muted
        playsInline
        preload="auto"
      />
    );
  }

  if (status === "PENDING") {
    return (
      <div className={`relative ${className ?? ""}`}>
        {coverImageId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/images/${coverImageId}`} alt={alt} className="size-full object-cover" />
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/60 text-sm text-muted-foreground backdrop-blur-sm">
          <Loader2 className="size-4 animate-spin" /> Animation wird erstellt …
        </div>
      </div>
    );
  }

  if (coverImageId) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={`/api/images/${coverImageId}`} alt={alt} />;
  }

  return null;
}
