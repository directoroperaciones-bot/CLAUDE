-- Pruebas de permisos (RLS y funciones). Ejecutar después de 00 y de las migraciones 001 a 004.
-- Cada línea imprime «OK» o «FALLA» con lo que se esperaba.
\set ON_ERROR_STOP off
\echo '== Preparar personas de prueba =='

insert into sedes (nombre, zona_horaria) values ('Sede de prueba 2', 'America/Bogota');
insert into turnos (sede_id, codigo, nombre, entrada, salida_almuerzo, regreso_almuerzo, salida)
select id, 'M', 'Mañana', '08:00', '12:30', '13:30', '17:30' from sedes where nombre = 'Sede de prueba 2';

insert into auth.users (email) values
  ('gerente@prueba.co'), ('directora@prueba.co'), ('colab1@prueba.co'), ('colab2@prueba.co'), ('conta@prueba.co');

insert into perfiles (id, nombre, correo, sede_id, area_id, rol, es_admin)
select u.id, x.nombre, u.email, x.sede, 1, x.rol::rol_t, x.admin
from auth.users u join (values
  ('gerente@prueba.co',   'Gerente Prueba',     1::smallint, 'gerente',     true),
  ('directora@prueba.co', 'Directora Sede 1',   1::smallint, 'directora',   false),
  ('colab1@prueba.co',    'Colaborador Sede 1', 1::smallint, 'colaborador', false),
  ('colab2@prueba.co',    'Colaborador Sede 2', 2::smallint, 'colaborador', false),
  ('conta@prueba.co',     'Contabilidad',       1::smallint, 'colaborador', false)
) as x (correo, nombre, sede, rol, admin) on x.correo = u.email;

insert into revisores (persona_id, sede_id, tipos, nivel)
select id, null, '{incapacidad}', 'aprobar' from perfiles where correo = 'conta@prueba.co';

set role authenticated;

\echo '== Sin sesión =='
select pruebas.como('nadie@prueba.co');
select pruebas.falla('Sin sesión no se puede marcar', $q$ select marcar('entrada') $q$);
select pruebas.igual('Sin sesión no se ven perfiles útiles (es_gerencia = false)', $q$ select es_gerencia()::text $q$, 'false');

\echo '== Marcas =='
select pruebas.como('colab1@prueba.co');
select pruebas.falla('Regreso sin salida a almuerzo se rechaza', $q$ select marcar('regreso_almuerzo') $q$);
select pruebas.falla('Salida sin entrada se rechaza', $q$ select marcar('salida') $q$);
select pruebas.ok('Marcar entrada funciona', $q$ select marcar('entrada') $q$);
select pruebas.falla('Marcar la entrada dos veces se rechaza', $q$ select marcar('entrada') $q$);
select pruebas.falla('Insert directo en marcas se rechaza', $q$ insert into marcas (persona_id, fecha, tipo) values (auth.uid(), current_date, 'salida') $q$);
select pruebas.ok('Salir a almorzar después de la entrada funciona', $q$ select marcar('salida_almuerzo') $q$);
select pruebas.igual('El colaborador ve solo sus 2 marcas', $q$ select count(*)::text from marcas $q$, '2');
select pruebas.falla('El colaborador no corrige sus marcas', $q$ update marcas set hora = now() - interval '1 hour' $q$);

select pruebas.como('colab2@prueba.co');
select pruebas.ok('El colaborador de la sede 2 marca entrada', $q$ select marcar('entrada') $q$);

select pruebas.como('directora@prueba.co');
select pruebas.igual('La directora ve las marcas de su sede (2), no las de la sede 2', $q$ select count(*)::text from marcas $q$, '2');
select pruebas.ok('La directora corrige una marca de su sede', $q$ update marcas set corregida_por = auth.uid() where tipo = 'salida_almuerzo' $q$);

select pruebas.como('gerente@prueba.co');
select pruebas.igual('La gerencia ve todas las marcas (3)', $q$ select count(*)::text from marcas $q$, '3');

\echo '== Malla y turnos =='
select pruebas.como('colab1@prueba.co');
select pruebas.falla('El colaborador no edita la malla',
  $q$ insert into malla (persona_id, fecha, turno_id) values (auth.uid(), current_date, (select id from turnos where sede_id = 1 and codigo = 'M')) $q$);
select pruebas.falla('El colaborador no edita turnos', $q$ update turnos set nombre = 'X' where sede_id = 1 $q$);

select pruebas.como('directora@prueba.co');
select pruebas.ok('La directora edita la malla de su sede',
  $q$ insert into malla (persona_id, fecha, turno_id) select id, current_date, (select id from turnos where sede_id = 1 and codigo = 'M') from perfiles where correo = 'colab1@prueba.co' $q$);
select pruebas.ok('La directora cambia el turno (upsert)',
  $q$ insert into malla (persona_id, fecha, turno_id) select id, current_date, (select id from turnos where sede_id = 1 and codigo = 'T') from perfiles where correo = 'colab1@prueba.co'
      on conflict (persona_id, fecha) do update set turno_id = excluded.turno_id $q$);
select pruebas.falla('La directora no edita la malla de otra sede',
  $q$ insert into malla (persona_id, fecha, turno_id) select id, current_date, (select id from turnos where sede_id = 2 and codigo = 'M') from perfiles where correo = 'colab2@prueba.co' $q$);
select pruebas.falla('La directora no edita turnos de otra sede', $q$ update turnos set nombre = 'X' where sede_id = 2 $q$);
select pruebas.ok('La directora edita turnos de su sede', $q$ update turnos set nombre = 'Mañana corrida' where sede_id = 1 and codigo = 'M' $q$);
select pruebas.igual('El historial registra el alta y el cambio (2 filas)', $q$ select count(*)::text from malla_historial $q$, '2');
select pruebas.igual('El historial guarda quién cambió', $q$ select count(*)::text from malla_historial where cambiado_por = auth.uid() $q$, '2');

select pruebas.como('colab2@prueba.co');
select pruebas.igual('La malla es pública para todos', $q$ select count(*)::text from malla $q$, '1');

\echo '== Perfiles, configuración y herramientas =='
select pruebas.como('colab1@prueba.co');
select pruebas.falla('El colaborador no se cambia el rol', $q$ update perfiles set rol = 'gerente' where id = auth.uid() $q$);
select pruebas.falla('El colaborador no cambia la configuración', $q$ update configuracion set valor = '{"activo": true}' where clave = 'modulo_solicitudes' $q$);
select pruebas.ok('El colaborador acepta el tratamiento de datos', $q$ select aceptar_datos() $q$);
select pruebas.igual('Queda la fecha de aceptación', $q$ select (acepto_datos is not null)::text from perfiles where id = auth.uid() $q$, 'true');
set role anon;
select pruebas.falla('Anónimo no lee sedes', $q$ select count(*) from sedes $q$);
set role authenticated;

\echo '== Comunicados =='
select pruebas.falla('El colaborador no publica comunicados', $q$ insert into comunicados (titulo, cuerpo) values ('Hola', 'x') $q$);

select pruebas.como('directora@prueba.co');
select pruebas.ok('La directora publica para la sede 1', $q$ insert into comunicados (titulo, cuerpo, destino, destino_id) values ('Para sede 1', 'Hola sede 1', 'sede', 1) $q$);
select pruebas.ok('La directora publica para todos', $q$ insert into comunicados (titulo, cuerpo) values ('Para todos', 'Hola a todos') $q$);
select pruebas.falla('No se puede publicar a nombre de otra persona',
  $q$ insert into comunicados (titulo, autor_id) select 'Falso', id from perfiles where correo = 'gerente@prueba.co' $q$);

select pruebas.como('colab2@prueba.co');
select pruebas.igual('El colaborador de la sede 2 ve solo el dirigido a todos', $q$ select count(*)::text from comunicados $q$, '1');
select pruebas.falla('Un no destinatario no confirma lectura',
  $q$ insert into comunicado_lecturas (comunicado_id, persona_id) values (pruebas.comunicado('Para sede 1'), auth.uid()) $q$);
select pruebas.falla('El colaborador no borra comunicados ajenos', $q$ delete from comunicados $q$);

select pruebas.como('colab1@prueba.co');
select pruebas.igual('El colaborador de la sede 1 ve los dos', $q$ select count(*)::text from comunicados $q$, '2');
select pruebas.ok('El destinatario confirma lectura',
  $q$ insert into comunicado_lecturas (comunicado_id, persona_id) select id, auth.uid() from comunicados where titulo = 'Para sede 1' $q$);
select pruebas.falla('No se confirma a nombre de otra persona',
  $q$ insert into comunicado_lecturas (comunicado_id, persona_id) select c.id, p.id from comunicados c, perfiles p where c.titulo = 'Para todos' and p.correo = 'conta@prueba.co' $q$);

select pruebas.como('directora@prueba.co');
select pruebas.igual('La directora ve quién confirmó', $q$ select count(*)::text from comunicado_lecturas $q$, '1');
select pruebas.ok('La autora sube una imagen a su comunicado',
  $q$ insert into storage.objects (bucket_id, name) select 'comunicados', id || '/foto.jpg' from comunicados where titulo = 'Para sede 1' $q$);

select pruebas.como('colab2@prueba.co');
select pruebas.igual('Quien no ve el comunicado no ve sus imágenes', $q$ select count(*)::text from storage.objects $q$, '0');
select pruebas.falla('Un colaborador no sube imágenes a comunicados',
  $q$ insert into storage.objects (bucket_id, name) select 'comunicados', id || '/otra.jpg' from comunicados limit 1 $q$);

select pruebas.como('colab1@prueba.co');
select pruebas.igual('El destinatario sí ve la imagen', $q$ select count(*)::text from storage.objects $q$, '1');

\echo '== Solicitudes con el módulo apagado y encendido =='
select pruebas.falla('Con el módulo apagado no se crean solicitudes',
  $q$ insert into solicitudes (tipo, desde, hasta, motivo) values ('vacaciones', current_date, current_date + 2, 'Descanso') $q$);

select pruebas.como('gerente@prueba.co');
select pruebas.ok('La gerencia activa el módulo', $q$ update configuracion set valor = '{"activo": true}' where clave = 'modulo_solicitudes' $q$);

select pruebas.como('colab1@prueba.co');
select pruebas.ok('Con el módulo activo se crean solicitudes',
  $q$ insert into solicitudes (tipo, desde, hasta, motivo) values ('vacaciones', current_date, current_date + 2, 'Descanso') $q$);
select pruebas.falla('No se crea una solicitud ya aprobada',
  $q$ insert into solicitudes (tipo, desde, hasta, estado) values ('permiso', current_date, current_date, 'aprobada') $q$);
select pruebas.falla('La dueña no se aprueba a sí misma (update directo)', $q$ update solicitudes set estado = 'aprobada' $q$);
select pruebas.falla('La dueña no se aprueba a sí misma (función)',
  $q$ select revisar_solicitud((select id from solicitudes limit 1), true, null) $q$);

select pruebas.como('colab2@prueba.co');
select pruebas.igual('Otro colaborador no ve solicitudes ajenas', $q$ select count(*)::text from solicitudes $q$, '0');

select pruebas.como('directora@prueba.co');
select pruebas.igual('La directora (sin ser revisora) no ve solicitudes', $q$ select count(*)::text from solicitudes $q$, '0');

reset role;
