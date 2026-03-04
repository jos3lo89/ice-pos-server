-- AlterTable
ALTER TABLE "ordenes" ADD COLUMN     "sesion_caja_id" TEXT;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_sesion_caja_id_fkey" FOREIGN KEY ("sesion_caja_id") REFERENCES "sesiones_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
