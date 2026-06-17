import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fuelUnit } from "@/lib/stats";
import { createFuelAction, deleteFuelAction } from "@/actions/entries";
import { FuelForm } from "@/components/forms/entry-forms";
import { DeleteButton } from "@/components/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatKm, formatNumber } from "@/lib/utils";

export default async function FuelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const vehicle = await db.vehicle.findFirst({
    where: { id, userId: user.id },
    include: { fuelEntries: { orderBy: [{ date: "desc" }, { odometer: "desc" }] } },
  });
  if (!vehicle) return null;
  const unit = fuelUnit(vehicle) as "L" | "kWh";

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="glass h-fit">
        <CardHeader>
          <CardTitle>Neue Tankung</CardTitle>
        </CardHeader>
        <CardContent>
          <FuelForm action={createFuelAction.bind(null, id)} unit={unit} />
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Tankbuch ({vehicle.fuelEntries.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {vehicle.fuelEntries.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Noch keine Tankungen erfasst.
            </p>
          )}
          {vehicle.fuelEntries.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{formatDate(f.date)}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatKm(f.odometer)}
                  </span>
                  {f.isFullTank && <Badge variant="secondary">Voll</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatNumber(f.amount, 2)} {unit}
                  {f.station ? ` · ${f.station}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatCurrency(f.totalCost)}</span>
                <DeleteButton action={deleteFuelAction.bind(null, id, f.id)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
