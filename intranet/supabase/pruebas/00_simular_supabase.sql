-- Imita lo mínimo de Supabase en un PostgreSQL local para probar migraciones y permisos.
-- NO se ejecuta en Supabase.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to public;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets,
  name text not null,
  owner uuid default auth.uid(),
  created_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;

grant usage on schema public to anon, authenticated, service_role;

-- Ayudas para las pruebas: imprimen OK o FALLA con el resultado esperado.
create schema pruebas;
grant usage on schema pruebas to public;

create function pruebas.como(persona text) returns void language plpgsql security definer as $$
begin
  perform set_config('request.jwt.claim.sub', (select id::text from auth.users where email = persona), false);
end $$;

-- Id de un comunicado por título, sin pasar por RLS (para intentar acciones sobre lo que no se ve).
create function pruebas.comunicado(t text) returns bigint language plpgsql security definer as $$ begin return (
  select id from public.comunicados where titulo = t); end
$$;

-- La consulta debe ejecutarse sin error.
create function pruebas.ok(nombre text, consulta text) returns void language plpgsql as $$
begin
  execute consulta;
  raise notice 'OK     · %', nombre;
exception when others then
  raise warning 'FALLA  · % (se esperaba que funcionara; error: %)', nombre, sqlerrm;
end $$;

-- La consulta debe fallar (o, si es update/delete, no afectar filas).
create function pruebas.falla(nombre text, consulta text) returns void language plpgsql as $$
declare n bigint;
begin
  execute consulta;
  get diagnostics n = row_count;
  if n = 0 and consulta ~* '^\s*(update|delete)' then
    raise notice 'OK     · % (0 filas afectadas)', nombre;
  else
    raise warning 'FALLA  · % (se esperaba un rechazo y funcionó)', nombre;
  end if;
exception when others then
  raise notice 'OK     · % (rechazado: %)', nombre, sqlerrm;
end $$;

-- La consulta devuelve un valor que debe ser igual al esperado.
create function pruebas.igual(nombre text, consulta text, esperado text) returns void language plpgsql as $$
declare v text;
begin
  execute consulta into v;
  if v is not distinct from esperado then
    raise notice 'OK     · % (= %)', nombre, esperado;
  else
    raise warning 'FALLA  · % (esperado %, obtenido %)', nombre, esperado, v;
  end if;
exception when others then
  raise warning 'FALLA  · % (error: %)', nombre, sqlerrm;
end $$;

grant execute on all functions in schema pruebas to public;
