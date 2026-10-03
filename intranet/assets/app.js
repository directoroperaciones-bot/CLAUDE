/* Intranet Caminos · aplicación de una sola página, sin frameworks ni compilación.
   Cada pantalla es una función que devuelve HTML; render() reemplaza #app.
   Los permisos de esta página solo muestran u ocultan botones: la decisión real la toma la base (RLS). */
(function () {
  'use strict';

  const CFG = window.INTRANET_CONFIG || {};
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);

  // ---------------------------------------------------------------------------
  // Datos de la empresa (personalización por cliente, manual §8.7)
  // ---------------------------------------------------------------------------
  const EMPRESA = {
    nombre: 'Caminos',
    intranet: 'Intranet Caminos',
    razonSocial: 'Caminos Agencia de Viajes',          // POR CONFIRMAR: razón social exacta
    nit: 'NIT por confirmar',                           // POR CONFIRMAR
    lema: 'Viajes con propósito',                       // POR CONFIRMAR
    registro: 'RNT por confirmar',                      // POR CONFIRMAR
    web: 'www.agenciacaminos.com.co',
    correoEjemplo: 'nombre@agenciacaminos.com.co',
    logo: 'assets/logo-caminos.svg',
    estrella: 'assets/estrella-caminos.svg',
    ley: 'la Ley 1581 de 2012 y el Decreto 1377 de 2013',
    etiquetaDirectora: 'Directora de operaciones'
  };

  // ---------------------------------------------------------------------------
  // Íconos (trazos estilo Lucide, 2 px)
  // ---------------------------------------------------------------------------
  const IC = {
    in: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    lunch: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    back: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
    chev: '<path d="m9 18 6-6-6-6"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    compass: '<path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/><circle cx="12" cy="12" r="10"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    mega: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'
  };
  const ico = (k, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || IC.file}</svg>`;

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (n) => String(n || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const fmtCache = {};
  const fmt = (tz, opts) => {
    const k = tz + JSON.stringify(opts);
    return fmtCache[k] || (fmtCache[k] = new Intl.DateTimeFormat('en-CA', Object.assign({ timeZone: tz }, opts)));
  };
  const fechaEn = (tz, d = new Date()) => fmt(tz, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const horaEn = (tz, d = new Date()) => fmt(tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  const segEn = (tz, d = new Date()) => fmt(tz, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(d);
  const toMin = (t) => { if (!t) return null; const [h, m] = String(t).split(':'); return (+h) * 60 + (+m); };
  const minEn = (iso, tz) => toMin(horaEn(tz, new Date(iso)));
  const ahoraMin = (tz) => toMin(horaEn(tz));
  const hhmm = (min) => min == null ? '' : String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
  const hc = (t) => t ? String(t).slice(0, 5) : '';
  const sumarDias = (f, n) => { const d = new Date(f + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const diaSemana = (f) => new Date(f + 'T00:00:00Z').getUTCDay();
  const lunesDe = (f) => sumarDias(f, -((diaSemana(f) + 6) % 7));
  const fechaLarga = (f) => new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(f + 'T12:00:00Z'));
  const fechaCorta = (f) => { const [, m, d] = f.split('-'); return `${+d} ${MESES[+m - 1].slice(0, 3)}`; };
  const fechaHora = (iso, tz) => { const f = fechaEn(tz, new Date(iso)); return `${fechaCorta(f)} · ${horaEn(tz, new Date(iso))}`; };
  const finDeMes = (mes) => { const [a, m] = mes.split('-').map(Number); return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10); };
  const nombreMes = (mes) => { const [a, m] = mes.split('-'); return `${MESES[+m - 1][0].toUpperCase()}${MESES[+m - 1].slice(1)} ${a}`; };
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const resaltar = (texto, q) => {
    const t = String(texto ?? '');
    if (!q) return esc(t);
    const nt = norm(t), nq = norm(q);
    let out = '', i = 0, j;
    while (nq && (j = nt.indexOf(nq, i)) !== -1) { out += esc(t.slice(i, j)) + '<mark>' + esc(t.slice(j, j + nq.length)) + '</mark>'; i = j + nq.length; }
    return out + esc(t.slice(i));
  };

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const S = {
    pantalla: 'cargando', error: '', aviso: '', usuario: null, perfil: null, correoLogin: '',
    sedes: [], areas: [], turnos: [], herramientas: [], personas: [], config: {},
    view: 'inicio', menu: false, ocupado: false,
    hoy: { fecha: null, malla: [], marcas: {}, semana: [], lunes: null, ausencia: null, misSol: [] },
    malla: { lunes: null, sede: 'todas', filas: [] },
    turnoSede: null,
    asistencia: { malla: [], marcas: [], ausencias: [], sede: 'todas' },
    equipo: { claveNueva: null, filtro: '' },
    inf: { mes: null, sede: 'todas', area: 'todas', orden: { col: 'tardes', dir: -1 }, sel: null, datos: null },
    com: { lista: [], imgs: [], lect: [], urls: {}, filtro: 'todos', q: '', borrador: { files: [] }, hl: null, cargado: false },
    lb: null,
    sol: { lista: [], adj: [], urls: {}, revisores: [], tipo: 'vacaciones', borrador: { files: [] }, pendientes: [] }
  };

  // ---------------------------------------------------------------------------
  // Permisos de interfaz (solo para mostrar u ocultar; la base decide)
  // ---------------------------------------------------------------------------
  const P = () => S.perfil || {};
  const esAdmin = () => !!P().es_admin;
  const esGerencia = () => P().rol === 'gerente' || esAdmin();
  const esLider = () => esGerencia() || P().rol === 'directora';
  const lideraSede = (id) => esGerencia() || (P().rol === 'directora' && P().sede_id === id);
  const puedePublicar = () => esLider();
  const moduloSol = () => !!(S.config.modulo_solicitudes && S.config.modulo_solicitudes.activo);
  const tol = () => Object.assign({ entrada_min: 5, almuerzo_min: 5 }, S.config.tolerancias || {});
  const meta = () => (S.config.meta_puntualidad && S.config.meta_puntualidad.porcentaje) || 95;
  const sede = (id) => S.sedes.find((s) => s.id === id) || { nombre: '—', zona_horaria: 'America/Bogota' };
  const area = (id) => S.areas.find((a) => a.id === id) || { nombre: 'Sin área' };
  const persona = (id) => S.personas.find((p) => p.id === id) || { nombre: 'Persona', correo: '', sede_id: null };
  const activos = () => S.personas.filter((p) => p.activo);
  const tzDe = (p) => sede(p.sede_id).zona_horaria;
  const miTz = () => tzDe(P());
  const turno = (id) => S.turnos.find((t) => t.id === id) || null;
  const turnosDe = (sedeId) => S.turnos.filter((t) => t.sede_id === sedeId).sort((a, b) => a.codigo.localeCompare(b.codigo));
  const claseTurno = (t) => !t ? 't-none' : (['M', 'T', 'S', 'D', 'V'].includes(t.codigo) ? 't-' + t.codigo : 't-X');
  const horario = (t) => t && t.entrada ? `${hc(t.entrada)} – ${hc(t.salida)}` : (t ? 'Sin horario' : 'Sin turno');
  const sedesQueLidero = () => S.sedes.filter((s) => lideraSede(s.id));
  const nombreRol = (p) => p.rol === 'gerente' ? 'Gerencia' : p.rol === 'directora' ? EMPRESA.etiquetaDirectora : 'Colaborador';
  const miAcceso = () => S.sol.revisores.find((r) => r.persona_id === P().id) || null;
  const TIPOS = {
    vacaciones: { nombre: 'Vacaciones', ayuda: 'Días de descanso', icono: 'sun', ausencia: 'Vacaciones' },
    permiso: { nombre: 'Permiso', ayuda: 'Un día, unas horas o una cita', icono: 'clock', ausencia: 'Ausencia con permiso' },
    incapacidad: { nombre: 'Incapacidad', ayuda: 'Sube la foto de la incapacidad', icono: 'heart', ausencia: 'Incapacidad' }
  };
  const TODOS_TIPOS = Object.keys(TIPOS);
  const puedeVerSol = (s) => {
    if (s.persona_id === P().id || esGerencia()) return true;
    const r = miAcceso();
    return !!r && r.tipos.includes(s.tipo) && (r.sede_id == null || r.sede_id === persona(s.persona_id).sede_id);
  };
  const puedeAprobar = (s) => {
    if (s.persona_id === P().id || s.estado !== 'pendiente') return false;
    if (esGerencia()) return true;
    const r = miAcceso();
    return !!r && r.nivel === 'aprobar' && r.tipos.includes(s.tipo) && (r.sede_id == null || r.sede_id === persona(s.persona_id).sede_id);
  };
  const pasosDe = (t) => {
    const todos = [
      { tipo: 'entrada', cod: 'ENT', paso: 'Entrada', boton: 'Marcar entrada', icono: 'in', prog: t && t.entrada },
      { tipo: 'salida_almuerzo', cod: 'ALM', paso: 'Salida a almuerzo', boton: 'Salir a almorzar', icono: 'lunch', prog: t && t.salida_almuerzo },
      { tipo: 'regreso_almuerzo', cod: 'REG', paso: 'Regreso de almuerzo', boton: 'Marcar regreso', icono: 'back', prog: t && t.regreso_almuerzo },
      { tipo: 'salida', cod: 'SAL', paso: 'Salida', boton: 'Marcar salida', icono: 'out', prog: t && t.salida }
    ];
    return t && t.entrada && !t.salida_almuerzo ? todos.filter((p) => p.tipo === 'entrada' || p.tipo === 'salida') : todos;
  };

  // ---------------------------------------------------------------------------
  // Datos
  // ---------------------------------------------------------------------------
  async function q(promesa) {
    const { data, error } = await promesa;
    if (error) throw error;
    return data;
  }
  // La API devuelve máximo 1.000 filas por consulta: se pide por tramos.
  async function todas(armar) {
    const out = [];
    for (let i = 0; ; i += 1000) {
      const parte = await q(armar().range(i, i + 999));
      out.push(...(parte || []));
      if (!parte || parte.length < 1000) return out;
    }
  }
  function errorTexto(e) {
    const m = String((e && (e.message || e.error_description || e.error)) || e || '');
    if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
    if (/banned/i.test(m)) return 'Tu cuenta está desactivada. Habla con la administración.';
    if (/failed to fetch|networkerror|load failed|network/i.test(m)) return 'No hay conexión. Revisa tu internet e intenta de nuevo.';
    if (/row-level security|permission denied/i.test(m)) return 'No tienes permiso para hacer esto.';
    if (/should be different|same.*password/i.test(m)) return 'La contraseña nueva debe ser distinta de la anterior.';
    if (/password should be at least/i.test(m)) return 'La contraseña debe tener al menos 8 caracteres.';
    if (/jwt|session/i.test(m) && /expired|missing|invalid/i.test(m)) return 'Tu sesión venció. Vuelve a entrar.';
    return m || 'Ocurrió un error inesperado.';
  }

  // ---------------------------------------------------------------------------
  // Avisos (toast)
  // ---------------------------------------------------------------------------
  let toastTimer = null;
  function toast(txt, tipo) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.textContent = txt;
    el.className = 'toast show' + (tipo === 'error' ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
  }
  const fallo = (e) => { console.error(e); toast(errorTexto(e), 'error'); };

  // ---------------------------------------------------------------------------
  // Arranque y sesión
  // ---------------------------------------------------------------------------
  async function arrancar() {
    try {
      const { data } = await sb.auth.getSession();
      const ses = data && data.session;
      if (!ses) { S.pantalla = 'login'; return render(); }
      S.usuario = ses.user;
      const perfil = await q(sb.from('perfiles').select('*').eq('id', ses.user.id).maybeSingle());
      if (!perfil || !perfil.activo) { S.pantalla = 'sinperfil'; return render(); }
      S.perfil = perfil;
      await siguientePaso();
    } catch (e) {
      S.pantalla = 'login'; S.error = errorTexto(e); render();
    }
  }
  async function siguientePaso() {
    const meta = (S.usuario && S.usuario.user_metadata) || {};
    if (meta.debe_cambiar_contrasena) { S.pantalla = 'clave'; return render(); }
    if (!S.perfil.acepto_datos) { S.pantalla = 'datos'; return render(); }
    await entrarApp();
  }
  async function entrarApp() {
    const [sedes, areas, turnos, herramientas, config, personas] = await Promise.all([
      q(sb.from('sedes').select('*').order('id')),
      q(sb.from('areas').select('*').order('nombre')),
      q(sb.from('turnos').select('*').order('codigo')),
      q(sb.from('herramientas').select('*').order('orden')),
      q(sb.from('configuracion').select('*')),
      q(sb.from('perfiles').select('*').order('nombre'))
    ]);
    Object.assign(S, { sedes, areas, turnos, herramientas, personas });
    S.config = Object.fromEntries(config.map((c) => [c.clave, c.valor]));
    S.turnoSede = (sedesQueLidero()[0] || {}).id || P().sede_id;
    S.pantalla = 'app';
    await ir(S.view || 'inicio');
  }
  async function recargarPersonas() {
    S.personas = await q(sb.from('perfiles').select('*').order('nombre'));
    const yo = S.personas.find((p) => p.id === P().id);
    if (yo) S.perfil = yo;
  }
  async function salir() {
    await sb.auth.signOut();
    reiniciar();
  }
  function reiniciar() {
    const correo = S.perfil ? S.perfil.correo : S.correoLogin;
    Object.assign(S, { pantalla: 'login', usuario: null, perfil: null, view: 'inicio', menu: false, error: '', lb: null, correoLogin: correo });
    S.com.cargado = false;
    render();
  }

  // ---------------------------------------------------------------------------
  // Pantallas de acceso
  // ---------------------------------------------------------------------------
  function marcoAcceso(contenido, o) {
    return `<div class="login">
      <section class="login-hero">
        <img class="login-logo" src="${EMPRESA.logo}" alt="${esc(EMPRESA.nombre)}">
        <img class="login-estrella" src="${EMPRESA.estrella}" alt="" aria-hidden="true">
        <div class="eyebrow">${esc(o.antetitulo || EMPRESA.intranet)}</div>
        <h1>${o.titular}</h1>
        <span class="dash"></span>
        <p>${esc(o.frase)}</p>
      </section>
      <section class="login-side"><div class="card login-card">${contenido}</div></section>
    </div>`;
  }
  function loginView() {
    return marcoAcceso(`
      <h2>Entrar</h2>
      <p class="hint">Usa tu correo corporativo y tu contraseña.</p>
      <form id="fLogin" novalidate>
        <div class="field"><label for="lCorreo">Correo corporativo</label>
          <input id="lCorreo" type="email" autocomplete="username" required placeholder="${esc(EMPRESA.correoEjemplo)}" value="${esc(S.correoLogin)}"></div>
        <div class="field"><label for="lClave">Contraseña</label>
          <input id="lClave" type="password" autocomplete="current-password" required></div>
        ${S.error ? `<p class="err" role="alert">${ico('alert')}${esc(S.error)}</p>` : ''}
        <button class="btn full" type="submit" ${S.ocupado ? 'disabled' : ''}>${S.ocupado ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <p class="hint">¿Olvidaste tu contraseña? Pídele a la administración que la restablezca.</p>`,
    { antetitulo: EMPRESA.intranet, titular: 'Todo el equipo, <em>en un solo camino</em>', frase: 'Marca tu jornada, revisa la malla, lee los comunicados y abre las herramientas de la agencia.' });
  }
  function formClave(primer) {
    return `<form id="fClave" novalidate>
      <div class="field"><label for="c1">Contraseña nueva</label><input id="c1" type="password" autocomplete="new-password" minlength="8" required></div>
      <div class="field"><label for="c2">Repítela</label><input id="c2" type="password" autocomplete="new-password" minlength="8" required></div>
      <p class="hint">Mínimo 8 caracteres. No la compartas con nadie.</p>
      ${S.error ? `<p class="err" role="alert">${ico('alert')}${esc(S.error)}</p>` : ''}
      <div class="acts">
        <button class="btn" type="submit" ${S.ocupado ? 'disabled' : ''}>${S.ocupado ? 'Guardando…' : 'Guardar contraseña'}</button>
        ${primer ? '<button class="btn ghost" type="button" data-accion="salir">Salir</button>' : '<button class="btn ghost" type="button" data-view="inicio">Cancelar</button>'}
      </div>
    </form>`;
  }
  function claveView() {
    return marcoAcceso(`<h2>Crea tu contraseña</h2><p class="hint">Es tu primer ingreso: reemplaza la contraseña temporal por una propia.</p>${formClave(true)}`,
      { antetitulo: 'Primer ingreso', titular: `Hola, <em>${esc((P().nombre || '').split(' ')[0])}</em>`, frase: 'Antes de empezar, crea una contraseña que solo tú conozcas.' });
  }
  function datosView() {
    return marcoAcceso(`
      <h2>Tratamiento de datos personales</h2>
      <div class="legal">
        <p>En cumplimiento de ${esc(EMPRESA.ley)}, autorizo a <b>${esc(EMPRESA.razonSocial)}</b> (${esc(EMPRESA.nit)}) para recolectar, almacenar y usar mis datos personales —nombre, correo corporativo, sede, área, horarios, registros de entrada y salida, dirección IP de las marcas, solicitudes de ausencia y sus soportes— con el fin de gestionar la jornada laboral, la comunicación interna y los procesos de talento humano.</p>
        <p>Los datos se guardan con acceso restringido según el cargo y no se comparten con terceros, salvo obligación legal. Puedo conocer, actualizar, rectificar y solicitar la supresión de mis datos, o revocar esta autorización, escribiendo a la administración de ${esc(EMPRESA.nombre)}.</p>
        <p class="hint">Texto POR CONFIRMAR con el área legal de ${esc(EMPRESA.nombre)}.</p>
      </div>
      <div class="acts"><button class="btn" data-accion="aceptarDatos" ${S.ocupado ? 'disabled' : ''}>${ico('check')}Acepto</button><button class="btn ghost" data-accion="salir">Salir</button></div>`,
    { antetitulo: 'Un paso más', titular: 'Tus datos, <em>bien cuidados</em>', frase: 'Necesitamos tu autorización para registrar tu jornada y tus solicitudes.' });
  }
  function sinPerfilView() {
    return marcoAcceso(`<h2>Tu cuenta no está lista</h2>
      <p>Tu usuario existe, pero todavía no tiene un perfil activo en la intranet. Pídele a la administración que lo revise.</p>
      <div class="acts"><button class="btn ghost" data-accion="salir">Salir</button></div>`,
    { antetitulo: EMPRESA.intranet, titular: 'Casi <em>listo</em>', frase: 'La administración debe terminar de configurar tu cuenta.' });
  }

  // ---------------------------------------------------------------------------
  // Marco de la aplicación
  // ---------------------------------------------------------------------------
  function sinConfirmar() {
    return S.com.lista.filter((c) => c.requiere_confirmacion && esDestinatario(c, P()) && !S.com.lect.some((l) => l.comunicado_id === c.id && l.persona_id === P().id));
  }
  const porAprobar = () => S.sol.pendientes.filter(puedeAprobar);
  function pestañas() {
    const t = [
      { v: 'inicio', n: 'Inicio' },
      { v: 'malla', n: 'Malla' },
      { v: 'comunicados', n: 'Comunicados', b: sinConfirmar().length },
      esLider() && { v: 'asistencia', n: 'Asistencia' },
      esLider() && { v: 'informes', n: 'Informes' },
      (moduloSol() || esGerencia()) && { v: 'solicitudes', n: 'Solicitudes', b: moduloSol() ? porAprobar().length : 0 },
      esAdmin() && { v: 'equipo', n: 'Equipo' }
    ];
    return t.filter(Boolean);
  }
  function appView() {
    const p = P();
    const tabs = pestañas().map((t) => `<button data-view="${t.v}" ${S.view === t.v ? 'aria-current="page"' : ''}>${t.n}${t.b ? `<span class="badge" aria-label="${t.b} pendientes">${t.b}</span>` : ''}</button>`).join('');
    const cuerpo = {
      inicio: inicioView, malla: mallaView, comunicados: comunicadosView, asistencia: asistenciaView,
      informes: informesView, solicitudes: solicitudesView, equipo: equipoView, guia: guiaView, clave: claveAppView
    }[S.view] || inicioView;
    return `<header class="top"><div class="wrap top-in">
        <button class="brand" data-view="inicio" aria-label="Inicio"><img src="${EMPRESA.logo}" alt="${esc(EMPRESA.nombre)}"><span>Intranet</span></button>
        <nav class="tabs" aria-label="Secciones">${tabs}</nav>
        <div class="menu">
          <button class="avatar" data-accion="menu" aria-haspopup="true" aria-expanded="${S.menu}" title="${esc(p.nombre)}">${esc(initials(p.nombre))}</button>
          ${S.menu ? `<div class="menu-pop" role="menu">
            <div class="menu-yo"><b>${esc(p.nombre)}</b><span>${esc(nombreRol(p))}${p.es_admin ? ' · Administración' : ''}</span><span>${esc(sede(p.sede_id).nombre)} · ${esc(area(p.area_id).nombre)}</span></div>
            <button role="menuitem" data-view="guia">${ico('book')}Guía de uso</button>
            <button role="menuitem" data-view="clave">${ico('key')}Cambiar contraseña</button>
            <button role="menuitem" data-accion="salir">${ico('out')}Cerrar sesión</button>
          </div>` : ''}
        </div>
      </div></header>
      <main class="wrap" id="principal">${cuerpo()}</main>
      <footer class="foot-site"><div class="wrap"><span><b>${esc(EMPRESA.nombre)}</b> · ${esc(EMPRESA.lema)}</span><span>${esc(EMPRESA.registro)} · ${esc(EMPRESA.web)}</span></div></footer>
      ${S.lb ? lightboxView() : ''}`;
  }
  function vista() {
    switch (S.pantalla) {
      case 'login': return loginView();
      case 'sinperfil': return sinPerfilView();
      case 'clave': return claveView();
      case 'datos': return datosView();
      case 'app': return appView();
      default: return '<div class="cargando">Cargando la intranet…</div>';
    }
  }
  function render() {
    document.getElementById('app').innerHTML = vista();
    tickReloj();
  }
  function encabezado(eyebrow, titulo, texto, extra) {
    return `<div class="page-h"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${titulo}</h1>${texto ? `<p class="lead">${texto}</p>` : ''}</div>${extra || ''}</div>`;
  }
  function claveAppView() {
    return `${encabezado('Tu cuenta', 'Cambiar <em>contraseña</em>', 'Usa una contraseña que no uses en otros sitios.')}
      <div class="card narrow">${formClave(false)}</div>`;
  }

  // ---------------------------------------------------------------------------
  // Inicio y pase de jornada
  // ---------------------------------------------------------------------------
  async function cargarInicio() {
    const p = P(), tz = miTz();
    const hoy = fechaEn(tz), lunes = lunesDe(hoy);
    const [malla, marcas, aus] = await Promise.all([
      q(sb.from('malla').select('*').eq('persona_id', p.id).gte('fecha', lunes).lte('fecha', sumarDias(lunes, 6))),
      q(sb.from('marcas').select('*').eq('persona_id', p.id).eq('fecha', hoy)),
      q(sb.rpc('ausencias_aprobadas', { p_desde: hoy, p_hasta: hoy })),
      cargarComunicados(),
      cargarPendientes()
    ]);
    const misSol = moduloSol() ? await q(sb.from('solicitudes').select('*').eq('persona_id', p.id).order('creado', { ascending: false }).limit(3)) : [];
    const fila = malla.find((m) => m.fecha === hoy);
    S.hoy = {
      fecha: hoy, lunes, malla,
      turno: fila ? turno(fila.turno_id) : null,
      marcas: Object.fromEntries(marcas.map((m) => [m.tipo, m])),
      semana: DIAS.map((d, i) => { const f = sumarDias(lunes, i); const m = malla.find((x) => x.fecha === f); return { dia: d, fecha: f, turno: m ? turno(m.turno_id) : null }; }),
      ausencia: (aus || []).find((a) => a.persona_id === p.id) || null,
      misSol
    };
  }
  // Solicitudes pendientes visibles (para la insignia de la pestaña).
  async function cargarPendientes() {
    if (!moduloSol()) { S.sol.pendientes = []; return; }
    const [pend, rev] = await Promise.all([
      q(sb.from('solicitudes').select('*').eq('estado', 'pendiente')),
      q(sb.from('revisores').select('*'))
    ]);
    S.sol.pendientes = pend; S.sol.revisores = rev;
  }
  function saludo(tz) {
    const h = Math.floor(ahoraMin(tz) / 60);
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  }
  function inicioView() {
    const p = P(), tz = miTz(), pend = sinConfirmar().length;
    return `<section class="hello">
        <div><div class="eyebrow">${esc(fechaLarga(S.hoy.fecha || fechaEn(tz)))}</div>
          <h1>${saludo(tz)}, <em>${esc(p.nombre.split(' ')[0])}</em></h1>
          <p class="lead">${esc(area(p.area_id).nombre)} · ${esc(sede(p.sede_id).nombre)}</p></div>
        <button class="btn ghost sm" data-view="guia">${ico('book')}¿Dudas? Guía de uso</button>
      </section>
      ${pend ? `<div class="alerta" role="status">${ico('mega')}<span>Tienes <b>${plural(pend, 'comunicado', 'comunicados')}</b> por confirmar.</span><button class="btn sm" data-accion="verPendientes">Ver comunicados</button></div>` : ''}
      <div class="grid-home">
        <div class="col">
          ${paseView()}
          ${herramientasView()}
        </div>
        <div class="col">
          ${ultimosComunicados()}
          ${moduloSol() ? misSolicitudesInicio() : ''}
          ${semanaView()}
        </div>
      </div>`;
  }
  // Evaluación de una marca contra el turno (manual §5.3). Devuelve {txt, cls} o null.
  function evaluar(tipo, t, marcas, tz) {
    const m = marcas[tipo];
    if (!m || !t || !t.entrada) return null;
    const real = minEn(m.hora, tz), T = tol();
    if (tipo === 'entrada') {
      const d = real - toMin(t.entrada);
      return d > T.entrada_min ? { txt: `Tarde ${d} min`, cls: 'bad', alerta: true, min: d } : { txt: 'A tiempo', cls: 'ok' };
    }
    if (tipo === 'regreso_almuerzo' && marcas.salida_almuerzo && t.salida_almuerzo) {
      const dur = real - minEn(marcas.salida_almuerzo.hora, tz);
      const perm = toMin(t.regreso_almuerzo) - toMin(t.salida_almuerzo);
      return dur > perm + T.almuerzo_min ? { txt: `Almuerzo ${dur} min`, cls: 'warn', alerta: true, min: dur } : { txt: `Almuerzo ${dur} min`, cls: 'ok', min: dur };
    }
    if (tipo === 'salida') {
      const d = real - toMin(t.salida);
      if (d < 0) return { txt: `Salió ${-d} min antes`, cls: 'warn', alerta: true, min: -d };
      if (d >= 30) return { txt: `${d} min extra`, cls: 'info', extra: d };
      return { txt: 'A tiempo', cls: 'ok' };
    }
    return null;
  }
  function paseView() {
    const p = P(), tz = miTz(), t = S.hoy.turno, marcas = S.hoy.marcas, aus = S.hoy.ausencia;
    const stub = `<div class="stub">
        <div class="eyebrow">Pase de jornada</div>
        <b class="stub-nombre">${esc(p.nombre)}</b>
        <span class="chip ${claseTurno(t)}">${t ? esc(t.codigo + ' · ' + t.nombre) : 'Sin turno'}</span>
        <dl><div><dt>Horario</dt><dd>${esc(horario(t))}</dd></div><div><dt>Sede</dt><dd>${esc(sede(p.sede_id).nombre)}</dd></div><div><dt>Fecha</dt><dd>${esc(fechaCorta(S.hoy.fecha || fechaEn(tz)))}</dd></div></dl>
        <div class="clock" id="clock" aria-label="Hora actual">${segEn(tz)}</div>
      </div>`;
    let cuerpo;
    if (aus) {
      const rev = aus.revisado_por ? persona(aus.revisado_por).nombre : 'la gerencia';
      cuerpo = `<div class="away">${ico('sun')}<div><b>Hoy no tienes que marcar</b><p>${esc(TIPOS[aus.tipo].ausencia)} del ${esc(fechaCorta(aus.desde))} al ${esc(fechaCorta(aus.hasta))}. Aprobó: ${esc(rev)}.</p></div></div>`;
    } else if (t && !t.entrada) {
      cuerpo = `<div class="away">${ico('moon')}<div><b>Hoy no tienes jornada programada</b><p>Tu turno de hoy es ${esc(t.nombre)}.</p></div></div>`;
    } else {
      const pasos = pasosDe(t);
      const siguiente = pasos.find((x) => !marcas[x.tipo]);
      const legs = pasos.map((x) => {
        const m = marcas[x.tipo], ev = evaluar(x.tipo, t, marcas, tz);
        const cls = m ? 'done' : (siguiente && siguiente.tipo === x.tipo ? 'next' : '');
        return `<li class="leg ${cls}"><span class="dot">${m ? ico('check') : esc(x.cod)}</span>
          <div class="leg-txt"><b>${esc(x.paso)}</b><span>${x.prog ? 'Programada ' + hc(x.prog) : 'Sin hora programada'}</span></div>
          <div class="leg-real">${m ? `<b>${horaEn(tz, new Date(m.hora))}</b>` : '<span class="mute">—</span>'}${ev ? `<span class="chip ${ev.cls}">${esc(ev.txt)}</span>` : ''}</div></li>`;
      }).join('');
      const validar = S.config.validar_ip && S.config.validar_ip.activo;
      cuerpo = `${!t ? `<div class="notice">${ico('alert')}<span>Tu turno de hoy todavía no está en la malla. Puedes marcar igual.</span></div>` : ''}
        <ol class="legs">${legs}</ol>
        ${siguiente ? `<button class="mark-btn" data-marcar="${siguiente.tipo}" ${S.ocupado ? 'disabled' : ''}>${ico(siguiente.icono)}${esc(siguiente.boton)}</button>`
          : `<div class="mark-done">${ico('check')}Jornada completa</div>`}
        <p class="where">${ico(validar ? 'pin' : 'shield')}${validar ? 'Solo desde la oficina ' + esc(sede(p.sede_id).nombre) : 'La hora la pone el servidor'}</p>`;
    }
    return `<section class="card pass">${stub}<div class="pass-main">${cuerpo}</div></section>`;
  }
  function herramientasView() {
    const mias = S.herramientas.filter((h) => h.activo && (!h.areas_visibles || !h.areas_visibles.length || h.areas_visibles.includes(P().area_id)));
    if (!mias.length) return '';
    return `<section><div class="sec-h"><h2>Herramientas</h2></div>
      <div class="tools">${mias.map((h) => `<a class="card tool" href="${esc(h.url)}" target="_blank" rel="noopener">
        <span class="sq">${ico(h.icono)}</span><b>${esc(h.nombre)}</b><p>${esc(h.descripcion || '')}</p>
        <span class="tool-pie">${esc(h.pie || 'Abrir')}${ico('chev')}</span></a>`).join('')}</div></section>`;
  }
  function ultimosComunicados() {
    const pend = new Set(sinConfirmar().map((c) => c.id));
    const lista = [...S.com.lista].sort((a, b) => (pend.has(b.id) - pend.has(a.id)) || (b.fijado - a.fijado) || b.creado.localeCompare(a.creado)).slice(0, 3);
    return `<section class="card side-card"><div class="sec-h"><h2>Comunicados</h2><button class="btn ghost sm" data-view="comunicados">Ver todos</button></div>
      ${lista.length ? lista.map((c) => `<button class="mini-note ${pend.has(c.id) ? 'unread' : ''}" data-vercom="${c.id}">
        <span class="mini-meta">${c.fijado ? '<span class="chip info">Fijado</span>' : ''}${pend.has(c.id) ? '<span class="chip bad">Por confirmar</span>' : ''}<span>${esc(fechaHora(c.creado, miTz()))}</span></span>
        <b>${esc(c.titulo)}</b><span class="mini-body">${esc(c.cuerpo.slice(0, 110))}${c.cuerpo.length > 110 ? '…' : ''}</span></button>`).join('')
        : '<p class="vacio">Aún no hay comunicados.</p>'}
    </section>`;
  }
  function misSolicitudesInicio() {
    const l = S.hoy.misSol || [];
    return `<section class="card side-card"><div class="sec-h"><h2>Mis solicitudes</h2><button class="btn ghost sm" data-view="solicitudes">${ico('plus')}Nueva</button></div>
      ${l.length ? l.map((s) => `<div class="mini-sol"><span class="sq sm">${ico(TIPOS[s.tipo].icono)}</span><div><b>${esc(TIPOS[s.tipo].nombre)}</b><span>${esc(rangoSol(s))}</span></div>${chipEstado(s.estado)}</div>`).join('')
        : '<p class="vacio">No tienes solicitudes recientes.</p>'}
    </section>`;
  }
  function semanaView() {
    const hoy = S.hoy.fecha;
    return `<section class="card side-card"><div class="sec-h"><h2>Tu semana</h2><button class="btn ghost sm" data-view="malla">Ver malla</button></div>
      <div class="week">${S.hoy.semana.map((d) => `<div class="day ${d.fecha === hoy ? 'today' : ''}">
        <span class="day-n">${d.dia} <b>${+d.fecha.slice(8)}</b></span>
        <span class="chip ${claseTurno(d.turno)}">${d.turno ? esc(d.turno.codigo) : '—'}</span>
        <span class="day-h">${d.turno ? esc(d.turno.entrada ? horario(d.turno) : d.turno.nombre) : 'Sin turno'}</span></div>`).join('')}</div>
    </section>`;
  }
  function tickReloj() {
    const el = document.getElementById('clock');
    if (el && S.perfil) el.textContent = segEn(miTz());
  }
  setInterval(tickReloj, 1000);

  // ---------------------------------------------------------------------------
  // Malla de horarios y turnos
  // ---------------------------------------------------------------------------
  async function cargarMalla() {
    if (!S.malla.lunes) S.malla.lunes = lunesDe(fechaEn(miTz()));
    if (S.sedes.length === 1) S.malla.sede = S.sedes[0].id;
    const l = S.malla.lunes;
    S.malla.filas = await todas(() => sb.from('malla').select('*').gte('fecha', l).lte('fecha', sumarDias(l, 5)));
  }
  function mallaView() {
    const l = S.malla.lunes, hoy = fechaEn(miTz());
    const fechas = DIAS.map((_, i) => sumarDias(l, i));
    const gente = activos().filter((p) => S.malla.sede === 'todas' || p.sede_id === +S.malla.sede)
      .sort((a, b) => (a.sede_id - b.sede_id) || a.nombre.localeCompare(b.nombre));
    const celda = (p, f) => {
      const m = S.malla.filas.find((x) => x.persona_id === p.id && x.fecha === f);
      const t = m ? turno(m.turno_id) : null;
      if (lideraSede(p.sede_id)) {
        return `<select class="shift ${claseTurno(t)}" data-malla="${p.id}|${f}" aria-label="Turno de ${esc(p.nombre)} el ${esc(fechaCorta(f))}">
          <option value="">—</option>${turnosDe(p.sede_id).filter((x) => x.activo || (t && x.id === t.id)).map((x) => `<option value="${x.id}" ${t && t.id === x.id ? 'selected' : ''}>${esc(x.codigo)} · ${esc(x.nombre)}</option>`).join('')}</select>`;
      }
      return t ? `<span class="chip ${claseTurno(t)}" title="${esc(t.nombre + ' · ' + horario(t))}">${esc(t.codigo)}</span>` : '<span class="chip t-none">—</span>';
    };
    const ayuda = esGerencia() ? 'Puedes cambiar el turno de cualquier persona. Cada cambio queda en el historial.'
      : esLider() ? `Puedes cambiar los turnos de ${esc(sede(P().sede_id).nombre)}. Cada cambio queda en el historial.`
        : 'La malla es pública para todo el equipo. Solo la líder de cada sede puede cambiarla.';
    const selSede = S.sedes.length > 1 ? `<select id="mSede" class="campo-sm" aria-label="Sede"><option value="todas">${S.sedes.length === 2 ? 'Las dos sedes' : 'Todas las sedes'}</option>${S.sedes.map((s) => `<option value="${s.id}" ${+S.malla.sede === s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select>` : '';
    return `${encabezado('Horarios', 'Malla <em>de la semana</em>', ayuda)}
      <div class="toolbar">
        <div class="weeknav"><button class="btn ghost sm" data-semana="-7" aria-label="Semana anterior">${ico('chevL')}Anterior</button>
          <b>${esc(fechaCorta(l))} – ${esc(fechaCorta(sumarDias(l, 5)))}</b>
          <button class="btn ghost sm" data-semana="7" aria-label="Semana siguiente">Siguiente${ico('chev')}</button></div>
        <div class="toolbar-r">${selSede}${esLider() ? `<button class="btn ghost sm" data-accion="copiarSemana">${ico('copy')}Copiar la semana anterior</button>` : ''}</div>
      </div>
      <div class="card tablewrap"><table class="malla">
        <thead><tr><th>Persona</th>${fechas.map((f, i) => `<th class="${f === hoy ? 'today' : ''}">${DIAS[i]} <span>${+f.slice(8)}</span></th>`).join('')}</tr></thead>
        <tbody>${gente.map((p) => `<tr><td><div class="person"><span class="avatar soft">${esc(initials(p.nombre))}</span><div><b>${esc(p.nombre)}</b><span>${esc(area(p.area_id).nombre)} · ${esc(sede(p.sede_id).nombre)}</span></div></div></td>
          ${fechas.map((f) => `<td class="${f === hoy ? 'today' : ''}">${celda(p, f)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="7" class="vacio">No hay personas activas en esta sede.</td></tr>`}</tbody>
      </table></div>
      <div class="leyenda">${S.turnos.filter((t) => t.sede_id === (S.malla.sede === 'todas' ? P().sede_id : +S.malla.sede) && t.activo).map((t) => `<span><span class="chip ${claseTurno(t)}">${esc(t.codigo)}</span>${esc(t.nombre)} · ${esc(horario(t))}</span>`).join('')}</div>
      ${esLider() ? turnosView() : ''}`;
  }
  function turnosView() {
    const sedes = sedesQueLidero();
    const sid = sedes.some((s) => s.id === S.turnoSede) ? S.turnoSede : (sedes[0] || {}).id;
    const campos = [['entrada', 'Entrada'], ['salida_almuerzo', 'Sale a almorzar'], ['regreso_almuerzo', 'Regresa'], ['salida', 'Salida']];
    return `<section class="turnos-sec"><div class="sec-h"><div><h2>Turnos${sedes.length === 1 ? ' de ' + esc(sedes[0].nombre) : ''}</h2>
        <p class="hint">Los turnos iniciales son de ejemplo: ajústalos a los horarios reales. Cada cambio se guarda al salir del campo.</p></div>
        ${sedes.length > 1 ? `<select id="tSede" class="campo-sm" aria-label="Sede de los turnos">${sedes.map((s) => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select>` : ''}</div>
      <div class="card tablewrap"><table class="turnos">
        <thead><tr><th>Código</th><th>Nombre</th>${campos.map((c) => `<th>${c[1]}</th>`).join('')}<th>Activo</th></tr></thead>
        <tbody>${turnosDe(sid).map((t) => `<tr>
          <td><span class="chip ${claseTurno(t)}">${esc(t.codigo)}</span></td>
          <td><input class="campo-sm" data-turno="${t.id}|nombre" value="${esc(t.nombre)}" aria-label="Nombre del turno ${esc(t.codigo)}"></td>
          ${t.entrada || t.salida_almuerzo ? campos.map((c) => `<td><input class="campo-sm" type="time" data-turno="${t.id}|${c[0]}" value="${hc(t[c[0]])}" aria-label="${c[1]} del turno ${esc(t.codigo)}"></td>`).join('')
            : `<td colspan="4" class="mute">Sin horario: no se marca asistencia</td>`}
          <td><input type="checkbox" data-turno="${t.id}|activo" ${t.activo ? 'checked' : ''} aria-label="Turno ${esc(t.codigo)} activo"></td></tr>`).join('')}</tbody>
      </table></div>
      <form id="fTurno" class="addrow"><input id="ntCodigo" class="campo-sm" maxlength="3" placeholder="Código" required aria-label="Código del turno nuevo">
        <input id="ntNombre" class="campo-sm" placeholder="Nombre del turno nuevo" required aria-label="Nombre del turno nuevo">
        <label class="chk"><input type="checkbox" id="ntHorario" checked> Con horario</label>
        <button class="btn ghost sm" type="submit">${ico('plus')}Agregar turno</button></form>
    </section>`;
  }
  async function copiarSemana() {
    const l = S.malla.lunes, ant = sumarDias(l, -7);
    const editables = new Set(activos().filter((p) => lideraSede(p.sede_id) && (S.malla.sede === 'todas' || p.sede_id === +S.malla.sede)).map((p) => p.id));
    const previa = await todas(() => sb.from('malla').select('*').gte('fecha', ant).lte('fecha', sumarDias(ant, 5)));
    const filas = previa.filter((m) => editables.has(m.persona_id)).map((m) => ({ persona_id: m.persona_id, fecha: sumarDias(m.fecha, 7), turno_id: m.turno_id }));
    if (!filas.length) return toast('La semana anterior no tiene turnos para copiar.', 'error');
    if (!confirm(`Se copiarán ${filas.length} turnos de la semana del ${fechaCorta(ant)} a esta semana. Los turnos que ya estén puestos se reemplazan. ¿Continuar?`)) return;
    await q(sb.from('malla').upsert(filas, { onConflict: 'persona_id,fecha' }));
    await cargarMalla(); render(); toast(`Listo: ${plural(filas.length, 'turno copiado', 'turnos copiados')}.`);
  }

  // ---------------------------------------------------------------------------
  // Asistencia del día (líderes)
  // ---------------------------------------------------------------------------
  async function cargarAsistencia() {
    const fechas = [...new Set(S.sedes.map((s) => fechaEn(s.zona_horaria)))].sort();
    const [malla, marcas, aus] = await Promise.all([
      todas(() => sb.from('malla').select('*').in('fecha', fechas)),
      todas(() => sb.from('marcas').select('*').in('fecha', fechas)),
      q(sb.rpc('ausencias_aprobadas', { p_desde: fechas[0], p_hasta: fechas[fechas.length - 1] }))
    ]);
    Object.assign(S.asistencia, { malla, marcas, ausencias: aus || [] });
  }
  const ausenciaEn = (lista, pid, f) => lista.find((a) => a.persona_id === pid && a.desde <= f && a.hasta >= f) || null;
  function estadoPersona(p, t, marcas, aus, tz) {
    if (aus) return { txt: TIPOS[aus.tipo].ausencia, cls: 'info', grupo: 'desc' };
    if (t && !t.entrada) return { txt: t.nombre, cls: 'mute', grupo: 'desc' };
    const ahora = ahoraMin(tz);
    if (!marcas.entrada) {
      if (!t) return ahora >= 12 * 60 ? { txt: 'Sin turno ni marca', cls: 'warn', grupo: 'sin' } : { txt: 'Sin turno', cls: 'mute', grupo: 'desc' };
      const e = toMin(t.entrada);
      if (ahora < e) return { txt: 'Aún no inicia', cls: 'mute', grupo: 'desc' };
      if (ahora > e + 15) return { txt: 'Sin marcar entrada', cls: 'bad', grupo: 'sin' };
      return { txt: 'Por llegar', cls: 'warn', grupo: 'desc' };
    }
    const alerta = ['entrada', 'regreso_almuerzo', 'salida'].some((k) => { const ev = evaluar(k, t, marcas, tz); return ev && ev.alerta; });
    return alerta ? { txt: 'Con novedad', cls: 'warn', grupo: 'nov' } : { txt: 'Al día', cls: 'ok', grupo: 'ok' };
  }
  function asistenciaView() {
    const A = S.asistencia;
    const gente = activos().filter((p) => lideraSede(p.sede_id) && (A.sede === 'todas' || p.sede_id === +A.sede))
      .sort((a, b) => (a.sede_id - b.sede_id) || a.nombre.localeCompare(b.nombre));
    const filas = gente.map((p) => {
      const tz = tzDe(p), f = fechaEn(tz);
      const m = A.malla.find((x) => x.persona_id === p.id && x.fecha === f);
      const t = m ? turno(m.turno_id) : null;
      const marcas = Object.fromEntries(A.marcas.filter((x) => x.persona_id === p.id && x.fecha === f).map((x) => [x.tipo, x]));
      return { p, t, tz, marcas, est: estadoPersona(p, t, marcas, ausenciaEn(A.ausencias, p.id, f), tz) };
    });
    const cuenta = (g) => filas.filter((r) => r.est.grupo === g).length;
    const pasos = pasosDe({ entrada: 1, salida_almuerzo: 1 });
    const selSede = sedesQueLidero().length > 1 ? `<select id="aSede" class="campo-sm" aria-label="Sede"><option value="todas">${S.sedes.length === 2 ? 'Las dos sedes' : 'Todas las sedes'}</option>${sedesQueLidero().map((s) => `<option value="${s.id}" ${+A.sede === s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select>` : '';
    return `${encabezado('Asistencia de hoy', '¿Quién está <em>trabajando hoy</em>?', `${esc(fechaLarga(fechaEn(miTz())))}. Las horas son las de cada sede.`,
      `<div class="toolbar-r">${selSede}<button class="btn ghost sm" data-accion="recargarAsistencia">${ico('refresh')}Actualizar</button></div>`)}
      <div class="kpis four">
        <div class="kpi"><span class="kpi-l">Al día</span><b class="ok-t">${cuenta('ok')}</b></div>
        <div class="kpi"><span class="kpi-l">Con novedad</span><b class="warn-t">${cuenta('nov')}</b></div>
        <div class="kpi"><span class="kpi-l">Sin marcar entrada</span><b class="bad-t">${cuenta('sin')}</b></div>
        <div class="kpi"><span class="kpi-l">Descanso o por llegar</span><b>${cuenta('desc')}</b></div>
      </div>
      <div class="card tablewrap"><table class="asis">
        <thead><tr><th>Persona</th><th>Turno</th>${pasos.map((x) => `<th>${esc(x.paso)}</th>`).join('')}<th>Estado</th></tr></thead>
        <tbody>${filas.map((r) => `<tr><td><div class="person"><span class="avatar soft">${esc(initials(r.p.nombre))}</span><div><b>${esc(r.p.nombre)}</b><span>${esc(area(r.p.area_id).nombre)} · ${esc(sede(r.p.sede_id).nombre)}</span></div></div></td>
          <td>${r.t ? `<span class="chip ${claseTurno(r.t)}">${esc(r.t.codigo)}</span> <span class="mute">${esc(horario(r.t))}</span>` : '<span class="mute">Sin turno</span>'}</td>
          ${pasos.map((x) => { const m = r.marcas[x.tipo], ev = evaluar(x.tipo, r.t, r.marcas, r.tz); const prog = r.t && r.t[x.tipo];
            return `<td>${m ? `<b>${horaEn(r.tz, new Date(m.hora))}</b>${ev && ev.alerta ? ` <span class="chip ${ev.cls}">${esc(ev.txt)}</span>` : ''}` : `<span class="mute">${prog ? hc(prog) : '—'}</span>`}</td>`; }).join('')}
          <td><span class="chip ${r.est.cls}">${esc(r.est.txt)}</span></td></tr>`).join('') || '<tr><td colspan="7" class="vacio">No hay personas para mostrar.</td></tr>'}</tbody>
      </table></div>`;
  }

  // ---------------------------------------------------------------------------
  // Comunicados
  // ---------------------------------------------------------------------------
  function esDestinatario(c, p) {
    return !!p && p.activo !== false && p.id !== c.autor_id &&
      (c.destino === 'todos' || (c.destino === 'area' && p.area_id === c.destino_id) || (c.destino === 'sede' && p.sede_id === c.destino_id));
  }
  const destinatarios = (c) => activos().filter((p) => esDestinatario(c, p));
  const nombreDestino = (c) => c.destino === 'todos' ? 'Todo el equipo' : c.destino === 'area' ? 'Área ' + area(c.destino_id).nombre : 'Sede ' + sede(c.destino_id).nombre;
  async function cargarComunicados() {
    const lista = await todas(() => sb.from('comunicados').select('*').order('creado', { ascending: false }));
    const ids = lista.map((c) => c.id);
    const [imgs, lect] = ids.length ? await Promise.all([
      todas(() => sb.from('comunicado_imagenes').select('*').in('comunicado_id', ids).order('orden')),
      todas(() => sb.from('comunicado_lecturas').select('*').in('comunicado_id', ids))
    ]) : [[], []];
    Object.assign(S.com, { lista, imgs, lect, cargado: true });
    const faltan = imgs.map((i) => i.ruta).filter((r) => !S.com.urls[r]);
    if (faltan.length) {
      const { data } = await sb.storage.from('comunicados').createSignedUrls(faltan, 3600);
      (data || []).forEach((d) => { if (d.signedUrl) S.com.urls[d.path] = d.signedUrl; });
    }
  }
  function comunicadosView() {
    const pend = sinConfirmar().length;
    return `${encabezado('Comunicación interna', 'Comunicados', 'Lee lo que publica la agencia y confirma la lectura cuando se pida.')}
      <div class="grid-news ${puedePublicar() ? '' : 'solo'}">
        <section class="news">
          <div class="toolbar">
            <div class="seg" role="group" aria-label="Filtro">
              <button data-comf="todos" aria-pressed="${S.com.filtro === 'todos'}">Todos</button>
              <button data-comf="pend" aria-pressed="${S.com.filtro === 'pend'}">Sin confirmar (${pend})</button>
            </div>
            <label class="search">${ico('search')}<input id="qCom" type="search" placeholder="Buscar en comunicados" value="${esc(S.com.q)}" aria-label="Buscar en comunicados"></label>
          </div>
          <div id="comLista">${listaComunicados()}</div>
        </section>
        ${puedePublicar() ? composeView() : ''}
      </div>`;
  }
  function listaComunicados() {
    const pend = new Set(sinConfirmar().map((c) => c.id));
    const qq = norm(S.com.q);
    const l = S.com.lista
      .filter((c) => S.com.filtro !== 'pend' || pend.has(c.id))
      .filter((c) => !qq || norm(c.titulo + ' ' + c.cuerpo + ' ' + persona(c.autor_id).nombre).includes(qq))
      .sort((a, b) => (b.fijado - a.fijado) || b.creado.localeCompare(a.creado));
    if (!l.length) return `<p class="vacio card">${S.com.filtro === 'pend' ? 'No tienes comunicados por confirmar.' : qq ? 'Ningún comunicado coincide con la búsqueda.' : 'Aún no hay comunicados.'}</p>`;
    return l.map((c) => notaView(c, pend.has(c.id))).join('');
  }
  function notaView(c, pendiente) {
    const autor = persona(c.autor_id), imgs = S.com.imgs.filter((i) => i.comunicado_id === c.id);
    const yoDest = esDestinatario(c, P());
    const leida = S.com.lect.some((l) => l.comunicado_id === c.id && l.persona_id === P().id);
    const puedeBorrar = c.autor_id === P().id || esGerencia();
    let seguimiento = '';
    if (puedePublicar() && c.requiere_confirmacion) {
      const dest = destinatarios(c), ok = dest.filter((p) => S.com.lect.some((l) => l.comunicado_id === c.id && l.persona_id === p.id));
      const faltan = dest.filter((p) => !ok.includes(p));
      const pct = dest.length ? Math.round(ok.length / dest.length * 100) : 100;
      seguimiento = `<div class="lect"><div class="lect-h"><span>Confirmado por <b>${ok.length} de ${dest.length}</b></span><span>${pct}%</span></div>
        <div class="bar"><span style="width:${pct}%"></span></div>${faltan.length ? `<p class="faltan">Faltan: ${faltan.map((p) => esc(p.nombre)).join(', ')}</p>` : ''}</div>`;
    }
    const q = S.com.q;
    return `<article class="card note ${c.fijado ? 'pin' : ''} ${pendiente ? 'unread' : ''} ${S.com.hl === c.id ? 'hl' : ''}" id="com-${c.id}">
      <div class="note-meta">${c.fijado ? `<span class="chip info">${ico('pin')}Fijado</span>` : ''}<span class="avatar soft xs">${esc(initials(autor.nombre))}</span>
        <span><b>${resaltar(autor.nombre, q)}</b> · ${esc(fechaHora(c.creado, miTz()))}</span>${imgs.length ? `<span class="mute">${ico('image')}${imgs.length}</span>` : ''}
        ${puedeBorrar ? `<button class="enlace eliminar" data-borrarcom="${c.id}">${ico('trash')}Eliminar</button>` : ''}</div>
      <h3>${resaltar(c.titulo, q)}</h3>
      <div class="note-body">${resaltar(c.cuerpo, q)}</div>
      ${imgs.length ? `<div class="thumbs">${imgs.map((im, i) => `<button class="thumb" data-lb="${c.id}|${i}" aria-label="Ver imagen ${i + 1}">${S.com.urls[im.ruta] ? `<img src="${esc(S.com.urls[im.ruta])}" alt="${esc(im.nombre || '')}" loading="lazy">` : ico('image')}</button>`).join('')}</div>` : ''}
      <div class="note-foot"><span class="mute">Para: ${esc(nombreDestino(c))}</span>
        ${yoDest && c.requiere_confirmacion ? (leida ? `<span class="chip ok">${ico('check')}Leído</span>` : `<span class="req">Requiere confirmación</span><button class="btn sm" data-leer="${c.id}">${ico('check')}Confirmar lectura</button>`) : ''}</div>
      ${seguimiento}
    </article>`;
  }
  function composeView() {
    const b = S.com.borrador;
    return `<aside class="card compose"><h2>${ico('mega')}Nuevo comunicado</h2>
      <form id="fCom" novalidate>
        <div class="field"><label for="cTitulo">Título</label><input id="cTitulo" maxlength="140" required value="${esc(b.titulo || '')}"></div>
        <div class="field"><label for="cCuerpo">Mensaje</label><textarea id="cCuerpo" rows="6">${esc(b.cuerpo || '')}</textarea></div>
        <div class="field"><label for="cPara">Para</label><select id="cPara">
          <option value="todos">Todo el equipo</option>
          <optgroup label="Por área">${S.areas.map((a) => `<option value="area:${a.id}" ${b.para === 'area:' + a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</optgroup>
          ${S.sedes.length > 1 ? `<optgroup label="Por sede">${S.sedes.map((s) => `<option value="sede:${s.id}" ${b.para === 'sede:' + s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</optgroup>` : ''}
        </select></div>
        <label class="check"><input type="checkbox" id="cConf" ${b.conf === false ? '' : 'checked'}> Pedir confirmación de lectura</label>
        <label class="check"><input type="checkbox" id="cFijar" ${b.fijar ? 'checked' : ''}> Fijar arriba</label>
        <label class="drop">${ico('image')}<span>Agregar imágenes <small>JPG, PNG o WEBP</small></span><input id="cImgs" type="file" accept="image/jpeg,image/png,image/webp" multiple></label>
        <div id="cPrev" class="thumbs">${previaArchivos(b.files, 'quitarimg')}</div>
        <button class="btn full" type="submit" ${S.ocupado ? 'disabled' : ''}>${S.ocupado ? 'Publicando…' : 'Publicar'}</button>
      </form></aside>`;
  }
  function previaArchivos(files, accion) {
    return files.map((f, i) => `<div class="thumb">${f.type.startsWith('image/') && f._url ? `<img src="${f._url}" alt="">` : `<span class="file-ico">${ico('file')}</span>`}
      <button type="button" class="thumb-x" data-${accion}="${i}" aria-label="Quitar ${esc(f.name)}">${ico('x')}</button><span class="thumb-n">${esc(f.name)}</span></div>`).join('');
  }
  // Reduce imágenes grandes a 1920 px máx. en JPG 0,85 antes de subir.
  async function prepararImagen(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    try {
      const bmp = await createImageBitmap(file);
      const max = Math.max(bmp.width, bmp.height);
      if (max <= 1920 && file.size <= 1.5 * 1024 * 1024) return file;
      const k = Math.min(1, 1920 / max);
      const cv = document.createElement('canvas');
      cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
      cx.drawImage(bmp, 0, 0, cv.width, cv.height);
      const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.85));
      return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
    } catch (e) { return file; }
  }
  const nombreSeguro = (n) => norm(n).replace(/[^a-z0-9.\-_]+/g, '-').replace(/-+/g, '-').slice(-60) || 'archivo';
  async function publicarComunicado() {
    const b = S.com.borrador;
    const titulo = document.getElementById('cTitulo').value.trim();
    const cuerpo = document.getElementById('cCuerpo').value.trim();
    const para = document.getElementById('cPara').value;
    if (!titulo) { toast('Escribe un título.', 'error'); document.getElementById('cTitulo').focus(); return; }
    const [destino, did] = para === 'todos' ? ['todos', null] : para.split(':');
    S.ocupado = true; render();
    try {
      const c = await q(sb.from('comunicados').insert({
        titulo, cuerpo, destino, destino_id: did ? +did : null, autor_id: P().id,
        requiere_confirmacion: document.getElementById('cConf').checked, fijado: document.getElementById('cFijar').checked
      }).select().single());
      const fallidas = [];
      for (let i = 0; i < b.files.length; i++) {
        const f = await prepararImagen(b.files[i]);
        const ruta = `${c.id}/${Date.now()}-${i + 1}-${nombreSeguro(f.name)}`;
        try {
          await q(sb.storage.from('comunicados').upload(ruta, f, { contentType: f.type }));
          await q(sb.from('comunicado_imagenes').insert({ comunicado_id: c.id, ruta, nombre: b.files[i].name, orden: i }));
        } catch (e) { fallidas.push(b.files[i].name); }
      }
      S.com.borrador = { files: [] };
      await cargarComunicados();
      toast(fallidas.length ? `Publicado, pero no subieron: ${fallidas.join(', ')}` : 'Comunicado publicado.', fallidas.length ? 'error' : '');
    } catch (e) { fallo(e); }
    S.ocupado = false; render();
  }
  async function borrarComunicado(id) {
    const c = S.com.lista.find((x) => x.id === id);
    if (!c || !confirm(`¿Eliminar el comunicado «${c.titulo}»? No se puede deshacer.`)) return;
    try {
      const rutas = S.com.imgs.filter((i) => i.comunicado_id === id).map((i) => i.ruta);
      if (rutas.length) await q(sb.storage.from('comunicados').remove(rutas));
      await q(sb.from('comunicados').delete().eq('id', id));
      await cargarComunicados(); render(); toast('Comunicado eliminado.');
    } catch (e) { fallo(e); }
  }
  async function confirmarLectura(id) {
    try {
      await q(sb.from('comunicado_lecturas').insert({ comunicado_id: id, persona_id: P().id }));
      await cargarComunicados(); render(); toast('Lectura confirmada. ¡Gracias!');
    } catch (e) { fallo(e); }
  }

  // Visor de imágenes genérico: S.lb = { titulo, items: [{ url, nombre }], i }
  function lightboxView() {
    const { titulo, items, i } = S.lb, it = items[i];
    return `<div class="lightbox" role="dialog" aria-modal="true" aria-label="${esc(titulo)}" data-accion="lbCerrar">
      <div class="lb-top"><span>${esc(titulo)} · ${i + 1} de ${items.length}</span>
        <span><a class="btn ghost sm inv" href="${esc(it.url)}" target="_blank" rel="noopener">${ico('ext')}Abrir en tamaño completo</a>
        <button class="btn ghost sm inv" data-accion="lbCerrar" aria-label="Cerrar">${ico('x')}</button></span></div>
      <div class="lb-img"><img src="${esc(it.url)}" alt="${esc(it.nombre || '')}"></div>
      ${items.length > 1 ? `<div class="lb-nav"><button class="btn ghost sm inv" data-lbmover="-1" aria-label="Anterior">${ico('chevL')}</button><button class="btn ghost sm inv" data-lbmover="1" aria-label="Siguiente">${ico('chev')}</button></div>` : ''}
    </div>`;
  }

  // ---------------------------------------------------------------------------
  // Solicitudes
  // ---------------------------------------------------------------------------
  const diasHabiles = (d, h) => { let n = 0; for (let f = d; f <= h; f = sumarDias(f, 1)) if (diaSemana(f) !== 0) n++; return n; };
  const rangoSol = (s) => s.hora_desde ? `${fechaCorta(s.desde)} · ${hc(s.hora_desde)} a ${hc(s.hora_hasta)}`
    : s.desde === s.hasta ? fechaCorta(s.desde) : `${fechaCorta(s.desde)} al ${fechaCorta(s.hasta)}`;
  const duracionMin = (m) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? ' ' + r + ' min' : ''}` : `${r} min`; };
  const duracionSol = (s) => s.hora_desde ? duracionMin(toMin(s.hora_hasta) - toMin(s.hora_desde)) : plural(diasHabiles(s.desde, s.hasta), 'día', 'días');
  const chipEstado = (e) => `<span class="chip ${e === 'aprobada' ? 'ok' : e === 'rechazada' ? 'bad' : 'warn'}">${e === 'aprobada' ? 'Aprobada' : e === 'rechazada' ? 'Rechazada' : 'Pendiente'}</span>`;
  async function cargarSolicitudes() {
    const [lista, rev] = await Promise.all([
      todas(() => sb.from('solicitudes').select('*').order('creado', { ascending: false })),
      q(sb.from('revisores').select('*'))
    ]);
    const ids = lista.map((s) => s.id);
    const adj = ids.length ? await todas(() => sb.from('solicitud_adjuntos').select('*').in('solicitud_id', ids)) : [];
    Object.assign(S.sol, { lista, adj, revisores: rev, pendientes: lista.filter((s) => s.estado === 'pendiente') });
    const faltan = adj.map((a) => a.ruta).filter((r) => !S.sol.urls[r]);
    if (faltan.length) {
      const { data } = await sb.storage.from('soportes').createSignedUrls(faltan, 3600);
      (data || []).forEach((d) => { if (d.signedUrl) S.sol.urls[d.path] = d.signedUrl; });
    }
  }
  function solTarjeta(s, conAcciones) {
    const p = persona(s.persona_id), adj = S.sol.adj.filter((a) => a.solicitud_id === s.id), T = TIPOS[s.tipo];
    const imgs = adj.filter((a) => (a.tipo_mime || '').startsWith('image/') && a.tipo_mime !== 'image/heic');
    return `<article class="card sol">
      <div class="sol-h"><span class="sq">${ico(T.icono)}</span><div><b>${esc(T.nombre)}${s.persona_id !== P().id ? ' · ' + esc(p.nombre) : ''}</b>
        <span class="meta">${esc(rangoSol(s))} · ${esc(duracionSol(s))} · ${esc(area(p.area_id).nombre)} · ${esc(sede(p.sede_id).nombre)}</span></div>${chipEstado(s.estado)}</div>
      ${s.motivo ? `<p class="sol-motivo">${esc(s.motivo)}</p>` : ''}
      ${adj.length ? `<div class="thumbs">${adj.map((a) => imgs.includes(a) && S.sol.urls[a.ruta]
        ? `<button class="thumb" data-lbsol="${s.id}|${imgs.indexOf(a)}" aria-label="Ver soporte"><img src="${esc(S.sol.urls[a.ruta])}" alt="${esc(a.nombre || '')}" loading="lazy"></button>`
        : `<a class="file" href="${esc(S.sol.urls[a.ruta] || '#')}" target="_blank" rel="noopener">${ico('clip')}${esc(a.nombre || 'Soporte')}</a>`).join('')}</div>` : ''}
      ${s.revisado_por ? `<p class="meta">${s.estado === 'aprobada' ? 'Aprobó' : 'Rechazó'}: <b>${esc(persona(s.revisado_por).nombre)}</b> · ${esc(fechaHora(s.revisado_en, miTz()))}${s.comentario ? ` — «${esc(s.comentario)}»` : ''}</p>` : ''}
      ${conAcciones && puedeAprobar(s) ? `<div class="acts rev"><input class="campo-sm" id="rc-${s.id}" placeholder="Comentario (opcional)" aria-label="Comentario">
        <button class="btn sm" data-revisar="${s.id}|1">${ico('check')}Aprobar</button><button class="btn ghost sm danger" data-revisar="${s.id}|0">${ico('x')}Rechazar</button></div>` : ''}
      ${s.persona_id === P().id && s.estado === 'pendiente' ? `<div class="acts"><button class="enlace eliminar" data-cancelarsol="${s.id}">Cancelar solicitud</button></div>` : ''}
    </article>`;
  }
  function solFormView() {
    const b = S.sol.borrador, tipo = S.sol.tipo, hoy = fechaEn(miTz());
    return `<section class="card compose"><h2>${ico('plus')}Nueva solicitud</h2>
      <form id="fSol" novalidate>
        <div class="tipos" role="radiogroup" aria-label="Tipo de solicitud">${TODOS_TIPOS.map((k) => `<button type="button" role="radio" aria-checked="${tipo === k}" data-soltipo="${k}">
          <span class="sq sm">${ico(TIPOS[k].icono)}</span><b>${TIPOS[k].nombre}</b><span>${TIPOS[k].ayuda}</span></button>`).join('')}</div>
        <div class="row2"><div class="field"><label for="sDesde">Desde</label><input id="sDesde" type="date" value="${esc(b.desde || hoy)}" required></div>
          <div class="field"><label for="sHasta">Hasta</label><input id="sHasta" type="date" value="${esc(b.hasta || hoy)}" required></div></div>
        ${tipo === 'permiso' ? `<div class="row2"><div class="field"><label for="sHd">Hora desde <small>(opcional)</small></label><input id="sHd" type="time" value="${esc(b.hd || '')}"></div>
          <div class="field"><label for="sHh">Hora hasta <small>(opcional)</small></label><input id="sHh" type="time" value="${esc(b.hh || '')}"></div></div>
          <p class="hint">Si es por horas, llena las dos horas; si es el día completo, déjalas vacías.</p>` : ''}
        <div class="field"><label for="sMotivo">${tipo === 'incapacidad' ? 'Diagnóstico o comentario' : 'Motivo'}</label><textarea id="sMotivo" rows="3">${esc(b.motivo || '')}</textarea></div>
        <label class="drop">${ico('clip')}<span>Adjuntar soporte <small>Opcional · JPG, PNG, WEBP, HEIC o PDF</small></span><input id="sArch" type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" multiple></label>
        <div id="sPrev" class="thumbs">${previaArchivos(b.files, 'quitarsop')}</div>
        <button class="btn full" type="submit" ${S.ocupado ? 'disabled' : ''}>${S.ocupado ? 'Enviando…' : 'Enviar solicitud'}</button>
      </form></section>`;
  }
  function solicitudesView() {
    const mias = S.sol.lista.filter((s) => s.persona_id === P().id);
    const ajenas = S.sol.lista.filter((s) => s.persona_id !== P().id && puedeVerSol(s));
    const r = miAcceso(), revisa = esGerencia() || !!r;
    const pend = ajenas.filter((s) => s.estado === 'pendiente');
    const aprobables = pend.filter(puedeAprobar);
    let texto = 'Pide vacaciones, permisos o reporta una incapacidad. Te avisamos aquí cuando la revisen.';
    if (!esGerencia() && r) {
      const tipos = r.tipos.map((t) => TIPOS[t].nombre.toLowerCase()).join(', ');
      texto = `La gerencia te dio acceso para ${r.nivel === 'aprobar' ? 'ver, aprobar y rechazar' : 'ver'} solicitudes de ${tipos} de ${r.sede_id ? esc(sede(r.sede_id).nombre) : 'todas las sedes'}.`;
    } else if (esGerencia()) texto = 'Revisas todas las solicitudes, menos las tuyas. Aquí activas el módulo y decides quién más las revisa.';
    const encab = encabezado('Talento humano', 'Solicitudes', texto);
    const modulo = esGerencia() ? `<section class="card modcard"><div><b>Módulo de solicitudes</b><p class="hint">${moduloSol() ? 'Activo: todo el equipo puede pedir vacaciones, permisos e incapacidades.' : 'Apagado: nadie puede crear solicitudes. Lo aprobado se conserva.'}</p></div>
      <button class="switch" role="switch" aria-checked="${moduloSol()}" data-accion="modSol"><span></span>${moduloSol() ? 'Activo' : 'Apagado'}</button></section>` : '';
    if (!moduloSol()) return `${encab}${modulo}${esGerencia() ? revisoresView() : '<p class="vacio card">La gerencia aún no ha activado las solicitudes.</p>'}`;
    const misCol = `<div class="col">${solFormView()}<section><div class="sec-h"><h2>Mis solicitudes</h2></div>${mias.length ? mias.map((s) => solTarjeta(s, false)).join('') : '<p class="vacio card">Aún no has hecho solicitudes.</p>'}</section></div>`;
    if (!revisa) return `${encab}<div class="grid-sol">${misCol}</div>`;
    const historial = ajenas.filter((s) => s.estado !== 'pendiente');
    return `${encab}${modulo}
      <div class="grid-sol">
        <div class="col">
          <section><div class="sec-h"><h2>${aprobables.length || esGerencia() || (r && r.nivel === 'aprobar') ? 'Por aprobar' : 'Pendientes'} (${pend.length})</h2></div>
            ${pend.length ? pend.map((s) => solTarjeta(s, true)).join('') : '<p class="vacio card">No hay solicitudes pendientes.</p>'}</section>
          <section><div class="sec-h"><h2>Historial</h2></div>
            ${historial.length ? historial.slice(0, 30).map((s) => solTarjeta(s, false)).join('') : '<p class="vacio card">Todavía no hay solicitudes revisadas.</p>'}</section>
        </div>
        ${misCol}
      </div>
      ${esGerencia() ? revisoresView() : ''}`;
  }
  function revisoresView() {
    const revs = S.sol.revisores;
    const candidatos = activos().filter((p) => !revs.some((r) => r.persona_id === p.id) && !(p.rol === 'gerente' || p.es_admin));
    return `<section class="revisores"><div class="sec-h"><div><h2>¿Quién revisa las solicitudes?</h2>
        <p class="hint">La gerencia revisa siempre. Puedes dar acceso a otras personas, por ejemplo contabilidad o talento humano.</p></div></div>
      <div class="card tablewrap"><table class="perm">
        <thead><tr><th>Persona</th><th>Sede</th><th>Tipos</th><th>Permiso</th><th></th></tr></thead>
        <tbody>
          ${activos().filter((p) => p.rol === 'gerente' || p.es_admin).map((p) => `<tr><td><div class="person"><span class="avatar soft">${esc(initials(p.nombre))}</span><div><b>${esc(p.nombre)}</b><span>Gerencia</span></div></div></td><td>Todas</td><td>Todos</td><td><span class="chip info">Siempre</span></td><td></td></tr>`).join('')}
          ${revs.map((r) => { const p = persona(r.persona_id); return `<tr><td><div class="person"><span class="avatar soft">${esc(initials(p.nombre))}</span><div><b>${esc(p.nombre)}</b><span>${esc(area(p.area_id).nombre)}</span></div></div></td>
            <td><select class="campo-sm" data-rev="${r.persona_id}|sede_id" aria-label="Sede"><option value="">Todas</option>${S.sedes.map((s) => `<option value="${s.id}" ${r.sede_id === s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select></td>
            <td><div class="chks">${TODOS_TIPOS.map((t) => `<label class="chk"><input type="checkbox" data-revtipo="${r.persona_id}|${t}" ${r.tipos.includes(t) ? 'checked' : ''}> ${TIPOS[t].nombre}</label>`).join('')}</div></td>
            <td><select class="campo-sm" data-rev="${r.persona_id}|nivel" aria-label="Permiso"><option value="aprobar" ${r.nivel === 'aprobar' ? 'selected' : ''}>Ver, aprobar y rechazar</option><option value="ver" ${r.nivel === 'ver' ? 'selected' : ''}>Solo ver</option></select></td>
            <td><button class="enlace eliminar" data-revquitar="${r.persona_id}">Quitar</button></td></tr>`; }).join('')}
        </tbody></table></div>
      <div class="addrow"><label for="revNueva">Dar acceso a</label><select id="revNueva" class="campo-sm"><option value="">Elige una persona…</option>${candidatos.map((p) => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}</select>
        <button class="btn ghost sm" data-accion="revAgregar">${ico('plus')}Agregar</button></div>
    </section>`;
  }
  async function enviarSolicitud() {
    const b = S.sol.borrador, tipo = S.sol.tipo;
    const desde = document.getElementById('sDesde').value, hasta = document.getElementById('sHasta').value;
    const hd = tipo === 'permiso' ? document.getElementById('sHd').value : '', hh = tipo === 'permiso' ? document.getElementById('sHh').value : '';
    if (!desde || !hasta) return toast('Elige las fechas.', 'error');
    if (hasta < desde) return toast('La fecha final no puede ser anterior a la inicial.', 'error');
    if (!!hd !== !!hh) return toast('Llena las dos horas o ninguna.', 'error');
    if (hd && hh <= hd) return toast('La hora final debe ser posterior a la inicial.', 'error');
    S.ocupado = true; render();
    try {
      const s = await q(sb.from('solicitudes').insert({ tipo, desde, hasta, hora_desde: hd || null, hora_hasta: hh || null, motivo: document.getElementById('sMotivo').value.trim() || null, persona_id: P().id }).select().single());
      const fallidos = [];
      for (let i = 0; i < b.files.length; i++) {
        const f = await prepararImagen(b.files[i]);
        const ruta = `${s.id}/${Date.now()}-${i + 1}-${nombreSeguro(f.name)}`;
        try {
          await q(sb.storage.from('soportes').upload(ruta, f, { contentType: f.type }));
          await q(sb.from('solicitud_adjuntos').insert({ solicitud_id: s.id, ruta, nombre: b.files[i].name, tipo_mime: f.type }));
        } catch (e) { fallidos.push(b.files[i].name); }
      }
      S.sol.borrador = { files: [] };
      await cargarSolicitudes();
      toast(fallidos.length ? `Solicitud enviada, pero no subieron: ${fallidos.join(', ')}` : 'Solicitud enviada.', fallidos.length ? 'error' : '');
    } catch (e) { fallo(e); }
    S.ocupado = false; render();
  }

  // ---------------------------------------------------------------------------
  // Informes mensuales (panel de gerencia)
  // ---------------------------------------------------------------------------
  function mesPorDefecto() {
    const hoy = fechaEn(miTz());
    return +hoy.slice(8) <= 5 ? sumarDias(hoy.slice(0, 8) + '01', -1).slice(0, 7) : hoy.slice(0, 7);
  }
  async function cargarInforme() {
    if (!S.inf.mes) S.inf.mes = mesPorDefecto();
    if (!esGerencia()) S.inf.sede = P().sede_id;
    const d = S.inf.mes + '-01', h = finDeMes(S.inf.mes);
    const [malla, marcas, aus] = await Promise.all([
      todas(() => sb.from('malla').select('*').gte('fecha', d).lte('fecha', h)),
      todas(() => sb.from('marcas').select('*').gte('fecha', d).lte('fecha', h)),
      q(sb.rpc('ausencias_aprobadas', { p_desde: d, p_hasta: h }))
    ]);
    if (!S.com.cargado) await cargarComunicados();
    S.inf.crudo = { malla, marcas, aus: aus || [], d, h };
    S.inf.datos = calcularInforme();
  }
  function calcularInforme() {
    const { malla, marcas, aus, d, h } = S.inf.crudo, I = S.inf;
    const enFiltro = (p) => (I.sede === 'todas' || p.sede_id === +I.sede) && (I.area === 'todas' || p.area_id === +I.area) && lideraSede(p.sede_id);
    const conDatos = new Set(malla.map((m) => m.persona_id));
    const gente = S.personas.filter((p) => (p.activo || conDatos.has(p.id)) && enFiltro(p));
    const ids = new Set(gente.map((p) => p.id));
    const marcasDe = {};
    marcas.forEach((m) => { if (ids.has(m.persona_id)) ((marcasDe[m.persona_id + m.fecha] = marcasDe[m.persona_id + m.fecha] || {})[m.tipo] = m); });
    const porDia = {}; for (let f = d; f <= h; f = sumarDias(f, 1)) porDia[f] = [];
    const filas = gente.map((p) => ({ p, jornadas: 0, tardes: 0, minTarde: 0, almLargos: 0, salidasAntes: 0, extra: 0, sinMarcar: 0, conPermiso: 0, comPend: 0, dias: [] }));
    const fila = Object.fromEntries(filas.map((r) => [r.p.id, r]));
    malla.filter((m) => ids.has(m.persona_id)).sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach((m) => {
      const r = fila[m.persona_id], t = turno(m.turno_id), tz = tzDe(r.p);
      if (!t || !t.entrada || m.fecha >= fechaEn(tz)) return; // solo días cerrados con horario
      const a = ausenciaEn(aus, m.persona_id, m.fecha);
      if (a) { r.conPermiso++; r.dias.push({ f: m.fecha, txt: TIPOS[a.tipo].ausencia, cls: 'info' }); return; }
      const mk = marcasDe[m.persona_id + m.fecha] || {};
      if (!mk.entrada) { r.sinMarcar++; r.dias.push({ f: m.fecha, txt: 'Sin marcar', cls: 'bad' }); return; }
      r.jornadas++;
      const e = evaluar('entrada', t, mk, tz), al = evaluar('regreso_almuerzo', t, mk, tz), sa = evaluar('salida', t, mk, tz);
      if (e && e.alerta) { r.tardes++; r.minTarde += e.min; porDia[m.fecha].push({ n: r.p.nombre, min: e.min }); r.dias.push({ f: m.fecha, txt: `Tarde ${e.min} min`, cls: 'bad' }); }
      if (al && al.alerta) { r.almLargos++; r.dias.push({ f: m.fecha, txt: `Almuerzo ${al.min} min`, cls: 'warn' }); }
      if (sa && sa.alerta) { r.salidasAntes++; r.dias.push({ f: m.fecha, txt: `Salió ${sa.min} min antes`, cls: 'warn' }); }
      if (sa && sa.extra) r.extra += sa.extra;
    });
    // Comunicados del mes que piden confirmación
    const coms = S.com.lista.filter((c) => c.requiere_confirmacion && c.creado.slice(0, 7) === I.mes).map((c) => {
      const dest = destinatarios(c).filter((p) => ids.has(p.id));
      const faltan = dest.filter((p) => !S.com.lect.some((l) => l.comunicado_id === c.id && l.persona_id === p.id));
      faltan.forEach((p) => { fila[p.id].comPend++; });
      return { c, total: dest.length, ok: dest.length - faltan.length, faltan };
    }).filter((x) => x.total);
    filas.forEach((r) => { r.punt = r.jornadas ? Math.round((r.jornadas - r.tardes) / r.jornadas * 1000) / 10 : null; });
    const sum = (k) => filas.reduce((s, r) => s + r[k], 0);
    const jornadas = sum('jornadas'), tardes = sum('tardes');
    return {
      filas, porDia, coms,
      tot: { jornadas, tardes, minTarde: sum('minTarde'), almLargos: sum('almLargos'), salidasAntes: sum('salidasAntes'), extra: sum('extra'), sinMarcar: sum('sinMarcar'), conPermiso: sum('conPermiso'),
        punt: jornadas ? Math.round((jornadas - tardes) / jornadas * 1000) / 10 : null,
        comTotal: coms.reduce((s, x) => s + x.total, 0), comOk: coms.reduce((s, x) => s + x.ok, 0) }
    };
  }
  const colorPunt = (v) => v == null ? 'mute' : v >= meta() ? 'ok' : v >= meta() - 10 ? 'warn' : 'bad';
  function informesView() {
    const I = S.inf, D = I.datos, T = D.tot;
    const meses = []; let m = fechaEn(miTz()).slice(0, 7);
    for (let i = 0; i < 12; i++) { meses.push(m); m = sumarDias(m + '-01', -1).slice(0, 7); }
    const sedes = esGerencia() ? S.sedes : S.sedes.filter((s) => s.id === P().sede_id);
    const filtros = `<div class="filters card">
      <label>Mes<select id="iMes" class="campo-sm">${meses.map((x) => `<option value="${x}" ${x === I.mes ? 'selected' : ''}>${nombreMes(x)}</option>`).join('')}</select></label>
      <label>Sede<select id="iSede" class="campo-sm" ${esGerencia() ? '' : 'disabled'}>${esGerencia() && S.sedes.length > 1 ? `<option value="todas">${S.sedes.length === 2 ? 'Las dos sedes' : 'Todas las sedes'}</option>` : ''}${sedes.map((s) => `<option value="${s.id}" ${+I.sede === s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select></label>
      <label>Área<select id="iArea" class="campo-sm"><option value="todas">Todas las áreas</option>${S.areas.map((a) => `<option value="${a.id}" ${+I.area === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>
      <button class="btn sm" data-accion="exportar">${ico('download')}Exportar a Excel</button></div>`;
    const pct = T.punt == null ? 0 : Math.min(100, T.punt);
    const kpis = `<div class="kpis six">
      <div class="kpi hero ${colorPunt(T.punt)}"><span class="kpi-l">Puntualidad del equipo</span><b>${T.punt == null ? '—' : String(T.punt).replace('.', ',') + ' %'}</b>
        <div class="meter"><div class="track2"><span style="width:${pct}%"></span><i style="left:${meta()}%"></i></div><div class="scale"><span>0</span><span>Meta ${meta()} %</span><span>100</span></div></div>
        <p class="hint">${plural(T.jornadas, 'jornada marcada', 'jornadas marcadas')} en días cerrados.</p></div>
      <div class="kpi"><span class="kpi-l">Llegadas tarde</span><b>${T.tardes}</b><span class="hint">${T.minTarde} min en total</span></div>
      <div class="kpi"><span class="kpi-l">Almuerzos largos</span><b>${T.almLargos}</b></div>
      <div class="kpi"><span class="kpi-l">Salidas antes de hora</span><b>${T.salidasAntes}</b></div>
      <div class="kpi"><span class="kpi-l">Jornadas sin marcar</span><b>${T.sinMarcar}</b></div>
      <div class="kpi"><span class="kpi-l">Ausencias con permiso</span><b>${T.conPermiso}</b><span class="hint">días</span></div>
      <div class="kpi"><span class="kpi-l">Horas extra</span><b>${duracionMin(T.extra)}</b><span class="hint">salidas 30 min o más después</span></div>
    </div>`;
    const rank = D.filas.filter((r) => r.minTarde > 0).sort((a, b) => b.minTarde - a.minTarde).slice(0, 8);
    const maxR = rank.length ? rank[0].minTarde : 1;
    const ranking = `<section class="card rankbox"><h2>¿Quién llegó más tarde?</h2>
      ${rank.length ? `<ol class="rank">${rank.map((r) => `<li><button data-selinf="${r.p.id}" ${I.sel === r.p.id ? 'aria-pressed="true"' : ''}><span class="rank-n">${esc(r.p.nombre)}</span>
        <span class="track"><span class="fill" style="width:${Math.max(4, r.minTarde / maxR * 100)}%"></span></span><span class="rank-v">${r.minTarde} min · ${plural(r.tardes, 'vez', 'veces')}</span></button></li>`).join('')}</ol>` : '<p class="vacio">Nadie llegó tarde este mes.</p>'}
    </section>`;
    const sel = I.sel && D.filas.find((r) => r.p.id === I.sel);
    const detalle = sel ? `<section class="card detail"><div class="sec-h"><div><h2>${esc(sel.p.nombre)}</h2><p class="hint">${esc(nombreMes(I.mes))} · ${esc(area(sel.p.area_id).nombre)} · ${esc(sede(sel.p.sede_id).nombre)}</p></div><button class="btn ghost sm" data-selinf="" aria-label="Cerrar detalle">${ico('x')}</button></div>
      <p>${plural(sel.jornadas, 'jornada', 'jornadas')} · ${plural(sel.tardes, 'llegada tarde', 'llegadas tarde')} (${sel.minTarde} min) · ${plural(sel.almLargos, 'almuerzo largo', 'almuerzos largos')} · ${plural(sel.salidasAntes, 'salida antes', 'salidas antes')} · ${sel.sinMarcar} sin marcar · ${sel.conPermiso} con permiso · Puntualidad ${sel.punt == null ? '—' : String(sel.punt).replace('.', ',') + ' %'}</p>
      <div class="days">${sel.dias.length ? sel.dias.map((x) => `<span class="chip ${x.cls}"><b>${esc(fechaCorta(x.f))}</b> ${esc(x.txt)}</span>`).join('') : '<span class="mute">Sin novedades en el mes.</span>'}</div></section>` : '';
    const cols = [['p', 'Persona'], ['jornadas', 'Jornadas'], ['tardes', 'Tardes'], ['minTarde', 'Min. tarde'], ['almLargos', 'Alm. largos'], ['salidasAntes', 'Salidas antes'], ['sinMarcar', 'Sin marcar'], ['conPermiso', 'Con permiso'], ['comPend', 'Com. sin confirmar'], ['punt', 'Puntualidad']];
    const o = I.orden;
    const orden = [...D.filas].sort((a, b) => {
      if (o.col === 'p') return a.p.nombre.localeCompare(b.p.nombre) * o.dir;
      return ((a[o.col] ?? -1) - (b[o.col] ?? -1)) * o.dir || a.p.nombre.localeCompare(b.p.nombre);
    });
    const tabla = `<section><div class="sec-h"><h2>Por persona</h2></div><div class="card tablewrap"><table class="inf">
      <thead><tr>${cols.map(([k, n]) => `<th><button data-orden="${k}" aria-sort="${o.col === k ? (o.dir > 0 ? 'ascending' : 'descending') : 'none'}">${n}${o.col === k ? (o.dir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`).join('')}</tr></thead>
      <tbody>${orden.map((r) => `<tr><td><button class="enlace-p" data-selinf="${r.p.id}">${esc(r.p.nombre)}</button>${r.p.activo ? '' : ' <span class="chip mute">Desactivada</span>'}</td>
        <td>${r.jornadas}</td><td>${r.tardes}</td><td>${r.minTarde}</td><td>${r.almLargos}</td><td>${r.salidasAntes}</td><td>${r.sinMarcar}</td><td>${r.conPermiso}</td><td>${r.comPend}</td>
        <td><span class="chip ${colorPunt(r.punt)}">${r.punt == null ? '—' : String(r.punt).replace('.', ',') + ' %'}</span></td></tr>`).join('') || '<tr><td colspan="10" class="vacio">No hay datos para estos filtros.</td></tr>'}</tbody></table></div></section>`;
    const pctCom = T.comTotal ? Math.round(T.comOk / T.comTotal * 100) : null;
    const coms = `<section class="card pad"><div class="sec-h"><h2>Confirmación de comunicados del mes</h2>${pctCom != null ? `<span class="chip ${pctCom >= 90 ? 'ok' : pctCom >= 70 ? 'warn' : 'bad'}">${pctCom} % confirmado · ${T.comTotal - T.comOk} pendientes</span>` : ''}</div>
      ${D.coms.length ? D.coms.map((x) => `<div class="lect"><div class="lect-h"><span><b>${esc(x.c.titulo)}</b> · ${esc(fechaCorta(x.c.creado.slice(0, 10)))}</span><span>${x.ok} de ${x.total}</span></div>
        <div class="bar"><span style="width:${x.total ? x.ok / x.total * 100 : 0}%"></span></div>${x.faltan.length ? `<p class="faltan">Faltan: ${x.faltan.map((p) => esc(p.nombre)).join(', ')}</p>` : ''}</div>`).join('') : '<p class="vacio">No hay comunicados con confirmación este mes.</p>'}</section>`;
    return `${encabezado('Panel de gerencia', `Informe de <em>${esc(nombreMes(I.mes).toLowerCase())}</em>`, 'Solo cuentan los días ya cerrados que tienen turno con horario en la malla.')}
      ${filtros}${kpis}
      <div class="stack"><div class="grid-rep"><section class="card chartbox"><h2>Llegadas tarde por día</h2>${graficaDias(D.porDia)}<div class="tip" id="tip" hidden></div></section>${ranking}</div>
      ${detalle}${tabla}${coms}</div>`;
  }
  // Gráfica de barras SVG hecha a mano: eje Y en pasos de 1, 2 o 5.
  function graficaDias(porDia) {
    const dias = Object.keys(porDia), vals = dias.map((f) => porDia[f].length);
    const max = Math.max(1, ...vals), paso = max <= 5 ? 1 : max <= 10 ? 2 : 5, top = Math.ceil(max / paso) * paso;
    const W = 640, H = 220, L = 30, B = 26, R = 6, Tp = 10, cw = (W - L - R) / dias.length, bw = Math.max(4, cw * 0.62);
    const y = (v) => Tp + (H - Tp - B) * (1 - v / top);
    let g = '';
    for (let v = 0; v <= top; v += paso) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    dias.forEach((f, i) => {
      const x = L + i * cw + (cw - bw) / 2, v = vals[i];
      if (v) g += `<rect x="${x}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="3" class="barra" data-dia="${f}" tabindex="0" aria-label="${fechaCorta(f)}: ${v} llegadas tarde"/>`;
      else g += `<rect x="${x}" y="${y(0) - 2}" width="${bw}" height="2" class="cero"/>`;
      if (f.endsWith('-01') || diaSemana(f) === 1) g += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${+f.slice(8)}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Llegadas tarde por día del mes">${g}</svg>`;
  }
  function mostrarTip(el) {
    const tip = document.getElementById('tip'), f = el.getAttribute('data-dia'), l = (S.inf.datos.porDia[f] || []);
    if (!tip) return;
    tip.innerHTML = `<b>${esc(fechaLarga(f))}</b>${l.map((x) => `<span>${esc(x.n)} · ${x.min} min</span>`).join('')}`;
    const box = tip.parentElement.getBoundingClientRect(), r = el.getBoundingClientRect();
    tip.hidden = false;
    tip.style.left = Math.min(box.width - tip.offsetWidth - 8, Math.max(8, r.left - box.left + r.width / 2 - tip.offsetWidth / 2)) + 'px';
    tip.style.top = Math.max(8, r.top - box.top - tip.offsetHeight - 8) + 'px';
  }
  function exportarInforme() {
    const I = S.inf, D = I.datos;
    const cab = ['Persona', 'Correo', 'Sede', 'Área', 'Jornadas', 'Llegadas tarde', 'Minutos tarde', 'Promedio tarde (min)', 'Almuerzos largos', 'Salidas antes', 'Horas extra (min)', 'Sin marcar', 'Con permiso', 'Comunicados sin confirmar', 'Puntualidad %'];
    const celda = (v) => { const s = String(v ?? ''); return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const filas = D.filas.map((r) => [r.p.nombre, r.p.correo, sede(r.p.sede_id).nombre, area(r.p.area_id).nombre, r.jornadas, r.tardes, r.minTarde,
      r.tardes ? String(Math.round(r.minTarde / r.tardes * 10) / 10).replace('.', ',') : 0, r.almLargos, r.salidasAntes, r.extra, r.sinMarcar, r.conPermiso, r.comPend,
      r.punt == null ? '' : String(r.punt).replace('.', ',')]);
    const csv = '﻿' + [cab, ...filas].map((f) => f.map(celda).join(';')).join('\r\n');
    const sufijo = I.sede !== 'todas' ? '-' + nombreSeguro(sede(+I.sede).nombre) : '';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `asistencia-${I.mes}${sufijo}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Informe exportado.');
  }

  // ---------------------------------------------------------------------------
  // Equipo (administración de cuentas)
  // ---------------------------------------------------------------------------
  function claveTemporal() {
    const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const r = new Uint32Array(10); crypto.getRandomValues(r);
    return Array.from(r, (n) => alfabeto[n % alfabeto.length]).join('');
  }
  async function funcionCuentas(body) {
    const { data, error } = await sb.functions.invoke('crear-usuario', { body });
    if (error) {
      let msg = error.message;
      try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch (e) { /* sin cuerpo */ }
      throw new Error(msg);
    }
    if (data && data.error) throw new Error(data.error);
    return data;
  }
  function equipoView() {
    const E = S.equipo, qq = norm(E.filtro);
    const lista = S.personas.filter((p) => !qq || norm(p.nombre + ' ' + p.correo).includes(qq));
    const k = E.claveNueva;
    return `${encabezado('Administración', 'Equipo', `${plural(activos().length, 'cuenta activa', 'cuentas activas')}. Aquí creas cuentas, restableces contraseñas y desactivas a quien ya no está.`)}
      ${k ? `<section class="card clave" role="status"><div><div class="eyebrow">${k.accion === 'crear' ? 'Cuenta creada' : 'Contraseña restablecida'} · se muestra una sola vez</div>
        <h2>${esc(k.nombre)}</h2><dl><div><dt>Usuario</dt><dd>${esc(k.correo)}</dd></div><div><dt>Contraseña temporal</dt><dd><code>${esc(k.clave)}</code></dd></div></dl>
        <p class="hint">Envíala por un canal privado. Al entrar, la persona creará su propia contraseña.</p></div>
        <div class="acts"><button class="btn sm" data-copiar="1">${ico('copy')}Copiar</button><button class="btn ghost sm" data-accion="cerrarClave">Listo</button></div></section>` : ''}
      <div class="grid-team">
        <section class="card compose"><h2>${ico('plus')}Crear cuenta</h2>
          <form id="fCuenta" class="form-grid" novalidate>
            <div class="field"><label for="eNombre">Nombre completo</label><input id="eNombre" required autocomplete="off"></div>
            <div class="field"><label for="eCorreo">Correo corporativo</label><input id="eCorreo" type="email" required placeholder="${esc(EMPRESA.correoEjemplo)}" autocomplete="off"></div>
            <div class="field"><label for="eSede">Sede</label><select id="eSede">${S.sedes.map((s) => `<option value="${s.id}">${esc(s.nombre)}</option>`).join('')}</select></div>
            <div class="field"><label for="eArea">Área</label><select id="eArea">${S.areas.map((a) => `<option value="${a.id}">${esc(a.nombre)}</option>`).join('')}</select></div>
            <div class="field"><label for="eRol">Rol</label><select id="eRol"><option value="colaborador">Colaborador</option><option value="directora">${esc(EMPRESA.etiquetaDirectora)}</option><option value="gerente">Gerente</option></select></div>
            <button class="btn full" type="submit" ${S.ocupado ? 'disabled' : ''}>${S.ocupado ? 'Creando…' : 'Crear cuenta'}</button>
          </form></section>
        <section><div class="toolbar"><label class="search">${ico('search')}<input id="eFiltro" type="search" placeholder="Buscar por nombre o correo" value="${esc(E.filtro)}" aria-label="Buscar personas"></label></div>
          <div class="card tablewrap" id="eTabla">${tablaEquipo(lista)}</div></section>
      </div>`;
  }
  function tablaEquipo(lista) {
    return `<table class="equipo"><thead><tr><th>Persona</th><th>Sede</th><th>Área</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>
      ${lista.map((p) => { const yo = p.id === P().id; return `<tr class="${p.activo ? '' : 'inactivo'}">
        <td><div class="person"><span class="avatar soft">${esc(initials(p.nombre))}</span><div><b>${esc(p.nombre)}${p.es_admin ? ' <span class="chip info">Admin</span>' : ''}</b><span>${esc(p.correo)}</span></div></div></td>
        <td><select class="campo-sm" data-perfil="${p.id}|sede_id" ${yo ? 'disabled' : ''} aria-label="Sede">${S.sedes.map((s) => `<option value="${s.id}" ${p.sede_id === s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select></td>
        <td><select class="campo-sm" data-perfil="${p.id}|area_id" aria-label="Área"><option value="">Sin área</option>${S.areas.map((a) => `<option value="${a.id}" ${p.area_id === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></td>
        <td><select class="campo-sm" data-perfil="${p.id}|rol" ${yo ? 'disabled' : ''} aria-label="Rol">${['colaborador', 'directora', 'gerente'].map((r) => `<option value="${r}" ${p.rol === r ? 'selected' : ''}>${esc(nombreRol({ rol: r }))}</option>`).join('')}</select></td>
        <td><span class="chip ${p.activo ? 'ok' : 'mute'}">${p.activo ? 'Activa' : 'Desactivada'}</span></td>
        <td class="acts-t"><button class="enlace" data-restablecer="${p.id}">Restablecer contraseña</button>
          ${yo ? '' : `<button class="enlace ${p.activo ? 'eliminar' : ''}" data-activar="${p.id}|${p.activo ? 0 : 1}">${p.activo ? 'Desactivar' : 'Reactivar'}</button>`}</td></tr>`; }).join('') || '<tr><td colspan="6" class="vacio">Nadie coincide con la búsqueda.</td></tr>'}
    </tbody></table>`;
  }

  // ---------------------------------------------------------------------------
  // Guía de uso (cada persona ve lo que aplica a su rol)
  // ---------------------------------------------------------------------------
  function guiaView() {
    const T = tol(), validar = S.config.validar_ip && S.config.validar_ip.activo;
    const secs = [
      { id: 'g-entrar', t: 'Entrar la primera vez', h: `<ol><li>La administración te entrega tu usuario (tu correo corporativo) y una contraseña temporal.</li><li>Al entrar, crea tu propia contraseña (mínimo 8 caracteres).</li><li>Lee y acepta la autorización de tratamiento de datos.</li><li>Si olvidas tu contraseña, pídele a la administración que la restablezca.</li></ol>` },
      { id: 'g-marcar', t: 'Marcar la jornada', h: `<p>En <b>Inicio</b> está tu pase de jornada. Marca cuatro momentos: <b>entrada</b>, <b>salida a almuerzo</b>, <b>regreso</b> y <b>salida</b>. Solo aparece el botón del siguiente paso.</p><ul><li>La hora la pone el servidor: no importa la hora de tu computador.</li><li>Tienes ${T.entrada_min} minutos de gracia en la entrada y ${T.almuerzo_min} en el almuerzo.</li><li>Los turnos sin almuerzo (como el sábado) solo piden entrada y salida.</li><li>Si te equivocas, avísale a tu líder: ella puede corregir la marca.</li></ul>` },
      { id: 'g-malla', t: 'Malla, comunicados y herramientas', h: `<ul><li><b>Malla:</b> muestra el turno de cada persona de lunes a sábado. Es pública para todo el equipo.</li><li><b>Comunicados:</b> cuando un comunicado pide confirmación, tócalo y presiona «Confirmar lectura». En Inicio verás una alerta mientras tengas pendientes.</li><li><b>Herramientas:</b> las tarjetas de Inicio abren las aplicaciones de la agencia en una pestaña nueva.</li></ul>` },
      (moduloSol() || esGerencia()) && { id: 'g-sol', t: 'Solicitudes', h: `<ul><li>Elige el tipo (vacaciones, permiso o incapacidad), las fechas y el motivo. Puedes adjuntar soportes.</li><li>Los permisos pueden ser por horas: llena las dos horas.</li><li>Mientras esté pendiente puedes cancelarla. Cuando la aprueben, ese día no tendrás que marcar.</li></ul>` },
      esLider() && { id: 'g-lider', t: 'Para las líderes de sede', h: `<ul><li><b>Turnos:</b> debajo de la malla ajusta los horarios reales de tu sede. Cada cambio se guarda al salir del campo.</li><li><b>Malla:</b> elige el turno de cada persona en cada día; «Copiar la semana anterior» ahorra tiempo.</li><li><b>Asistencia:</b> muestra quién está al día, quién tiene novedades y quién no ha marcado.</li><li><b>Informes:</b> resumen mensual de tu sede, con exportación a Excel.</li><li><b>Comunicados:</b> publica para todo el equipo, un área o una sede, y mira quién falta por confirmar.</li></ul>` },
      esGerencia() && { id: 'g-gerencia', t: 'Para la gerencia', h: `<ul><li>Ves la asistencia y los informes de todas las sedes.</li><li>En <b>Solicitudes</b> activas o apagas el módulo y decides quién revisa (por ejemplo, contabilidad para incapacidades).</li><li>Puntualidad: (jornadas − llegadas tarde) ÷ jornadas. La meta actual es ${meta()} %.</li>${esAdmin() ? '<li><b>Equipo:</b> crea cuentas, restablece contraseñas y desactiva a quien ya no está (sus registros se conservan).</li>' : ''}</ul>` },
      { id: 'g-faq', t: 'Preguntas frecuentes', h: `<dl class="faq"><dt>¿Puedo marcar desde el celular?</dt><dd>${validar ? 'No. Solo se puede marcar desde la red de la oficina.' : 'Por ahora sí. Más adelante solo se podrá marcar desde la red de la oficina.'}</dd>
        <dt>Mi turno de hoy no aparece.</dt><dd>Puedes marcar igual. Avísale a tu líder para que lo agregue a la malla.</dd>
        <dt>Marqué un paso por error.</dt><dd>No se puede borrar desde la página; tu líder puede corregirlo.</dd>
        <dt>No me deja entrar.</dt><dd>Revisa que el correo esté bien escrito. Si aún falla, la administración puede restablecer tu contraseña.</dd></dl>` }
    ].filter(Boolean);
    return `${encabezado('Ayuda', 'Guía <em>de uso</em>', 'Todo lo que necesitas para usar la intranet, según tu rol.')}
      <div class="guia"><nav class="guia-indice card" aria-label="Índice">${secs.map((s) => `<button data-guia="${s.id}">${esc(s.t)}</button>`).join('')}</nav>
        <div class="guia-texto">${secs.map((s) => `<section class="card" id="${s.id}"><h2>${esc(s.t)}</h2>${s.h}</section>`).join('')}</div></div>`;
  }

  // ---------------------------------------------------------------------------
  // Navegación
  // ---------------------------------------------------------------------------
  const CARGAS = {
    inicio: cargarInicio, malla: cargarMalla, asistencia: cargarAsistencia, informes: cargarInforme,
    comunicados: cargarComunicados, solicitudes: cargarSolicitudes
  };
  async function ir(view) {
    S.view = view; S.menu = false;
    try {
      if (CARGAS[view]) await CARGAS[view]();
      if (view !== 'inicio' && !S.com.cargado) await cargarComunicados();
    } catch (e) { fallo(e); }
    render();
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------
  const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  async function conOcupado(fn) {
    if (S.ocupado) return;
    S.ocupado = true; render();
    try { await fn(); } catch (e) { fallo(e); }
    S.ocupado = false; render();
  }
  async function marcar(tipo) {
    await conOcupado(async () => {
      const r = await q(sb.rpc('marcar', { p_tipo: tipo }));
      await cargarInicio();
      const paso = pasosDe(null).find((x) => x.tipo === tipo);
      toast(`${paso ? paso.paso : 'Marca'} registrada a las ${horaEn(miTz(), new Date(r.hora))}.`);
    });
    if (S.view !== 'inicio') return;
    const b = document.querySelector('.mark-btn'); if (b) b.focus();
  }
  async function enviarLogin() {
    const correo = val('lCorreo').trim().toLowerCase(), clave = val('lClave');
    S.correoLogin = correo;
    if (!correo || !clave) { S.error = 'Escribe tu correo y tu contraseña.'; render(); document.getElementById(correo ? 'lClave' : 'lCorreo').focus(); return; }
    S.error = ''; S.ocupado = true; render();
    const { error } = await sb.auth.signInWithPassword({ email: correo, password: clave });
    S.ocupado = false;
    if (error) { S.error = errorTexto(error); render(); document.getElementById('lClave').focus(); return; }
    await arrancar();
  }
  async function guardarClave() {
    const c1 = val('c1'), c2 = val('c2');
    if (c1.length < 8) { S.error = 'La contraseña debe tener al menos 8 caracteres.'; render(); document.getElementById('c1').focus(); return; }
    if (c1 !== c2) { S.error = 'Las dos contraseñas no coinciden.'; render(); document.getElementById('c2').focus(); return; }
    S.error = ''; S.ocupado = true; render();
    const { data, error } = await sb.auth.updateUser({ password: c1, data: { debe_cambiar_contrasena: false } });
    S.ocupado = false;
    if (error) { S.error = errorTexto(error); render(); return; }
    S.usuario = data.user;
    if (S.pantalla === 'app') { toast('Contraseña actualizada.'); return ir('inicio'); }
    try { await siguientePaso(); } catch (e) { fallo(e); }
  }
  async function crearCuenta() {
    const nombre = val('eNombre').trim(), correo = val('eCorreo').trim().toLowerCase();
    if (!nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) { toast('Escribe el nombre completo y un correo válido.', 'error'); return; }
    const clave = claveTemporal();
    await conOcupado(async () => {
      await funcionCuentas({ accion: 'crear', correo, nombre, sede_id: +val('eSede'), area_id: +val('eArea') || null, rol: val('eRol'), contrasena: clave });
      S.equipo.claveNueva = { accion: 'crear', nombre, correo, clave };
      await recargarPersonas();
      toast('Cuenta creada.');
    });
  }
  async function restablecer(id) {
    const p = persona(id);
    if (!confirm(`¿Restablecer la contraseña de ${p.nombre}? Se le pedirá crear una nueva al entrar.`)) return;
    const clave = claveTemporal();
    await conOcupado(async () => {
      await funcionCuentas({ accion: 'restablecer', id, contrasena: clave });
      S.equipo.claveNueva = { accion: 'restablecer', nombre: p.nombre, correo: p.correo, clave };
      window.scrollTo(0, 0);
    });
  }
  async function activar(id, si) {
    const p = persona(id);
    if (!si && !confirm(`¿Desactivar la cuenta de ${p.nombre}? No podrá entrar, pero sus registros se conservan.`)) return;
    await conOcupado(async () => {
      await funcionCuentas({ accion: si ? 'reactivar' : 'desactivar', id });
      await recargarPersonas();
      toast(si ? 'Cuenta reactivada.' : 'Cuenta desactivada.');
    });
  }
  async function copiarClave() {
    const k = S.equipo.claveNueva;
    const txt = `Hola, ${k.nombre.split(' ')[0]}. Esta es tu cuenta de la ${EMPRESA.intranet}:\n${location.href.split('#')[0].split('?')[0]}\nUsuario: ${k.correo}\nContraseña temporal: ${k.clave}\nAl entrar te pedirá crear tu propia contraseña.`;
    try { await navigator.clipboard.writeText(txt); toast('Copiado. Envíalo por un canal privado.'); }
    catch (e) { prompt('Copia este texto:', txt); }
  }
  async function guardarCampo(promesa, recargar) {
    try { await q(promesa); if (recargar) await recargar(); toast('Guardado.'); }
    catch (e) { fallo(e); if (recargar) await recargar().catch(() => {}); }
    render();
  }
  const recargarTurnos = async () => { S.turnos = await q(sb.from('turnos').select('*').order('codigo')); };
  async function agregarTurno() {
    const sid = (sedesQueLidero().some((s) => s.id === S.turnoSede) ? S.turnoSede : (sedesQueLidero()[0] || {}).id);
    const codigo = val('ntCodigo').trim().toUpperCase(), nombre = val('ntNombre').trim();
    if (!codigo || !nombre) return toast('Escribe el código y el nombre del turno.', 'error');
    if (S.turnos.some((t) => t.sede_id === sid && t.codigo === codigo)) return toast('Ya existe un turno con ese código en la sede.', 'error');
    const conHorario = document.getElementById('ntHorario').checked;
    await guardarCampo(sb.from('turnos').insert({ sede_id: sid, codigo, nombre, entrada: conHorario ? '08:00' : null, salida: conHorario ? '17:00' : null }), recargarTurnos);
  }
  async function cancelarSolicitud(id) {
    if (!confirm('¿Cancelar esta solicitud? Se borrarán también sus soportes.')) return;
    try {
      const rutas = S.sol.adj.filter((a) => a.solicitud_id === id).map((a) => a.ruta);
      if (rutas.length) await q(sb.storage.from('soportes').remove(rutas));
      await q(sb.from('solicitudes').delete().eq('id', id));
      await cargarSolicitudes(); render(); toast('Solicitud cancelada.');
    } catch (e) { fallo(e); }
  }
  async function revisar(id, aprobar) {
    const comentario = val('rc-' + id).trim();
    await conOcupado(async () => {
      await q(sb.rpc('revisar_solicitud', { p_id: id, p_aprobar: aprobar, p_comentario: comentario || null }));
      await cargarSolicitudes();
      toast(aprobar ? 'Solicitud aprobada.' : 'Solicitud rechazada.');
    });
  }
  function agregarArchivos(input, borrador, contenedor, accion) {
    for (const f of input.files) { if (f.type.startsWith('image/')) f._url = URL.createObjectURL(f); borrador.files.push(f); }
    input.value = '';
    document.getElementById(contenedor).innerHTML = previaArchivos(borrador.files, accion);
  }
  function quitarArchivo(borrador, i, contenedor, accion) {
    const [f] = borrador.files.splice(i, 1);
    if (f && f._url) URL.revokeObjectURL(f._url);
    document.getElementById(contenedor).innerHTML = previaArchivos(borrador.files, accion);
  }

  // ---------------------------------------------------------------------------
  // Eventos (delegación global: el HTML se regenera sin perder comportamiento)
  // ---------------------------------------------------------------------------
  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = e.target.id;
    if (id === 'fLogin') enviarLogin();
    else if (id === 'fClave') guardarClave();
    else if (id === 'fCom') publicarComunicado();
    else if (id === 'fSol') enviarSolicitud();
    else if (id === 'fCuenta') crearCuenta();
    else if (id === 'fTurno') agregarTurno();
  });

  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-view],[data-accion],[data-marcar],[data-semana],[data-leer],[data-comf],[data-borrarcom],[data-lb],[data-lbmover],[data-quitarimg],[data-quitarsop],[data-revisar],[data-cancelarsol],[data-lbsol],[data-revquitar],[data-selinf],[data-orden],[data-restablecer],[data-activar],[data-copiar],[data-guia],[data-vercom],[data-soltipo]');
    if (S.menu && !e.target.closest('.menu')) { S.menu = false; if (!el) return render(); }
    if (!el) return;
    const d = el.dataset;
    if (d.view) { S.error = ''; return ir(d.view); }
    if (d.accion) {
      switch (d.accion) {
        case 'salir': return salir();
        case 'menu': S.menu = !S.menu; return render();
        case 'aceptarDatos':
          return conOcupado(async () => { await q(sb.rpc('aceptar_datos')); S.perfil.acepto_datos = new Date().toISOString(); await entrarApp(); });
        case 'copiarSemana': return copiarSemana().catch(fallo);
        case 'recargarAsistencia': try { await cargarAsistencia(); render(); toast('Asistencia actualizada.'); } catch (x) { fallo(x); } return;
        case 'exportar': return exportarInforme();
        case 'verPendientes': S.com.filtro = 'pend'; return ir('comunicados');
        case 'cerrarClave': S.equipo.claveNueva = null; return render();
        case 'lbCerrar': if (el.classList.contains('lightbox') && e.target !== el && !e.target.classList.contains('lb-img')) return; S.lb = null; return render();
        case 'modSol': {
          const valor = { activo: !moduloSol() };
          if (valor.activo === false && !confirm('¿Apagar el módulo de solicitudes? Nadie podrá crear nuevas; lo aprobado se conserva.')) return;
          try { await q(sb.from('configuracion').upsert({ clave: 'modulo_solicitudes', valor }, { onConflict: 'clave' })); S.config.modulo_solicitudes = valor; await cargarSolicitudes(); toast(valor.activo ? 'Solicitudes activadas.' : 'Solicitudes apagadas.'); } catch (x) { fallo(x); }
          return render();
        }
        case 'revAgregar': {
          const pid = val('revNueva'); if (!pid) return toast('Elige una persona.', 'error');
          return guardarCampo(sb.from('revisores').insert({ persona_id: pid, tipos: TODOS_TIPOS, nivel: 'ver' }), cargarSolicitudes);
        }
      }
      return;
    }
    if (d.marcar) return marcar(d.marcar);
    if (d.semana) { S.malla.lunes = sumarDias(S.malla.lunes, +d.semana); try { await cargarMalla(); } catch (x) { fallo(x); } return render(); }
    if (d.leer) return confirmarLectura(+d.leer);
    if (d.comf) { S.com.filtro = d.comf; return render(); }
    if (d.borrarcom) return borrarComunicado(+d.borrarcom);
    if (d.lb) {
      const [cid, i] = d.lb.split('|').map(Number), c = S.com.lista.find((x) => x.id === cid);
      S.lb = { titulo: c.titulo, items: S.com.imgs.filter((x) => x.comunicado_id === cid).map((x) => ({ url: S.com.urls[x.ruta], nombre: x.nombre })), i };
      return render();
    }
    if (d.lbsol) {
      const [sid, i] = d.lbsol.split('|').map(Number), s = S.sol.lista.find((x) => x.id === sid);
      const imgs = S.sol.adj.filter((a) => a.solicitud_id === sid && (a.tipo_mime || '').startsWith('image/') && a.tipo_mime !== 'image/heic' && S.sol.urls[a.ruta]);
      S.lb = { titulo: `${TIPOS[s.tipo].nombre} · ${persona(s.persona_id).nombre}`, items: imgs.map((a) => ({ url: S.sol.urls[a.ruta], nombre: a.nombre })), i };
      return render();
    }
    if (d.lbmover) { const n = S.lb.items.length; S.lb.i = (S.lb.i + +d.lbmover + n) % n; return render(); }
    if (d.quitarimg) return quitarArchivo(S.com.borrador, +d.quitarimg, 'cPrev', 'quitarimg');
    if (d.quitarsop) return quitarArchivo(S.sol.borrador, +d.quitarsop, 'sPrev', 'quitarsop');
    if (d.soltipo) { guardarBorradorSol(); S.sol.tipo = d.soltipo; return render(); }
    if (d.revisar) { const [id, ap] = d.revisar.split('|'); return revisar(+id, ap === '1'); }
    if (d.cancelarsol) return cancelarSolicitud(+d.cancelarsol);
    if (d.revquitar) {
      if (!confirm(`¿Quitar el acceso de ${persona(d.revquitar).nombre} a las solicitudes?`)) return;
      return guardarCampo(sb.from('revisores').delete().eq('persona_id', d.revquitar), cargarSolicitudes);
    }
    if (d.selinf !== undefined) { S.inf.sel = d.selinf || null; render(); if (S.inf.sel) { const x = document.querySelector('.detail'); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } return; }
    if (d.orden) { const o = S.inf.orden; S.inf.orden = { col: d.orden, dir: o.col === d.orden ? -o.dir : (d.orden === 'p' ? 1 : -1) }; return render(); }
    if (d.restablecer) return restablecer(d.restablecer);
    if (d.activar) { const [id, si] = d.activar.split('|'); return activar(id, si === '1'); }
    if (d.copiar) return copiarClave();
    if (d.guia) { const x = document.getElementById(d.guia); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (d.vercom) {
      S.com.hl = +d.vercom; S.com.filtro = 'todos'; S.com.q = '';
      await ir('comunicados');
      const x = document.getElementById('com-' + d.vercom); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  function guardarBorradorSol() {
    if (!document.getElementById('fSol')) return;
    Object.assign(S.sol.borrador, { desde: val('sDesde'), hasta: val('sHasta'), hd: val('sHd'), hh: val('sHh'), motivo: val('sMotivo') });
  }

  document.addEventListener('change', async (e) => {
    const el = e.target, d = el.dataset;
    if (d.malla) {
      const [pid, f] = d.malla.split('|');
      const p = el.value ? sb.from('malla').upsert({ persona_id: pid, fecha: f, turno_id: +el.value }, { onConflict: 'persona_id,fecha' })
        : sb.from('malla').delete().eq('persona_id', pid).eq('fecha', f);
      return guardarCampo(p, cargarMalla);
    }
    if (d.turno) {
      const [id, campo] = d.turno.split('|');
      const v = campo === 'activo' ? el.checked : campo === 'nombre' ? el.value.trim() : (el.value || null);
      if (campo === 'nombre' && !v) return toast('El nombre no puede quedar vacío.', 'error');
      return guardarCampo(sb.from('turnos').update({ [campo]: v }).eq('id', +id), recargarTurnos);
    }
    if (d.perfil) {
      const [id, campo] = d.perfil.split('|');
      const v = campo === 'rol' ? el.value : (el.value ? +el.value : null);
      return guardarCampo(sb.from('perfiles').update({ [campo]: v }).eq('id', id), recargarPersonas);
    }
    if (d.rev) {
      const [pid, campo] = d.rev.split('|');
      return guardarCampo(sb.from('revisores').update({ [campo]: campo === 'sede_id' ? (el.value ? +el.value : null) : el.value }).eq('persona_id', pid), cargarSolicitudes);
    }
    if (d.revtipo) {
      const [pid, tipo] = d.revtipo.split('|'), r = S.sol.revisores.find((x) => x.persona_id === pid);
      const tipos = el.checked ? [...new Set([...r.tipos, tipo])] : r.tipos.filter((t) => t !== tipo);
      if (!tipos.length) { el.checked = true; return toast('Debe quedar al menos un tipo.', 'error'); }
      return guardarCampo(sb.from('revisores').update({ tipos: TODOS_TIPOS.filter((t) => tipos.includes(t)) }).eq('persona_id', pid), cargarSolicitudes);
    }
    switch (el.id) {
      case 'mSede': S.malla.sede = el.value; return render();
      case 'tSede': S.turnoSede = +el.value; return render();
      case 'aSede': S.asistencia.sede = el.value; return render();
      case 'iMes': S.inf.mes = el.value; S.inf.sel = null; try { await cargarInforme(); } catch (x) { fallo(x); } return render();
      case 'iSede': S.inf.sede = el.value; S.inf.sel = null; S.inf.datos = calcularInforme(); return render();
      case 'iArea': S.inf.area = el.value; S.inf.sel = null; S.inf.datos = calcularInforme(); return render();
      case 'cImgs': return agregarArchivos(el, S.com.borrador, 'cPrev', 'quitarimg');
      case 'sArch': return agregarArchivos(el, S.sol.borrador, 'sPrev', 'quitarsop');
      case 'cPara': S.com.borrador.para = el.value; return;
      case 'cConf': S.com.borrador.conf = el.checked; return;
      case 'cFijar': S.com.borrador.fijar = el.checked; return;
    }
  });

  // Los buscadores solo redibujan su lista para no perder el foco.
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'qCom') { S.com.q = el.value; document.getElementById('comLista').innerHTML = listaComunicados(); }
    else if (el.id === 'eFiltro') { S.equipo.filtro = el.value; const qq = norm(el.value); document.getElementById('eTabla').innerHTML = tablaEquipo(S.personas.filter((p) => !qq || norm(p.nombre + ' ' + p.correo).includes(qq))); }
    else if (el.id === 'cTitulo') S.com.borrador.titulo = el.value;
    else if (el.id === 'cCuerpo') S.com.borrador.cuerpo = el.value;
    else if (el.closest && el.closest('#fSol')) guardarBorradorSol();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (S.lb) { S.lb = null; render(); }
      else if (S.menu) { S.menu = false; render(); const a = document.querySelector('.avatar'); if (a) a.focus(); }
    } else if (S.lb && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const n = S.lb.items.length; S.lb.i = (S.lb.i + (e.key === 'ArrowRight' ? 1 : -1) + n) % n; render();
    }
  });

  // Tooltip de la gráfica de informes
  const enBarra = (e) => { const b = e.target.closest && e.target.closest('[data-dia]'); if (b) mostrarTip(b); };
  document.addEventListener('mouseover', enBarra);
  document.addEventListener('focusin', enBarra);
  document.addEventListener('mouseout', (e) => { if (e.target.closest && e.target.closest('[data-dia]')) { const t = document.getElementById('tip'); if (t) t.hidden = true; } });

  sb.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT' && S.pantalla !== 'login') reiniciar();
  });

  arrancar();
})();
