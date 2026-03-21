/*
  Warnings:

  - Added the required column `area_impresion` to the `items_orden` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "items_orden" ADD COLUMN     "area_impresion" "DestinoImpresion" NOT NULL;
