/** Server-safe helper: true when a vehicle has something to show in its media slot. */
export function hasVehicleMedia(v: {
  animationStatus: "NONE" | "PENDING" | "READY" | "FAILED";
  animationVideoId: string | null;
  coverImageId: string | null;
}): boolean {
  return (
    v.animationStatus === "PENDING" ||
    (v.animationStatus === "READY" && !!v.animationVideoId) ||
    !!v.coverImageId
  );
}
