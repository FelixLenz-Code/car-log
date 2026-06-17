import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createVehicleAction } from "@/actions/vehicles";
import { VehicleForm } from "@/components/forms/vehicle-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewVehiclePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Zurück zur Garage
      </Link>
      <Card className="glass">
        <CardHeader>
          <CardTitle>Neues Fahrzeug</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm action={createVehicleAction} submitLabel="Fahrzeug anlegen" />
        </CardContent>
      </Card>
    </div>
  );
}
