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
