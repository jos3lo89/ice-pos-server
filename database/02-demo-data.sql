-- Usuarios (Contraseñas de ejemplo, usa hashes en producción)
INSERT INTO users (username, password, pin, full_name, role)
VALUES ('admin', 'hash_admin', '1234', 'Administrador Sistema', 'admin'),
       ('juan_mesero', 'hash_juan', '2021', 'Juan Pérez', 'mesero'),
       ('ana_cajera', 'hash_ana', '3030', 'Ana Rosa', 'cajero'),
       ('chef_mario', 'hash_mario', '4040', 'Mario Gastón', 'cocinero'),
       ('luis_barman', 'hash_luis', '5050', 'Luis Tragos', 'bartender');

-- Mesas por piso
INSERT INTO tables (table_number, piso, capacity)
VALUES ('101', 1, 4),
       ('102', 1, 2),
       ('201', 2, 6),
       ('202', 2, 4),
       ('301', 3, 10);

-- Categorías y Productos con Variantes
INSERT INTO categories (id, name)
VALUES (1, 'Ceviches'),
       (2, 'Jugos Naturales');

INSERT INTO products (id, category_id, name, base_price, area_impresion)
VALUES (1, 1, 'Ceviche de Pescado', 35.00, 'cocina'),
       (2, 2, 'Jugo de Papaya', 10.00, 'bar');

-- Variantes para el Ceviche (Tipos de Pescado)
INSERT INTO product_variants (product_id, variant_name, additional_price)
VALUES (1, 'Pescado del Día', 0),
       (1, 'Mero', 15.00),
       (1, 'Lenguado', 20.00);

-- Variantes para el Jugo (Tamaños)
INSERT INTO product_variants (product_id, variant_name, additional_price)
VALUES (2, 'Vaso Simple', 0),
       (2, 'Jarra 1L', 8.00),
       (2, 'Jarra 2L', 15.00);

-- Modificadores
INSERT INTO product_modifiers (product_id, modifier_name)
VALUES (1, 'Sin picante'),
       (1, 'Picante medio'),
       (2, 'Sin azúcar'),
       (2, 'Con stevia');
