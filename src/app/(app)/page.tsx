import Link from "next/link";
import { Car, Plus } from "lucide-react";
import { requireUser, vehicleAccessWhere } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ImportVehicleButton } from "@/components/import-vehicle-button";
import { GarageGrid, type GarageVehicle } from "@/components/garage-grid";
import { hasVehicleMedia } from "@/lib/vehicle-media";

export default async function GaragePage() {
  const user = await requireUser();
  const [vehicles, orders] = await Promise.all([
    db.vehicle.findMany({
      where: vehicleAccessWhere(user.id),
      orderBy: { createdAt: "asc" },
      include: {
        fuelEntries: { select: { odometer: true } },
        odometerEntries: { select: { odometer: true } },
      },
    }),
    db.vehicleOrder.findMany({
      where: { userId: user.id },
      select: { vehicleId: true, sortOrder: true },
    }),
  ]);

  // Apply this user's personal ordering. Vehicles without a saved position keep
  // their createdAt order and sort after the ones that do.
  const orderByVehicle = new Map(orders.map((o) => [o.vehicleId, o.sortOrder]));
  vehicles.sort((a, b) => {
    const oa = orderByVehicle.get(a.id);
    const ob = orderByVehicle.get(b.id);
    if (oa !== undefined && ob !== undefined) return oa - ob;
    if (oa !== undefined) return -1;
    if (ob !== undefined) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const cards: GarageVehicle[] = vehicles.map((v) => ({
    id: v.id,
    name: v.name,
    make: v.make,
    model: v.model,
    year: v.year,
    fuelType: v.fuelType,
    shared: v.userId !== user.id,
    currentOdometer: Math.max(
      v.initialOdometer,
      ...v.fuelEntries.map((f) => f.odometer),
      ...v.odometerEntries.map((o) => o.odometer),
      0
    ),
    hasMedia: hasVehicleMedia(v),
    animationStatus: v.animationStatus,
    animationVideoId: v.animationVideoId,
    animationPosterId: v.animationPosterId,
    coverImageId: v.coverImageId,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Deine Garage
          </h1>
          <p className="mt-1 text-muted-foreground">
            {vehicles.length === 0
              ? "Noch keine Fahrzeuge angelegt."
              : `${vehicles.length} Fahrzeug${vehicles.length === 1 ? "" : "e"}`}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <ImportVehicleButton />
          <Link href="/vehicles/new" className={buttonVariants()}>
            <Plus className="size-4" /> Fahrzeug
          </Link>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Car className="size-8" />
            </span>
            <div>
              <p className="font-display text-lg font-medium">
                Lege dein erstes Fahrzeug an
              </p>
              <p className="text-sm text-muted-foreground">
                Erfasse danach Tankungen, Reparaturen und Pflege.
              </p>
            </div>
            <Link href="/vehicles/new" className={buttonVariants()}>
              <Plus className="size-4" /> Fahrzeug hinzufügen
            </Link>
          </CardContent>
        </Card>
      ) : (
        <GarageGrid vehicles={cards} />
      )}
    </div>
  );
}
