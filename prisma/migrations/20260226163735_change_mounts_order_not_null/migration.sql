/*
  Warnings:

  - Made the column `total` on table `ordenes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `monto_pagado` on table `ordenes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ordenes" ALTER COLUMN "total" SET NOT NULL,
ALTER COLUMN "monto_pagado" SET NOT NULL;
