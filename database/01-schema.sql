-- [01-schema.sql]
-- Borrado de tablas por orden de jerarquía
DROP TABLE IF EXISTS payment_details CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_modifiers CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Eliminar tipos existentes
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS order_type CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS table_status CASCADE;
DROP TYPE IF EXISTS printer_target CASCADE;

-- Crear ENUM
CREATE TYPE user_role AS ENUM ('admin', 'mesero', 'cajero', 'cocinero', 'bartender');
CREATE TYPE order_status AS ENUM ('pendiente', 'preparando', 'listo', 'servido', 'completado', 'cancelado');
CREATE TYPE order_type AS ENUM ('en_local', 'para_llevar', 'delivery');
CREATE TYPE payment_status AS ENUM ('pendiente', 'pagado', 'cancelado');
CREATE TYPE payment_method AS ENUM ('efectivo', 'tarjeta', 'yape', 'plin');
CREATE TYPE table_status AS ENUM ('disponible', 'ocupada', 'reservada');
CREATE TYPE printer_target AS ENUM ('cocina', 'bar' );

-- Usuarios
CREATE TABLE users
(
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL UNIQUE,
    password   TEXT         NOT NULL,
    pin        VARCHAR(6),
    full_name  VARCHAR(100) NOT NULL,
    role       user_role    NOT NULL DEFAULT 'mesero',
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP             DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP             DEFAULT NOW() NOT NULL,
    phone      VARCHAR(20)
);

-- Mesas (3 Pisos)
CREATE TABLE tables
(
    id               SERIAL PRIMARY KEY,
    table_number     VARCHAR(20)  NOT NULL UNIQUE,
    floor            INTEGER      NOT NULL CHECK (floor BETWEEN 1 AND 3),
    status           table_status NOT NULL DEFAULT 'disponible',
    current_order_id INTEGER,
    created_at       TIMESTAMP             DEFAULT NOW(),
    updated_at       TIMESTAMP             DEFAULT NOW()

);

-- Categorías
CREATE TABLE categories
(
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP             DEFAULT NOW(),
    updated_at  TIMESTAMP             DEFAULT NOW()
);

-- Productos y Áreas de Impresión
CREATE TABLE products
(
    id             SERIAL PRIMARY KEY,
    category_id    INTEGER REFERENCES categories (id),
    name           VARCHAR(100)   NOT NULL,
    description    TEXT,
    price          DECIMAL(10, 2) NOT NULL,
    area_impresion printer_target,
    is_available   BOOLEAN        NOT NULL DEFAULT TRUE,
    emoji          VARCHAR(10),
    created_at     TIMESTAMP               DEFAULT NOW(),
    updated_at     TIMESTAMP               DEFAULT NOW()
);


-- Variantes (Lomo Res vs Pollo, Jugo 1L vs 2L)
CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL,
    additional_price DECIMAL(10, 2) DEFAULT 0
);

-- Modificadores (Con azucar, Cocido, quemado)
CREATE TABLE product_modifiers
(
    id               SERIAL PRIMARY KEY,
    product_id       INTEGER REFERENCES products (id) ON DELETE CASCADE,
    modifier_name    VARCHAR(100) NOT NULL,
    additional_price DECIMAL(10, 2) DEFAULT 0
);

-- Ordenes
CREATE TABLE orders


(
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(20) NOT NULL UNIQUE,
    table_id INTEGER REFERENCES tables(id),
    mesero_id INTEGER REFERENCES users(id), -- Unificado
    subtotal DECIMAL(10, 2) DEFAULT 0,
    igv DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    status order_status NOT NULL DEFAULT 'pendiente',
    order_type order_type DEFAULT 'dine_in',
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()


    id                  SERIAL PRIMARY KEY,
    order_number        VARCHAR(20)  NOT NULL UNIQUE,
    table_id            INTEGER REFERENCES tables (id),
    mesero_id           INTEGER REFERENCES users (id),
    subtotal            DECIMAL(10, 2)        DEFAULT 0,
    igv                 DECIMAL(10, 2)        DEFAULT 0,
    total               DECIMAL(10, 2)        DEFAULT 0,
    amount_paid         DECIMAL(10, 2)        DEFAULT 0,
    status              order_status NOT NULL DEFAULT 'pendiente',
    cancellation_reason TEXT,
    created_at          TIMESTAMP             DEFAULT NOW(),
    updated_at          TIMESTAMP             DEFAULT NOW(),
    completed_at        TIMESTAMP,
    order_type          order_type   NOT NULL DEFAULT 'dine_in',
    notes               TEXT
);

-- Add foreign key for current_order_id after orders table exists
ALTER TABLE tables
    ADD CONSTRAINT fk_current_order FOREIGN KEY (current_order_id) REFERENCES orders (id);

-- Orden Items table
CREATE TABLE order_items
(
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id INTEGER        NOT NULL REFERENCES products (id),
    variant_id INTEGER REFERENCES product_variants (id),
    quantity   INTEGER        NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    notes      TEXT,
    status     order_status   NOT NULL DEFAULT 'pendiente',
    is_paid    BOOLEAN                 DEFAULT FALSE,
    created_at TIMESTAMP               DEFAULT NOW(),
    updated_at TIMESTAMP               DEFAULT NOW()
);

-- Pagos table
CREATE TABLE payments
(
    id             SERIAL PRIMARY KEY,
    order_id       INTEGER        NOT NULL REFERENCES orders (id),
    cajero_id      INTEGER REFERENCES users (id),
    amount         DECIMAL(10, 2) NOT NULL,
    method         payment_method NOT NULL DEFAULT 'efectivo',
    transaction_id VARCHAR(100),
    created_at     TIMESTAMP               DEFAULT NOW(),
    updated_at     TIMESTAMP               DEFAULT NOW(),
    processed_by   TEXT REFERENCES users (id),
    notes          TEXT,

    payment_number VARCHAR(20)    NOT NULL UNIQUE,
    status         payment_status NOT NULL DEFAULT 'pending'
);

CREATE TABLE payment_details
(
    payment_id    INTEGER REFERENCES payments (id),
    order_item_id INTEGER REFERENCES order_items (id),
    PRIMARY KEY (payment_id, order_item_id)
);

-- Settings table
CREATE TABLE settings
(
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(100) NOT NULL UNIQUE,
    value       TEXT,
    description TEXT,
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_orders_table ON orders (table_id);
-- CREATE INDEX idx_orders_server ON orders (server_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at);
CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);
-- CREATE INDEX idx_order_items_server ON order_items (server_id);
CREATE INDEX idx_payments_order ON payments (order_id);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_tables_status ON tables (status);
CREATE INDEX idx_users_role ON users (role);
-- CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);

-- Output success message
SELECT 'Schema created successfully!' AS message;
