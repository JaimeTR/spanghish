-- 0031_customer_role.sql
-- Rol de las personas que compran en la web sin ser alumnas: 'customer'. Va en su propia
-- migración porque un valor de enum recién añadido no se puede usar en la misma transacción.
alter type public.app_role add value if not exists 'customer';
