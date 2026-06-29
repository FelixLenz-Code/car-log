"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { Car, Gauge, Users, GripVertical, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { VehicleMedia } from "@/components/vehicle-media";
import { reorderVehiclesAction } from "@/actions/vehicles";
import { formatKm, cn } from "@/lib/utils";

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const FLIP_MS = 180;

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

type DragState = {
  id: string;
  pointerId: number;
  grabX: number; // pointer offset inside the card
  grabY: number;
  w: number;
  moved: boolean; // did the order actually change during this drag?
};

export function GarageGrid({ vehicles }: { vehicles: GarageVehicle[] }) {
  const [order, setOrder] = useState(vehicles);
  const [arranging, setArranging] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  const overlayRef = useRef<HTMLDivElement>(null);
  // Last-known layout positions (offset coords, transform-immune) for FLIP.
  const prevPos = useRef(new Map<string, { x: number; y: number }>());
  const drag = useRef<DragState | null>(null);
  const lastPointer = useRef({ x: 0, y: 0 });
  const orderRef = useRef(order);
  orderRef.current = order;

  // Re-sync from the server when the set of vehicles changes (added/removed
  // elsewhere) — but never mid-rearrange, so we don't fight the user.
  const serverIds = vehicles.map((v) => v.id).join(",");
  const [lastServerIds, setLastServerIds] = useState(serverIds);
  if (serverIds !== lastServerIds && !arranging) {
    setLastServerIds(serverIds);
    setOrder(vehicles);
  }

  // FLIP: after any order change, slide every card from where it was to where
  // it is now. Uses offsetLeft/Top (immune to in-flight transforms) so rapid
  // reorders never jump or thrash.
  useIsoLayoutEffect(() => {
    const prev = prevPos.current;
    const next = new Map<string, { x: number; y: number }>();
    cellRefs.current.forEach((el, id) => {
      const pos = { x: el.offsetLeft, y: el.offsetTop };
      next.set(id, pos);
      const old = prev.get(id);
      if (!old) return;
      const dx = old.x - pos.x;
      const dy = old.y - pos.y;
      if (!dx && !dy) return;
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      void el.offsetWidth; // force reflow so the next change animates
      requestAnimationFrame(() => {
        el.style.transition = `transform ${FLIP_MS}ms ease`;
        el.style.transform = "";
      });
    });
    prevPos.current = next;
  }, [order, arranging]);

  // Position the lifted overlay under the pointer (imperative — avoids a
  // re-render on every pointermove).
  function positionOverlay(x: number, y: number) {
    const d = drag.current;
    const el = overlayRef.current;
    if (!d || !el) return;
    el.style.transform = `translate(${x - d.grabX}px, ${y - d.grabY}px)`;
  }

  // Place the overlay before the browser paints the first dragging frame.
  useIsoLayoutEffect(() => {
    if (dragId) positionOverlay(lastPointer.current.x, lastPointer.current.y);
  }, [dragId]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>, id: string) {
    if (!arranging || drag.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const cell = cellRefs.current.get(id);
    if (!cell) return;
    const rect = cell.getBoundingClientRect();
    drag.current = {
      id,
      pointerId: e.pointerId,
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
      w: rect.width,
      moved: false,
    };
    lastPointer.current = { x: e.clientX, y: e.clientY };
    cell.setPointerCapture(e.pointerId);
    setDragId(id);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    positionOverlay(e.clientX, e.clientY);

    const grid = gridRef.current;
    if (!grid) return;
    const gridRect = grid.getBoundingClientRect();
    const px = e.clientX - gridRect.left;
    const py = e.clientY - gridRect.top;

    // Insertion target = the cell whose centre is nearest the pointer. This is
    // stable (the dragged slot stays nearest until the pointer clearly enters
    // another cell), so there's no swap-back flicker.
    let bestId = d.id;
    let best = Infinity;
    cellRefs.current.forEach((el, id) => {
      const cx = el.offsetLeft + el.offsetWidth / 2;
      const cy = el.offsetTop + el.offsetHeight / 2;
      const dist = (px - cx) ** 2 + (py - cy) ** 2;
      if (dist < best) {
        best = dist;
        bestId = id;
      }
    });
    if (bestId === d.id) return;
    d.moved = true;

    setOrder((prev) => {
      const from = prev.findIndex((v) => v.id === d.id);
      const to = prev.findIndex((v) => v.id === bestId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function endDrag() {
    const d = drag.current;
    if (!d) return;

    const moved = d.moved;
    const finish = () => {
      drag.current = null;
      setDragId(null);
      if (!moved) return; // a plain tap/click — nothing to persist
      startTransition(async () => {
        await reorderVehiclesAction(orderRef.current.map((v) => v.id));
      });
    };

    // Animate the lifted card down into its final slot, then drop it.
    const grid = gridRef.current;
    const cell = cellRefs.current.get(d.id);
    const overlay = overlayRef.current;
    if (grid && cell && overlay) {
      const gridRect = grid.getBoundingClientRect();
      const left = gridRect.left + cell.offsetLeft;
      const top = gridRect.top + cell.offsetTop;
      overlay.style.transition = `transform ${FLIP_MS}ms ease`;
      overlay.style.transform = `translate(${left}px, ${top}px)`;
      let done = false;
      const settle = () => {
        if (done) return;
        done = true;
        finish();
      };
      overlay.addEventListener("transitionend", settle, { once: true });
      window.setTimeout(settle, FLIP_MS + 80); // fallback if no transitionend
    } else {
      finish();
    }
  }

  const dragged = dragId ? order.find((v) => v.id === dragId) ?? null : null;

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
            disabled={pending || !!dragId}
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

      <div ref={gridRef} className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {order.map((v) => {
          const isDragged = dragId === v.id;
          const setCellRef = (el: HTMLDivElement | null) => {
            if (el) cellRefs.current.set(v.id, el);
            else cellRefs.current.delete(v.id);
          };
          if (!arranging) {
            return (
              <div key={v.id} ref={setCellRef}>
                <Link href={`/vehicles/${v.id}`} className="group block">
                  <VehicleCardBody v={v} />
                </Link>
              </div>
            );
          }
          return (
            <div
              key={v.id}
              ref={setCellRef}
              onPointerDown={(e) => onPointerDown(e, v.id)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className={cn(
                "relative touch-none select-none",
                isDragged ? "cursor-grabbing" : "cursor-grab"
              )}
            >
              {/* The dragged card is shown via the overlay; keep this one in
                  place (invisible) so the grid keeps its size and a slot. */}
              <div className={cn(isDragged && "invisible")}>
                <VehicleCardBody v={v} />
                <div className="pointer-events-none absolute left-3 top-3 flex size-9 items-center justify-center rounded-lg bg-background/80 text-muted-foreground shadow-md backdrop-blur">
                  <GripVertical className="size-4" />
                </div>
              </div>
              {isDragged && (
                <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5" />
              )}
            </div>
          );
        })}
      </div>

      {dragged && (
        <div
          ref={overlayRef}
          className="pointer-events-none fixed left-0 top-0 z-50 will-change-transform"
          style={{ width: drag.current?.w }}
        >
          <div className="rotate-[1deg] rounded-xl shadow-2xl shadow-black/50 ring-2 ring-primary/50">
            <VehicleCardBody v={dragged} />
          </div>
        </div>
      )}
    </div>
  );
}
