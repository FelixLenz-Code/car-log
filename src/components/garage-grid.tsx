"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Car, Gauge, Users, GripVertical, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { VehicleMedia } from "@/components/vehicle-media";
import { reorderVehiclesAction } from "@/actions/vehicles";
import { formatKm, cn } from "@/lib/utils";

const fuelTypeLabel: Record<string, string> = {
  PETROL: "Benzin",
  DIESEL: "Diesel",
  ELECTRIC: "Elektro",
  HYBRID: "Hybrid",
  LPG: "LPG",
};

export type GarageVehicle = {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  fuelType: string;
  shared: boolean;
  currentOdometer: number;
  hasMedia: boolean;
  animationStatus: "NONE" | "PENDING" | "READY" | "FAILED";
  animationVideoId: string | null;
  animationPosterId: string | null;
  coverImageId: string | null;
};

function VehicleCardBody({ v }: { v: GarageVehicle }) {
  return (
    <Card className="h-full overflow-hidden bg-[#121418] transition-colors group-hover:border-primary/40">
      {v.hasMedia && (
        <VehicleMedia
          status={v.animationStatus}
          videoId={v.animationVideoId}
          posterId={v.animationPosterId}
          coverImageId={v.coverImageId}
          alt={v.name}
          className="h-48 w-full object-cover"
        />
      )}
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between">
          {!v.hasMedia && (
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
              <Car className="size-5" />
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {v.shared && (
              <Badge variant="secondary" className="gap-1">
                <Users className="size-3" /> Geteilt
              </Badge>
            )}
            <Badge variant="secondary">{fuelTypeLabel[v.fuelType]}</Badge>
          </div>
        </div>
        <div>
          <p className="font-display text-lg font-semibold">{v.name}</p>
          <p className="text-sm text-muted-foreground">
            {[v.make, v.model, v.year].filter(Boolean).join(" ") || "Keine Details"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Gauge className="size-4" />
          {formatKm(v.currentOdometer)}
        </div>
      </CardContent>
    </Card>
  );
}

export function GarageGrid({ vehicles }: { vehicles: GarageVehicle[] }) {
  const [order, setOrder] = useState(vehicles);
  const [arranging, setArranging] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dragIdRef = useRef<string | null>(null);

  // Re-sync from the server when its data changes (e.g. a vehicle was added or
  // removed elsewhere) — but not while the user is actively rearranging.
  const serverIds = vehicles.map((v) => v.id).join(",");
  const [lastServerIds, setLastServerIds] = useState(serverIds);
  if (serverIds !== lastServerIds && !arranging) {
    setLastServerIds(serverIds);
    setOrder(vehicles);
  }

  function persist(ids: string[]) {
    startTransition(async () => {
      await reorderVehiclesAction(ids);
    });
  }

  function onPointerDown(e: React.PointerEvent, id: string) {
    if (!arranging) return;
    dragIdRef.current = id;
    setDragId(id);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragIdRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const overId = el?.closest<HTMLElement>("[data-vehicle-id]")?.dataset.vehicleId;
    if (!overId || overId === dragIdRef.current) return;
    setOrder((prev) => {
      const from = prev.findIndex((v) => v.id === dragIdRef.current);
      const to = prev.findIndex((v) => v.id === overId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function onPointerUp() {
    if (!dragIdRef.current) return;
    dragIdRef.current = null;
    setDragId(null);
    setOrder((prev) => {
      persist(prev.map((v) => v.id));
      return prev;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {arranging && (
          <span className="mr-auto text-sm text-muted-foreground">
            Karten ziehen, um die Reihenfolge zu ändern.
          </span>
        )}
        {arranging ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setArranging(false)}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <Check className="size-4" /> {pending ? "Speichern…" : "Fertig"}
          </button>
        ) : (
          order.length > 1 && (
            <button
              type="button"
              onClick={() => setArranging(true)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <GripVertical className="size-4" /> Anordnen
            </button>
          )
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {order.map((v) =>
          arranging ? (
            <div
              key={v.id}
              data-vehicle-id={v.id}
              onPointerDown={(e) => onPointerDown(e, v.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={cn(
                "relative cursor-grab touch-none select-none transition-[transform,opacity]",
                dragId === v.id && "scale-[1.03] cursor-grabbing opacity-80"
              )}
            >
              <VehicleCardBody v={v} />
              <div className="pointer-events-none absolute left-3 top-3 flex size-9 items-center justify-center rounded-lg bg-background/80 text-muted-foreground shadow-md backdrop-blur">
                <GripVertical className="size-4" />
              </div>
            </div>
          ) : (
            <Link key={v.id} href={`/vehicles/${v.id}`} className="group">
              <VehicleCardBody v={v} />
            </Link>
          )
        )}
      </div>
    </div>
  );
}
