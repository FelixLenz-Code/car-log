import "server-only";
import { db } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

/**
 * Notify a vehicle's owner that someone else (a shared editor) added or changed
 * an entry. No-op when the actor is the owner. Best-effort: failures are
 * swallowed so they never break the underlying write.
 */
export async function notifyOwnerOfActivity(opts: {
  vehicleId: string;
  ownerId: string;
  actorId: string;
  actorName: string;
  summary: string; // e.g. "hat eine Tankung hinzugefügt"
  path: string; // e.g. /vehicles/<id>/fuel
}): Promise<void> {
  if (opts.ownerId === opts.actorId) return;
  try {
    const vehicle = await db.vehicle.findUnique({
      where: { id: opts.vehicleId },
      select: { name: true },
    });
    await sendPushToUser(opts.ownerId, {
      title: vehicle?.name ?? "Car Log",
      body: `${opts.actorName} ${opts.summary}.`,
      url: opts.path,
      tag: `activity-${opts.vehicleId}`,
    });
  } catch {
    /* notifications are best-effort */
  }
}
