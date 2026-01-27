-- [02-functions.sql] - Lógica de Negocio Integrada

-- =====================================================
-- 1. UTILITARIOS Y TRIGGERS
-- =====================================================

-- Función para actualizar el timestamp de 'updated_at' automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. GENERADORES DE CORRELATIVOS
-- =====================================================

-- Generar número de orden (Ej: ORD-001)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  next_num INTEGER;
  prefix TEXT;
BEGIN
  SELECT COALESCE(value, 'ORD-') INTO prefix FROM settings WHERE key = 'order_number_prefix';

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(order_number FROM LENGTH(prefix)+1) AS INTEGER)), 0
  ) + 1 INTO next_num
  FROM orders
  WHERE order_number LIKE prefix || '%';

  RETURN prefix || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Generar número de pago (Ej: PAY-001)
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  next_num INTEGER;
  prefix TEXT := 'PAY-';
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(payment_number FROM LENGTH(prefix)+1) AS INTEGER)), 0
  ) + 1 INTO next_num
  FROM payments
  WHERE payment_number LIKE prefix || '%';

  RETURN prefix || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. GESTIÓN DE ÓRDENES Y TOTALES
-- =====================================================

-- Recalcular totales de la orden (Lógica de IGV 1.18 integrada)
CREATE OR REPLACE FUNCTION refresh_order_totals(p_order_id INTEGER)
RETURNS VOID AS $$
DECLARE
  v_total_items DECIMAL(10,2);
  v_igv_rate DECIMAL;
  v_subtotal_neto DECIMAL(10,2);
  v_igv_amount DECIMAL(10,2);
  v_amount_paid DECIMAL(10,2);
BEGIN
  -- Obtener tasa de IGV de configuración (por defecto 18)
  SELECT COALESCE(value::DECIMAL, 18) INTO v_igv_rate
  FROM settings WHERE key = 'igv_rate';

  -- Calcular suma de productos activos
  SELECT COALESCE(SUM(line_total), 0) INTO v_total_items
  FROM order_items
  WHERE order_id = p_order_id AND status != 'cancelado';

  -- Desglose de IGV (Total / 1.18)
  v_subtotal_neto := CASE 
    WHEN v_total_items = 0 THEN 0 
    ELSE ROUND(v_total_items / (1 + (v_igv_rate / 100)), 2) 
  END;

  v_igv_amount := ROUND(v_total_items - v_subtotal_neto, 2);

  -- Sumar pagos confirmados
  SELECT COALESCE(SUM(amount), 0) INTO v_amount_paid
  FROM payments
  WHERE order_id = p_order_id AND status = 'pagado';

  -- Actualizar cabecera de la orden
  UPDATE orders
  SET subtotal = v_subtotal_neto,
      igv = v_igv_amount,
      total = v_total_items,
      amount_paid = v_amount_paid,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Lógica de cierre automático de orden y liberación de mesa
  IF v_amount_paid >= v_total_items AND v_total_items > 0 THEN
    UPDATE orders 
    SET status = 'completado', completed_at = NOW() 
    WHERE id = p_order_id AND status != 'cancelado';

    UPDATE tables 
    SET status = 'disponible', current_order_id = NULL 
    WHERE current_order_id = p_order_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Crear nueva orden
CREATE OR REPLACE FUNCTION create_order(
  p_order_type order_type,
  p_table_id INTEGER DEFAULT NULL,
  p_mesero_id INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_order_id INTEGER;
  v_order_number VARCHAR(20);
BEGIN
  v_order_number := generate_order_number();

  INSERT INTO orders (order_number, order_type, status, table_id, mesero_id, notes)
  VALUES (v_order_number, p_order_type, 'pendiente', p_table_id, p_mesero_id, p_notes)
  RETURNING id INTO v_order_id;

  IF p_table_id IS NOT NULL THEN
    UPDATE tables SET status = 'ocupada', current_order_id = v_order_id WHERE id = p_table_id;
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Agregar item a la orden (con variantes y modificadores)
CREATE OR REPLACE FUNCTION add_order_item(
  p_order_id INTEGER,
  p_product_id INTEGER,
  p_variant_id INTEGER DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_notes TEXT DEFAULT NULL,
  p_modifier_ids INTEGER[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_item_id INTEGER;
  v_base_price DECIMAL(10,2);
  v_variant_extra DECIMAL(10,2) := 0;
  v_mod_total DECIMAL(10,2) := 0;
  v_unit_price DECIMAL(10,2);
  v_line_total DECIMAL(10,2);
  v_mod_id INTEGER;
BEGIN
  -- Obtener precio base
  SELECT price INTO v_base_price FROM products WHERE id = p_product_id;
  IF v_base_price IS NULL THEN RAISE EXCEPTION 'Producto no existe'; END IF;

  -- Aplicar variante
  IF p_variant_id IS NOT NULL THEN
    SELECT additional_price INTO v_variant_extra FROM product_variants 
    WHERE id = p_variant_id AND product_id = p_product_id;
  END IF;

  v_unit_price := v_base_price + COALESCE(v_variant_extra, 0);

  INSERT INTO order_items(order_id, product_id, variant_id, quantity, unit_price, modifiers_total, line_total, notes)
  VALUES (p_order_id, p_product_id, p_variant_id, p_quantity, v_unit_price, 0, 0, p_notes)
  RETURNING id INTO v_item_id;

  -- Aplicar modificadores
  IF p_modifier_ids IS NOT NULL THEN
    FOREACH v_mod_id IN ARRAY p_modifier_ids LOOP
      INSERT INTO order_item_modifiers(order_item_id, modifier_id, modifier_name, additional_price)
      SELECT v_item_id, id, modifier_name, additional_price FROM product_modifiers WHERE id = v_mod_id;
    END LOOP;
    
    SELECT COALESCE(SUM(additional_price), 0) INTO v_mod_total 
    FROM order_item_modifiers WHERE order_item_id = v_item_id;
  END IF;

  v_line_total := (v_unit_price + v_mod_total) * p_quantity;

  UPDATE order_items SET modifiers_total = v_mod_total, line_total = v_line_total WHERE id = v_item_id;

  PERFORM refresh_order_totals(p_order_id);
  RETURN v_item_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. PROCESO DE PAGOS (Split Payments)
-- =====================================================

CREATE OR REPLACE FUNCTION pay_items(
  p_order_id INTEGER,
  p_method payment_method,
  p_cajero_id INTEGER,
  p_cash_session_id INTEGER,
  p_lines JSONB,
  p_transaction_id VARCHAR(100) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_payment_id INTEGER;
  v_payment_number VARCHAR(20);
  v_sum_amount DECIMAL(10,2) := 0;
  v_item_id INTEGER;
  v_paid_qty INTEGER;
  v_paid_amount DECIMAL(10,2);
  v_already_paid_qty INTEGER;
  v_target_qty INTEGER;
BEGIN
  v_payment_number := generate_payment_number();

  INSERT INTO payments(payment_number, order_id, cajero_id, cash_session_id, amount, method, status, transaction_id, notes)
  VALUES (v_payment_number, p_order_id, p_cajero_id, p_cash_session_id, 0, p_method, 'pendiente', p_transaction_id, p_notes)
  RETURNING id INTO v_payment_id;

  FOR v_item_id, v_paid_qty, v_paid_amount IN 
    SELECT (x->>'order_item_id')::INT, (x->>'paid_quantity')::INT, (x->>'paid_amount')::DECIMAL(10,2)
    FROM jsonb_array_elements(p_lines) AS x
  LOOP
    -- Validar sobrepago
    SELECT quantity INTO v_target_qty FROM order_items WHERE id = v_item_id;
    SELECT COALESCE(SUM(paid_quantity), 0) INTO v_already_paid_qty FROM payment_items pi
    JOIN payments p ON p.id = pi.payment_id WHERE pi.order_item_id = v_item_id AND p.status = 'pagado';

    IF (v_already_paid_qty + v_paid_qty) > v_target_qty THEN
      RAISE EXCEPTION 'Cantidad excede el total de la orden para el item %', v_item_id;
    END IF;

    INSERT INTO payment_items(payment_id, order_item_id, paid_quantity, paid_amount)
    VALUES (v_payment_id, v_item_id, v_paid_qty, v_paid_amount);

    v_sum_amount := v_sum_amount + v_paid_amount;
  END LOOP;

  UPDATE payments SET amount = v_sum_amount, status = 'pagado' WHERE id = v_payment_id;
  PERFORM refresh_order_totals(p_order_id);

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. GESTIÓN DE CAJA (Apertura y Cierre)
-- =====================================================

CREATE OR REPLACE FUNCTION open_cash_session(
  p_cajero_id INTEGER,
  p_opening_balance DECIMAL(10,2),
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_session_id INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM cash_sessions WHERE cajero_id = p_cajero_id AND status = 'abierta') THEN
    RAISE EXCEPTION 'El usuario ya tiene una sesión abierta.';
  END IF;

  INSERT INTO cash_sessions (cajero_id, opening_balance, status, notes)
  VALUES (p_cajero_id, p_opening_balance, 'abierta', p_notes)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION close_cash_session(
  p_session_id INTEGER,
  p_actual_balance DECIMAL(10,2)
)
RETURNS VOID AS $$
DECLARE
  v_opening DECIMAL(10,2);
  v_sales_cash DECIMAL(10,2);
  v_extras DECIMAL(10,2);
  v_expected DECIMAL(10,2);
BEGIN
  SELECT opening_balance INTO v_opening FROM cash_sessions WHERE id = p_session_id;
  
  -- Solo sumamos EFECTIVO para el arqueo físico
  SELECT COALESCE(SUM(amount), 0) INTO v_sales_cash FROM payments 
  WHERE cash_session_id = p_session_id AND method = 'efectivo' AND status = 'pagado';

  -- Movimientos manuales
  SELECT COALESCE(SUM(CASE WHEN type = 'ingreso' THEN amount ELSE -amount END), 0) 
  INTO v_extras FROM cash_transactions WHERE cash_session_id = p_session_id;

  v_expected := v_opening + v_sales_cash + v_extras;

  UPDATE cash_sessions SET 
    expected_balance = v_expected,
    actual_balance = p_actual_balance,
    difference = p_actual_balance - v_expected,
    status = 'cerrada',
    closed_at = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CANCELACIONES
-- =====================================================

CREATE OR REPLACE FUNCTION cancel_order(p_order_id INTEGER, p_reason TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE orders SET status = 'cancelado', cancellation_reason = p_reason WHERE id = p_order_id;
  UPDATE order_items SET status = 'cancelado' WHERE order_id = p_order_id;
  UPDATE tables SET status = 'disponible', current_order_id = NULL WHERE current_order_id = p_order_id;
END;
$$ LANGUAGE plpgsql;

SELECT 'Funciones del POS cargadas correctamente' AS message;