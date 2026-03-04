/*
  Warnings:

  - The values [ingreso,egreso] on the enum `TipoTransaccionCaja` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `cajero_id` to the `transacciones_caja` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TipoTransaccionCaja_new" AS ENUM ('apertura', 'ingreso_venta', 'egreso_gasto', 'ingreso_manual', 'egreso_manual', 'cierre');
ALTER TABLE "transacciones_caja" ALTER COLUMN "tipo" TYPE "TipoTransaccionCaja_new" USING ("tipo"::text::"TipoTransaccionCaja_new");
ALTER TYPE "TipoTransaccionCaja" RENAME TO "TipoTransaccionCaja_old";
ALTER TYPE "TipoTransaccionCaja_new" RENAME TO "TipoTransaccionCaja";
DROP TYPE "public"."TipoTransaccionCaja_old";
COMMIT;

-- AlterTable
ALTER TABLE "transacciones_caja" ADD COLUMN     "cajero_id" TEXT NOT NULL,
ADD COLUMN     "pago_id" TEXT;

-- AddForeignKey
ALTER TABLE "transacciones_caja" ADD CONSTRAINT "transacciones_caja_cajero_id_fkey" FOREIGN KEY ("cajero_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transacciones_caja" ADD CONSTRAINT "transacciones_caja_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "pagos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
