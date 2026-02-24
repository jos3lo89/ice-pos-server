/*
  Warnings:

  - A unique constraint covering the columns `[orden_actual_id]` on the table `mesas` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "mesas_orden_actual_id_key" ON "mesas"("orden_actual_id");

-- RenameForeignKey
ALTER TABLE "mesas" RENAME CONSTRAINT "fk_orden_actual" TO "mesas_orden_actual_id_fkey";
