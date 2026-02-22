/*
  Warnings:

  - You are about to drop the `cash_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cash_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `floors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_item_modifiers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_modifiers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_variants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tables` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EstadoSesionCaja" AS ENUM ('abierta', 'cerrada');

-- CreateEnum
CREATE TYPE "TipoTransaccionCaja" AS ENUM ('ingreso', 'egreso');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('ticket', 'boleta', 'factura');

-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('pendiente', 'preparando', 'listo', 'servido', 'completado', 'cancelado');

-- CreateEnum
CREATE TYPE "TipoOrden" AS ENUM ('en_local', 'para_llevar');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('efectivo', 'tarjeta', 'yape', 'plin');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('pendiente', 'pagado', 'cancelado');

-- CreateEnum
CREATE TYPE "DestinoImpresion" AS ENUM ('cocina', 'bar');

-- CreateEnum
CREATE TYPE "EstadoMesa" AS ENUM ('disponible', 'ocupada', 'reservada', 'limpieza');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('admin', 'mesero', 'cajero', 'cocinero', 'bartender');

-- DropForeignKey
ALTER TABLE "cash_sessions" DROP CONSTRAINT "cash_sessions_cajero_id_fkey";

-- DropForeignKey
ALTER TABLE "cash_transactions" DROP CONSTRAINT "cash_transactions_cash_session_id_fkey";

-- DropForeignKey
ALTER TABLE "order_item_modifiers" DROP CONSTRAINT "order_item_modifiers_modifier_id_fkey";

-- DropForeignKey
ALTER TABLE "order_item_modifiers" DROP CONSTRAINT "order_item_modifiers_order_item_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_order_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_mesero_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_table_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_items" DROP CONSTRAINT "payment_items_order_item_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_items" DROP CONSTRAINT "payment_items_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_cajero_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_cash_session_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_client_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_order_id_fkey";

-- DropForeignKey
ALTER TABLE "product_modifiers" DROP CONSTRAINT "product_modifiers_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_product_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";

-- DropForeignKey
ALTER TABLE "tables" DROP CONSTRAINT "fk_current_order";

-- DropForeignKey
ALTER TABLE "tables" DROP CONSTRAINT "tables_floor_id_fkey";

-- DropTable
DROP TABLE "cash_sessions";

-- DropTable
DROP TABLE "cash_transactions";

-- DropTable
DROP TABLE "categories";

-- DropTable
DROP TABLE "clients";

-- DropTable
DROP TABLE "floors";

-- DropTable
DROP TABLE "order_item_modifiers";

-- DropTable
DROP TABLE "order_items";

-- DropTable
DROP TABLE "orders";

-- DropTable
DROP TABLE "payment_items";

-- DropTable
DROP TABLE "payments";

-- DropTable
DROP TABLE "product_modifiers";

-- DropTable
DROP TABLE "product_variants";

-- DropTable
DROP TABLE "products";

-- DropTable
DROP TABLE "settings";

-- DropTable
DROP TABLE "tables";

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "CashSessionStatus";

-- DropEnum
DROP TYPE "CashTransactionType";

-- DropEnum
DROP TYPE "DocType";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "OrderType";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "PrinterTarget";

-- DropEnum
DROP TYPE "TableStatus";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "sesiones_caja" (
    "id" TEXT NOT NULL,
    "cajero_id" TEXT NOT NULL,
    "saldo_apertura" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "saldo_esperado" DECIMAL(10,2) DEFAULT 0,
    "saldo_real" DECIMAL(10,2) DEFAULT 0,
    "diferencia" DECIMAL(10,2) DEFAULT 0,
    "estado" "EstadoSesionCaja" DEFAULT 'abierta',
    "notas" TEXT,
    "fecha_apertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_cierre" TIMESTAMP(3),

    CONSTRAINT "sesiones_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacciones_caja" (
    "id" TEXT NOT NULL,
    "sesion_caja_id" TEXT,
    "tipo" "TipoTransaccionCaja" NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "descripcion" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transacciones_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "esta_activa" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "tipo_documento" VARCHAR(1) NOT NULL,
    "numero_documento" VARCHAR(15) NOT NULL,
    "razon_social" VARCHAR(255) NOT NULL,
    "direccion" TEXT,
    "ubigeo" VARCHAR(6),
    "departamento" VARCHAR(50),
    "provincia" VARCHAR(50),
    "distrito" VARCHAR(50),
    "correo" VARCHAR(100),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modificadores_item_orden" (
    "item_orden_id" TEXT NOT NULL,
    "modificador_id" TEXT NOT NULL,
    "nombre_modificador" VARCHAR(100) NOT NULL,
    "precio_adicional" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "modificadores_item_orden_pkey" PRIMARY KEY ("item_orden_id","modificador_id")
);

-- CreateTable
CREATE TABLE "items_orden" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "variante_id" TEXT,
    "nombre_producto" VARCHAR(100) NOT NULL,
    "nombre_variante" VARCHAR(100),
    "precio_variante" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "total_modificadores" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_linea" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes" (
    "id" TEXT NOT NULL,
    "numero_orden" VARCHAR(20) NOT NULL,
    "mesa_id" TEXT,
    "mesero_id" TEXT,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'pendiente',
    "tipo_orden" "TipoOrden" NOT NULL DEFAULT 'en_local',
    "motivo_cancelacion" TEXT,
    "notas" TEXT,
    "total" DECIMAL(10,2) DEFAULT 0,
    "monto_pagado" DECIMAL(10,2) DEFAULT 0,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "fecha_completado" TIMESTAMP(3),

    CONSTRAINT "ordenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_pago" (
    "pago_id" TEXT NOT NULL,
    "item_orden_id" TEXT NOT NULL,
    "cantidad_pagada" INTEGER NOT NULL DEFAULT 1,
    "monto_pagado" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "detalles_pago_pkey" PRIMARY KEY ("pago_id","item_orden_id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "numero_pago" VARCHAR(20) NOT NULL,
    "orden_id" TEXT NOT NULL,
    "cajero_id" TEXT,
    "cliente_id" TEXT,
    "sesion_caja_id" TEXT,
    "monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "metodo" "MetodoPago" NOT NULL DEFAULT 'efectivo',
    "tipo_documento" "TipoDocumento" NOT NULL DEFAULT 'ticket',
    "estado" "EstadoPago" NOT NULL DEFAULT 'pendiente',
    "id_externo" VARCHAR(100),
    "notas" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modificadores_producto" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "nombre_modificador" VARCHAR(100) NOT NULL,
    "precio_adicional" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "esta_activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "modificadores_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variantes_producto" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "nombre_variante" VARCHAR(100) NOT NULL,
    "precio_adicional" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "esta_activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "variantes_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "area_impresion" "DestinoImpresion" NOT NULL,
    "descripcion" TEXT,
    "esta_disponible" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuraciones" (
    "id" TEXT NOT NULL,
    "clave" VARCHAR(100) NOT NULL,
    "valor" TEXT,
    "descripcion" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pisos" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "nivel" INTEGER NOT NULL,
    "esta_activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesas" (
    "id" TEXT NOT NULL,
    "numero_mesa" VARCHAR(20) NOT NULL,
    "salon_id" TEXT,
    "estado" "EstadoMesa" NOT NULL DEFAULT 'disponible',
    "reservada_para" VARCHAR(100),
    "orden_actual_id" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "usuario" VARCHAR(50) NOT NULL,
    "contrasena" TEXT NOT NULL,
    "nombre_completo" VARCHAR(100) NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'mesero',
    "esta_activo" BOOLEAN NOT NULL DEFAULT true,
    "telefono" VARCHAR(9) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_numero_documento_key" ON "clientes"("numero_documento");

-- CreateIndex
CREATE INDEX "idx_items_orden_orden" ON "items_orden"("orden_id");

-- CreateIndex
CREATE INDEX "idx_items_orden_producto" ON "items_orden"("producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_numero_orden_key" ON "ordenes"("numero_orden");

-- CreateIndex
CREATE INDEX "idx_ordenes_fecha_creacion" ON "ordenes"("fecha_creacion");

-- CreateIndex
CREATE INDEX "idx_ordenes_estado" ON "ordenes"("estado");

-- CreateIndex
CREATE INDEX "idx_ordenes_mesa" ON "ordenes"("mesa_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_numero_pago_key" ON "pagos"("numero_pago");

-- CreateIndex
CREATE INDEX "idx_pagos_sesion_caja" ON "pagos"("sesion_caja_id");

-- CreateIndex
CREATE INDEX "idx_pagos_orden" ON "pagos"("orden_id");

-- CreateIndex
CREATE INDEX "idx_pagos_estado" ON "pagos"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "uq_modificador_producto" ON "modificadores_producto"("producto_id", "nombre_modificador");

-- CreateIndex
CREATE UNIQUE INDEX "uq_variante_producto" ON "variantes_producto"("producto_id", "nombre_variante");

-- CreateIndex
CREATE INDEX "idx_productos_categoria" ON "productos"("categoria_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_producto_nombre_cat" ON "productos"("categoria_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_clave_key" ON "configuraciones"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "pisos_nivel_key" ON "pisos"("nivel");

-- CreateIndex
CREATE UNIQUE INDEX "mesas_numero_mesa_key" ON "mesas"("numero_mesa");

-- CreateIndex
CREATE INDEX "idx_mesas_estado" ON "mesas"("estado");

-- CreateIndex
CREATE INDEX "idx_mesas_salon" ON "mesas"("salon_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_telefono_key" ON "usuarios"("telefono");

-- CreateIndex
CREATE INDEX "idx_usuarios_rol" ON "usuarios"("rol");

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_cajero_id_fkey" FOREIGN KEY ("cajero_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transacciones_caja" ADD CONSTRAINT "transacciones_caja_sesion_caja_id_fkey" FOREIGN KEY ("sesion_caja_id") REFERENCES "sesiones_caja"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "modificadores_item_orden" ADD CONSTRAINT "modificadores_item_orden_modificador_id_fkey" FOREIGN KEY ("modificador_id") REFERENCES "modificadores_producto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "modificadores_item_orden" ADD CONSTRAINT "modificadores_item_orden_item_orden_id_fkey" FOREIGN KEY ("item_orden_id") REFERENCES "items_orden"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "items_orden" ADD CONSTRAINT "items_orden_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "items_orden" ADD CONSTRAINT "items_orden_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "items_orden" ADD CONSTRAINT "items_orden_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes_producto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_mesero_id_fkey" FOREIGN KEY ("mesero_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_mesa_id_fkey" FOREIGN KEY ("mesa_id") REFERENCES "mesas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalles_pago" ADD CONSTRAINT "detalles_pago_item_orden_id_fkey" FOREIGN KEY ("item_orden_id") REFERENCES "items_orden"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalles_pago" ADD CONSTRAINT "detalles_pago_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "pagos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cajero_id_fkey" FOREIGN KEY ("cajero_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_sesion_caja_id_fkey" FOREIGN KEY ("sesion_caja_id") REFERENCES "sesiones_caja"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "modificadores_producto" ADD CONSTRAINT "modificadores_producto_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "variantes_producto" ADD CONSTRAINT "variantes_producto_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "pisos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "fk_orden_actual" FOREIGN KEY ("orden_actual_id") REFERENCES "ordenes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
