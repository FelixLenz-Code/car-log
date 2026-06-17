import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

/** Require a logged-in user, or redirect to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require an admin user, or redirect. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/**
 * Load a vehicle owned by the current user, or return null.
 * Enforces per-user data isolation.
 */
export async function getOwnedVehicle(vehicleId: string, userId: string) {
  return db.vehicle.findFirst({
    where: { id: vehicleId, userId },
  });
}

/** Like getOwnedVehicle but redirects home (404-ish) when not found. */
export async function requireOwnedVehicle(vehicleId: string, userId: string) {
  const vehicle = await getOwnedVehicle(vehicleId, userId);
  if (!vehicle) redirect("/");
  return vehicle;
}
