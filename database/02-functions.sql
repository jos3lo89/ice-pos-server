-- [funciones]

--  Correlativos (simple)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  next_num INTEGER;
  prefix TEXT;
BEGIN
  SELECT COALESCE(value, 'ORD-') INTO prefix FROM settings WHERE key = 'order_number_prefix';

  SELECT COALESCE(
    MAX(
      CAST(SUBSTRING(order_number FROM LENGTH(prefix)+1) AS INTEGER)
    ), 0
  ) + 1
  INTO next_num
  FROM orders
  WHERE order_number LIKE prefix || '%';

  RETURN prefix || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  next_num INTEGER;
  prefix TEXT := 'PAY-';
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(payment_number FROM LENGTH(prefix)+1) AS INTEGER)), 0
  ) + 1
  INTO next_num
  FROM payments
  WHERE payment_number LIKE prefix || '%';

  RETURN prefix || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;


-- Crear orden
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
    UPDATE tables
    SET status = 'ocupada', current_order_id = v_order_id
    WHERE id = p_table_id;
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;


-- ---------- Agregar item (independiente) ----------
-- p_modifier_ids: array de product_modifiers.id
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
  v_mod_name VARCHAR(100);
  v_mod_price DECIMAL(10,2);
BEGIN
  -- precio base
  SELECT price INTO v_base_price FROM products WHERE id = p_product_id;
  IF v_base_price IS NULL THEN
    RAISE EXCEPTION 'Producto no existe: %', p_product_id;
  END IF;

  -- variante
  IF p_variant_id IS NOT NULL THEN
    SELECT additional_price INTO v_variant_extra
    FROM product_variants
    WHERE id = p_variant_id AND product_id = p_product_id;

    IF v_variant_extra IS NULL THEN
      RAISE EXCEPTION 'Variante inválida % para producto %', p_variant_id, p_product_id;
    END IF;
  END IF;

  v_unit_price := v_base_price + COALESCE(v_variant_extra,0);

  -- insert item primero (modifiers_total lo actualizamos luego)
  INSERT INTO order_items(order_id, product_id, variant_id, quantity, unit_price, modifiers_total, line_total, notes)
  VALUES (p_order_id, p_product_id, p_variant_id, p_quantity, v_unit_price, 0, 0, p_notes)
  RETURNING id INTO v_item_id;

  -- insertar modificadores y sumar
  IF p_modifier_ids IS NOT NULL THEN
    FOREACH v_mod_id IN ARRAY p_modifier_ids LOOP
      SELECT modifier_name, additional_price
      INTO v_mod_name, v_mod_price
      FROM product_modifiers
      WHERE id = v_mod_id AND product_id = p_product_id;

      IF v_mod_name IS NULL THEN
        RAISE EXCEPTION 'Modificador inválido % para producto %', v_mod_id, p_product_id;
      END IF;

      INSERT INTO order_item_modifiers(order_item_id, modifier_id, modifier_name, additional_price)
      VALUES (v_item_id, v_mod_id, v_mod_name, COALESCE(v_mod_price,0));

      v_mod_total := v_mod_total + COALESCE(v_mod_price,0);
    END LOOP;
  END IF;

  -- regla: modifiers_total es "por unidad"
  v_line_total := (v_unit_price + v_mod_total) * p_quantity;

  UPDATE order_items
  SET modifiers_total = v_mod_total,
      line_total = v_line_total
  WHERE id = v_item_id;

  PERFORM update_order_totals(p_order_id);

  RETURN v_item_id;
END;
$$ LANGUAGE plpgsql;


-- ---------- Totales Perú (IGV incluido en precios) ----------
CREATE OR REPLACE FUNCTION update_order_totals(p_order_id INTEGER)
RETURNS VOID AS $$
DECLARE
  v_total_items DECIMAL(10,2);
  v_igv_rate DECIMAL;
  v_subtotal_neto DECIMAL(10,2);
  v_igv_amount DECIMAL(10,2);
  v_amount_paid DECIMAL(10,2);
BEGIN
  SELECT COALESCE(value::DECIMAL, 18) INTO v_igv_rate
  FROM settings WHERE key = 'igv_rate';

  SELECT COALESCE(SUM(line_total), 0) INTO v_total_items
  FROM order_items
  WHERE order_id = p_order_id AND status != 'cancelado';

  v_subtotal_neto := CASE
    WHEN v_total_items = 0 THEN 0
    ELSE ROUND(v_total_items / (1 + (v_igv_rate / 100)), 2)
  END;

  v_igv_amount := ROUND(v_total_items - v_subtotal_neto, 2);

  -- solo pagos pagados cuentan
  SELECT COALESCE(SUM(amount), 0) INTO v_amount_paid
  FROM payments
  WHERE order_id = p_order_id AND status = 'pagado';

  UPDATE orders
  SET subtotal = v_subtotal_neto,
      igv = v_igv_amount,
      total = v_total_items,
      amount_paid = v_amount_paid,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- completar si todo pagado
  IF v_amount_paid >= v_total_items AND v_total_items > 0 THEN
    UPDATE orders
    SET status = 'completado', completed_at = NOW(), updated_at = NOW()
    WHERE id = p_order_id AND status != 'cancelado';

    UPDATE tables
    SET status = 'disponible', current_order_id = NULL, updated_at = NOW()
    WHERE current_order_id = p_order_id;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- Pagar items específicos (split payments real)
-- p_lines: JSONB array con objetos:
-- [{ "order_item_id": 10, "paid_quantity": 1, "paid_amount": 25.50 }, ...]
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
  v_item_qty INTEGER;
  v_item_total DECIMAL(10,2);
  v_already_paid_qty INTEGER;
BEGIN
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'p_lines vacío';
  END IF;

  v_payment_number := generate_payment_number();

  INSERT INTO payments(payment_number, order_id, cajero_id, cash_session_id, amount, method, status, transaction_id, notes)
  VALUES (v_payment_number, p_order_id, p_cajero_id, p_cash_session_id, 0, p_method, 'pendiente', p_transaction_id, p_notes)
  RETURNING id INTO v_payment_id;


  -- recorrer líneas
  FOR v_item_id, v_paid_qty, v_paid_amount IN
    SELECT
      (x->>'order_item_id')::INT,
      COALESCE((x->>'paid_quantity')::INT, 1),
      (x->>'paid_amount')::DECIMAL(10,2)
    FROM jsonb_array_elements(p_lines) AS x
  LOOP
    IF v_paid_qty <= 0 OR v_paid_amount < 0 THEN
      RAISE EXCEPTION 'Cantidad o monto inválido en item %', v_item_id;
    END IF;

    SELECT quantity, line_total INTO v_item_qty, v_item_total
    FROM order_items
    WHERE id = v_item_id AND order_id = p_order_id;

    IF v_item_qty IS NULL THEN
      RAISE EXCEPTION 'Item % no pertenece a la orden %', v_item_id, p_order_id;
    END IF;

    -- cuánta cantidad ya pagada (solo pagos pagados)
    SELECT COALESCE(SUM(pi.paid_quantity),0) INTO v_already_paid_qty
    FROM payment_items pi
    JOIN payments p ON p.id = pi.payment_id
    WHERE pi.order_item_id = v_item_id
      AND p.order_id = p_order_id
      AND p.status = 'pagado';

    IF (v_already_paid_qty + v_paid_qty) > v_item_qty THEN
      RAISE EXCEPTION 'Sobrepago por cantidad en item % (pagado %, intentando %, qty %)',
        v_item_id, v_already_paid_qty, v_paid_qty, v_item_qty;
    END IF;

    INSERT INTO payment_items(payment_id, order_item_id, paid_quantity, paid_amount)
    VALUES (v_payment_id, v_item_id, v_paid_qty, v_paid_amount);

    v_sum_amount := v_sum_amount + v_paid_amount;
  END LOOP;

  -- cerrar pago como pagado
  UPDATE payments
  SET amount = v_sum_amount,
      status = 'pagado',
      updated_at = NOW()
  WHERE id = v_payment_id;

  PERFORM update_order_totals(p_order_id);

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;


-- Cancelar orden
CREATE OR REPLACE FUNCTION cancel_order(
  p_order_id INTEGER,
  p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE orders
  SET status = 'cancelado',
      cancellation_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_order_id;

  UPDATE order_items
  SET status = 'cancelado',
      updated_at = NOW()
  WHERE order_id = p_order_id;

  -- opcional: cancelar pagos pendientes (los pagados dependen de tu política)
  UPDATE payments
  SET status = 'cancelado',
      updated_at = NOW(),
      notes = COALESCE(notes,'') || ' | Orden cancelada: ' || COALESCE(p_reason,'')
  WHERE order_id = p_order_id AND status = 'pendiente';

  UPDATE tables
  SET status = 'disponible', current_order_id = NULL, updated_at = NOW()
  WHERE current_order_id = p_order_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION close_cash_session(
  p_session_id INTEGER,
  p_actual_balance DECIMAL(10,2) -- Lo que el cajero contó
)
RETURNS VOID AS $$
DECLARE
  v_opening DECIMAL(10,2);
  v_sales_cash DECIMAL(10,2);
  v_extras DECIMAL(10,2);
  v_expected DECIMAL(10,2);
BEGIN
  -- 1. Obtener fondo inicial
  SELECT opening_balance INTO v_opening FROM cash_sessions WHERE id = p_session_id;

  -- 2. Sumar solo pagos en EFECTIVO de esa sesión
  SELECT COALESCE(SUM(amount), 0) INTO v_sales_cash
  FROM payments
  WHERE cash_session_id = p_session_id AND method = 'efectivo' AND status = 'pagado';

  -- 3. Sumar ingresos y restar egresos manuales
  SELECT COALESCE(SUM(CASE WHEN type = 'ingreso' THEN amount ELSE -amount END), 0)
  INTO v_extras
  FROM cash_transactions
  WHERE cash_session_id = p_session_id;

  -- 4. Calcular esperado
  v_expected := v_opening + v_sales_cash + v_extras;

  -- 5. Actualizar sesión y cerrar
  UPDATE cash_sessions
  SET expected_balance = v_expected,
      actual_balance = p_actual_balance,
      difference = p_actual_balance - v_expected,
      status = 'cerrada',
      closed_at = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

SELECT 'Funciones creadas OK' AS message;


CREATE OR REPLACE FUNCTION open_cash_session(
    p_cajero_id INTEGER,
    p_opening_balance DECIMAL(10,2),
    p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_session_id INTEGER;
BEGIN
    -- 1. Validar si el cajero ya tiene una sesión abierta
    IF EXISTS (
        SELECT 1 FROM cash_sessions
        WHERE cajero_id = p_cajero_id AND status = 'abierta'
    ) THEN
        RAISE EXCEPTION 'El usuario ya tiene una sesión de caja activa. Debe cerrarla antes de abrir una nueva.';
    END IF;

    -- 2. Crear la nueva sesión
    INSERT INTO cash_sessions (cajero_id, opening_balance, status, notes, opened_at)
    VALUES (p_cajero_id, p_opening_balance, 'abierta', p_notes, NOW())
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;