/*
  Warnings:

  - Made the column `saldo_esperado` on table `sesiones_caja` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldo_real` on table `sesiones_caja` required. This step will fail if there are existing NULL values in that column.
  - Made the column `diferencia` on table `sesiones_caja` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_plin` on table `sesiones_caja` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_tarjeta` on table `sesiones_caja` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_yape` on table `sesiones_caja` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "sesiones_caja" ALTER COLUMN "saldo_esperado" SET NOT NULL,
ALTER COLUMN "saldo_real" SET NOT NULL,
ALTER COLUMN "diferencia" SET NOT NULL,
ALTER COLUMN "total_plin" SET NOT NULL,
ALTER COLUMN "total_tarjeta" SET NOT NULL,
ALTER COLUMN "total_yape" SET NOT NULL;
