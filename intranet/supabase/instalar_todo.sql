-- Intranet Caminos · instalar_todo.sql
-- Las cuatro migraciones (001 a 004) en un solo archivo, para pegar en SQL Editor de Supabase.
-- Generado con: cat supabase/migrations/00*.sql > supabase/instalar_todo.sql

-- Intranet Caminos · 001_esquema
-- Tipos, tablas, funciones de permiso, reglas RLS y grants.
-- Se ejecuta una sola vez, antes de 002, 003 y 004. Los cambios futuros van en migraciones nuevas.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type rol_t as enum ('colaborador', 'directora', 'gerente');
create type marca_t as enum ('entrada', 'salida_almuerzo', 'regreso_almuerzo', 'salida');
create type solicitud_tipo_t as enum ('vacaciones', 'permiso', 'incapacidad');
create type solicitud_estado_t as enum ('pendiente', 'aprobada', 'rechazada');
create type nivel_revisor_t as enum ('ver', 'aprobar');
create type destino_t as enum ('todos', 'area', 'sede');

-- ---------------------------------------------------------------------------
-- Organización
-- ---------------------------------------------------------------------------
create table sedes (
  id smallserial primary key,
  nombre text not null unique,
  zona_horaria text not null default 'America/Bogota',
  ips_oficina inet[] not null default '{}'
);

create table areas (
  id smallserial primary key,
  nombre text not null unique
);

create table perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  correo text not null unique check (correo = lower(correo)),
  area_id smallint references areas,
  sede_id smallint not null references sedes,
  rol rol_t not null default 'colaborador',
  es_admin boolean not null default false,
  activo boolean not null default true,
  acepto_datos timestamptz,
  creado timestamptz not null default now()
);

create table configuracion (
  clave text primary key,
  valor jsonb not null,
  actualizado timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Turnos y malla
-- ---------------------------------------------------------------------------
create table turnos (
  id serial primary key,
  sede_id smallint not null references sedes on delete cascade,
  codigo text not null,
  nombre text not null,
  entrada time,
  salida_almuerzo time,
  regreso_almuerzo time,
  salida time,
  activo boolean not null default true,
  unique (sede_id, codigo),
  check ((entrada is null) = (salida is null)),
  check ((salida_almuerzo is null) = (regreso_almuerzo is null)),
  check (salida_almuerzo is null or entrada is not null)
);

create table malla (
  persona_id uuid not null references perfiles on delete cascade,
  fecha date not null,
  turno_id int not null references turnos on delete cascade,
  primary key (persona_id, fecha)
);

create table malla_historial (
  id bigserial primary key,
  persona_id uuid not null,
  fecha date not null,
  turno_antes int,
  turno_despues int,
  cambiado_por uuid default auth.uid(),
  cambiado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Asistencia
-- ---------------------------------------------------------------------------
create table marcas (
  id bigserial primary key,
  persona_id uuid not null references perfiles on delete cascade,
  fecha date not null,
  tipo marca_t not null,
  hora timestamptz not null default now(),
  ip inet,
  corregida_por uuid references perfiles,
  unique (persona_id, fecha, tipo)
);
create index marcas_fecha_idx on marcas (fecha);

-- ---------------------------------------------------------------------------
-- Herramientas
-- ---------------------------------------------------------------------------
create table herramientas (
  id serial primary key,
  nombre text not null,
  descripcion text,
  icono text not null default 'file',
  pie text not null default 'Abrir',
  url text not null,
  orden int not null default 0,
  areas_visibles smallint[],
  activo boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Comunicados
-- ---------------------------------------------------------------------------
create table comunicados (
  id bigserial primary key,
  autor_id uuid not null default auth.uid() references perfiles on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 140),
  cuerpo text not null default '',
  destino destino_t not null default 'todos',
  destino_id smallint,
  requiere_confirmacion boolean not null default true,
  fijado boolean not null default false,
  creado timestamptz not null default now(),
  check ((destino = 'todos') = (destino_id is null))
);

create table comunicado_imagenes (
  id bigserial primary key,
  comunicado_id bigint not null references comunicados on delete cascade,
  ruta text not null,
  nombre text,
  orden int not null default 0
);

create table comunicado_lecturas (
  comunicado_id bigint not null references comunicados on delete cascade,
  persona_id uuid not null references perfiles on delete cascade,
  leido_en timestamptz not null default now(),
  primary key (comunicado_id, persona_id)
);

-- ---------------------------------------------------------------------------
-- Solicitudes
-- ---------------------------------------------------------------------------
create table solicitudes (
  id bigserial primary key,
  persona_id uuid not null default auth.uid() references perfiles on delete cascade,
  tipo solicitud_tipo_t not null,
  desde date not null,
  hasta date not null,
  hora_desde time,
  hora_hasta time,
  motivo text,
  estado solicitud_estado_t not null default 'pendiente',
  revisado_por uuid references perfiles,
  revisado_en timestamptz,
  comentario text,
  creado timestamptz not null default now(),
  check (hasta >= desde),
  check ((hora_desde is null) = (hora_hasta is null))
);
create index solicitudes_rango_idx on solicitudes (desde, hasta);

create table solicitud_adjuntos (
  id bigserial primary key,
  solicitud_id bigint not null references solicitudes on delete cascade,
  ruta text not null,
  nombre text,
  tipo_mime text
);

create table revisores (
  persona_id uuid primary key references perfiles on delete cascade,
  sede_id smallint references sedes on delete cascade,
  tipos solicitud_tipo_t[] not null default '{vacaciones,permiso,incapacidad}' check (cardinality(tipos) >= 1),
  nivel nivel_revisor_t not null default 'ver'
);

-- ---------------------------------------------------------------------------
-- Funciones de permiso (security definer: leen perfiles sin quedar atrapadas en RLS)
-- ---------------------------------------------------------------------------
create function mi_perfil() returns perfiles
language sql stable security definer set search_path = public as $$
  select * from perfiles where id = auth.uid() and activo
$$;

create function es_gerencia() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and activo and (rol = 'gerente' or es_admin))
$$;

create function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and activo and es_admin)
$$;

create function lidera_sede(s smallint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfiles
    where id = auth.uid() and activo
      and (rol = 'gerente' or es_admin or (rol = 'directora' and sede_id = s))
  )
$$;

create function sede_de(persona uuid) returns smallint
language sql stable security definer set search_path = public as $$
  select sede_id from perfiles where id = persona
$$;

create function config(k text) returns jsonb
language sql stable security definer set search_path = public as $$
  select valor from configuracion where clave = k
$$;

create function puede_publicar() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfiles
    where id = auth.uid() and activo and (rol in ('gerente', 'directora') or es_admin)
  )
$$;

create function es_destinatario(c comunicados, persona uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfiles p
    where p.id = persona and p.activo and p.id <> c.autor_id
      and (c.destino = 'todos'
        or (c.destino = 'area' and p.area_id = c.destino_id)
        or (c.destino = 'sede' and p.sede_id = c.destino_id))
  )
$$;

create function puede_ver_solicitud(s solicitudes) returns boolean
language sql stable security definer set search_path = public as $$
  select s.persona_id = auth.uid()
    or es_gerencia()
    or exists (
      select 1 from revisores r join perfiles p on p.id = r.persona_id and p.activo
      where r.persona_id = auth.uid()
        and s.persona_id <> auth.uid()
        and s.tipo = any (r.tipos)
        and (r.sede_id is null or r.sede_id = sede_de(s.persona_id))
    )
$$;

-- ---------------------------------------------------------------------------
-- Marcar asistencia: única forma de crear marcas. La hora la pone el servidor.
-- ---------------------------------------------------------------------------
create function marcar(p_tipo marca_t) returns marcas
language plpgsql security definer set search_path = public as $$
declare
  yo perfiles; s sedes; hoy date; ip_txt text; previa marca_t; r marcas;
  nombre_paso constant jsonb := '{"entrada": "la entrada", "salida_almuerzo": "la salida a almuerzo",
    "regreso_almuerzo": "el regreso de almuerzo", "salida": "la salida"}';
begin
  select * into yo from perfiles where id = auth.uid() and activo;
  if yo.id is null then raise exception 'Tu cuenta no está activa.'; end if;
  select * into s from sedes where id = yo.sede_id;
  hoy := (now() at time zone s.zona_horaria)::date;
  ip_txt := trim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1));
  if coalesce((config('validar_ip') ->> 'activo')::boolean, false) then
    if ip_txt = '' or not (ip_txt::inet = any (s.ips_oficina)) then
      raise exception 'Solo puedes marcar desde la red de la oficina.';
    end if;
  end if;
  previa := case p_tipo when 'salida_almuerzo' then 'entrada'::marca_t
                        when 'regreso_almuerzo' then 'salida_almuerzo'::marca_t
                        when 'salida' then 'entrada'::marca_t end;
  if previa is not null and not exists (select 1 from marcas where persona_id = yo.id and fecha = hoy and tipo = previa) then
    raise exception 'Primero marca %.', nombre_paso ->> previa::text;
  end if;
  insert into marcas (persona_id, fecha, tipo, ip)
  values (yo.id, hoy, p_tipo, nullif(ip_txt, '')::inet)
  returning * into r;
  return r;
exception when unique_violation then
  raise exception 'Ya marcaste % hoy.', nombre_paso ->> p_tipo::text;
end $$;

-- ---------------------------------------------------------------------------
-- Revisar solicitudes
-- ---------------------------------------------------------------------------
create function revisar_solicitud(p_id bigint, p_aprobar boolean, p_comentario text default null) returns solicitudes
language plpgsql security definer set search_path = public as $$
declare s solicitudes; permitido boolean;
begin
  select * into s from solicitudes where id = p_id for update;
  if s.id is null then raise exception 'La solicitud no existe.'; end if;
  if s.persona_id = auth.uid() then raise exception 'No puedes revisar tus propias solicitudes.'; end if;
  if s.estado <> 'pendiente' then raise exception 'Esta solicitud ya fue revisada.'; end if;
  permitido := es_gerencia() or exists (
    select 1 from revisores r join perfiles p on p.id = r.persona_id and p.activo
    where r.persona_id = auth.uid() and r.nivel = 'aprobar'
      and s.tipo = any (r.tipos)
      and (r.sede_id is null or r.sede_id = sede_de(s.persona_id))
  );
  if not permitido then raise exception 'No tienes permiso para aprobar esta solicitud.'; end if;
  update solicitudes
     set estado = case when p_aprobar then 'aprobada'::solicitud_estado_t else 'rechazada'::solicitud_estado_t end,
         revisado_por = auth.uid(),
         revisado_en = now(),
         comentario = nullif(trim(coalesce(p_comentario, '')), '')
   where id = p_id
  returning * into s;
  return s;
end $$;

-- ---------------------------------------------------------------------------
-- Consentimiento de tratamiento de datos (la persona no puede escribir en perfiles)
-- ---------------------------------------------------------------------------
create function aceptar_datos() returns void
language sql security definer set search_path = public as $$
  update perfiles set acepto_datos = now() where id = auth.uid() and acepto_datos is null
$$;

-- ---------------------------------------------------------------------------
-- Historial de la malla
-- ---------------------------------------------------------------------------
create function registrar_cambio_malla() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into malla_historial (persona_id, fecha, turno_antes, turno_despues) values (new.persona_id, new.fecha, null, new.turno_id);
  elsif tg_op = 'UPDATE' then
    if new.turno_id is distinct from old.turno_id then
      insert into malla_historial (persona_id, fecha, turno_antes, turno_despues) values (new.persona_id, new.fecha, old.turno_id, new.turno_id);
    end if;
  else
    insert into malla_historial (persona_id, fecha, turno_antes, turno_despues) values (old.persona_id, old.fecha, old.turno_id, null);
  end if;
  return null;
end $$;

create trigger malla_historial_trg after insert or update or delete on malla
for each row execute function registrar_cambio_malla();

-- Id numérico de la primera carpeta de una ruta de Storage ('15/foto.jpg' → 15)
create function carpeta_id(ruta text) returns bigint
language sql immutable set search_path = public as $$
  select case when split_part(ruta, '/', 1) ~ '^[0-9]{1,18}$' then split_part(ruta, '/', 1)::bigint end
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table sedes enable row level security;
alter table areas enable row level security;
alter table perfiles enable row level security;
alter table configuracion enable row level security;
alter table turnos enable row level security;
alter table malla enable row level security;
alter table malla_historial enable row level security;
alter table marcas enable row level security;
alter table herramientas enable row level security;
alter table comunicados enable row level security;
alter table comunicado_imagenes enable row level security;
alter table comunicado_lecturas enable row level security;
alter table solicitudes enable row level security;
alter table solicitud_adjuntos enable row level security;
alter table revisores enable row level security;

create policy sedes_ver on sedes for select to authenticated using (true);
create policy sedes_admin on sedes for all to authenticated using (es_admin()) with check (es_admin());

create policy areas_ver on areas for select to authenticated using (true);
create policy areas_admin on areas for all to authenticated using (es_admin()) with check (es_admin());

create policy config_ver on configuracion for select to authenticated using (true);
create policy config_gerencia on configuracion for all to authenticated using (es_gerencia()) with check (es_gerencia());

create policy perfiles_ver on perfiles for select to authenticated using (true);
create policy perfiles_admin on perfiles for all to authenticated using (es_admin()) with check (es_admin());

create policy turnos_ver on turnos for select to authenticated using (true);
create policy turnos_lider on turnos for all to authenticated using (lidera_sede(sede_id)) with check (lidera_sede(sede_id));

create policy malla_ver on malla for select to authenticated using (true);
create policy malla_lider on malla for all to authenticated
  using (lidera_sede(sede_de(persona_id))) with check (lidera_sede(sede_de(persona_id)));

create policy malla_hist_ver on malla_historial for select to authenticated using (true);

create policy marcas_ver on marcas for select to authenticated
  using (persona_id = auth.uid() or lidera_sede(sede_de(persona_id)));
create policy marcas_corregir on marcas for update to authenticated
  using (lidera_sede(sede_de(persona_id))) with check (lidera_sede(sede_de(persona_id)));

create policy herr_ver on herramientas for select to authenticated using (
  es_gerencia() or (activo and (areas_visibles is null or cardinality(areas_visibles) = 0
    or (select area_id from perfiles where id = auth.uid()) = any (areas_visibles)))
);
create policy herr_gerencia on herramientas for all to authenticated using (es_gerencia()) with check (es_gerencia());

create policy com_ver on comunicados for select to authenticated using (
  autor_id = auth.uid() or es_gerencia() or puede_publicar() or es_destinatario(comunicados, auth.uid())
);
create policy com_crear on comunicados for insert to authenticated with check (puede_publicar() and autor_id = auth.uid());
create policy com_editar on comunicados for update to authenticated
  using (autor_id = auth.uid() or es_gerencia()) with check (autor_id = auth.uid() or es_gerencia());
create policy com_borrar on comunicados for delete to authenticated using (autor_id = auth.uid() or es_gerencia());

create policy comimg_ver on comunicado_imagenes for select to authenticated
  using (exists (select 1 from comunicados c where c.id = comunicado_id));
create policy comimg_crear on comunicado_imagenes for insert to authenticated with check (
  exists (select 1 from comunicados c where c.id = comunicado_id and (c.autor_id = auth.uid() or es_gerencia()))
);
create policy comimg_borrar on comunicado_imagenes for delete to authenticated using (
  exists (select 1 from comunicados c where c.id = comunicado_id and (c.autor_id = auth.uid() or es_gerencia()))
);

create policy lect_ver on comunicado_lecturas for select to authenticated
  using (persona_id = auth.uid() or es_gerencia() or puede_publicar());
create policy lect_crear on comunicado_lecturas for insert to authenticated with check (
  persona_id = auth.uid()
  and exists (select 1 from comunicados c where c.id = comunicado_id and es_destinatario(c, auth.uid()))
);

create policy sol_ver on solicitudes for select to authenticated using (puede_ver_solicitud(solicitudes));
create policy sol_crear on solicitudes for insert to authenticated with check (
  persona_id = auth.uid() and estado = 'pendiente'
  and revisado_por is null and revisado_en is null and comentario is null
  and coalesce((config('modulo_solicitudes') ->> 'activo')::boolean, false)
);
create policy sol_cancelar on solicitudes for delete to authenticated
  using (persona_id = auth.uid() and estado = 'pendiente');

create policy soladj_ver on solicitud_adjuntos for select to authenticated
  using (exists (select 1 from solicitudes s where s.id = solicitud_id));
create policy soladj_crear on solicitud_adjuntos for insert to authenticated with check (
  exists (select 1 from solicitudes s where s.id = solicitud_id and s.persona_id = auth.uid() and s.estado = 'pendiente')
);

create policy rev_ver on revisores for select to authenticated using (persona_id = auth.uid() or es_gerencia());
create policy rev_gerencia on revisores for all to authenticated using (es_gerencia()) with check (es_gerencia());

-- ---------------------------------------------------------------------------
-- Grants explícitos ("Automatically expose new tables" apagado). Sin sesión no hay nada.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
-- Intranet Caminos · 002_archivos
-- Buckets privados y reglas de archivos. La primera carpeta de cada ruta es el id del
-- comunicado o de la solicitud dueña, así el archivo hereda sus permisos (RLS).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('comunicados', 'comunicados', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('soportes', 'soportes', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

-- Comunicados: ve quien puede ver el comunicado; suben y borran el autor o la gerencia.
create policy "comunicados: ver" on storage.objects for select to authenticated using (
  bucket_id = 'comunicados'
  and exists (select 1 from public.comunicados c where c.id = public.carpeta_id(name))
);
create policy "comunicados: subir" on storage.objects for insert to authenticated with check (
  bucket_id = 'comunicados'
  and exists (select 1 from public.comunicados c where c.id = public.carpeta_id(name)
              and (c.autor_id = auth.uid() or public.es_gerencia()))
);
create policy "comunicados: borrar" on storage.objects for delete to authenticated using (
  bucket_id = 'comunicados'
  and exists (select 1 from public.comunicados c where c.id = public.carpeta_id(name)
              and (c.autor_id = auth.uid() or public.es_gerencia()))
);

-- Soportes de solicitudes: ve quien puede ver la solicitud; sube la dueña mientras está pendiente.
create policy "soportes: ver" on storage.objects for select to authenticated using (
  bucket_id = 'soportes'
  and exists (select 1 from public.solicitudes s where s.id = public.carpeta_id(name))
);
create policy "soportes: subir" on storage.objects for insert to authenticated with check (
  bucket_id = 'soportes'
  and exists (select 1 from public.solicitudes s where s.id = public.carpeta_id(name)
              and s.persona_id = auth.uid() and s.estado = 'pendiente')
);
-- Intranet Caminos · 003_datos_iniciales
-- Catálogos y configuración. REVISAR CON CAMINOS ANTES DE EJECUTAR: sedes y zonas
-- horarias, áreas, turnos de ejemplo, herramientas (URL reales) y valores de configuración.
-- Los valores marcados «POR CONFIRMAR» son supuestos razonables mientras llega el dato real.

-- Sedes (zona IANA: define la fecha y la hora de cada marca). POR CONFIRMAR
insert into sedes (nombre, zona_horaria) values
  ('Bogotá', 'America/Bogota');

-- Áreas. POR CONFIRMAR
insert into areas (nombre) values
  ('Operaciones'),
  ('Comercial'),
  ('Administrativa');

-- Turnos de ejemplo por cada sede. La primera tarea de cada líder es ajustarlos en la Malla.
insert into turnos (sede_id, codigo, nombre, entrada, salida_almuerzo, regreso_almuerzo, salida)
select s.id, t.codigo, t.nombre, t.entrada::time, t.salida_almuerzo::time, t.regreso_almuerzo::time, t.salida::time
from sedes s
cross join (values
  ('M', 'Mañana',     '08:00', '12:30', '13:30', '17:30'),
  ('T', 'Tarde',      '10:00', '14:00', '15:00', '19:00'),
  ('S', 'Sábado',     '09:00', null,    null,    '13:00'),
  ('D', 'Descanso',   null,    null,    null,    null),
  ('V', 'Vacaciones', null,    null,    null,    null)
) as t (codigo, nombre, entrada, salida_almuerzo, regreso_almuerzo, salida);

-- Configuración
insert into configuracion (clave, valor) values
  ('modulo_solicitudes', '{"activo": false}'),
  ('tolerancias',        '{"entrada_min": 5, "almuerzo_min": 5}'),
  ('meta_puntualidad',   '{"porcentaje": 95}'),
  ('validar_ip',         '{"activo": false}');

-- Herramientas del portal (ícono: compass, file, target, plane, map, globe, ticket, users…).
-- URL POR CONFIRMAR: reemplazar por las direcciones reales de Caminos.
insert into herramientas (nombre, descripcion, icono, pie, url, orden) values
  ('Caminos Documentos', 'Cotizaciones, confirmaciones, vouchers e itinerarios con el diseño oficial.', 'file', 'Abrir generador', 'https://claude.ai', 1),
  ('Itinerarios publicados', 'Versiones interactivas de los itinerarios que se comparten con los grupos.', 'plane', 'Ver itinerarios', 'https://directoroperaciones-bot.github.io/itinerarios/', 2),
  ('Sistema de operación', 'Ventas, pasajeros, pagos y proveedores (AppSheet).', 'compass', 'Abrir AppSheet', 'https://www.appsheet.com', 3),
  ('Sitio web de Caminos', 'La página pública de la agencia, tal como la ven los clientes.', 'globe', 'Abrir sitio', 'https://www.agenciacaminos.com.co', 4);
-- Intranet Caminos · 004_ausencias_y_soportes
-- Ausencias aprobadas para asistencia, informes e inicio, y borrado de soportes al cancelar.

-- Devuelve solo lo necesario para justificar días (nunca motivo ni soportes), de la propia
-- persona o de las personas que quien consulta lidera. Solo solicitudes de día completo.
create function ausencias_aprobadas(p_desde date, p_hasta date)
returns table (persona_id uuid, tipo solicitud_tipo_t, desde date, hasta date, revisado_por uuid)
language sql stable security definer set search_path = public as $$
  select s.persona_id, s.tipo, s.desde, s.hasta, s.revisado_por
  from solicitudes s
  where s.estado = 'aprobada' and s.hora_desde is null
    and s.desde <= p_hasta and s.hasta >= p_desde
    and (s.persona_id = auth.uid() or lidera_sede(sede_de(s.persona_id)))
$$;

revoke all on function ausencias_aprobadas(date, date) from public, anon;
grant execute on function ausencias_aprobadas(date, date) to authenticated;

-- La dueña borra sus soportes mientras la solicitud está pendiente (al cancelarla o quitarlos).
create policy soladj_borrar on solicitud_adjuntos for delete to authenticated using (
  exists (select 1 from solicitudes s where s.id = solicitud_id and s.persona_id = auth.uid() and s.estado = 'pendiente')
);

create policy "soportes: borrar" on storage.objects for delete to authenticated using (
  bucket_id = 'soportes'
  and exists (select 1 from public.solicitudes s where s.id = public.carpeta_id(name)
              and s.persona_id = auth.uid() and s.estado = 'pendiente')
);
