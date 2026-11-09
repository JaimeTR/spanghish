-- 0008_catalog.sql
-- Catálogo: sedes, programas, ediciones por fecha y precios.
--
-- Reglas:
--   * Lectura: cualquier usuario autenticado con cuenta activa (is_active()).
--   * Escritura: solo admin activa (has_role('admin')).
--   * anon no tiene ningún privilegio (privilegios por defecto de 0006).
--   * Sedes sin direcciones privadas: una sede 'home' u 'online' no lleva
--     dirección (la de una clase a domicilio irá en groups.location_note).
--   * Importes en centavos AUD; la moneda es siempre 'AUD'.
--   * Precio por programa, por edición y/o por sede: la app elige el más
--     específico (resolvePrices). Solo un precio activo por combinación.
--   * Auditoría con enable_audit() en todas las tablas.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.audience_segment as enum ('kids', 'adults', 'mature');
create type public.lesson_format as enum ('individual', 'own_group', 'local_group');
create type public.location_kind as enum ('library', 'office', 'home', 'online');
create type public.edition_status as enum ('draft', 'open', 'closed', 'cancelled');
create type public.price_kind as enum ('per_lesson', 'upfront', 'pack');

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  kind public.location_kind not null,
  region text not null check (region in ('sunshine_coast', 'brisbane', 'online')),
  address text check (char_length(address) <= 300),
  map_url text check (map_url ~ '^https://' and char_length(map_url) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_no_private_address check (kind not in ('home', 'online') or address is null)
);

comment on table public.locations is 'Sedes: bibliotecas, oficinas, domicilio y online (sin direcciones privadas).';

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9-]{2,40}$'),
  name_es text not null check (char_length(name_es) between 1 and 120),
  name_en text not null check (char_length(name_en) between 1 and 120),
  description_es text check (char_length(description_es) <= 2000),
  description_en text check (char_length(description_en) <= 2000),
  language_code text not null references public.languages (code) on update cascade,
  audience public.audience_segment not null,
  format public.lesson_format not null,
  level_id uuid references public.levels (id),
  duration_weeks smallint check (duration_weeks between 1 and 52),
  lesson_minutes smallint not null default 70 check (lesson_minutes between 15 and 240),
  active boolean not null default true,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.programs is 'Programas (oferta): idioma, segmento, formato y nivel.';

create index programs_language_code_idx on public.programs (language_code);
create index programs_level_id_idx on public.programs (level_id);

create table public.program_editions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  label_es text check (char_length(label_es) <= 120),
  label_en text check (char_length(label_en) <= 120),
  starts_on date not null,
  ends_on date not null,
  status public.edition_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_editions_program_starts_unique unique (program_id, starts_on),
  -- Destino de la FK compuesta de program_prices (edición del mismo programa).
  constraint program_editions_id_program_unique unique (id, program_id),
  constraint program_editions_dates check (ends_on >= starts_on)
);

comment on table public.program_editions is 'Ediciones con fecha de un programa (el "curso" del spec).';
-- program_editions_program_starts_unique sirve de índice para program_id.

create table public.program_prices (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  edition_id uuid,
  location_id uuid references public.locations (id),
  kind public.price_kind not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'AUD' check (currency = 'AUD'),
  lessons_included smallint,
  label_es text check (char_length(label_es) <= 120),
  label_en text check (char_length(label_en) <= 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_prices_edition_fk foreign key (edition_id, program_id)
    references public.program_editions (id, program_id) on delete cascade,
  -- per_lesson: sin número de clases; pack: obligatorio; upfront: opcional
  -- (p. ej. "9 semanas" sin contar clases). El plan pedía
  -- (kind = 'per_lesson') = (lessons_included is null), que obligaba a upfront.
  constraint program_prices_lessons_kind check (
    case kind
      when 'per_lesson' then lessons_included is null
      when 'pack' then lessons_included is not null
      else true
    end
  ),
  constraint program_prices_lessons_range check (lessons_included is null or lessons_included between 1 and 100)
);

comment on table public.program_prices is
  'Precios (centavos AUD) por programa, con edición y/o sede opcionales; la app usa el más específico.';

create unique index program_prices_active_unique
  on public.program_prices (program_id, edition_id, location_id, kind, lessons_included)
  nulls not distinct
  where active;
create index program_prices_program_id_idx on public.program_prices (program_id);
create index program_prices_edition_id_idx on public.program_prices (edition_id);
create index program_prices_location_id_idx on public.program_prices (location_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create trigger locations_touch_updated_at
  before update on public.locations
  for each row execute function public.touch_updated_at();
create trigger programs_touch_updated_at
  before update on public.programs
  for each row execute function public.touch_updated_at();
create trigger program_editions_touch_updated_at
  before update on public.program_editions
  for each row execute function public.touch_updated_at();
create trigger program_prices_touch_updated_at
  before update on public.program_prices
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS y privilegios
-- ---------------------------------------------------------------------------
alter table public.locations enable row level security;
alter table public.programs enable row level security;
alter table public.program_editions enable row level security;
alter table public.program_prices enable row level security;

grant select, insert, update, delete on table
  public.locations, public.programs, public.program_editions, public.program_prices
  to authenticated;

-- Lectura para toda cuenta activa; escritura solo admin. Mismo patrón en las
-- cuatro tablas.
create policy locations_select_active on public.locations for select to authenticated
  using ((select public.is_active()));
create policy locations_insert_admin on public.locations for insert to authenticated
  with check ((select public.has_role('admin')));
create policy locations_update_admin on public.locations for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy locations_delete_admin on public.locations for delete to authenticated
  using ((select public.has_role('admin')));

create policy programs_select_active on public.programs for select to authenticated
  using ((select public.is_active()));
create policy programs_insert_admin on public.programs for insert to authenticated
  with check ((select public.has_role('admin')));
create policy programs_update_admin on public.programs for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy programs_delete_admin on public.programs for delete to authenticated
  using ((select public.has_role('admin')));

create policy program_editions_select_active on public.program_editions for select to authenticated
  using ((select public.is_active()));
create policy program_editions_insert_admin on public.program_editions for insert to authenticated
  with check ((select public.has_role('admin')));
create policy program_editions_update_admin on public.program_editions for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy program_editions_delete_admin on public.program_editions for delete to authenticated
  using ((select public.has_role('admin')));

create policy program_prices_select_active on public.program_prices for select to authenticated
  using ((select public.is_active()));
create policy program_prices_insert_admin on public.program_prices for insert to authenticated
  with check ((select public.has_role('admin')));
create policy program_prices_update_admin on public.program_prices for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy program_prices_delete_admin on public.program_prices for delete to authenticated
  using ((select public.has_role('admin')));

-- ---------------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------------
select public.enable_audit('public.locations');
select public.enable_audit('public.programs');
select public.enable_audit('public.program_editions');
select public.enable_audit('public.program_prices');
