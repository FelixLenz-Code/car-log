-- CreateTable: per-user manual ordering of vehicles in the garage grid
CREATE TABLE "VehicleOrder" (
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "VehicleOrder_pkey" PRIMARY KEY ("userId","vehicleId")
);

-- CreateIndex
CREATE INDEX "VehicleOrder_userId_idx" ON "VehicleOrder"("userId");

-- AddForeignKey
ALTER TABLE "VehicleOrder" ADD CONSTRAINT "VehicleOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOrder" ADD CONSTRAINT "VehicleOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
