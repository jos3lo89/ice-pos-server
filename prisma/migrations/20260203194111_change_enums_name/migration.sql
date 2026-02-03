/*
  Warnings:

  - The `status` column on the `cash_sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `order_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `order_type` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `method` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tipo_doc` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `tables` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `cash_transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `area_impresion` on the `products` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('abierta', 'cerrada');

-- CreateEnum
CREATE TYPE "CashTransactionType" AS ENUM ('ingreso', 'egreso');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('ticket', 'boleta', 'factura');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pendiente', 'preparando', 'listo', 'servido', 'completado', 'cancelado');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('en_local', 'para_llevar');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('efectivo', 'tarjeta', 'yape', 'plin');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pendiente', 'pagado', 'cancelado');

-- CreateEnum
CREATE TYPE "PrinterTarget" AS ENUM ('cocina', 'bar');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('disponible', 'ocupada', 'reservada', 'limpieza');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'mesero', 'cajero', 'cocinero', 'bartender');

-- AlterTable
ALTER TABLE "cash_sessions" DROP COLUMN "status",
ADD COLUMN     "status" "CashSessionStatus" DEFAULT 'abierta';

-- AlterTable
ALTER TABLE "cash_transactions" DROP COLUMN "type",
ADD COLUMN     "type" "CashTransactionType" NOT NULL;

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'pendiente';

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'pendiente',
DROP COLUMN "order_type",
ADD COLUMN     "order_type" "OrderType" NOT NULL DEFAULT 'en_local';

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "method",
ADD COLUMN     "method" "PaymentMethod" NOT NULL DEFAULT 'efectivo',
DROP COLUMN "tipo_doc",
ADD COLUMN     "tipo_doc" "DocType" NOT NULL DEFAULT 'ticket',
DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'pendiente';

-- AlterTable
ALTER TABLE "products" DROP COLUMN "area_impresion",
ADD COLUMN     "area_impresion" "PrinterTarget" NOT NULL;

-- AlterTable
ALTER TABLE "tables" DROP COLUMN "status",
ADD COLUMN     "status" "TableStatus" NOT NULL DEFAULT 'disponible';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'mesero';

-- DropEnum
DROP TYPE "cash_session_status";

-- DropEnum
DROP TYPE "cash_transaction_type";

-- DropEnum
DROP TYPE "doc_type";

-- DropEnum
DROP TYPE "order_status";

-- DropEnum
DROP TYPE "order_type";

-- DropEnum
DROP TYPE "payment_method";

-- DropEnum
DROP TYPE "payment_status";

-- DropEnum
DROP TYPE "printer_target";

-- DropEnum
DROP TYPE "table_status";

-- DropEnum
DROP TYPE "user_role";

-- CreateIndex
CREATE INDEX "idx_orders_status" ON "orders"("status");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE INDEX "idx_tables_status" ON "tables"("status");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");
