-- 0032_customers.sql
-- Clientes de la web: personas que compran en la tienda (sin ser alumnas) y entran
-- a la web con un enlace al correo para ver sus compras y descargar cuando quieran.
--
--   * Rol 'customer' como rol inicial permitido por app_metadata (nunca por
--     user_metadata). Un cliente NO tiene el rol 'student': no entra al portal.
--   * shop_orders.user_id: la cuenta dueña del pedido (la crea o enlaza el servidor
--     del portal al registrar el pedido, por el correo que dio al pagar).
--   * Cada cliente lee SUS pedidos y productos (sin el token) y puede firmar la
--     descarga SOLO de los archivos que compró (política de Storage).
--   * my_shop_purchases(): lo que la página "Mis compras" de la web necesita.

alter table public.shop_orders
  add column user_id uuid references public.profiles (id) on delete set null;
create index shop_orders_user_id_idx on public.shop_orders (user_id);

-- Rol inicial al crear la cuenta: se admite 'customer' (y entonces no se añade 'student').
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested text;
  v_role public.app_role := 'student';
begin
  if jsonb_typeof(new.raw_app_meta_data -> 'initial_role') = 'string' then
    v_requested := new.raw_app_meta_data ->> 'initial_role';
    if v_requested in ('teacher', 'student', 'guardian', 'customer') then
      v_role := v_requested::public.app_role;
    end if;
  end if;

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, left(new.raw_user_meta_data ->> 'full_name', 200));

  insert into public.user_roles (user_id, role)
  values (new.id, v_role);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated, service_role;

-- GoTrue aplica el app_metadata con un UPDATE posterior: mismo criterio, con 'customer'.
create or replace function public.apply_initial_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested text;
begin
  if jsonb_typeof(new.raw_app_meta_data -> 'initial_role') <> 'string' then
    return null;
  end if;
  v_requested := new.raw_app_meta_data ->> 'initial_role';
  if v_requested not in ('teacher', 'guardian', 'customer') then
    return null; -- student ya es el rol por defecto; admin nunca por metadatos
  end if;

  if (select array_agg(ur.role order by ur.role) from public.user_roles ur where ur.user_id = new.id)
     is distinct from array['student'::public.app_role] then
    return null;
  end if;

  insert into public.user_roles (user_id, role) values (new.id, v_requested::public.app_role);
  delete from public.user_roles where user_id = new.id and role = 'student';
  return null;
end;
$$;

revoke execute on function public.apply_initial_role() from public, anon, authenticated, service_role;

-- Cada cliente ve sus pedidos y sus productos (el token sigue sin poder leerse).
create policy shop_orders_select_own on public.shop_orders for select to authenticated
  using ((select public.is_active()) and user_id = (select auth.uid()));

create policy shop_order_items_select_own on public.shop_order_items for select to authenticated
  using (
    (select public.is_active())
    and exists (
      select 1 from public.shop_orders o
      where o.id = order_id and o.user_id = (select auth.uid())
    )
  );

-- ¿Compró la persona actual el producto cuyo archivo se llama así?
create function public.owns_product_file(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.shop_order_items i
    join public.shop_orders o on o.id = i.order_id
    join public.products p on p.id = i.product_id
    where p.file_path = p_name
      and o.user_id = (select auth.uid())
      and public.is_active()
  );
$$;

revoke execute on function public.owns_product_file(text) from public, anon, authenticated, service_role;
grant execute on function public.owns_product_file(text) to authenticated;

create policy product_files_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'product-files' and public.owns_product_file(name));

-- Mis compras: pedidos de la persona actual con sus productos y, si hay archivo, su ruta.
create function public.my_shop_purchases()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'order_id', o.id,
    'created_at', o.created_at,
    'total_cents', o.total_cents,
    'currency', o.currency,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_id', i.id,
        'slug', i.slug,
        'name', i.name,
        'amount_cents', i.amount_cents,
        'file_path', p.file_path,
        'file_name', p.file_name
      ) order by i.name)
      from public.shop_order_items i
      left join public.products p on p.id = i.product_id
      where i.order_id = o.id
    ), '[]'::jsonb)
  ) order by o.created_at desc), '[]'::jsonb)
  from public.shop_orders o
  where public.is_active() and o.user_id = (select auth.uid());
$$;

comment on function public.my_shop_purchases() is 'Pedidos de la persona actual con sus productos y archivos (página Mis compras de la web).';
revoke execute on function public.my_shop_purchases() from public, anon, authenticated, service_role;
grant execute on function public.my_shop_purchases() to authenticated;
