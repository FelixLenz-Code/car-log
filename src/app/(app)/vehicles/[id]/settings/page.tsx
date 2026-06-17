import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { updateVehicleAction, deleteVehicleAction } from "@/actions/vehicles";
import { VehicleForm } from "@/components/forms/vehicle-form";
import { DeleteButton } from "@/components/delete-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function VehicleSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const vehicle = await db.vehicle.findFirst({ where: { id, userId: user.id } });
  if (!vehicle) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle>Fahrzeugdaten</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm
            action={updateVehicleAction.bind(null, id)}
            vehicle={vehicle}
            submitLabel="Änderungen speichern"
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Fahrzeug löschen</CardTitle>
          <CardDescription>
            Löscht das Fahrzeug samt aller Tankungen, Reparaturen und Pflege-Einträge.
            Dies kann nicht rückgängig gemacht werden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteButton
            action={deleteVehicleAction.bind(null, id)}
            confirmText={`„${vehicle.name}" mit allen Daten wirklich löschen?`}
            label="Fahrzeug unwiderruflich löschen"
          />
        </CardContent>
      </Card>
    </div>
  );
}
