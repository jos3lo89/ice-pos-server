-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "monto_recibido" DECIMAL(10,2),
ADD COLUMN     "vuelto" DECIMAL(10,2) DEFAULT 0;
