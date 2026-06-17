import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteImage } from "@/lib/images";
import { renderVehicleAnimation } from "@/lib/render-animation";

export const MAX_GLB_BYTES = 25 * 1024 * 1024;
const GLB_MAGIC = 0x46546c67; // "glTF" little-endian

/** Copy into a fresh ArrayBuffer-backed array so the type is Uint8Array<ArrayBuffer> (Prisma Bytes). */
function toBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  const a = new Uint8Array(buf.length);
  a.set(buf);
  return a;
}

/**
 * Read and validate an uploaded GLB file from a form field. Returns the bytes,
 * or null if no file was provided. Throws a user-facing message if invalid.
 */
export async function readGlbUpload(value: FormDataEntryValue | null): Promise<Buffer | null> {
  if (!value || typeof value === "string") return null;
  const file = value as File;
  if (file.size === 0) return null;
  if (file.size > MAX_GLB_BYTES) {
    throw new Error(`3D-Modell zu groß (max. ${MAX_GLB_BYTES / 1024 / 1024} MB).`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length < 12 || buf.readUInt32LE(0) !== GLB_MAGIC) {
    throw new Error("Keine gültige GLB-Datei (.glb erwartet).");
  }
  return buf;
}

/**
 * Render the intro animation for a vehicle from a GLB and store the resulting
 * video + poster, updating the vehicle's animation status. Long-running; meant
 * to be scheduled with next/server `after()` so it doesn't block the response.
 */
export async function renderVehicleAnimationJob(
  vehicleId: string,
  glb: Buffer,
  previous: { videoId: string | null; posterId: string | null }
): Promise<void> {
  try {
    const { mp4, poster } = await renderVehicleAnimation(glb);
    const [video, posterImg] = await Promise.all([
      db.image.create({ data: { mimeType: "video/mp4", data: toBytes(mp4) } }),
      db.image.create({ data: { mimeType: "image/jpeg", data: toBytes(poster) } }),
    ]);
    await db.vehicle.update({
      where: { id: vehicleId },
      data: {
        animationVideoId: video.id,
        animationPosterId: posterImg.id,
        animationStatus: "READY",
      },
    });
    await deleteImage(previous.videoId);
    await deleteImage(previous.posterId);
  } catch (e) {
    console.error("Vehicle animation render failed:", e);
    await db.vehicle
      .update({ where: { id: vehicleId }, data: { animationStatus: "FAILED" } })
      .catch(() => {});
  } finally {
    revalidatePath("/");
    revalidatePath(`/vehicles/${vehicleId}`);
  }
}
