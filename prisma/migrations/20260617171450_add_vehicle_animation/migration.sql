-- CreateEnum
CREATE TYPE "AnimationStatus" AS ENUM ('NONE', 'PENDING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "animationPosterId" TEXT,
ADD COLUMN     "animationStatus" "AnimationStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "animationVideoId" TEXT;
