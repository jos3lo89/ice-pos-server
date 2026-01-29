-- CreateEnum
CREATE TYPE "cash_session_status" AS ENUM ('abierta', 'cerrada');

-- CreateEnum
CREATE TYPE "cash_transaction_type" AS ENUM ('ingreso', 'egreso');

-- CreateEnum
CREATE TYPE "doc_type" AS ENUM ('ticket', 'boleta', 'factura');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pendiente', 'preparando', 'listo', 'servido', 'completado', 'cancelado');

-- CreateEnum
CREATE TYPE "order_type" AS ENUM ('en_local', 'para_llevar');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('efectivo', 'tarjeta', 'yape', 'plin');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pendiente', 'pagado', 'cancelado');

-- CreateEnum
CREATE TYPE "printer_target" AS ENUM ('cocina', 'bar');

-- CreateEnum
CREATE TYPE "table_status" AS ENUM ('disponible', 'ocupada', 'reservada', 'limpieza');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'mesero', 'cajero', 'cocinero', 'bartender');

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" SERIAL NOT NULL,
    "cajero_id" INTEGER NOT NULL,
    "opening_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "expected_balance" DECIMAL(10,2) DEFAULT 0,
    "actual_balance" DECIMAL(10,2) DEFAULT 0,
    "difference" DECIMAL(10,2) DEFAULT 0,
    "status" "cash_session_status" DEFAULT 'abierta',
    "notes" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" SERIAL NOT NULL,
    "cash_session_id" INTEGER,
    "type" "cash_transaction_type" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "tipo_documento" VARCHAR(1) NOT NULL,
    "numero_documento" VARCHAR(15) NOT NULL,
    "razon_social" VARCHAR(255) NOT NULL,
    "direccion" TEXT,
    "ubigeo" VARCHAR(6),
    "departamento" VARCHAR(50),
    "provincia" VARCHAR(50),
    "distrito" VARCHAR(50),
    "email" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_modifiers" (
    "order_item_id" INTEGER NOT NULL,
    "modifier_id" INTEGER NOT NULL,
    "modifier_name" VARCHAR(100) NOT NULL,
    "additional_price" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "order_item_modifiers_pkey" PRIMARY KEY ("order_item_id","modifier_id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "variant_id" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "modifiers_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(10,2) NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'pendiente',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "order_number" VARCHAR(20) NOT NULL,
    "table_id" INTEGER,
    "mesero_id" INTEGER,
    "status" "order_status" NOT NULL DEFAULT 'pendiente',
    "order_type" "order_type" NOT NULL DEFAULT 'en_local',
    "cancellation_reason" TEXT,
    "notes" TEXT,
    "subtotal" DECIMAL(10,2) DEFAULT 0,
    "igv" DECIMAL(10,2) DEFAULT 0,
    "total" DECIMAL(10,2) DEFAULT 0,
    "amount_paid" DECIMAL(10,2) DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_items" (
    "payment_id" INTEGER NOT NULL,
    "order_item_id" INTEGER NOT NULL,
    "paid_quantity" INTEGER NOT NULL DEFAULT 1,
    "paid_amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "payment_items_pkey" PRIMARY KEY ("payment_id","order_item_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "payment_number" VARCHAR(20) NOT NULL,
    "order_id" INTEGER NOT NULL,
    "cajero_id" INTEGER,
    "client_id" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "method" "payment_method" NOT NULL DEFAULT 'efectivo',
    "tipo_doc" "doc_type" NOT NULL DEFAULT 'ticket',
    "status" "payment_status" NOT NULL DEFAULT 'pendiente',
    "external_id" VARCHAR(100),
    "serie_comprobante" VARCHAR(4),
    "numero_comprobante" VARCHAR(10),
    "pdf_url" TEXT,
    "xml_url" TEXT,
    "enviado_sunat" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cash_session_id" INTEGER,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_modifiers" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "modifier_name" VARCHAR(100) NOT NULL,
    "additional_price" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "product_modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "variant_name" VARCHAR(100) NOT NULL,
    "additional_price" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "area_impresion" "printer_target" NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "codigo_sunat" VARCHAR(20),
    "unidad_medida" VARCHAR(3) DEFAULT 'NIU',
    "afec_igv_tipo" VARCHAR(2) DEFAULT '10',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" SERIAL NOT NULL,
    "table_number" VARCHAR(20) NOT NULL,
    "floor" INTEGER NOT NULL,
    "status" "table_status" NOT NULL DEFAULT 'disponible',
    "reserved_for" VARCHAR(100),
    "current_order_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password" TEXT NOT NULL,
    "pin" VARCHAR(6),
    "full_name" VARCHAR(100) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'mesero',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "phone" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "clients_numero_documento_key" ON "clients"("numero_documento");

-- CreateIndex
CREATE INDEX "idx_order_items_order" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "idx_order_items_product" ON "order_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "idx_orders_created_at" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "idx_orders_status" ON "orders"("status");

-- CreateIndex
CREATE INDEX "idx_orders_table" ON "orders"("table_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_number_key" ON "payments"("payment_number");

-- CreateIndex
CREATE INDEX "idx_payments_cash_session" ON "payments"("cash_session_id");

-- CreateIndex
CREATE INDEX "idx_payments_order" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_modifier" ON "product_modifiers"("product_id", "modifier_name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_variant" ON "product_variants"("product_id", "variant_name");

-- CreateIndex
CREATE INDEX "idx_products_category" ON "products"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_products_name_cat" ON "products"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "tables_table_number_key" ON "tables"("table_number");

-- CreateIndex
CREATE INDEX "idx_tables_status" ON "tables"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_cajero_id_fkey" FOREIGN KEY ("cajero_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_modifier_id_fkey" FOREIGN KEY ("modifier_id") REFERENCES "product_modifiers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_mesero_id_fkey" FOREIGN KEY ("mesero_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cajero_id_fkey" FOREIGN KEY ("cajero_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_modifiers" ADD CONSTRAINT "product_modifiers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "fk_current_order" FOREIGN KEY ("current_order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
