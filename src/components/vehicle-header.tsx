"use client";

import { usePathname } from "next/navigation";
import { Users } from "lucide-react";
import { VehicleMedia } from "@/components/vehicle-media";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Media = {
  status: "NONE" | "PENDING" | "READY" | "FAILED";
  videoId: string | null;
  posterId: string | null;
  coverImageId: string | null;
};

function Heading({
  name,
  subtitle,
  ownerName,
}: {
  name: string;
  subtitle: string;
  ownerName: string | null;
}) {
  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">{name}</h1>
      <p className="text-muted-foreground">{subtitle}</p>
      {ownerName && (
        <Badge variant="secondary" className="mt-2 w-fit gap-1">
          <Users className="size-3" /> Geteilt von {ownerName}
        </Badge>
      )}
    </>
  );
}

/**
 * Vehicle page header. The 3D animation / cover sits beside the title on
 * desktop. On mobile the media is only shown on the vehicle's start page; on
 * the other tabs just the heading remains, to save vertical space.
 */
export function VehicleHeader({
  id,
  name,
  subtitle,
  ownerName,
  media,
}: {
  id: string;
  name: string;
  subtitle: string;
  ownerName: string | null;
  media: Media | null;
}) {
  const pathname = usePathname();
  const isDashboard = pathname === `/vehicles/${id}`;

  if (!media) {
    return (
      <div className="mt-2">
        <Heading name={name} subtitle={subtitle} ownerName={ownerName} />
      </div>
    );
  }

  return (
    <>
      {/* Title + media. Always on the start page; desktop-only on other tabs. */}
      <div
        className={cn(
          "mt-2 grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-[#121418] sm:grid-cols-[1fr_1.3fr]",
          !isDashboard && "hidden sm:grid"
        )}
      >
        <div className="order-2 flex flex-col justify-center p-5 sm:order-1">
          <Heading name={name} subtitle={subtitle} ownerName={ownerName} />
        </div>
        <div className="order-1 h-56 sm:order-2 sm:h-72">
          <VehicleMedia
            status={media.status}
            videoId={media.videoId}
            posterId={media.posterId}
            coverImageId={media.coverImageId}
            alt={name}
            className="size-full object-cover"
          />
        </div>
      </div>

      {/* Mobile, non-start pages: just the heading. */}
      {!isDashboard && (
        <div className="mt-2 sm:hidden">
          <Heading name={name} subtitle={subtitle} ownerName={ownerName} />
        </div>
      )}
    </>
  );
}
