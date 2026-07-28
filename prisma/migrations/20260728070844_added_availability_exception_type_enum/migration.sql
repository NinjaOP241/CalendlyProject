/*
  Warnings:

  - Changed the type of `type` on the `availability_exceptions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AvailabilityExceptionType" AS ENUM ('BLOCK_FULL_DAY', 'BLOCK_PARTIAL', 'ADD_AVAILABLE_WINDOW');

-- AlterTable
ALTER TABLE "availability_exceptions" DROP COLUMN "type",
ADD COLUMN     "type" "AvailabilityExceptionType" NOT NULL;

-- AlterTable
ALTER TABLE "availability_rules" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
