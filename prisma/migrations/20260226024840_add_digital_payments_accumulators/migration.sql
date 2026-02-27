-- AlterTable
ALTER TABLE "sesiones_caja" ADD COLUMN     "total_plin" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "total_tarjeta" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "total_yape" DECIMAL(10,2) DEFAULT 0;
