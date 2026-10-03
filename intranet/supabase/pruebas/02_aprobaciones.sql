-- Pruebas de aprobaciones, soportes y ausencias. Ejecutar después de 01_permisos.sql.
\set ON_ERROR_STOP off
set role authenticated;

\echo '== Incapacidad con soporte =='
select pruebas.como('colab1@prueba.co');
select pruebas.ok('El colaborador pide una incapacidad',
  $q$ insert into solicitudes (tipo, desde, hasta, motivo) values ('incapacidad', current_date, current_date + 1, 'Gripa') $q$);
select pruebas.ok('Sube el soporte (registro)',
  $q$ insert into solicitud_adjuntos (solicitud_id, ruta, nombre, tipo_mime) select id, id || '/incapacidad.jpg', 'incapacidad.jpg', 'image/jpeg' from solicitudes where tipo = 'incapacidad' $q$);
select pruebas.ok('Sube el soporte (archivo)',
  $q$ insert into storage.objects (bucket_id, name) select 'soportes', id || '/incapacidad.jpg' from solicitudes where tipo = 'incapacidad' $q$);

select pruebas.como('conta@prueba.co');
select pruebas.igual('Contabilidad ve solo la incapacidad (no las vacaciones)', $q$ select string_agg(tipo::text, ',') from solicitudes $q$, 'incapacidad');
select pruebas.igual('Contabilidad ve el soporte', $q$ select count(*)::text from storage.objects where bucket_id = 'soportes' $q$, '1');
select pruebas.ok('Contabilidad aprueba la incapacidad',
  $q$ select revisar_solicitud((select id from solicitudes where tipo = 'incapacidad'), true, 'Recibida') $q$);
select pruebas.falla('No se puede revisar dos veces',
  $q$ select revisar_solicitud((select id from solicitudes where tipo = 'incapacidad'), false, null) $q$);
select pruebas.igual('Queda aprobada con revisor y comentario',
  $q$ select estado || '|' || (revisado_por = auth.uid())::text || '|' || comentario from solicitudes where tipo = 'incapacidad' $q$, 'aprobada|true|Recibida');

select pruebas.como('colab1@prueba.co');
select pruebas.falla('Aprobada, la dueña ya no la cancela', $q$ delete from solicitudes where tipo = 'incapacidad' $q$);
select pruebas.falla('Aprobada, ya no se suben soportes',
  $q$ insert into storage.objects (bucket_id, name) select 'soportes', id || '/otro.jpg' from solicitudes where tipo = 'incapacidad' $q$);
select pruebas.igual('La persona ve su propia ausencia aprobada',
  $q$ select count(*)::text from ausencias_aprobadas(current_date, current_date) $q$, '1');

\echo '== Vacaciones: tipo que contabilidad no revisa =='
select pruebas.como('conta@prueba.co');
select pruebas.falla('Contabilidad no aprueba vacaciones (no es su tipo)',
  $q$ select revisar_solicitud((select id from solicitudes where tipo = 'vacaciones' limit 1), true, null) $q$);

select pruebas.como('gerente@prueba.co');
select pruebas.igual('La gerencia ve todas las solicitudes', $q$ select count(*)::text from solicitudes $q$, '2');
select pruebas.igual('La gerencia ve los soportes', $q$ select count(*)::text from storage.objects where bucket_id = 'soportes' $q$, '1');
select pruebas.ok('La gerencia aprueba las vacaciones',
  $q$ select revisar_solicitud((select id from solicitudes where tipo = 'vacaciones'), true, '') $q$);
select pruebas.igual('Comentario vacío queda nulo', $q$ select coalesce(comentario, 'nulo') from solicitudes where tipo = 'vacaciones' $q$, 'nulo');

\echo '== Ausencias para líderes =='
select pruebas.como('directora@prueba.co');
select pruebas.igual('La directora ve las ausencias de su sede sin ver la solicitud',
  $q$ select count(*)::text from ausencias_aprobadas(current_date, current_date) $q$, '2');
select pruebas.igual('…pero no la solicitud ni el motivo', $q$ select count(*)::text from solicitudes $q$, '0');

select pruebas.como('colab2@prueba.co');
select pruebas.igual('Otra sede no ve esas ausencias',
  $q$ select count(*)::text from ausencias_aprobadas(current_date, current_date) $q$, '0');

\echo '== Cancelar una solicitud pendiente =='
select pruebas.como('colab1@prueba.co');
select pruebas.ok('Pide un permiso por horas',
  $q$ insert into solicitudes (tipo, desde, hasta, hora_desde, hora_hasta, motivo) values ('permiso', current_date + 3, current_date + 3, '08:00', '10:00', 'Cita médica') $q$);
select pruebas.ok('Sube un soporte al permiso',
  $q$ insert into storage.objects (bucket_id, name) select 'soportes', id || '/cita.pdf' from solicitudes where tipo = 'permiso' $q$);
select pruebas.ok('Borra el soporte del permiso pendiente',
  $q$ delete from storage.objects where bucket_id = 'soportes' and name like (select id || '/%' from solicitudes where tipo = 'permiso') $q$);
select pruebas.ok('Cancela el permiso pendiente', $q$ delete from solicitudes where tipo = 'permiso' $q$);
select pruebas.igual('El permiso ya no existe', $q$ select count(*)::text from solicitudes where tipo = 'permiso' $q$, '0');

\echo '== Revisores =='
select pruebas.falla('Un colaborador no se nombra revisor',
  $q$ insert into revisores (persona_id, nivel) values (auth.uid(), 'aprobar') $q$);
select pruebas.como('gerente@prueba.co');
select pruebas.ok('La gerencia nombra revisora a la directora',
  $q$ insert into revisores (persona_id, sede_id, nivel) select id, 1, 'ver' from perfiles where correo = 'directora@prueba.co' $q$);
select pruebas.como('directora@prueba.co');
select pruebas.igual('Como revisora (ver) la directora ya ve las solicitudes de su sede', $q$ select count(*)::text from solicitudes $q$, '2');

reset role;
