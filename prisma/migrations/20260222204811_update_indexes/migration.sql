/*
  Warnings:

  - You are about to drop the column `salon_id` on the `mesas` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "mesas" DROP CONSTRAINT "mesas_salon_id_fkey";

-- DropIndex
DROP INDEX "idx_mesas_salon";

-- AlterTable
ALTER TABLE "mesas" DROP COLUMN "salon_id",
ADD COLUMN     "piso_id" TEXT;

-- CreateIndex
CREATE INDEX "idx_mesas_piso" ON "mesas"("piso_id");

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_piso_id_fkey" FOREIGN KEY ("piso_id") REFERENCES "pisos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
