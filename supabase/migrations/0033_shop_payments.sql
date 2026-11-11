-- 0033_shop_payments.sql
-- Módulo Pagos de administración: cada pedido guarda su pago de Stripe y lo reembolsado.
--
--   * payment_intent_id: el pago de Stripe (pi_…), para abrirlo desde el portal y para
--     casar los avisos de reembolso (charge.refunded). Nulo en los pedidos anteriores.
--   * refunded_cents / refunded_at: lo devuelto al comprador. Si se devuelve todo, el
--     servidor del portal caduca además el enlace de descarga (expires_at = ahora).
--   * El estado (pagado / reembolso parcial / reembolsado) se deduce de estas columnas.

alter table public.shop_orders
  add column payment_intent_id text check (payment_intent_id is null or char_length(payment_intent_id) between 5 and 255),
  add column refunded_cents integer not null default 0 check (refunded_cents >= 0),
  add column refunded_at timestamptz;

alter table public.shop_orders
  add constraint shop_orders_refund_le_total check (refunded_cents <= total_cents);

create unique index shop_orders_payment_intent_idx on public.shop_orders (payment_intent_id) where payment_intent_id is not null;

-- Administración lee las columnas nuevas (sigue sin poder leer el token).
grant select (payment_intent_id, refunded_cents, refunded_at) on table public.shop_orders to authenticated;
