/* Supabase simulado para probar la intranet sin proyecto real (pruebas/demo.html).
   Expone window.supabase.createClient() con Auth, consultas, RPC, Storage y Functions en memoria.
   Aplica algunas reglas de visibilidad para que cada rol vea algo parecido a la realidad,
   pero NO sirve para probar permisos: para eso están las pruebas SQL (supabase/pruebas).
   Todas las cuentas entran con la contraseña «clave1234». Agrega ?sedes=2 a la URL para simular dos sedes. */
(function () {
  'use strict';
  const CLAVE = 'clave1234';
  const params = new URLSearchParams(location.search);
  const DOS_SEDES = params.get('sedes') === '2';

  // ---------- azar determinista ----------
  let semilla = 20261003;
  const azar = () => { semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));

  // ---------- fechas ----------
  const fechaEn = (tz, d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const sumarDias = (f, n) => { const d = new Date(f + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const diaSemana = (f) => new Date(f + 'T00:00:00Z').getUTCDay();
  const toMin = (t) => { const [h, m] = String(t).split(':'); return +h * 60 + +m; };
  // Fecha local + minutos en una zona → instante ISO
  function localAIso(fecha, min, tz) {
    const guess = Date.parse(fecha + 'T00:00:00Z') + min * 60000;
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(guess));
    const g = Object.fromEntries(p.map((x) => [x.type, x.value]));
    const comoLocal = Date.parse(`${g.year}-${g.month}-${g.day}T${g.hour}:${g.minute}:00Z`);
    return new Date(guess - (comoLocal - guess)).toISOString();
  }
  const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  const ahora = () => new Date().toISOString();

  // ---------- datos sembrados ----------
  const DB = {
    sedes: [{ id: 1, nombre: 'Bogotá', zona_horaria: 'America/Bogota', ips_oficina: [] }],
    areas: [{ id: 1, nombre: 'Operaciones' }, { id: 2, nombre: 'Comercial' }, { id: 3, nombre: 'Administrativa' }],
    perfiles: [], configuracion: [], turnos: [], malla: [], malla_historial: [], marcas: [], herramientas: [],
    comunicados: [], comunicado_imagenes: [], comunicado_lecturas: [], solicitudes: [], solicitud_adjuntos: [], revisores: []
  };
  if (DOS_SEDES) DB.sedes.push({ id: 2, nombre: 'Medellín', zona_horaria: 'America/Bogota', ips_oficina: [] });
  const seq = {};
  const nuevoId = (t) => { seq[t] = (seq[t] || Math.max(0, ...DB[t].map((r) => +r.id || 0))) + 1; return seq[t]; };

  let tid = 0;
  DB.sedes.forEach((s) => {
    [['M', 'Mañana', '08:00:00', '12:30:00', '13:30:00', '17:30:00'], ['T', 'Tarde', '10:00:00', '14:00:00', '15:00:00', '19:00:00'],
      ['S', 'Sábado', '09:00:00', null, null, '13:00:00'], ['D', 'Descanso', null, null, null, null], ['V', 'Vacaciones', null, null, null, null]]
      .forEach(([codigo, nombre, entrada, sa, ra, salida]) => DB.turnos.push({ id: ++tid, sede_id: s.id, codigo, nombre, entrada, salida_almuerzo: sa, regreso_almuerzo: ra, salida, activo: true }));
  });
  DB.configuracion = [
    { clave: 'modulo_solicitudes', valor: { activo: true } },
    { clave: 'tolerancias', valor: { entrada_min: 5, almuerzo_min: 5 } },
    { clave: 'meta_puntualidad', valor: { porcentaje: 95 } },
    { clave: 'validar_ip', valor: { activo: false } }
  ];
  DB.herramientas = [
    { id: 1, nombre: 'Caminos Documentos', descripcion: 'Cotizaciones, confirmaciones, vouchers e itinerarios con el diseño oficial.', icono: 'file', pie: 'Abrir generador', url: 'https://claude.ai', orden: 1, areas_visibles: null, activo: true },
    { id: 2, nombre: 'Itinerarios publicados', descripcion: 'Versiones interactivas de los itinerarios que se comparten con los grupos.', icono: 'plane', pie: 'Ver itinerarios', url: 'https://directoroperaciones-bot.github.io/itinerarios/', orden: 2, areas_visibles: null, activo: true },
    { id: 3, nombre: 'Sistema de operación', descripcion: 'Ventas, pasajeros, pagos y proveedores (AppSheet).', icono: 'compass', pie: 'Abrir AppSheet', url: 'https://www.appsheet.com', orden: 3, areas_visibles: null, activo: true },
    { id: 4, nombre: 'Sitio web de Caminos', descripcion: 'La página pública de la agencia, tal como la ven los clientes.', icono: 'globe', pie: 'Abrir sitio', url: 'https://www.agenciacaminos.com.co', orden: 4, areas_visibles: null, activo: true }
  ];

  const USUARIOS = [];
  const GENTE = [
    ['Laura Gómez', 'laura', 1, 1, 'gerente', true],
    ['Andrea Ruiz', 'andrea', 1, 1, 'directora', false],
    ['Camilo Pérez', 'camilo', 1, 2, 'colaborador', false],
    ['Valentina Ortiz', 'valentina', 1, 1, 'colaborador', false],
    ['Julián Moreno', 'julian', 1, 3, 'colaborador', false],
    ['Sofía Ramírez', 'sofia', 1, 2, 'colaborador', false]
  ];
  if (DOS_SEDES) GENTE.push(['Mateo Castro', 'mateo', 2, 1, 'directora', false], ['Daniela Ríos', 'daniela', 2, 2, 'colaborador', false]);
  GENTE.forEach(([nombre, u, sede, area, rol, admin], i) => {
    const id = uuid(), correo = `${u}@caminos.simulado`;
    USUARIOS.push({ id, email: correo, password: CLAVE, user_metadata: { debe_cambiar_contrasena: i === 0 } });
    DB.perfiles.push({ id, nombre, correo, area_id: area, sede_id: sede, rol, es_admin: admin, activo: true, acepto_datos: i === 0 ? null : ahora(), creado: ahora() });
  });
  const P = (u) => DB.perfiles.find((p) => p.correo.startsWith(u + '@'));
  DB.revisores.push({ persona_id: P('julian').id, sede_id: null, tipos: ['incapacidad'], nivel: 'aprobar' });

  // 45 días de jornadas + la semana siguiente en la malla
  const tz = 'America/Bogota', hoy = fechaEn(tz);
  const turnoDe = (sede, cod) => DB.turnos.find((t) => t.sede_id === sede && t.codigo === cod);
  const lunesHoy = sumarDias(hoy, -((diaSemana(hoy) + 6) % 7));
  const finMalla = sumarDias(lunesHoy, 12);
  const vac = { persona: P('valentina').id, desde: sumarDias(hoy, -16), hasta: sumarDias(hoy, -12) };
  DB.perfiles.forEach((p, ip) => {
    for (let f = sumarDias(hoy, -44); f <= finMalla; f = sumarDias(f, 1)) {
      const ds = diaSemana(f);
      if (ds === 0) continue;
      const semana = Math.floor((Date.parse(f) - Date.parse('2026-01-05')) / (7 * 864e5));
      let cod = ds === 6 ? ((ip + semana) % 2 ? 'S' : 'D') : ((ip + semana) % 3 === 0 ? 'T' : 'M');
      if (p.id === vac.persona && f >= vac.desde && f <= vac.hasta) cod = 'V';
      const t = turnoDe(p.sede_id, cod);
      DB.malla.push({ persona_id: p.id, fecha: f, turno_id: t.id });
      if (!t.entrada || f > hoy) continue;
      if (f < hoy && azar() < 0.03) continue; // día sin marcar
      const tardon = ip === 2 ? 0.35 : ip === 5 ? 0.2 : 0.07;
      const ent = toMin(t.entrada) + (azar() < tardon ? entre(6, 28) : entre(-12, 4));
      const marcas = [['entrada', ent]];
      if (t.salida_almuerzo) {
        const sa = toMin(t.salida_almuerzo) + entre(-5, 10);
        marcas.push(['salida_almuerzo', sa], ['regreso_almuerzo', sa + (azar() < 0.12 ? entre(66, 85) : entre(52, 63))]);
      }
      const r = azar();
      marcas.push(['salida', toMin(t.salida) + (r < 0.08 ? -entre(10, 40) : r < 0.2 ? entre(30, 75) : entre(0, 15))]);
      // hoy: solo lo que ya pasó, y Camilo todavía sin marcar
      const ahoraMin = toMin(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()));
      marcas.forEach(([tipo, min]) => {
        if (f === hoy && (min > ahoraMin || p.correo.startsWith('camilo') || p.correo.startsWith('laura'))) return;
        DB.marcas.push({ id: nuevoId('marcas'), persona_id: p.id, fecha: f, tipo, hora: localAIso(f, min, tz), ip: '190.25.1.10', corregida_por: null });
      });
    }
  });

  DB.solicitudes.push(
    { id: 1, persona_id: vac.persona, tipo: 'vacaciones', desde: vac.desde, hasta: vac.hasta, hora_desde: null, hora_hasta: null, motivo: 'Viaje familiar', estado: 'aprobada', revisado_por: P('laura').id, revisado_en: localAIso(sumarDias(vac.desde, -10), 600, tz), comentario: '¡Disfrútalas!', creado: localAIso(sumarDias(vac.desde, -12), 540, tz) },
    { id: 2, persona_id: P('camilo').id, tipo: 'permiso', desde: sumarDias(hoy, 3), hasta: sumarDias(hoy, 3), hora_desde: '08:00:00', hora_hasta: '10:00:00', motivo: 'Cita médica de control', estado: 'pendiente', revisado_por: null, revisado_en: null, comentario: null, creado: localAIso(sumarDias(hoy, -1), 900, tz) },
    { id: 3, persona_id: P('sofia').id, tipo: 'incapacidad', desde: sumarDias(hoy, -1), hasta: sumarDias(hoy, 1), hora_desde: null, hora_hasta: null, motivo: 'Gripa, 3 días de incapacidad', estado: 'pendiente', revisado_por: null, revisado_en: null, comentario: null, creado: localAIso(hoy, 470, tz) }
  );

  const imagenDemo = (texto, c1, c2) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><text x="60" y="720" font-family="Poppins, sans-serif" font-size="64" font-weight="700" fill="#fff">${texto}</text></svg>`);
  const ARCHIVOS = {}; // ruta → url
  DB.comunicados.push(
    { id: 1, autor_id: P('laura').id, titulo: 'Bienvenidos a la intranet de Caminos', cuerpo: 'Desde hoy marcamos la jornada, consultamos la malla y recibimos los comunicados aquí.\n\nCualquier duda, revisen la Guía de uso en el menú de su cuenta.', destino: 'todos', destino_id: null, requiere_confirmacion: true, fijado: true, creado: localAIso(sumarDias(hoy, -20), 480, tz) },
    { id: 2, autor_id: P('andrea').id, titulo: 'Salida grupal a Tierra Santa: briefing del viernes', cuerpo: 'El viernes a las 3:00 p. m. revisamos el itinerario del grupo de octubre. Traigan las confirmaciones de hoteles y la lista de pasajeros.', destino: 'area', destino_id: 1, requiere_confirmacion: true, fijado: false, creado: localAIso(sumarDias(hoy, -2), 620, tz) },
    { id: 3, autor_id: P('laura').id, titulo: 'Nuevas fotos del banco de imágenes', cuerpo: 'Subimos fotos nuevas de Fátima y Lourdes para usar en cotizaciones e itinerarios.', destino: 'todos', destino_id: null, requiere_confirmacion: false, fijado: false, creado: localAIso(sumarDias(hoy, -5), 700, tz) }
  );
  [['3/fatima.jpg', 'Fátima', '#F25061', '#F5B75F'], ['3/lourdes.jpg', 'Lourdes', '#3D5A99', '#F25061']].forEach(([ruta, n, a, b], i) => {
    ARCHIVOS[ruta] = imagenDemo(n, a, b);
    DB.comunicado_imagenes.push({ id: i + 1, comunicado_id: 3, ruta, nombre: n.toLowerCase() + '.jpg', orden: i });
  });
  ['andrea', 'camilo', 'julian'].forEach((u) => DB.comunicado_lecturas.push({ comunicado_id: 1, persona_id: P(u).id, leido_en: ahora() }));
  DB.comunicado_lecturas.push({ comunicado_id: 2, persona_id: P('valentina').id, leido_en: ahora() });

  // ---------- reglas mínimas de visibilidad (imitan RLS) ----------
  let sesion = null;
  try { const s = sessionStorage.getItem('sim-sesion'); if (s) sesion = JSON.parse(s); } catch (e) { /* sin almacenamiento */ }
  const yo = () => sesion && DB.perfiles.find((p) => p.id === sesion.user.id && p.activo);
  const esGer = (p) => p && (p.rol === 'gerente' || p.es_admin);
  const lidera = (p, sedeId) => p && (esGer(p) || (p.rol === 'directora' && p.sede_id === sedeId));
  const sedeDe = (pid) => (DB.perfiles.find((p) => p.id === pid) || {}).sede_id;
  const esDest = (c, p) => p && p.activo && p.id !== c.autor_id && (c.destino === 'todos' || (c.destino === 'area' && p.area_id === c.destino_id) || (c.destino === 'sede' && p.sede_id === c.destino_id));
  const revDe = (p) => p && DB.revisores.find((r) => r.persona_id === p.id);
  const veSol = (s, p) => s.persona_id === p.id || esGer(p) || (() => { const r = revDe(p); return r && s.persona_id !== p.id && r.tipos.includes(s.tipo) && (r.sede_id == null || r.sede_id === sedeDe(s.persona_id)); })();
  const VISIBLE = {
    marcas: (r, p) => r.persona_id === p.id || lidera(p, sedeDe(r.persona_id)),
    comunicados: (c, p) => c.autor_id === p.id || esGer(p) || p.rol === 'directora' || esDest(c, p),
    comunicado_lecturas: (l, p) => l.persona_id === p.id || esGer(p) || p.rol === 'directora',
    solicitudes: (s, p) => veSol(s, p),
    revisores: (r, p) => r.persona_id === p.id || esGer(p),
    herramientas: (h, p) => esGer(p) || (h.activo && (!h.areas_visibles || !h.areas_visibles.length || h.areas_visibles.includes(p.area_id)))
  };

  const err = (message, code) => ({ data: null, error: { message, code } });
  const copia = (x) => JSON.parse(JSON.stringify(x));
  const espera = () => new Promise((r) => setTimeout(r, 40));

  // ---------- consultas ----------
  class Consulta {
    constructor(tabla) { Object.assign(this, { t: tabla, op: 'select', f: [], ord: [], rng: null, lim: null, uno: null, datos: null, conflicto: null }); }
    select() { return this; } // las columnas se ignoran: siempre devuelve filas completas
    insert(d) { this.op = 'insert'; this.datos = d; return this; }
    update(d) { this.op = 'update'; this.datos = d; return this; }
    upsert(d, o) { this.op = 'upsert'; this.datos = d; this.conflicto = (o && o.onConflict) || 'id'; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(c, v) { this.f.push((r) => r[c] === v); return this; }
    in(c, a) { this.f.push((r) => a.includes(r[c])); return this; }
    gte(c, v) { this.f.push((r) => r[c] >= v); return this; }
    lte(c, v) { this.f.push((r) => r[c] <= v); return this; }
    order(c, o) { this.ord.push([c, !o || o.ascending !== false]); return this; }
    limit(n) { this.lim = n; return this; }
    range(a, b) { this.rng = [a, b]; return this; }
    single() { this.uno = 'single'; return this; }
    maybeSingle() { this.uno = 'maybe'; return this; }
    then(ok, mal) { return espera().then(() => this.ejecutar()).then(ok, mal); }
    ejecutar() {
      const p = yo();
      if (!p && this.t !== 'perfiles') return err('permission denied for table ' + this.t);
      const tabla = DB[this.t];
      if (!tabla) return err('relation does not exist');
      const pasa = (r) => this.f.every((fn) => fn(r));
      const visible = (r) => !VISIBLE[this.t] || !p || VISIBLE[this.t](r, p);
      let out;
      if (this.op === 'select') {
        out = tabla.filter((r) => pasa(r) && visible(r));
        if (this.ord.length) out.sort((a, b) => { for (const [c, asc] of this.ord) { if (a[c] < b[c]) return asc ? -1 : 1; if (a[c] > b[c]) return asc ? 1 : -1; } return 0; });
        if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1);
        if (this.lim != null) out = out.slice(0, this.lim);
      } else if (this.op === 'insert' || this.op === 'upsert') {
        const filas = (Array.isArray(this.datos) ? this.datos : [this.datos]).map((d) => Object.assign({}, d));
        const claves = this.conflicto ? this.conflicto.split(',') : null;
        out = [];
        for (const d of filas) {
          if (this.t === 'comunicados' && !(esGer(p) || p.rol === 'directora')) return err('new row violates row-level security policy for table "comunicados"');
          if (this.t === 'solicitudes' && !(DB.configuracion.find((c) => c.clave === 'modulo_solicitudes') || {}).valor.activo) return err('new row violates row-level security policy for table "solicitudes"');
          const previa = this.op === 'upsert' && tabla.find((r) => claves.every((k) => r[k] === d[k]));
          if (previa) {
            if (this.t === 'malla') DB.malla_historial.push({ id: nuevoId('malla_historial'), persona_id: d.persona_id, fecha: d.fecha, turno_antes: previa.turno_id, turno_despues: d.turno_id, cambiado_por: p.id, cambiado_en: ahora() });
            Object.assign(previa, d); out.push(previa); continue;
          }
          if (this.t === 'comunicado_lecturas' && tabla.some((r) => r.comunicado_id === d.comunicado_id && r.persona_id === d.persona_id)) return err('duplicate key value violates unique constraint', '23505');
          if (this.t === 'revisores' && tabla.some((r) => r.persona_id === d.persona_id)) return err('duplicate key value violates unique constraint', '23505');
          if (this.t === 'turnos' && tabla.some((r) => r.sede_id === d.sede_id && r.codigo === d.codigo)) return err('duplicate key value violates unique constraint "turnos_sede_id_codigo_key"', '23505');
          const def = {
            comunicados: { creado: ahora(), destino_id: null, fijado: false, requiere_confirmacion: true },
            solicitudes: { estado: 'pendiente', creado: ahora(), revisado_por: null, revisado_en: null, comentario: null, hora_desde: null, hora_hasta: null },
            comunicado_lecturas: { leido_en: ahora() },
            turnos: { activo: true, salida_almuerzo: null, regreso_almuerzo: null },
            revisores: { sede_id: null, tipos: ['vacaciones', 'permiso', 'incapacidad'], nivel: 'ver' }
          }[this.t] || {};
          const fila = Object.assign({}, def, d);
          if (!['malla', 'comunicado_lecturas', 'revisores', 'configuracion', 'perfiles'].includes(this.t) && fila.id == null) fila.id = nuevoId(this.t);
          if (this.t === 'malla') DB.malla_historial.push({ id: nuevoId('malla_historial'), persona_id: d.persona_id, fecha: d.fecha, turno_antes: null, turno_despues: d.turno_id, cambiado_por: p.id, cambiado_en: ahora() });
          tabla.push(fila); out.push(fila);
        }
      } else if (this.op === 'update') {
        if (this.t === 'turnos') {
          for (const r of tabla.filter(pasa)) {
            const n = Object.assign({}, r, this.datos);
            if ((n.entrada == null) !== (n.salida == null) || (n.salida_almuerzo == null) !== (n.regreso_almuerzo == null))
              return err('new row for relation "turnos" violates check constraint');
          }
        }
        out = tabla.filter(pasa); out.forEach((r) => Object.assign(r, this.datos));
      } else if (this.op === 'delete') {
        out = tabla.filter((r) => pasa(r) && visible(r));
        DB[this.t] = tabla.filter((r) => !out.includes(r));
        if (this.t === 'comunicados') { const ids = out.map((c) => c.id); DB.comunicado_imagenes = DB.comunicado_imagenes.filter((i) => !ids.includes(i.comunicado_id)); DB.comunicado_lecturas = DB.comunicado_lecturas.filter((l) => !ids.includes(l.comunicado_id)); }
        if (this.t === 'solicitudes') { const ids = out.map((s) => s.id); DB.solicitud_adjuntos = DB.solicitud_adjuntos.filter((a) => !ids.includes(a.solicitud_id)); }
      }
      if (this.uno === 'single') return out.length === 1 ? { data: copia(out[0]), error: null } : err('JSON object requested, multiple (or no) rows returned');
      if (this.uno === 'maybe') return { data: out[0] ? copia(out[0]) : null, error: null };
      return { data: copia(out), error: null };
    }
  }

  // ---------- RPC ----------
  const NOMBRE_PASO = { entrada: 'la entrada', salida_almuerzo: 'la salida a almuerzo', regreso_almuerzo: 'el regreso de almuerzo', salida: 'la salida' };
  const RPC = {
    es_admin: (p) => !!(p && p.es_admin),
    aceptar_datos: (p) => { if (!p.acepto_datos) p.acepto_datos = ahora(); return null; },
    marcar: (p, { p_tipo }) => {
      const s = DB.sedes.find((x) => x.id === p.sede_id), f = fechaEn(s.zona_horaria);
      const tiene = (t) => DB.marcas.some((m) => m.persona_id === p.id && m.fecha === f && m.tipo === t);
      const previa = { salida_almuerzo: 'entrada', regreso_almuerzo: 'salida_almuerzo', salida: 'entrada' }[p_tipo];
      if (previa && !tiene(previa)) throw new Error(`Primero marca ${NOMBRE_PASO[previa]}.`);
      if (tiene(p_tipo)) throw new Error(`Ya marcaste ${NOMBRE_PASO[p_tipo]} hoy.`);
      const r = { id: nuevoId('marcas'), persona_id: p.id, fecha: f, tipo: p_tipo, hora: ahora(), ip: '190.25.1.10', corregida_por: null };
      DB.marcas.push(r); return r;
    },
    revisar_solicitud: (p, { p_id, p_aprobar, p_comentario }) => {
      const s = DB.solicitudes.find((x) => x.id === p_id);
      if (!s) throw new Error('La solicitud no existe.');
      if (s.persona_id === p.id) throw new Error('No puedes revisar tus propias solicitudes.');
      if (s.estado !== 'pendiente') throw new Error('Esta solicitud ya fue revisada.');
      const r = revDe(p);
      if (!(esGer(p) || (r && r.nivel === 'aprobar' && r.tipos.includes(s.tipo) && (r.sede_id == null || r.sede_id === sedeDe(s.persona_id))))) throw new Error('No tienes permiso para aprobar esta solicitud.');
      Object.assign(s, { estado: p_aprobar ? 'aprobada' : 'rechazada', revisado_por: p.id, revisado_en: ahora(), comentario: (p_comentario || '').trim() || null });
      return s;
    },
    ausencias_aprobadas: (p, { p_desde, p_hasta }) => DB.solicitudes
      .filter((s) => s.estado === 'aprobada' && !s.hora_desde && s.desde <= p_hasta && s.hasta >= p_desde && (s.persona_id === p.id || lidera(p, sedeDe(s.persona_id))))
      .map((s) => ({ persona_id: s.persona_id, tipo: s.tipo, desde: s.desde, hasta: s.hasta, revisado_por: s.revisado_por }))
  };

  // ---------- Auth ----------
  const oyentes = [];
  const guardarSesion = () => { try { sesion ? sessionStorage.setItem('sim-sesion', JSON.stringify(sesion)) : sessionStorage.removeItem('sim-sesion'); } catch (e) { /* nada */ } };
  const avisar = (ev) => oyentes.forEach((fn) => { try { fn(ev, sesion); } catch (e) { console.error(e); } });
  const auth = {
    async getSession() { await espera(); return { data: { session: sesion }, error: null }; },
    async signInWithPassword({ email, password }) {
      await espera();
      const u = USUARIOS.find((x) => x.email === String(email).toLowerCase());
      if (!u || u.password !== password) return { data: {}, error: { message: 'Invalid login credentials' } };
      if (u.baneado) return { data: {}, error: { message: 'User is banned' } };
      sesion = { access_token: 'simulado', user: { id: u.id, email: u.email, user_metadata: copia(u.user_metadata) } };
      guardarSesion(); avisar('SIGNED_IN');
      return { data: { session: sesion, user: sesion.user }, error: null };
    },
    async signOut() { await espera(); sesion = null; guardarSesion(); avisar('SIGNED_OUT'); return { error: null }; },
    async updateUser({ password, data }) {
      await espera();
      const u = sesion && USUARIOS.find((x) => x.id === sesion.user.id);
      if (!u) return { data: {}, error: { message: 'Auth session missing!' } };
      if (password) { if (password === u.password) return { data: {}, error: { message: 'New password should be different from the old password.' } }; u.password = password; }
      if (data) Object.assign(u.user_metadata, data);
      sesion.user.user_metadata = copia(u.user_metadata); guardarSesion();
      return { data: { user: copia(sesion.user) }, error: null };
    },
    onAuthStateChange(fn) { oyentes.push(fn); return { data: { subscription: { unsubscribe() { oyentes.splice(oyentes.indexOf(fn), 1); } } } }; }
  };

  // ---------- Storage ----------
  const storage = {
    from(bucket) {
      return {
        async upload(ruta, archivo) {
          await espera();
          if (archivo.size > 10 * 1024 * 1024) return err('The object exceeded the maximum allowed size');
          ARCHIVOS[ruta] = URL.createObjectURL(archivo); return { data: { path: ruta }, error: null };
        },
        async createSignedUrls(rutas) { await espera(); return { data: rutas.map((r) => ({ path: r, signedUrl: ARCHIVOS[r] || null, error: ARCHIVOS[r] ? null : 'Object not found' })), error: null }; },
        async remove(rutas) { await espera(); rutas.forEach((r) => delete ARCHIVOS[r]); return { data: rutas.map((name) => ({ name, bucket_id: bucket })), error: null }; }
      };
    }
  };

  // ---------- Functions ----------
  const fallaFn = (msg, status) => ({ data: null, error: { message: 'Edge Function returned a non-2xx status code', context: { status, json: async () => ({ error: msg }) } } });
  const functions = {
    async invoke(nombre, { body }) {
      await espera();
      const p = yo();
      if (nombre !== 'crear-usuario') return fallaFn('Función no encontrada.', 404);
      if (!p || !p.es_admin) return fallaFn('Solo la administración puede gestionar cuentas.', 403);
      if ((body.accion === 'crear' || body.accion === 'restablecer') && String(body.contrasena || '').length < 8) return fallaFn('La contraseña debe tener al menos 8 caracteres.', 400);
      if (body.accion === 'crear') {
        const correo = String(body.correo).trim().toLowerCase();
        if (USUARIOS.some((u) => u.email === correo)) return fallaFn('Ya existe una cuenta con ese correo.', 400);
        const id = uuid();
        USUARIOS.push({ id, email: correo, password: body.contrasena, user_metadata: { debe_cambiar_contrasena: true } });
        DB.perfiles.push({ id, nombre: body.nombre, correo, area_id: body.area_id, sede_id: body.sede_id, rol: body.rol, es_admin: false, activo: true, acepto_datos: null, creado: ahora() });
        return { data: { ok: true, id }, error: null };
      }
      const u = USUARIOS.find((x) => x.id === body.id), perfil = DB.perfiles.find((x) => x.id === body.id);
      if (!u) return fallaFn('La cuenta no existe.', 400);
      if (body.accion === 'restablecer') { u.password = body.contrasena; u.user_metadata.debe_cambiar_contrasena = true; return { data: { ok: true }, error: null }; }
      if (body.accion === 'desactivar' || body.accion === 'reactivar') { u.baneado = body.accion === 'desactivar'; perfil.activo = !u.baneado; return { data: { ok: true }, error: null }; }
      return fallaFn('Acción desconocida.', 400);
    }
  };

  window.supabase = {
    createClient() {
      return {
        auth, storage, functions,
        from: (t) => new Consulta(t),
        rpc(nombre, args) {
          return { then(ok, mal) {
            return espera().then(() => {
              const p = yo();
              if (!p) return err('permission denied for function ' + nombre);
              try { return { data: copia(RPC[nombre](p, args || {}) ?? null), error: null }; } catch (e) { return err(e.message, 'P0001'); }
            }).then(ok, mal);
          } };
        }
      };
    }
  };
  window.SIMULADOR = { DB, USUARIOS, CLAVE };
})();
