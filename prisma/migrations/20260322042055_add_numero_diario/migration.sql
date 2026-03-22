-- AlterTable
ALTER TABLE "ordenes" ADD COLUMN     "numero_diario" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "secuencia_diaria" (
    "fecha" DATE NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "secuencia_diaria_pkey" PRIMARY KEY ("fecha")
);
