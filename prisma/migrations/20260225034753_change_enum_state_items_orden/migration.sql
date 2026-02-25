/*
  Warnings:

  - The `estado` column on the `items_orden` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EstadoItemOrden" AS ENUM ('pendiente', 'preparando', 'listo', 'cancelado');

-- AlterTable
ALTER TABLE "items_orden" DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoItemOrden" NOT NULL DEFAULT 'pendiente';
