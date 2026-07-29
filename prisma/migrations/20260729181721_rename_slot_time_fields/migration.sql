/*
  Warnings:

  - You are about to drop the column `endTime` on the `slots` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `slots` table. All the data in the column will be lost.
  - The `status` column on the `slots` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[eventTypeId,startAt,endAt]` on the table `slots` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `endAt` to the `slots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startAt` to the `slots` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'BOOKED');

-- DropIndex
DROP INDEX "slots_eventTypeId_startTime_endTime_key";

-- DropIndex
DROP INDEX "slots_eventTypeId_startTime_status_idx";

-- DropIndex
DROP INDEX "slots_hostId_startTime_idx";

-- AlterTable
ALTER TABLE "slots" DROP COLUMN "endTime",
DROP COLUMN "startTime",
ADD COLUMN     "endAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE';

-- CreateIndex
CREATE INDEX "slots_hostId_startAt_idx" ON "slots"("hostId", "startAt");

-- CreateIndex
CREATE INDEX "slots_eventTypeId_startAt_status_idx" ON "slots"("eventTypeId", "startAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "slots_eventTypeId_startAt_endAt_key" ON "slots"("eventTypeId", "startAt", "endAt");
