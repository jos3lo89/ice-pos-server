-- 03-demo-data.sql

-- =====================================================
-- 1. CONFIGURACIONES
-- =====================================================
INSERT INTO settings (key, value, description) VALUES 
('igv_rate', '18', 'Tasa del Impuesto General a las Ventas en Perú'),
('order_number_prefix', 'ORD-', 'Prefijo para los tickets de pedido'),
('restaurant_name', 'Sabor Peruano POS', 'Nombre comercial del restaurante'),
('api_company_id', '1', 'ID de empresa para la API de Facturación PHP'),
('api_branch_id', '1', 'ID de sucursal para la API de Facturación PHP');

-- =====================================================
-- 2. USUARIOS (Password: '123456' en texto plano para desarrollo)
-- =====================================================
INSERT INTO users (username, password, pin, full_name, role, phone) VALUES 
('admin', '123456', '1111', 'Administrador General', 'admin', '987654321'),
('juan_mesero', '123456', '2222', 'Juan Pérez', 'mesero', '987654322'),
('ana_cajera', '123456', '3333', 'Ana García', 'cajero', '987654323'),
('chef_mario', '123456', '4444', 'Mario Gastón', 'cocinero', '987654324'),
('luis_barman', '123456', '5555', 'Luis Tragos', 'bartender', '987654325');

-- =====================================================
-- 3. CLIENTES BASE (Para pruebas de Facturación)
-- =====================================================
INSERT INTO clients (tipo_documento, numero_documento, razon_social, direccion, email) VALUES 
('0', '00000000', 'CLIENTES VARIOS', 'DOMICILIO CONOCIDO', 'ventas@restaurante.com'),
('1', '72233454', 'HARU DEVELOPER', 'AV. LOS PINOS 123, LIMA', 'haru@example.com'),
('6', '20123456789', 'SOLUCIONES TECH S.A.C.', 'AV. INDUSTRIAL 456, LIMA', 'contacto@tech.com');

-- =====================================================
-- 4. INFRAESTRUCTURA (3 PISOS)
-- =====================================================
-- Piso 1
INSERT INTO tables (table_number, floor, capacity) VALUES 
('101', 1, 4), ('102', 1, 2), ('103', 1, 6), ('104', 1, 4);
-- Piso 2
INSERT INTO tables (table_number, floor, capacity) VALUES 
('201', 2, 8), ('202', 2, 4), ('203', 2, 4), ('204', 2, 2);
-- Piso 3 (Terraza)
INSERT INTO tables (table_number, floor, capacity) VALUES 
('301', 3, 10), ('302', 3, 4), ('303', 3, 4);

-- =====================================================
-- 5. CATEGORÍAS
-- =====================================================
INSERT INTO categories (id, name, description) VALUES 
(1, 'Entradas', 'Platos para empezar'),
(2, 'Fondos Marinos', 'Especialidades del mar'),
(3, 'Carnes y Parrillas', 'Lo mejor de la brasa'),
(4, 'Bebidas Alcoholicas', 'Cervezas y Tragos'),
(5, 'Jugos y Gaseosas', 'Bebidas naturales y refrescos');

-- =========================
-- 6. PRODUCTOS (Con datos SUNAT)
-- =========================
-- Entradas
INSERT INTO products (category_id, name, price, area_impresion, codigo_sunat, unidad_medida) VALUES 
(1, 'Causa Limeña', 18.00, 'cocina', '50191500', 'NIU'),
(1, 'Papa a la Huancaina', 15.00, 'cocina', '50191500', 'NIU');

-- Fondos Marinos
INSERT INTO products (category_id, name, price, area_impresion, codigo_sunat, unidad_medida) VALUES 
(2, 'Ceviche de Pescado', 35.00, 'cocina', '50191500', 'NIU'),
(2, 'Arroz con Mariscos', 38.00, 'cocina', '50191500', 'NIU');

-- Carnes
INSERT INTO products (category_id, name, price, area_impresion, codigo_sunat, unidad_medida) VALUES 
(3, 'Lomo Saltado', 42.00, 'cocina', '50191500', 'NIU');

-- Bebidas
INSERT INTO products (category_id, name, price, area_impresion, codigo_sunat, unidad_medida) VALUES 
(4, 'Pisco Sour', 25.00, 'bar', '50202201', 'NIU'),
(5, 'Jugo de Papaya', 12.00, 'bar', '50202306', 'NIU'),
(5, 'Chicha Morada 1L', 15.00, 'bar', '50202306', 'NIU');

-- =====================================================
-- 7. VARIANTES (Ej: Jugo Simple vs Jarra)
-- =====================================================
-- Ceviche de Pescado (IDs dependen de la inserción, asumo 3)
INSERT INTO product_variants (product_id, variant_name, additional_price) VALUES 
(3, 'Pescado del Día', 0.00),
(3, 'Mero Fino', 15.00),
(3, 'Lenguado', 20.00);

-- Jugo de Papaya
INSERT INTO product_variants (product_id, variant_name, additional_price) VALUES 
(7, 'Vaso Personal', 0.00),
(7, 'Jarra 1.5L', 10.00);

-- =====================================================
-- 8. MODIFICADORES (Ej: Términos de carne / Azúcar)
-- =====================================================
-- Modificadores para el Lomo Saltado
INSERT INTO product_modifiers (product_id, modifier_name, additional_price) VALUES 
(5, 'Término Medio', 0.00),
(5, 'Bien Cocido', 0.00),
(5, 'Sin Cebolla', 0.00);

-- Modificadores para Jugos
INSERT INTO product_modifiers (product_id, modifier_name, additional_price) VALUES 
(7, 'Sin Azúcar', 0.00),
(7, 'Con Stevia', 1.50),
(7, 'Con Leche', 3.00);

-- Mensaje Final
SELECT '¡Datos de prueba cargados exitosamente para Haru POS!' AS Resultado;
