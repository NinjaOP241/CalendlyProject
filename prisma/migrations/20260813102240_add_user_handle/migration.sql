/*
  Warnings:

  - You are about to drop the column `slug` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[handle]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `handle` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "users_slug_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "slug",
ADD COLUMN     "handle" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");
