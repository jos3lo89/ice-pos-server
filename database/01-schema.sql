-- [01-schema.sql]

-- Borrado de tablas
DROP TABLE IF EXISTS cash_transactions CASCADE;
DROP TABLE IF EXISTS payment_items CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS cash_sessions CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS order_item_modifiers CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_modifiers CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Eliminar tipos
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS order_type CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS table_status CASCADE;
DROP TYPE IF EXISTS printer_target CASCADE;
DROP TYPE IF EXISTS doc_type CASCADE;
DROP TYPE IF EXISTS cash_session_status CASCADE;
DROP TYPE IF EXISTS cash_transaction_type CASCADE;


-- Crear ENUMs (ES)
CREATE TYPE user_role AS ENUM ('admin', 'mesero', 'cajero', 'cocinero', 'bartender');
CREATE TYPE order_status AS ENUM ('pendiente', 'preparando', 'listo', 'servido', 'completado', 'cancelado');
CREATE TYPE order_type AS ENUM ('en_local', 'para_llevar');
CREATE TYPE payment_status AS ENUM ('pendiente', 'pagado', 'cancelado');
CREATE TYPE payment_method AS ENUM ('efectivo', 'tarjeta', 'yape', 'plin');
CREATE TYPE table_status AS ENUM ('disponible', 'ocupada', 'reservada', 'limpieza');
CREATE TYPE printer_target AS ENUM ('cocina', 'bar');
CREATE TYPE doc_type AS ENUM ('ticket', 'boleta', 'factura');
CREATE TYPE cash_session_status AS ENUM ('abierta', 'cerrada');
CREATE TYPE cash_transaction_type AS ENUM ('ingreso', 'egreso');

-- =========================
-- Usuarios
-- =========================
CREATE TABLE users
(
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL UNIQUE,
    password   TEXT         NOT NULL,
    pin        VARCHAR(6),
    full_name  VARCHAR(100) NOT NULL,
    role       user_role    NOT NULL DEFAULT 'mesero',
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    phone      VARCHAR(20) unique,
    created_at TIMESTAMP             DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP             DEFAULT NOW() NOT NULL
);

-- =========================
-- Mesas
-- =========================
CREATE TABLE tables
(
    id               SERIAL PRIMARY KEY,
    table_number     VARCHAR(20)  NOT NULL UNIQUE,
    floor            INTEGER      NOT NULL,
    status           table_status NOT NULL DEFAULT 'disponible',
    reserved_for     VARCHAR(100),
    current_order_id INTEGER,
    created_at       TIMESTAMP             DEFAULT NOW(),
    updated_at       TIMESTAMP             DEFAULT NOW()

);

-- =========================
-- Categorías / Productos
-- =========================
CREATE TABLE categories
(
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL unique,
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP             DEFAULT NOW(),
    updated_at  TIMESTAMP             DEFAULT NOW()
);

CREATE TABLE products
(
    id             SERIAL PRIMARY KEY,
    category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name           VARCHAR(100)   NOT NULL,
    description    TEXT,
    price          DECIMAL(10, 2) NOT NULL,
    area_impresion printer_target NOT NULL,
    is_available   BOOLEAN        NOT NULL DEFAULT TRUE,
    codigo_sunat   VARCHAR(20),                           -- Para 'codigo_producto_sunat'
    unidad_medida  VARCHAR(3)              DEFAULT 'NIU', -- 'NIU' para platos/bebidas, 'ZZ' para servicios
    afec_igv_tipo  VARCHAR(2)              DEFAULT '10',  -- '10' es Gravado (operación normal)
    created_at     TIMESTAMP               DEFAULT NOW(),
    updated_at     TIMESTAMP               DEFAULT NOW(),
    CONSTRAINT uq_products_name_cat UNIQUE (category_id, name)
);

CREATE TABLE product_variants
(
    id               SERIAL PRIMARY KEY,
    product_id       INTEGER REFERENCES products (id) ON DELETE CASCADE,
    variant_name     VARCHAR(100)   NOT NULL,
    additional_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    CONSTRAINT uq_variant UNIQUE (product_id, variant_name)
);

CREATE TABLE product_modifiers
(
    id               SERIAL PRIMARY KEY,
    product_id       INTEGER REFERENCES products (id) ON DELETE CASCADE,
    modifier_name    VARCHAR(100)   NOT NULL,
    additional_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    CONSTRAINT uq_modifier UNIQUE (product_id, modifier_name)
);

-- =========================
-- Ordenes
-- =========================
CREATE TABLE orders
(
    id                  SERIAL PRIMARY KEY,
    order_number        VARCHAR(20)  NOT NULL UNIQUE,
    table_id            INTEGER REFERENCES tables (id),
    mesero_id           INTEGER REFERENCES users (id),
    status              order_status NOT NULL DEFAULT 'pendiente',
    order_type          order_type   NOT NULL DEFAULT 'en_local',
    cancellation_reason TEXT,
    notes               TEXT,
    -- totales
    subtotal            DECIMAL(10, 2)        DEFAULT 0,
    igv                 DECIMAL(10, 2)        DEFAULT 0,
    total               DECIMAL(10, 2)        DEFAULT 0,
    amount_paid         DECIMAL(10, 2)        DEFAULT 0,
    created_at          TIMESTAMP             DEFAULT NOW(),
    updated_at          TIMESTAMP             DEFAULT NOW(),
    completed_at        TIMESTAMP
);

ALTER TABLE tables
    ADD CONSTRAINT fk_current_order FOREIGN KEY (current_order_id) REFERENCES orders (id);

-- =========================
-- Orden Items
-- =========================
CREATE TABLE order_items
(
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id      INTEGER        NOT NULL REFERENCES products (id),
    variant_id      INTEGER REFERENCES product_variants (id),
    quantity        INTEGER        NOT NULL DEFAULT 1,
    unit_price      DECIMAL(10, 2) NOT NULL, -- price base + variant al momento
    modifiers_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    line_total      DECIMAL(10, 2) NOT NULL, -- (unit_price + modifiers_total)*quantity
    status          order_status   NOT NULL DEFAULT 'pendiente',
    notes           TEXT,
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- Modificadores aplicados a cada item
CREATE TABLE order_item_modifiers
(
    order_item_id    INTEGER        NOT NULL REFERENCES order_items (id) ON DELETE CASCADE,
    modifier_id      INTEGER        NOT NULL REFERENCES product_modifiers (id),
    modifier_name    VARCHAR(100)   NOT NULL,
    additional_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    PRIMARY KEY (order_item_id, modifier_id)
);

-- =========================
-- clientes
-- =========================
CREATE TABLE clients
(
    id               SERIAL PRIMARY KEY,
    tipo_documento   VARCHAR(1)   NOT NULL, -- '1' DNI, '6' RUC
    numero_documento VARCHAR(15)  NOT NULL UNIQUE,
    razon_social     VARCHAR(255) NOT NULL,
    direccion        TEXT,
    ubigeo           VARCHAR(6),            -- Código de 6 dígitos (ej: 150101)
    departamento     VARCHAR(50),
    provincia        VARCHAR(50),
    distrito         VARCHAR(50),
    email            VARCHAR(100),
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);
-- =========================
-- Pagos / items
-- =========================
CREATE TABLE payments
(
    id                 SERIAL PRIMARY KEY,
    payment_number     VARCHAR(20)    NOT NULL UNIQUE,
    order_id           INTEGER        NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
    cajero_id          INTEGER REFERENCES users (id),
    client_id          INTEGER REFERENCES clients (id),          -- Quién pagó este monto
    amount             DECIMAL(10, 2) NOT NULL DEFAULT 0,
    method             payment_method NOT NULL DEFAULT 'efectivo',
    tipo_doc           doc_type       NOT NULL DEFAULT 'ticket', -- ticket, boleta o factura
    status             payment_status NOT NULL DEFAULT 'pendiente',
    external_id        VARCHAR(100),                             -- iD de la API
    serie_comprobante  VARCHAR(4),                               -- Ej: B001 o F001
    numero_comprobante VARCHAR(10),
    pdf_url            TEXT,
    xml_url            TEXT,
    enviado_sunat      BOOLEAN                 DEFAULT FALSE,
    created_at         TIMESTAMP               DEFAULT NOW(),
    notes              TEXT,
    updated_at         TIMESTAMP               DEFAULT NOW()
);

CREATE TABLE payment_items
(
    payment_id    INTEGER        NOT NULL REFERENCES payments (id) ON DELETE CASCADE,
    order_item_id INTEGER        NOT NULL REFERENCES order_items (id) ON DELETE RESTRICT,
    paid_quantity INTEGER        NOT NULL DEFAULT 1,
    paid_amount   DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (payment_id, order_item_id)
);


-- =========================
-- Apertura y cierre de caja
-- =========================

CREATE TABLE cash_sessions
(
    id               SERIAL PRIMARY KEY,
    cajero_id        INTEGER        NOT NULL REFERENCES users (id),
    opening_balance  DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Fondo inicial
    expected_balance DECIMAL(10, 2)          DEFAULT 0, -- Calculado por sistema
    actual_balance   DECIMAL(10, 2)          DEFAULT 0, -- Declarado por cajero
    difference       DECIMAL(10, 2)          DEFAULT 0, -- actual - expected
    status           cash_session_status     DEFAULT 'abierta',
    notes            TEXT,
    opened_at        TIMESTAMP               DEFAULT NOW(),
    closed_at        TIMESTAMP
);

-- Vincular pagos a una sesión de caja
ALTER TABLE payments
    ADD COLUMN cash_session_id INTEGER REFERENCES cash_sessions (id);

-- Tabla para gastos menores (Egresos de caja)
CREATE TABLE cash_transactions
(
    id              SERIAL PRIMARY KEY,
    cash_session_id INTEGER REFERENCES cash_sessions (id),
    type            cash_transaction_type NOT NULL,
    amount          DECIMAL(10, 2)        NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);


-- =========================
-- configuraciones del sistema
-- =========================
CREATE TABLE settings
(
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(100) NOT NULL UNIQUE,
    value       TEXT,
    description TEXT,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_orders_table ON orders (table_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at);
CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);
CREATE INDEX idx_payments_order ON payments (order_id);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_tables_status ON tables (status);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_payments_cash_session ON payments(cash_session_id);


-- Output success message
SELECT 'Schema creado Ok' AS message;
