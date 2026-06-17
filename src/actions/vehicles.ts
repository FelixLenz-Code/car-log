"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, getOwnedVehicle } from "@/lib/auth/guards";
import { vehicleSchema } from "@/lib/validation";

export type ActionState = { error?: string };

function parseVehicle(formData: FormData) {
  return vehicleSchema.safeParse({
    name: formData.get("name"),
    make: formData.get("make"),
    model: formData.get("model"),
    year: formData.get("year"),
    licensePlate: formData.get("licensePlate"),
    vin: formData.get("vin"),
    fuelType: formData.get("fuelType"),
    color: formData.get("color"),
    initialOdometer: formData.get("initialOdometer"),
  });
}

export async function createVehicleAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseVehicle(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ungültige Eingabe." };
  }

  const vehicle = await db.vehicle.create({
    data: { ...parsed.data, userId: user.id },
  });
  revalidatePath("/");
  redirect(`/vehicles/${vehicle.id}`);
}

export async function updateVehicleAction(
  vehicleId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const owned = await getOwnedVehicle(vehicleId, user.id);
  if (!owned) return { error: "Fahrzeug nicht gefunden." };

  const parsed = parseVehicle(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ungültige Eingabe." };
  }

  await db.vehicle.update({ where: { id: vehicleId }, data: parsed.data });
  revalidatePath(`/vehicles/${vehicleId}`);
  revalidatePath("/");
  redirect(`/vehicles/${vehicleId}`);
}

export async function deleteVehicleAction(vehicleId: string): Promise<void> {
  const user = await requireUser();
  const owned = await getOwnedVehicle(vehicleId, user.id);
  if (!owned) redirect("/");
  await db.vehicle.delete({ where: { id: vehicleId } });
  revalidatePath("/");
  redirect("/");
}
