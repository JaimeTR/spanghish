-- 0034_shop_orders_user_id_grant.sql
-- Las políticas "pedido propio" (0032) comparan shop_orders.user_id con auth.uid(), pero el privilegio por
-- columna (0030) no incluía user_id: leer shop_order_items (o un pedido con filas) daba "permission denied"
-- (42501) y fallaban Pedidos y Pagos de administración. user_id es el id de la cuenta compradora, no un
-- secreto; el token de descarga sigue sin poder leerse.

grant select (user_id) on table public.shop_orders to authenticated;
