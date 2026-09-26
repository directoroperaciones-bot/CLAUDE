(() => {
  'use strict';

  // Plantillas oficiales del plugin y sus datos de ejemplo, incrustados por build.py.
  const PLANTILLAS = "__PLANTILLAS__";
  const EJEMPLOS = "__EJEMPLOS__";
  // Íconos Lucide incrustados como SVG inline (no máscaras CSS, para que sobrevivan capturas y PDF).
  const ICONOS = "__ICONOS__";
  // Poppins Regular, Medium y Bold del plugin (fuentes/), incrustadas para que el documento mida igual que en el motor.
  const FUENTES = "__FUENTES__";
  // Logos, estrella y degradado de protección del itinerario, por su ruta en la plantilla.
  const RECURSOS = "__RECURSOS__";

  const ASESOR = { nombre: 'Andrea Gómez', correo: 'andrea@agenciacaminos.com.co', telefono: '+57 300 000 0000' };

  // ================= utilidades =================
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const iconos = (r = document) => $$('i[data-lucide]', r).forEach(el => { const svg = ICONOS[el.dataset.lucide]; if (svg) el.outerHTML = svg; });
  const vacio = v => v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Igual que e() del motor: escapa y convierte **así** en negrita de marca.
  const e = s => esc(String(s ?? '').trim()).replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;color:#1F2024">$1</strong>');
  const rep = (h, a, b) => h.split(a).join(b);
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const clonar = o => JSON.parse(JSON.stringify(o ?? {}));
  const hoy = () => new Date().toISOString().slice(0, 10);
  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, p, v) => { const ks = p.split('.'); let a = o; ks.slice(0, -1).forEach(k => { a = a[k] ??= {}; }); a[ks.at(-1)] = v; };

  // ================= motor: puerto de motor/comun.py =================
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const RE_ISO = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$/;
  function fecha(v, estilo = 'coma', cero = false) {
    const m = RE_ISO.exec(String(v || ''));
    if (!m) return v;
    const f = new Date(+m[1], +m[2] - 1, +m[3]);
    const dia = cero || estilo === 'corta' ? String(f.getDate()).padStart(2, '0') : String(f.getDate());
    if (estilo === 'corta') return `${dia} ${MES_CORTO[f.getMonth()]} ${f.getFullYear()}`;
    const base = `${dia} de ${MESES[f.getMonth()]}`;
    if (estilo === 'de') return `${base} de ${f.getFullYear()}`;
    if (estilo === 'dia') return `${DIAS[f.getDay()]} ${base}, ${f.getFullYear()}`;
    return `${base}, ${f.getFullYear()}`;
  }
  function rango(desde, hasta) {
    const m1 = RE_ISO.exec(String(desde || '')), m2 = RE_ISO.exec(String(hasta || ''));
    if (!m1 || !m2) return `${desde} al ${hasta}`;
    const a = new Date(+m1[1], +m1[2] - 1, +m1[3]), b = new Date(+m2[1], +m2[2] - 1, +m2[3]);
    if (a.getFullYear() !== b.getFullYear()) return `${a.getDate()} de ${MESES[a.getMonth()]} de ${a.getFullYear()} al ${b.getDate()} de ${MESES[b.getMonth()]} de ${b.getFullYear()}`;
    if (a.getMonth() !== b.getMonth()) return `${a.getDate()} de ${MESES[a.getMonth()]} al ${b.getDate()} de ${MESES[b.getMonth()]}, ${b.getFullYear()}`;
    return `${a.getDate()} al ${b.getDate()} de ${MESES[b.getMonth()]}, ${b.getFullYear()}`;
  }
  const codigoDocumento = (codigo, prefijo) => { const g = String(codigo).match(/\d+/g); return g ? `${prefijo}-${g.at(-1)}` : String(codigo); };
  function patron(tpl, m) {
    const r = new RegExp(reEsc('{{' + m + '}}') + '\\s*<!--[^\\n]*\\n\\s*([\\s\\S]*?)\\n\\s*-->').exec(tpl);
    if (!r) throw new Error('La plantilla no tiene el patrón de ' + m);
    return r[1].trim();
  }
  function quitar(h, re) {
    let n = 0;
    const nuevo = h.replace(re, () => { n++; return ''; });
    if (n !== 1) throw new Error('No encontré en la plantilla el bloque a omitir: ' + String(re).slice(0, 60));
    return nuevo;
  }
  const quitarCampo = (h, m) => quitar(h, new RegExp('\\s*<div style="[^"]*"><span class="(?:meta-label|l)">[^<]*</span><span class="(?:meta-value|v)"[^>]*>\\{\\{' + m + '\\}\\}</span></div>'));
  function sinMarcadores(h) {
    const sobra = h.match(/\{\{[a-z_]+\}\}/g);
    if (sobra) throw new Error('Quedaron marcadores sin llenar: ' + [...new Set(sobra)].join(', '));
  }
  const COLUMNAS = { aereo: ['vuelo', 'fecha', 'ruta', 'sale', 'llega'], hotel: ['hotel', 'entrada', 'salida', 'acomodacion', 'confirmacion'], traslado: ['trayecto', 'fecha', 'hora', 'confirmacion'] };
  const FECHAS = new Set(['fecha', 'entrada', 'salida']);
  function patronesTarjeta(tpl, marcador) {
    const bloque = new RegExp('\\{\\{' + marcador + '\\}\\}\\s*<!--([\\s\\S]*?)-->').exec(tpl)[1];
    const out = {};
    for (const [clave, etq, sig] of [['aereo', 'AÉREO', 'HOTEL'], ['hotel', 'HOTEL', 'TRASLADO'], ['traslado', 'TRASLADO', null]]) {
      const m = new RegExp(etq + '[^\\n]*\\n([\\s\\S]*?)' + (sig ? '\\n\\s*' + sig : '$')).exec(bloque);
      out[clave] = m[1].replace(/\s+$/, '');
    }
    return out;
  }
  function tarjeta(pat, tipo, filas, proveedor, tiquete, record, tituloHotel) {
    const cols = COLUMNAS[tipo];
    const ths = pat.match(/<th(?:\s[^>]*)?>.*?<\/th>/g);
    const filaPat = /<tr><td.*?<\/tr>/.exec(pat)[0];
    const tds = [...filaPat.matchAll(/(<td[^>]*>).*?<\/td>/g)].map(m => m[1]);
    const usar = cols.map((k, i) => i).filter(i => filas.some(f => !vacio(f[cols[i]])));
    const celda = (i, f) => tds[i] + e(FECHAS.has(cols[i]) ? fecha(f[cols[i]], 'corta') : f[cols[i]]) + '</td>';
    const thead = '<thead><tr>' + usar.map(i => ths[i]).join('') + '</tr></thead>';
    const cuerpo = filas.map(f => '<tr>' + usar.map(i => celda(i, f)).join('') + '</tr>').join('\n          ');
    let h = pat.replace(/<thead>[\s\S]*?<\/thead>/, () => thead).replace(/<tbody>[\s\S]*?<\/tbody>/, () => '<tbody>\n          ' + cuerpo + '\n        </tbody>');
    if (tipo === 'aereo') {
      const partes = [];
      if (!vacio(tiquete)) partes.push(`Tiquete <b>${e(tiquete)}</b>`);
      if (!vacio(record)) partes.push(`Récord <b>${e(record)}</b>`);
      h = partes.length ? h.replace(/<span class="conf-cod">[\s\S]*?<\/span>\n/, () => '<span class="conf-cod">' + partes.join(' &nbsp;·&nbsp; ') + '</span>\n')
        : h.replace(/\s*<span class="conf-cod">[\s\S]*?<\/span>/, () => '');
      h = rep(h, 'AEROLÍNEA', e(proveedor));
    } else if (tipo === 'traslado') h = rep(h, 'OPERADOR', e(proveedor));
    else if (tipo === 'hotel' && !vacio(tituloHotel)) h = rep(h, '<span class="conf-prov">Alojamiento</span>', '<span class="conf-prov">' + e(tituloHotel) + '</span>');
    return h;
  }

  // ================= motor: cotización (skills/caminos-cotizacion/scripts/generar.py) =================
  function armarCotizacion(d0) {
    const d = clonar(d0);
    d.fecha_llegada = fecha(d.fecha_llegada, 'coma');
    d.fecha_salida = fecha(d.fecha_salida, 'coma');
    d.vigencia = fecha(d.vigencia, 'de');
    (d.itinerario || []).forEach(s => { s.fecha = fecha(s.fecha, 'dia'); });
    const tpl = PLANTILLAS.cotizacion;
    const pInc = patron(tpl, 'items_incluye'), pNo = patron(tpl, 'items_no_incluye');
    const pTar = patron(tpl, 'filas_tarifas'), pIti = patron(tpl, 'filas_itinerario');
    let h = tpl.replace(/\s*<!-- PATRÓN[\s\S]*?-->/g, '');
    for (const k of ['destino', 'fecha_llegada', 'fecha_salida', 'noches', 'pasajeros', 'acomodacion'])
      if (vacio(d[k])) h = h.replace(new RegExp('\\s*<div style="[^"]*"><span class="meta-label">[^<]*</span><span class="meta-value">\\{\\{' + k + '\\}\\}</span></div>'), () => '');
    if (vacio(d.parrafo_intro)) h = h.replace(/\s*<p style="[^"]*">\{\{parrafo_intro\}\}<\/p>/, () => '');
    h = rep(h, '{{items_incluye}}', d.incluye.filter(i => !vacio(i)).map(i => rep(pInc, 'TEXTO', e(i))).join('\n      '));
    const noinc = (d.no_incluye || []).filter(i => !vacio(i));
    if (noinc.length) h = rep(h, '{{items_no_incluye}}', noinc.map(i => rep(pNo, 'TEXTO', e(i))).join('\n      '));
    else h = h.replace(/\s*<h2 class="sec"[^>]*>El precio <span[^>]*>no incluye<\/span><\/h2>\s*<span class="dash"[^>]*><\/span>\s*<div[^>]*>\s*\{\{items_no_incluye\}\}\s*<\/div>/, () => '');
    h = rep(h, '{{filas_tarifas}}', d.tarifas.filter(t => !vacio(t.valor)).map(t =>
      rep(rep(rep(pTar, 'HOTEL', e(t.hotel || '')), 'ACOMODACIÓN', e(t.acomodacion || '')), '$VALOR', e(t.valor))).join('\n      '));
    const iti = (d.itinerario || []).filter(s => ['servicio', 'fecha', 'detalle'].some(k => !vacio(s[k])));
    if (iti.length) h = rep(h, '{{filas_itinerario}}', iti.map(s =>
      rep(rep(rep(pIti, 'SERVICIO', e(s.servicio || '')), 'FECHA', e(s.fecha || '')), 'DETALLE', e(s.detalle || ''))).join('\n      '));
    else h = h.replace(/\s*<h2 class="sec"[^>]*>Itinerario <span[^>]*>de servicios<\/span><\/h2>\s*<span class="dash"[^>]*><\/span>\s*<table[^>]*>[\s\S]*?\{\{filas_itinerario\}\}[\s\S]*?<\/table>/, () => '');
    const parrafos = String(d.condiciones_pago).trim().split(/\n\s*\n/).filter(p => p.trim());
    h = rep(h, '{{condiciones_pago}}', parrafos.length === 1 ? e(parrafos[0]) : parrafos.map(p => `<p style="margin:0 0 10px;">${e(p)}</p>`).join(''));
    if (String(d.asesor.correo || '').trim().length > 28) {
      h = h.replace('<div style="width:25%;padding-right:14px;"><span class="meta-label">Vigencia', () => '<div style="width:24%;padding-right:14px;"><span class="meta-label">Vigencia');
      h = h.replace('<div style="width:22%;padding-right:14px;"><span class="meta-label">Tu asesor', () => '<div style="width:18%;padding-right:14px;"><span class="meta-label">Tu asesor');
      h = h.replace('<div style="width:33%;padding-right:14px;"><span class="meta-label">Correo', () => '<div style="width:38%;padding-right:14px;"><span class="meta-label">Correo');
    }
    for (const k of ['nombre', 'correo', 'telefono']) h = rep(h, '{{asesor_' + k + '}}', e(d.asesor[k]));
    const codigo = String(d.codigo_cotizacion).trim();
    const valores = { codigo_cotizacion: codigo, codigo_documento: /\d/.test(codigo) ? 'CAM-COT-' + codigo.replace(/^[A-Za-z]+/, '') : codigo };
    for (const k of ['titulo_destino', 'parrafo_intro', 'destino', 'fecha_llegada', 'fecha_salida', 'noches', 'pasajeros', 'acomodacion', 'vigencia']) valores[k] = d[k] || '';
    for (const [k, v] of Object.entries(valores)) h = rep(h, '{{' + k + '}}', e(v));
    h = rep(h, '{{total_paginas}}', String(h.split('<section class="page"').length - 1));
    // Fotos: la del destino va en el encabezado; los hoteles con foto salen en "Tus opciones de hotel".
    if (d.foto_portada) h = h.replace(/<div style="position:relative;height:420px;overflow:hidden;background:#F25061;">[\s\S]*?\n  <\/div>\n/, hero => portadaConFoto(hero, d.foto_portada, 420));
    const conFoto = [], vistos = new Set();
    for (const t of d.tarifas) {
      const nombre = (t.hotel || '').trim();
      if (!t.foto || !nombre || vistos.has(nombre) || vacio(t.valor)) continue;
      vistos.add(nombre);
      const valores = d.tarifas.filter(x => (x.hotel || '').trim() === nombre && !vacio(x.valor)).map(x => x.valor);
      const num = v => parseInt(String(v).replace(/\D/g, '') || '0', 10);
      const precio = valores.length === 1 ? e(valores[0]) : 'desde ' + e(valores.reduce((a, b) => (num(b) < num(a) ? b : a)));
      conFoto.push([t.foto, e(nombre), `<span style="font-weight:600;color:#F25061;">${precio}</span> por persona`]);
    }
    if (conFoto.length) {
      const bloque = '<h2 class="sec" style="margin-top:26px;font-size:36px;">Tus opciones <span style="color:#F25061;">de hotel</span></h2>\n' +
        '  <span class="dash" style="margin-top:14px;"></span>\n  <div style="display:flex;flex-wrap:wrap;margin-top:22px;">' + tarjetasFoto(conFoto).join('') + '</div>\n\n  ';
      const marca = '<h2 class="sec" style="margin-top:26px;font-size:36px;">Tarifas <span';
      h = h.replace(marca, () => bloque + marca);
    }
    sinMarcadores(h);
    return h;
  }

  // ================= motor: confirmación (skills/caminos-confirmacion/scripts/generar.py) =================
  function tarjetasConfirmacion(d, pats) {
    const out = [];
    for (const t of d.aereo || []) {
      const tray = (t.trayectos || []).filter(x => COLUMNAS.aereo.some(k => !vacio(x[k])));
      if (tray.length) out.push(tarjeta(pats.aereo, 'aereo', tray, t.aerolinea || '', t.tiquete, t.record));
    }
    const hoteles = (d.hoteles || []).filter(x => !vacio(x.hotel));
    if (hoteles.length) out.push(tarjeta(pats.hotel, 'hotel', hoteles));
    const grupos = new Map();
    for (const x of d.traslados || []) {
      if (!COLUMNAS.traslado.some(k => !vacio(x[k]))) continue;
      const op = (x.operador || '').trim();
      if (!grupos.has(op)) grupos.set(op, []);
      grupos.get(op).push(x);
    }
    for (const [op, filas] of grupos) out.push(tarjeta(pats.traslado, 'traslado', filas, op));
    return out;
  }
  function armarConfirmacion(d) {
    const tpl = PLANTILLAS.confirmacion;
    const pServ = patron(tpl, 'items_servicios_confirmados'), pPago = patron(tpl, 'filas_pago');
    let h = tpl.replace(/\s*<!-- PATRÓN por (?:servicio|ítem|fila)[\s\S]*?-->/g, '').replace(/\s*<!-- Las tarjetas de confirmación que no quepan[\s\S]*?-->/g, '');
    for (const k of ['destino', 'pasajeros', 'estado_pago']) if (vacio(d[k])) h = quitarCampo(h, k);
    if (vacio(d.parrafo_confirmacion)) h = rep(h, ' {{parrafo_confirmacion}}', '');
    const serv = (d.servicios_confirmados || []).filter(x => !vacio(x));
    if (serv.length) h = rep(h, '{{items_servicios_confirmados}}', serv.map(x => rep(pServ, 'TEXTO', e(x))).join('\n    '));
    else h = quitar(h, /\s*<h2 class="sec"[^>]*>Servicios <span[^>]*>confirmados<\/span><\/h2>\s*<span class="dash"[^>]*><\/span>\s*<div[^>]*>\s*\{\{items_servicios_confirmados\}\}\s*<\/div>/);
    const pagos = (d.pagos || []).filter(x => !vacio(x.concepto) || !vacio(x.valor));
    if (pagos.length) h = rep(h, '{{filas_pago}}', pagos.map(x => rep(rep(rep(pPago, 'CONCEPTO', e(x.concepto || '')), '$VALOR', e(x.valor || '')), 'ESTADO', e(x.estado || ''))).join('\n      '));
    else h = quitar(h, /\s*<h3 class="sub">Información <span[^>]*>de pago<\/span><\/h3>\s*<span class="dash"[^>]*><\/span>\s*<table[\s\S]*?\{\{filas_pago\}\}[\s\S]*?<\/table>/);
    if (vacio(d.nota_importante)) h = quitar(h, /\s*<div class="nota"[^>]*>\s*<span>\{\{nota_importante\}\}<\/span>\s*<\/div>/);
    const ases = { asesor: d.asesor, asesor_correo: d.asesor_correo, asesor_telefono: d.asesor_telefono };
    if (Object.values(ases).every(vacio)) h = quitar(h, /\s*<h3 class="sub">¿Tienes <span[^>]*>dudas\?<\/span><\/h3>\s*<span class="dash"[^>]*><\/span>\s*<div[^>]*>[\s\S]*?\{\{asesor_telefono\}\}<\/span><\/div>\s*<\/div>/);
    else for (const [k, v] of Object.entries(ases)) h = vacio(v) ? quitarCampo(h, k) : rep(h, '{{' + k + '}}', e(v));
    const valores = {
      codigo_reserva: d.codigo_reserva, codigo_documento: codigoDocumento(d.codigo_reserva, 'CAM-CONF'), titulo_viaje: d.titulo_viaje,
      nombre_viajero: d.nombre_viajero, parrafo_confirmacion: d.parrafo_confirmacion || '', destino: d.destino || '', pasajeros: d.pasajeros || '',
      estado_pago: d.estado_pago || '', fecha_salida: fecha(d.fecha_salida, 'coma', true), fecha_regreso: fecha(d.fecha_regreso, 'coma', true),
      nota_importante: d.nota_importante || '',
    };
    for (const [k, v] of Object.entries(valores)) h = rep(h, '{{' + k + '}}', e(v));
    const cards = tarjetasConfirmacion(d, patronesTarjeta(tpl, 'tarjetas_confirmacion'));
    if (!cards.length) {
      h = quitar(h, /\s*<!-- ======== CONFIRMACIONES DE SERVICIOS ======== -->[\s\S]*?\{\{tarjetas_confirmacion\}\}/);
    }
    // Todas las tarjetas van en la hoja 1; el reparto pasa a la hoja siguiente lo que no quepa.
    h = rep(rep(h, '{{tarjetas_confirmacion}}', cards.join('\n\n    ')), '\n  {{tarjetas_continuacion}}', '');
    sinMarcadores(h);
    return h;
  }

  // ================= motor: voucher (skills/caminos-voucher/scripts/generar.py) =================
  function tarjetaVoucher(d, pats) {
    const tipo = d.tipo;
    if (tipo === 'hotel') return tarjeta(pats.hotel, 'hotel', d.hoteles.filter(x => !vacio(x.hotel)), null, null, null, d.proveedor);
    if (tipo === 'aereo') {
      const a = d.aereo;
      return tarjeta(pats.aereo, 'aereo', a.trayectos.filter(x => COLUMNAS.aereo.some(k => !vacio(x[k]))), a.aerolinea || d.proveedor, a.tiquete, a.record);
    }
    return tarjeta(pats.traslado, 'traslado', d.traslados.filter(x => COLUMNAS.traslado.some(k => !vacio(x[k]))), d.proveedor);
  }
  function armarVoucher(d) {
    const tpl = PLANTILLAS.voucher;
    const pats = patronesTarjeta(tpl, 'tarjeta_confirmacion');
    const pInc = patron(tpl, 'items_incluye');
    let h = tpl.replace(/\s*<!-- UNA SOLA tarjeta:[\s\S]*?-->/g, '').replace(/\s*<!-- PATRÓN por ítem[\s\S]*?-->/g, '');
    const acomp = Array.isArray(d.acompanantes) ? d.acompanantes.map(x => String(x).trim()).filter(Boolean).join(', ') : d.acompanantes;
    for (const [k, v] of [['acompanantes', acomp], ['ubicacion', d.ubicacion], ['codigo_reserva', d.codigo_reserva]])
      h = vacio(v) ? quitarCampo(h, k) : rep(h, '{{' + k + '}}', e(v));
    h = rep(h, '{{tarjeta_confirmacion}}', tarjetaVoucher(d, pats));
    const inc = (d.incluye || []).filter(x => !vacio(x));
    if (inc.length) h = rep(h, '{{items_incluye}}', inc.map(x => rep(pInc, 'TEXTO', e(x))).join('\n      '));
    else h = quitar(h, /\s*<h2 class="sec"[^>]*>Este voucher <span[^>]*>incluye<\/span><\/h2>\s*<span class="dash"[^>]*><\/span>\s*<div[^>]*>\s*\{\{items_incluye\}\}\s*<\/div>/);
    if (vacio(d.instrucciones)) h = quitar(h, /\s*<h2 class="sec"[^>]*>Instrucciones <span[^>]*>de uso<\/span><\/h2>\s*<span class="dash"[^>]*><\/span>\s*<div[^>]*>\s*\{\{instrucciones\}\}\s*<\/div>/);
    if (vacio(d.condiciones)) h = quitar(h, /\s*<div class="nota"[^>]*>\s*<span>\{\{condiciones\}\}<\/span>\s*<\/div>/);
    const cod = String(d.codigo_voucher).trim();
    const valores = {
      codigo_voucher: cod, codigo_documento: cod, nombre_servicio: d.nombre_servicio, nombre_viajero: d.nombre_viajero,
      vigencia: rango(d.vigencia.desde, d.vigencia.hasta), instrucciones: d.instrucciones || '', condiciones: d.condiciones || '',
    };
    for (const [k, v] of Object.entries(valores)) h = rep(h, '{{' + k + '}}', e(v));
    sinMarcadores(h);
    return h;
  }

  // ================= reparto entre hojas (versión en el navegador de motor/flujo.py) =================
  // Mide el documento ya dibujado y pasa a la hoja siguiente lo que no quepa: parte tablas,
  // tarjetas y listas repitiendo su encabezado, mantiene cada título con su primer elemento y,
  // si hace falta, abre una hoja de continuación con el mismo encabezado y pie.
  const ALTO_PAGINA = 1373;
  // Los límites del motor (1178 px, y 1156 en la cotización) se miden sobre la tinta del PDF;
  // aquí se mide la caja, que queda unos píxeles más abajo, así que se usan 6 px más.
  const HOLGURA_CAJA = 6;
  function fluir(doc, { limite: limiteMotor = 1178, etiqueta = null, pegarNota = false, juntar = false, compacto = false, sinPoliticas = false } = {}) {
    const limite = limiteMotor + HOLGURA_CAJA;
    const esPol = p => !!p.querySelector('.pol-cols');
    const paginas = () => [...doc.querySelectorAll('section.page')];
    const raiz = p => (p.querySelector(':scope > .hdr') ? p : p.children[1]);
    const flujoDe = p => {
      const r = raiz(p);
      const hijos = [...r.children];
      const desde = r === p ? hijos.findIndex(x => x.classList.contains('rule')) + 1 : 0;
      return hijos.slice(desde).filter(x => !x.classList.contains('footer') && !x.classList.contains('banda'));
    };
    const esTitulo = el => el.matches('h2.sec, h3.sub');
    const bloques = p => {
      const els = flujoDe(p), out = [];
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (esTitulo(el)) {
          const b = [el];
          if (els[i + 1]?.matches('span.dash')) b.push(els[++i]);
          if (els[i + 1] && !esTitulo(els[i + 1])) b.push(els[++i]);
          out.push(b);
        } else if (pegarNota && el.matches('div.nota') && out.length && out.at(-1).at(-1).matches('table')) out.at(-1).push(el);
        else out.push([el]);
      }
      return out;
    };
    const fondo = (el, p) => el.getBoundingClientRect().bottom - p.getBoundingClientRect().top;
    const dentro = el => el.querySelector('tbody') ? [...el.querySelector('tbody').rows] : el.matches('div') && getComputedStyle(el).flexWrap === 'wrap' ? [...el.children] : [];
    // Parte un elemento divisible (tabla, tarjeta con tabla, lista a dos columnas) en el primer ítem
    // que no cabe. Devuelve la copia con lo que pasa a la hoja siguiente, o null si no se puede.
    function partir(el, p) {
      const items = dentro(el);
      if (items.length < 2) return null;
      let j = items.findIndex(x => fondo(x, p) > limite);
      if (j > 0 && el.matches('div') && !el.querySelector('tbody')) {
        const porFila = items.filter(x => Math.abs(x.getBoundingClientRect().top - items[0].getBoundingClientRect().top) < 2).length;
        j -= j % porFila; // una fila de la lista (dos columnas, o tres tarjetas de foto) nunca se parte
      }
      if (j <= 0) return null;
      const copia = el.cloneNode(true);
      const itemsCopia = dentro(copia);
      itemsCopia.slice(0, j).forEach(x => x.remove());
      items.slice(j).forEach(x => x.remove());
      return copia;
    }
    function hojaNueva(antesDe) {
      const todas = paginas();
      const marco = [...todas].reverse().find(p => !esPol(p) && p.querySelector(':scope > .hdr')) || todas.at(-1);
      const hoja = marco.cloneNode(true);
      const hijos = [...hoja.children];
      const ini = hijos.findIndex(x => x.classList.contains('rule')) + 1;
      hijos.slice(ini).filter(x => !x.classList.contains('footer') && !x.classList.contains('banda')).forEach(x => x.remove());
      if (etiqueta && marco === todas.at(-1)) hoja.querySelector('.hdr .eyebrow').textContent = etiqueta;
      antesDe.before(hoja);
      return hoja;
    }
    function aHoja(p, els) {
      const r = raiz(p);
      const primero = flujoDe(p)[0];
      const ref = primero || r.querySelector(':scope > .footer');
      els.forEach(x => (ref ? ref.before(x) : r.append(x)));
      const mt = parseFloat(getComputedStyle(els[0]).marginTop) || 0;
      if (mt > 26) { els[0].dataset.mt = els[0].style.marginTop; els[0].style.marginTop = '26px'; }
    }
    // Al final de una hoja (después de su último bloque); el margen recortado al abrir hoja se devuelve.
    function alFinal(p, els) {
      const ult = flujoDe(p).at(-1);
      if (!ult) return aHoja(p, els);
      ult.after(...els);
      if (els[0].dataset.mt !== undefined) { els[0].style.marginTop = els[0].dataset.mt; delete els[0].dataset.mt; }
    }
    const contenido = () => paginas().filter(p => !esPol(p));
    const cabe = p => bloques(p).every(b => fondo(b.at(-1), p) <= limite);
    function repartir() {
    for (let vuelta = 0; vuelta < 60; vuelta++) {
      const todas = paginas();
      const idx = todas.findIndex(p => !esPol(p) && bloques(p).some(b => fondo(b.at(-1), p) > limite));
      if (idx === -1) break;
      const p = todas[idx];
      const bs = bloques(p);
      const k = bs.findIndex(b => fondo(b.at(-1), p) > limite);
      const mover = [];
      const ultimo = bs[k].at(-1);
      const copia = partir(ultimo, p);
      if (copia) {
        // La copia repite el encabezado de la tarjeta o el thead de la tabla; el título se queda con lo que cupo.
        copia.dataset.cont = '1';
        mover.push(copia);
      } else {
        if (k === 0) break; // un solo bloque más alto que la hoja: no se puede hacer nada mejor
        mover.push(...bs[k]);
      }
      bs.slice(k + 1).forEach(b => mover.push(...b));
      const siguiente = todas[idx + 1];
      const destino = siguiente && !esPol(siguiente) ? siguiente : hojaNueva(todas.find(esPol));
      aHoja(destino, mover);
    }
    subir();
    // Quita hojas de contenido que hayan quedado vacías (nunca la primera).
    paginas().forEach((p, i) => { if (i > 0 && !esPol(p) && !flujoDe(p).length) p.remove(); });
    }
    // Repaso final del motor: si el primer bloque de una hoja cabe al final de la anterior, sube.
    // Solo bloques completos (no las continuaciones de una tabla partida), y solo si la medición lo confirma.
    function subir() {
      for (let k = 0, intentos = 0; intentos < 80; intentos++) {
        const cont = contenido();
        if (k >= cont.length - 1) break;
        const a = cont[k], b = cont[k + 1], primero = bloques(b)[0];
        if (!primero || primero[0].dataset.cont) { k++; continue; }
        alFinal(a, primero);
        if (cabe(a)) continue;
        aHoja(b, primero);
        k++;
      }
    }
    const juntarYRepartir = () => {
      const cont = contenido();
      for (const p of cont.slice(1)) { const els = flujoDe(p); if (els.length) alFinal(cont[0], els); }
      repartir();
    };
    const original = doc.body.innerHTML;
    if (juntar && contenido().length > 1) {
      // Como el motor con juntar=True (confirmación): se prueba también todo el contenido en una sola
      // secuencia desde la primera hoja y se queda la opción con menos hojas.
      repartir();
      const nSeparado = paginas().length, separado = doc.body.innerHTML;
      doc.body.innerHTML = original;
      juntarYRepartir();
      if (paginas().length >= nSeparado) doc.body.innerHTML = separado;
    } else repartir();
    if (compacto && contenido().length > 1) {
      // Modo compacto: espacios entre secciones un poco más cortos. Nunca es una regla de hojas: solo se
      // prueba, y se queda únicamente si ahorra una hoja; si no, el documento sigue como estaba y crece
      // a las hojas que necesite.
      const nAntes = paginas().length, antes = doc.body.innerHTML;
      if (!doc.getElementById('estilo-compacto')) {
        const st = doc.createElement('style');
        st.id = 'estilo-compacto';
        st.textContent = 'html.compacto h2.sec{margin-top:20px!important}html.compacto h3.sub{margin-top:16px!important}'
          + 'html.compacto .dash{margin-top:10px!important}html.compacto .dash+*{margin-top:14px!important}'
          + 'html.compacto .conf-card{margin-top:10px!important}';
        doc.head.append(st);
      }
      doc.documentElement.classList.add('compacto');
      doc.body.innerHTML = original;
      juntarYRepartir();
      if (paginas().length >= nAntes) { doc.documentElement.classList.remove('compacto'); doc.body.innerHTML = antes; }
    }
    // El voucher no lleva la hoja de condiciones y políticas: sirve de molde mientras se reparte y al final se quita.
    if (sinPoliticas) paginas().filter(esPol).forEach(p => p.remove());
    const total = paginas().length;
    paginas().forEach((p, i) => {
      const c = p.querySelector('.footer-code');
      if (c) c.textContent = c.textContent.replace(/· \d+ de \d+/, `· ${i + 1} de ${total}`);
    });
    return total;
  }

  // ================= banco de fotos (colección "fotos" + archivos de esta misma página) =================
  // Mismo índice que usa el plugin: documento `destino__san-andres` con clave, tipo, nombre, ciudad,
  // asset, ancho, alto, fecha y documento. Por eso el plugin y la app ven las mismas fotos al instante.
  const slug = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const claveDestino = d => (slug(d) ? 'destino:' + slug(d) : null);
  const claveHotel = (hotel, ciudad) => {
    const h = slug(hotel).replace(/^(hotel|hostal|hosteria|hostel)-/, '');
    return h ? 'hotel:' + h + (slug(ciudad) ? '--' + slug(ciudad) : '') : null;
  };
  const Banco = { db: null, assets: null, docs: [], listo: false };
  const blobUrl = asset => '/_blob/' + asset;
  const delBanco = url => typeof url === 'string' && url.startsWith('/_blob/');
  const fotoDelBanco = clave => {
    const x = clave && Banco.docs.map(d => d.data()).find(v => v.clave === clave);
    return x && x.asset ? x : null;
  };
  function medidasDe(url) {
    return new Promise(res => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res([0, 0]); i.src = url; });
  }
  function dataUrlABlob(u) {
    const [cab, datos] = u.split(',');
    const tipo = /data:([^;]+)/.exec(cab)[1];
    const bin = atob(datos), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: tipo });
  }
  // Guarda una foto que el asesor ubicó, con la misma regla del plugin: si la clave ya existe con una
  // foto de igual o mayor ancho no se reemplaza; si se reemplaza, se borra el archivo viejo.
  // Devuelve el id del archivo guardado, o null si no se guardó.
  async function guardarEnBanco({ clave, tipo, nombre, ciudad, url, documento }) {
    if (!Banco.db || !Banco.assets || !clave || !url || !url.startsWith('data:image/')) return null;
    const [ancho, alto] = await medidasDe(url);
    const previa = fotoDelBanco(clave);
    if (previa && (previa.ancho || 0) >= ancho) return null;
    const blob = dataUrlABlob(url);
    const r = await Banco.assets.upload(blob, { type: blob.type });
    await Banco.db.doc('fotos/' + clave.replace(':', '__')).set({ clave, tipo, nombre: nombre || '', ciudad: ciudad || '', asset: r.id, ancho, alto, fecha: hoy(), documento });
    if (previa) { try { await Banco.assets.delete(previa.asset); } catch (_) {} }
    return r.id;
  }
  async function iniciarBanco() {
    Banco.db = window.claude?.use ? await window.claude.use('db').catch(() => null) : null;
    if (!Banco.db) { $('#b-lista').innerHTML = '<div class="vacio papel">El banco de fotos funciona al abrir esta página desde claude.ai.</div>'; return; }
    Banco.assets = await window.claude.use('assets').catch(() => null);
    $('#b-abrir').hidden = !Banco.assets;
    Banco.db.collection('fotos').onSnapshot(snap => { Banco.docs = snap.docs.filter(d => d.exists); Banco.listo = true; pintarBanco(); },
      () => { $('#b-lista').innerHTML = '<div class="vacio papel">No se pudo leer el banco. Recarga la página.</div>'; });
  }
  let filtroBanco = 'todos';
  function pintarBanco() {
    const docs = Banco.docs, q = slug($('#b-q').value);
    const nDest = docs.filter(d => d.data().tipo === 'destino').length;
    $('#b-dest').textContent = nDest; $('#b-hot').textContent = docs.length - nDest; $('#b-fot').textContent = docs.length;
    const vis = docs.filter(d => { const x = d.data(); return (filtroBanco === 'todos' || x.tipo === filtroBanco) && (!q || slug((x.nombre || '') + ' ' + (x.ciudad || '')).includes(q)); });
    if (!docs.length) { $('#b-lista').innerHTML = '<div class="vacio papel" style="margin-top:24px;">El banco está vacío. Las fotos aparecen aquí cuando un asesor ubica una foto en un documento.</div>'; return; }
    if (!vis.length) { $('#b-lista').innerHTML = '<div class="vacio papel" style="margin-top:24px;">No hay fotos que coincidan con la búsqueda.</div>'; return; }
    let h = '';
    for (const [tipo, titulo] of [['destino', 'Destinos'], ['hotel', 'Hoteles']]) {
      const L = vis.filter(d => (d.data().tipo === 'hotel' ? 'hotel' : 'destino') === tipo).sort((a, b) => (a.data().nombre || '').localeCompare(b.data().nombre || '', 'es'));
      if (!L.length) continue;
      h += `<section class="banco-grupo"><h2 class="sec">${titulo} <small>${L.length}</small></h2><div class="banco-grid">` + L.map(d => {
        const x = d.data(), chica = x.tipo !== 'hotel' && x.ancho && x.ancho < 1200; // solo la portada necesita 1.200 px o más
        return `<div class="papel foto-card"><div class="ph" style="background-image:url('${esc(blobUrl(x.asset))}')" role="img" aria-label="${esc(x.nombre)}"></div><div class="meta">` +
          `<b>${esc(x.nombre)}</b><span>${x.tipo === 'hotel' && x.ciudad ? esc(x.ciudad) + ' · ' : ''}<code>${esc(x.clave)}</code></span>` +
          (x.ancho ? `<span class="${chica ? 'aviso-chica' : ''}">${x.ancho} × ${x.alto} px${chica ? ' · pequeña para portada' : ''}</span>` : '') +
          `<span>${x.fecha ? 'Agregada el ' + esc(fecha(x.fecha, 'de')) : ''}${x.documento ? ' · ' + esc(x.documento) : ''}</span>` +
          (Banco.assets ? `<div class="fila-acc"><button type="button" class="enlace" data-quitar="${esc(d.id)}">Quitar</button></div>` : '') + '</div></div>';
      }).join('') + '</div></section>';
    }
    $('#b-lista').innerHTML = h;
  }
  $$('.chip').forEach(b => b.addEventListener('click', () => {
    filtroBanco = b.dataset.f;
    $$('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    pintarBanco();
  }));
  $('#b-q').addEventListener('input', pintarBanco);
  $('#b-abrir').addEventListener('click', () => { $('#b-panel').hidden = !$('#b-panel').hidden; });
  let armado = null;
  $('#b-lista').addEventListener('click', async ev => {
    const b = ev.target.closest('[data-quitar]');
    if (!b) return;
    if (armado !== b) { // se confirma tocando dos veces, sin diálogos
      if (armado) armado.textContent = 'Quitar';
      armado = b; b.textContent = '¿Quitar? Toca otra vez';
      setTimeout(() => { if (armado === b) { b.textContent = 'Quitar'; armado = null; } }, 3500);
      return;
    }
    armado = null;
    const d = Banco.docs.find(x => x.id === b.dataset.quitar);
    if (!d) return;
    b.disabled = true; b.textContent = 'Quitando…';
    try { await Banco.db.doc('fotos/' + d.id).delete(); await Banco.assets.delete(d.data().asset); }
    catch (_) { b.disabled = false; b.textContent = 'No se pudo quitar'; }
  });
  $('#b-subir').addEventListener('click', async () => {
    const f = $('#b-archivo').files[0], tipo = $('#b-tipo').value, nombre = $('#b-nombre').value.trim(), ciudad = $('#b-ciudad').value.trim(), m = $('#b-msg');
    m.className = 'estado';
    if (!nombre) { m.className = 'estado error'; m.textContent = 'Escribe el nombre del destino o del hotel.'; return; }
    if (!f) { m.className = 'estado error'; m.textContent = 'Elige una foto.'; return; }
    const clave = tipo === 'hotel' ? claveHotel(nombre, ciudad) : claveDestino(nombre);
    const btn = $('#b-subir');
    btn.disabled = true; m.textContent = 'Guardando…';
    const url = URL.createObjectURL(f);
    try {
      const [ancho, alto] = await medidasDe(url);
      if (!ancho) throw { code: 'imagen' };
      const r = await Banco.assets.upload(f, { type: f.type || 'image/jpeg' });
      const previa = fotoDelBanco(clave);
      await Banco.db.doc('fotos/' + clave.replace(':', '__')).set({ clave, tipo, nombre, ciudad, asset: r.id, ancho, alto, fecha: hoy(), documento: 'Cargada desde el banco' });
      if (previa && previa.asset !== r.id) { try { await Banco.assets.delete(previa.asset); } catch (_) {} }
      m.textContent = `Guardada como ${clave}.`;
      $('#b-archivo').value = ''; $('#b-nombre').value = ''; $('#b-ciudad').value = '';
    } catch (e) {
      m.className = 'estado error';
      m.textContent = e?.code === 'imagen' ? 'No se pudo leer la imagen. Usa JPG o PNG.' : e?.code === 'too_large' ? 'La foto pesa más de 20 MB.' : 'No se pudo guardar la foto.';
    } finally { btn.disabled = false; URL.revokeObjectURL(url); }
  });

  // Portada con foto (portada_con_foto del motor): la foto cubre el bloque, el degradado de
  // protección va encima y la estrella de marca no va sobre la foto.
  function portadaConFoto(hero, url, alto) {
    return hero
      .replace(/<img src="[^"]*" style="position:absolute;right:-117px;top:-104px;[^"]*">/, () =>
        `<div style="position:absolute;left:0;top:0;right:0;bottom:0;${cssFoto(url)}"></div>\n    <img src="${RECURSOS['proteccion.png']}" style="position:absolute;left:0;bottom:0;width:100%;height:${alto}px;">`)
      .replace('background:#F25061;', 'background:#1F2024;');
  }
  const cssFoto = url => `background-image:url('${url}');background-size:cover;background-position:center;`;
  function tarjetasFoto(items) {
    return items.map(([url, titulo, sub], k) =>
      `<div style="width:31.5%;margin-right:${k % 3 === 2 ? '0' : '2.75%'};margin-bottom:22px;">` +
      `<div style="height:190px;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(31,32,36,.14);${cssFoto(url)}"></div>` +
      `<div style="margin-top:14px;font:600 17px/1.3 'Poppins',sans-serif;color:#1F2024;">${titulo}</div>` +
      `<div style="margin-top:4px;font:400 14px/1.4 'Poppins',sans-serif;color:#7E859A;">${sub}</div></div>`);
  }

  // ================= motor: itinerario (skills/caminos-itinerario/scripts/generar.py + empaquetador.py) =================
  // El plugin estima la altura de cada bloque y corrige midiendo el PDF. Aquí se mide cada bloque
  // dibujándolo con la misma hoja de estilos, se apilan con el mismo repartidor y al final se
  // verifica el documento completo; si una hoja se pasa, se reparte otra vez con más margen.
  const TPL_IT = PLANTILLAS.itinerario;
  const PIE_IT = /<!-- PIE_Y_FRANJA[^\n]*\n([\s\S]*?)\n-->/.exec(TPL_IT)[1];
  const POL_IT = (() => { const i = TPL_IT.indexOf('<!-- ========== PÁGINA — INFORMACIÓN ADICIONAL'); return TPL_IT.slice(i, TPL_IT.indexOf('</section>', i) + 10); })();
  const CSS_IT = TPL_IT.slice(TPL_IT.indexOf('<style>'), TPL_IT.indexOf('</style>') + 8);
  const CHECK_IT = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  // El motor mide dónde termina la tinta en el PDF y exige que no pase de 1178 px (el pie
  // empieza en 1184). Aquí se mide la caja de cada bloque, que siempre queda unos píxeles por
  // debajo de la tinta, así que el límite equivalente es el inicio del pie.
  const ALTO_HERO = 400, LIMITE = 1184;
  const conRecursos = h => Object.entries(RECURSOS).reduce((a, [k, v]) => rep(a, k, v), h);
  const pieIt = (doc, pag) => rep(rep(PIE_IT, 'CÓDIGO_DOCUMENTO', doc), 'N de TOTAL', pag);
  const polIt = (cod, doc, pag) => rep(rep(rep(POL_IT, 'CÓDIGO_DOCUMENTO', doc), 'N de TOTAL', pag), 'CÓDIGO', cod);
  const MES = m => MESES[m - 1];
  const isoP = v => { const m = RE_ISO.exec(String(v || '')); return m ? [+m[1], +m[2], +m[3]] : null; };
  const d2 = n => String(n).padStart(2, '0');
  function rangoHero(a, b) {
    const x = isoP(a), y = isoP(b);
    if (!x || !y) return `${a} al ${b}`;
    if (x.join() === y.join()) return `${d2(x[2])} de ${MES(x[1])} de ${x[0]}`;
    if (x[0] !== y[0]) return `${d2(x[2])} de ${MES(x[1])} de ${x[0]} al ${d2(y[2])} de ${MES(y[1])} de ${y[0]}`;
    if (x[1] !== y[1]) return `${d2(x[2])} de ${MES(x[1])} al ${d2(y[2])} de ${MES(y[1])} de ${y[0]}`;
    return `${d2(x[2])} al ${d2(y[2])} de ${MES(y[1])} de ${y[0]}`;
  }
  const fechaDia = v => { const f = isoP(v); return f ? `${d2(f[2])} de ${MES(f[1])}` : e(v); };
  const fechaVuelo = v => { const f = isoP(v); return f ? `${d2(f[2])}/${d2(f[1])}/${f[0]}` : e(v); };
  const cabIt = (a, b) => `  <h2 class="blq">${a} <span style="color:#F25061;">${b}</span></h2>\n  <span class="dash" style="margin-top:14px;"></span>\n`;
  const tagsHtml = tags => tags ? '<div class="dia-tags">' + tags.map(([t, hotel]) => `<span class="tag${hotel ? ' tag-hotel' : ''}">${t}</span>`).join('') + '</div>\n' : '';

  // Constructores de bloque: {html, et} o, si se puede partir, {div, n, wrap(a, b, conCab), min, et, cab}.
  const bIt = {
    datos: campos => ({ et: 'Tu viaje', html: '<div style="display:flex;flex-wrap:wrap;padding-bottom:18px;border-bottom:1px solid #E2E0DD;">' +
      campos.map(([k, v]) => `<div style="width:50%;margin-bottom:18px;padding-right:20px;"><span class="meta-label">${k}</span><span class="meta-value">${v}</span></div>`).join('') + '</div>' }),
    fotoDestino: (url, lugar) => ({ et: 'Tu viaje', html: `<div class="blq-sep" style="position:relative;height:230px;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(31,32,36,.14);${cssFoto(url)}">` +
      (lugar ? `<span style="position:absolute;left:24px;bottom:22px;display:inline-flex;align-items:center;background:rgba(255,255,255,.92);border-radius:999px;padding:9px 18px;font:600 13px/1 'Poppins',sans-serif;letter-spacing:0.14em;text-transform:uppercase;color:#1F2024;">${lugar}</span>` : '') + '</div>' }),
    bienvenida: t => ({ et: 'Tu viaje', html: `<div class="blq-sep">\n  <h2 class="blq">Te damos la <span style="color:#F25061;">bienvenida</span></h2>\n  <span class="dash" style="margin-top:14px;"></span>\n  <div style="margin-top:18px;font:400 17px/1.6 'Poppins',sans-serif;color:#3A3C42;">${t}</div>\n</div>` }),
    frase: t => ({ et: 'Tu viaje', html: `<div class="blq-sep" style="padding:24px 30px;background:#FDE9EB;border-radius:26px;"><p style="margin:0;font:700 19px/1.45 'Poppins',sans-serif;color:#1F2024;">${t}</p></div>` }),
    vuelos: (titulo, filas) => {
      const fs = filas.map(f => `<tr><td style="padding:13px 16px;font:600 16px/1.45 'Poppins',sans-serif;color:#F25061">${f[0]}</td><td style="padding:13px 16px">${f[1]}</td>` +
        `<td style="padding:13px 16px;font:600 16px/1.45 'Poppins',sans-serif;color:#1F2024">${f[2]}</td><td style="padding:13px 16px;font:600 16px/1.45 'Poppins',sans-serif;color:#1F2024">${f[3]}</td>` +
        `<td style="padding:13px 16px">${f[4]}</td><td style="padding:13px 16px">${f[5]}</td></tr>`).join('');
      return { et: 'Vuelos', html: `<div class="blq-sep">\n  <h2 class="blq">Vuelos <span style="color:#F25061;">${titulo}</span></h2>\n  <span class="dash" style="margin-top:14px;"></span>\n` +
        `  <table style="margin-top:18px;">\n    <thead><tr><th style="width:110px;">Vuelo</th><th style="width:150px;">Fecha</th><th>Origen</th><th>Destino</th><th style="width:100px;">Sale</th><th style="width:150px;">Llega</th></tr></thead>\n    <tbody>${fs}</tbody>\n  </table>\n</div>` };
    },
    tituloDias: () => ({ et: 'Itinerario día a día', html: '<h2 class="blq" style="margin-top:30px;margin-bottom:22px;">Itinerario <span style="color:#F25061;">día a día</span></h2>' }),
    dia(num, fechaTxt, titulo, texto, tags, foto) {
      const cuerpo = `<div class="dia-head"><span class="dia-pill">Día ${num}</span><span class="dia-fecha">${fechaTxt}</span></div>\n    <h3 class="dia-titulo">${titulo}</h3>\n    <p class="dia-texto">${texto}</p>\n    ${tagsHtml(tags)}`;
      if (!foto) return { et: 'Itinerario día a día', html: `<div class="dia">\n  ${cuerpo}</div>` };
      return { et: 'Itinerario día a día', html: `<div class="dia">\n  <div style="display:flex;align-items:flex-start;">\n   <div style="flex:1;padding-right:28px;">\n    ${cuerpo}   </div>\n` +
        `   <div style="width:300px;height:200px;flex:0 0 auto;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(31,32,36,.14);${cssFoto(foto)}"></div>\n  </div>\n</div>` };
    },
    fotosHoteles(items) {
      const tj = tarjetasFoto(items);
      const filas = []; for (let i = 0; i < tj.length; i += 3) filas.push(tj.slice(i, i + 3).join(''));
      return { div: true, n: filas.length, min: 1, et: 'Alojamiento',
        wrap: (a, b, cc) => `<div class="blq-sep">\n${cc ? cabIt('Tus', 'hoteles') : ''}  <div style="display:flex;flex-wrap:wrap;margin-top:22px;">${filas.slice(a, b).join('')}</div>\n</div>` };
    },
    lista(ta, tb, items, check = true) {
      const els = items.map(it => Array.isArray(it) ? `<div class="grupo-h">${it[1]}</div>`
        : check ? `<div class="li2"><span class="bolita">${CHECK_IT}</span><span class="txt">${it}</span></div>`
          : `<div class="li2"><span class="punto"></span><span class="txt" style="color:#3A3C42">${it}</span></div>`);
      return { div: true, n: els.length, min: 4, et: 'Qué incluye tu viaje', cab: items.map(Array.isArray),
        wrap: (a, b, cc) => `<div class="blq-sep">\n${cc ? cabIt(ta, tb) : ''}  <div class="lista2">${els.slice(a, b).join('')}</div>\n</div>` };
    },
    hoteles(filas) {
      const fs = filas.map(f => `<tr><td style="padding:13px 16px;font:600 16px/1.4 'Poppins',sans-serif;color:#1F2024">${f[0]}</td><td style="padding:13px 16px">${f[1]}</td><td style="padding:13px 16px;font-size:15px">${f[2]}</td><td style="padding:13px 16px;font-size:15px">${f[3]}</td></tr>`);
      const thead = '    <thead><tr><th>Hotel</th><th style="width:170px;">Ciudad</th><th style="width:330px;">Dirección</th><th style="width:180px;">Teléfono</th></tr></thead>\n';
      return { div: true, n: fs.length, min: 2, et: 'Alojamiento',
        wrap: (a, b, cc) => `<div class="blq-sep">\n${cc ? cabIt('Hoteles', 'confirmados') : ''}  <table style="margin-top:18px;">\n${thead}    <tbody>${fs.slice(a, b).join('')}</tbody>\n  </table>\n</div>` };
    },
    recom(grupos) {
      const gs = grupos.map(([t, items]) => `<div class="rec-grupo"><p class="rec-h">${t}</p>${items.map(x => `<div class="rec-item"><span class="punto"></span><span class="t">${x}</span></div>`).join('')}</div>`);
      return { div: true, n: gs.length, min: 2, et: 'Antes de viajar',
        wrap: (a, b, cc) => `<div class="blq-sep">\n${cc ? cabIt('Recomendaciones', 'del viaje') : ''}  <div class="rec-grid">${gs.slice(a, b).join('')}</div>\n</div>` };
    },
    nota: t => ({ et: null, html: `<div class="nota" style="margin-top:20px;padding:20px 28px;"><span style="font-size:15px;">${t}</span></div>` }),
  };
  function heroIt(sub, titulo, fechas, foto) {
    let h = `<div style="position:relative;height:400px;overflow:hidden;background:#F25061;">\n  <img src="../assets/brand/estrella-crema.svg" style="position:absolute;right:-117px;top:-104px;height:416px;opacity:.10;">\n` +
      `  <div style="position:absolute;top:42px;left:68px;right:68px;display:flex;align-items:center;justify-content:space-between;">\n    <img src="../assets/logos/caminos-logo-white.svg" alt="Caminos" style="height:46px;">\n` +
      `    <span style="display:inline-flex;align-items:center;background:rgba(255,255,255,.92);border-radius:999px;padding:11px 23px;font:600 14px/1 'Poppins',sans-serif;letter-spacing:0.16em;text-transform:uppercase;color:#1F2024;">Itinerario de viaje</span>\n` +
      `  </div>\n  <div style="position:absolute;left:68px;right:68px;bottom:38px;">\n    <span style="font:600 14px/1.3 'Poppins',sans-serif;letter-spacing:0.16em;text-transform:uppercase;color:#FFFFFF;">${sub}</span>\n` +
      `    <h1 style="margin:16px 0 0;font:700 48px/1.06 'Poppins',sans-serif;letter-spacing:-0.02em;color:#FFFFFF;">${titulo}</h1>\n` +
      `    <span style="display:inline-flex;align-items:center;margin-top:18px;background:rgba(255,255,255,.18);border-radius:999px;padding:10px 22px;font:700 17px/1 'Poppins',sans-serif;color:#FFFFFF;">${fechas}</span>\n  </div>\n</div>`;
    return foto ? portadaConFoto(conRecursos(h), foto, ALTO_HERO) : h;
  }
  function bloquesIt(d) {
    const out = [];
    const campos = [['Grupo', 'grupo'], ['Acompañamiento espiritual', 'acompanamiento'], ['Pasajero', 'pasajero'], ['Acomodación', 'acomodacion']]
      .filter(([, k]) => !vacio(d[k])).map(([n, k]) => [n, e(d[k])]);
    out.push(bIt.datos(campos));
    if (d.foto_portada && d.estilo_foto === 'cuerpo') out.push(bIt.fotoDestino(d.foto_portada, e(d.destino || '')));
    if (!vacio(d.bienvenida)) out.push(bIt.bienvenida(String(d.bienvenida).trim().split(/\n\s*\n/).filter(p => p.trim()).map(e).join('<br><br>')));
    if (!vacio(d.frase)) out.push(bIt.frase(e(d.frase)));
    for (const [k, t] of [['vuelos', 'confirmados'], ['vuelos_internos', 'internos']]) {
      const filas = (d[k] || []).filter(v => !vacio(v.vuelo) || !vacio(v.origen)).map(v => [e(v.vuelo), fechaVuelo(v.fecha), e(v.origen), e(v.destino), e(v.sale), e(v.llega)]);
      if (filas.length) out.push(bIt.vuelos(t, filas));
    }
    out.push(bIt.tituloDias());
    (d.dias || []).filter(x => !vacio(x.titulo) || !vacio(x.descripcion)).forEach((x, i) => {
      const tags = [...(x.comidas || []), ...(x.etiquetas || [])].filter(t => !vacio(t)).map(t => [e(t), false]);
      if (!vacio(x.hotel)) tags.push([e(x.hotel), true]);
      const num = x.dia || i + 1;
      out.push(bIt.dia(/^\d+$/.test(String(num)) ? d2(+num) : e(num), fechaDia(x.fecha), e(x.titulo || ''), e(x.descripcion || ''), tags.length ? tags : null, x.foto));
    });
    const lista = items => items.flatMap(it => (it && typeof it === 'object' && !vacio(it.grupo)) ? [['g', e(it.grupo)], ...(it.items || []).filter(z => !vacio(z)).map(e)] : typeof it === 'string' && !vacio(it) ? [e(it)] : []);
    const inc = lista(d.incluye || []), noinc = lista(d.no_incluye || []);
    if (inc.length) out.push(bIt.lista('El precio', 'incluye', inc));
    if (noinc.length) out.push(bIt.lista('El precio', 'no incluye', noinc, false));
    const hs = (d.hoteles || []).filter(h => !vacio(h.nombre));
    const fotosH = hs.filter(h => h.foto).map(h => [h.foto, e(h.nombre), e(h.ciudad || '')]);
    if (fotosH.length) out.push(bIt.fotosHoteles(fotosH));
    if (hs.length) out.push(bIt.hoteles(hs.map(h => [e(h.nombre), e(h.ciudad), e(h.direccion), e(h.telefono)])));
    const rec = (d.recomendaciones || []).filter(r => !vacio(r.tema)).map(r => [e(r.tema), (r.items || []).filter(z => !vacio(z)).map(e)]).filter(r => r[1].length);
    if (rec.length) out.push(bIt.recom(rec));
    if (!vacio(d.nota)) out.push(bIt.nota(e(d.nota)));
    return out;
  }
  // Repartidor: puerto directo de empaquetar(), con alturas medidas en vez de estimadas.
  function empaquetar(bloques, altoDe, finDe, alto1, altoC) {
    const paginas = [];
    let actual = [], usado = 0, etiqueta = null, primera = true;
    const cerrar = () => { paginas.push([actual, etiqueta, primera]); actual = []; usado = 0; etiqueta = null; primera = false; };
    const cola = [...bloques];
    while (cola.length) {
      const b = cola.shift();
      let limite = primera ? alto1 : altoC;
      if (b.div) {
        const cc = !b.parcial, libre = limite - usado;
        const alto = k => altoDe(b.wrap(0, k, cc));
        let k = 0;
        while (k < b.n && finDe(b.wrap(0, k + 1, cc)) <= libre) k++;
        while (b.cab && k > 0 && k < b.n && b.cab[k - 1]) k--; // un subtítulo de grupo nunca queda solo
        if (k >= b.min || (k === b.n && k > 0)) {
          etiqueta ??= b.et;
          actual.push(b.wrap(0, k, cc));
          usado += alto(k);
          if (k < b.n) {
            const w = b.wrap, kk = k;
            cola.unshift({ ...b, parcial: true, n: b.n - k, cab: b.cab ? b.cab.slice(k) : null, wrap: (x, y, c) => w(kk + x, kk + y, c) });
            cerrar();
          }
          continue;
        }
        if (actual.length) { cerrar(); cola.unshift(b); continue; }
        actual.push(b.wrap(0, b.n, cc)); usado += alto(b.n); etiqueta ??= b.et; // hoja vacía y aun así no cabe: se fuerza
        continue;
      }
      const alto = altoDe(b.html);
      // Un título de sección nunca queda solo al final de la hoja: pasa con el bloque que sigue.
      if (b.html.trimStart().startsWith('<h2 class="blq"') && cola.length && actual.length) {
        const sig = cola[0];
        const finSig = sig.div ? finDe(sig.wrap(0, 1, true)) : finDe(sig.html);
        if (usado + alto + finSig > limite) { cerrar(); limite = altoC; }
      }
      // El margen inferior del último bloque de la hoja no ocupa espacio visible.
      if (usado + finDe(b.html) > limite && actual.length) cerrar();
      if (etiqueta == null && b.et) etiqueta = b.et;
      actual.push(b.html); usado += alto;
    }
    if (actual.length) paginas.push([actual, etiqueta, primera]);
    return paginas;
  }
  function documentoIt(hero, paginas, codigo, codDoc) {
    const total = paginas.length + 1;
    const hojas = paginas.map(([bls, etq, esPrimera], i) => {
      const cuerpo = bls.join('\n').replace(/^(<div) class="blq-sep"/, '$1');
      const pie = pieIt(codDoc, `${i + 1} de ${total}`);
      return esPrimera
        ? `<section class="page">\n${hero}\n  <div class="cont cont-top">\n${cuerpo}\n  </div>\n\n${pie}\n</section>`
        : `<section class="page" style="padding-top:57px;">\n  <div class="cont">\n    <div class="hdr">\n      <img src="../assets/logos/caminos-logo-coral.svg" alt="Caminos">\n      <span class="hdr-sep"></span>\n      <span class="eyebrow">${etq || 'Itinerario'}</span>\n      <span class="eyebrow" style="margin-left:auto;font-weight:400;">${codigo}</span>\n    </div>\n    <div class="rule"></div>\n    <div style="margin-top:28px;">\n${cuerpo}\n    </div>\n  </div>\n\n${pie}\n</section>`;
    });
    return conRecursos(`<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n${CSS_IT}\n</head>\n<body>\n\n${hojas.join('\n\n')}\n\n${polIt(codigo, codDoc, `${total} de ${total}`)}\n\n</body>\n</html>\n`);
  }
  // Iframe oculto para medir con las mismas fuentes y estilos del documento.
  function iframeMedidor(html) {
    return new Promise(res => {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true');
      f.style.cssText = 'position:absolute;left:-20000px;top:0;width:1061px;height:1400px;border:0;visibility:hidden;';
      // El contenido va antes de insertar el iframe: si no, el primer "load" es el del
      // documento en blanco inicial y se mediría una hoja vacía y sin estilos.
      f.srcdoc = html;
      f.onload = async () => { try { await Promise.race([f.contentDocument.fonts.ready, new Promise(r => setTimeout(r, 4000))]); } catch (_) {} res(f); };
      document.body.append(f);
    });
  }
  const conFuentes = h => h.replace('<head>', `<head><style>${FUENTES}</style>`);
  async function armarItinerario(d) {
    const titulo = String(d.titulo).split('\n').map(e).join('<br>');
    const hero = heroIt(e(d.subtitulo || ''), titulo, rangoHero(d.fecha_inicio, d.fecha_fin), d.estilo_foto !== 'cuerpo' ? d.foto_portada : null);
    const codigo = String(d.codigo).trim();
    const codDoc = codigoDocumento(codigo, 'CAM-ITI');
    const bloques = bloquesIt(d);
    const med = await iframeMedidor(conFuentes(conRecursos(`<!DOCTYPE html><html><head><meta charset="utf-8">${CSS_IT}</head><body></body></html>`)));
    try {
      const md = med.contentDocument;
      // Alto útil real de cada tipo de hoja: del inicio del contenido al límite del pie.
      md.body.innerHTML = conRecursos(`<section class="page">${heroIt('', '', '', null)}<div class="cont cont-top"><i id="a"></i></div></section>` +
        `<section class="page" style="padding-top:57px;"><div class="cont"><div class="hdr"><img src="../assets/logos/caminos-logo-coral.svg" alt=""><span class="hdr-sep"></span><span class="eyebrow">x</span></div><div class="rule"></div><div style="margin-top:28px;"><i id="b"></i></div></div></section>`);
      const [p1, p2] = md.querySelectorAll('section.page');
      let alto1 = LIMITE - (md.getElementById('a').getBoundingClientRect().top - p1.getBoundingClientRect().top);
      let altoC = LIMITE - (md.getElementById('b').getBoundingClientRect().top - p2.getBoundingClientRect().top);
      // Altura de cada bloque dibujado en una columna del ancho del contenido (con sus márgenes).
      md.body.innerHTML = '<div class="cont" id="m"></div>';
      const caja = md.getElementById('m'), cache = new Map();
      const medir = h => {
        if (!cache.has(h)) {
          caja.innerHTML = `<div style="display:flow-root">${conRecursos(h)}</div>`;
          const w = caja.firstChild, ult = w.lastElementChild;
          const total = w.getBoundingClientRect().height;
          const mb = ult ? parseFloat(md.defaultView.getComputedStyle(ult).marginBottom) || 0 : 0;
          cache.set(h, [Math.ceil(total), Math.ceil(total - mb)]);
        }
        return cache.get(h);
      };
      const altoDe = h => medir(h)[0], finDe = h => medir(h)[1];
      let html = '';
      for (let vuelta = 0; vuelta < 8; vuelta++) {
        html = documentoIt(hero, empaquetar(bloques, altoDe, finDe, alto1, altoC), codigo, codDoc);
        // Verificación con el documento completo, como hace el motor con el PDF.
        const v = await iframeMedidor(conFuentes(html));
        const hojas = [...v.contentDocument.querySelectorAll('section.page')].slice(0, -1);
        const malos = hojas.map((p, i) => {
          const c = p.querySelector('.cont-top') || p.querySelector('.cont > div[style*="margin-top:28px"]');
          return [i, Math.ceil(c.getBoundingClientRect().bottom - p.getBoundingClientRect().top) - LIMITE];
        }).filter(([, px]) => px > 0);
        v.remove();
        if (!malos.length) break;
        for (const [i, px] of malos) { if (i === 0) alto1 -= px + 12; else altoC -= px + 12; }
      }
      return html;
    } finally { med.remove(); }
  }

/*__INTERACTIVO__*/

  // ================= formularios (se arman a partir de un esquema) =================
  const T = (k, label, w = 4, extra = {}) => ({ k, label, w, tipo: 'texto', ...extra });
  const D = (k, label, w = 4, extra = {}) => ({ k, label, w, tipo: 'fecha', ...extra });
  const A = (k, label, w = 12, extra = {}) => ({ k, label, w, tipo: 'area', ...extra });
  const L = (k, label, w = 6, extra = {}) => ({ k, label, w, tipo: 'lineas', ...extra });
  const COLS_TRAYECTO = [T('vuelo', 'Vuelo', 1), D('fecha', 'Fecha', 1.3), T('ruta', 'Trayecto', 1.4, { ph: 'BOG — CDG' }), T('sale', 'Sale', 0.9), T('llega', 'Llega', 0.9)];
  const COLS_HOTEL = [T('hotel', 'Hotel', 2), D('entrada', 'Entrada', 1.3), D('salida', 'Salida', 1.3), T('acomodacion', 'Acomodación', 1.2), T('confirmacion', 'Confirmación', 1.3)];
  const COLS_TRASLADO = [T('trayecto', 'Trayecto', 1.8), D('fecha', 'Fecha', 1.3), T('hora', 'Hora', 0.8), T('confirmacion', 'Confirmación', 1.3)];

  // Estados de pago con lista cerrada, para no escribirlos distinto cada vez. Lo que llega en texto libre
  // (de Claude o de la app de operación: CONFIRMADO, PENDIENTE, ANULADO) se lleva a la opción equivalente.
  const ESTADOS_RESERVA = [['', 'Elige el estado…'], ['Pagado en su totalidad', 'Pagado en su totalidad'], ['Abono recibido', 'Abono recibido'], ['Pendiente de pago', 'Pendiente de pago']];
  const ESTADOS_PAGO = [['', 'Elige…'], ['Pagado', 'Pagado'], ['Pendiente', 'Pendiente'], ['Anulado', 'Anulado']];
  const normalEstadoReserva = v => {
    const t = String(v || '').toLowerCase();
    if (!t.trim()) return '';
    if (/abono|parcial|anticipo/.test(t)) return 'Abono recibido';
    if (/pend|por pagar|sin pag/.test(t)) return 'Pendiente de pago';
    if (/pag|total|confirm|cancelad/.test(t)) return 'Pagado en su totalidad';
    return '';
  };
  const normalEstadoPago = v => {
    const t = String(v || '').toLowerCase();
    if (/anul/.test(t)) return 'Anulado';
    if (/pend|por pagar/.test(t)) return 'Pendiente';
    if (/pag|confirm|recib/.test(t)) return 'Pagado';
    return '';
  };
  const DOCS = {
    cotizacion: {
      nombre: 'Cotización', titulo: 'Nueva <span class="c">cotización</span>', eyebrow: 'Cotización de viaje', icono: 'file-text',
      desc: 'Propuesta con tarifas por hotel, qué incluye e itinerario de servicios.', hojas: '3 hojas',
      boton: 'Generar la cotización', archivo: 'Cotizacion', codigo: d => d.codigo_cotizacion, tituloDe: d => d.titulo_destino, clienteDe: d => d.pasajeros,
      armar: armarCotizacion, flujo: { limite: 1156, pegarNota: true },
      pegar: 'Pega aquí la información del viaje',
      ayuda: ['Notas del cliente: destino, fechas, cuántas personas', 'Tarifas por hotel, copiadas del proveedor', 'Servicios del itinerario y condiciones de pago'],
      grupos: [
        { t: 'El viaje', sub: 'Lo que va en la portada.', icono: 'map', campos: [
          T('codigo_cotizacion', 'Código', 4, { req: 1 }), T('titulo_destino', 'Título del viaje', 8, { req: 1, ayuda: 'De 4 a 8 palabras. Ejemplo: «Villa de Leyva, tres días».' }),
          A('parrafo_intro', 'Párrafo de presentación', 12, { filas: 3, ayuda: 'Escribe **así** para resaltar en negrita.' }),
          T('destino', 'Destino'), D('fecha_llegada', 'Llegada', 4, { req: 1 }), D('fecha_salida', 'Salida', 4, { req: 1 }),
          T('noches', 'Noches'), T('pasajeros', 'Pasajeros'), T('acomodacion', 'Acomodación'),
          { k: 'foto_portada', label: 'Foto del destino (opcional)', w: 12, tipo: 'foto', ayuda: 'Va en el encabezado. Si la dejas vacía, la buscamos en el banco de fotos por el destino.' }] },
        { t: 'Qué incluye el precio', sub: 'Un servicio por renglón.', icono: 'badge-check', campos: [L('incluye', 'Incluye', 6, { req: 1 }), L('no_incluye', 'No incluye')] },
        { t: 'Tarifas por persona', sub: 'Una fila por hotel u opción.', icono: 'building-2', campos: [
          { tipo: 'filas', k: 'tarifas', req: 1, mas: 'Agregar tarifa', cols: [T('hotel', 'Hotel', 2), T('acomodacion', 'Acomodación', 1.2), T('valor', 'Valor', 1, { ph: '$0' }), { k: 'foto', label: 'Foto', w: 1.6, tipo: 'foto', max: 900 }] }] },
        { t: 'Itinerario de servicios', sub: 'Opcional. Si lo dejas vacío, la sección no aparece.', icono: 'route', campos: [
          { tipo: 'filas', k: 'itinerario', mas: 'Agregar servicio', min: 0, cols: [T('servicio', 'Servicio', 2), D('fecha', 'Fecha', 1.1), T('detalle', 'Detalle', 1.2)] }] },
        { t: 'Condiciones y asesor', sub: 'Lo que el cliente debe saber antes de confirmar.', icono: 'file-text', campos: [
          A('condiciones_pago', 'Condiciones de pago', 8, { req: 1, filas: 4 }), D('vigencia', 'Vigencia de la cotización', 4, { req: 1 }),
          T('asesor.nombre', 'Tu nombre', 4, { req: 1 }), T('asesor.correo', 'Tu correo', 4, { req: 1 }), T('asesor.telefono', 'Tu teléfono', 4, { req: 1 })] },
      ],
      validar(d) {
        const f = [];
        [['codigo_cotizacion', 'Código de cotización'], ['titulo_destino', 'Título del viaje'], ['fecha_llegada', 'Fecha de llegada'], ['fecha_salida', 'Fecha de salida'],
          ['vigencia', 'Vigencia'], ['condiciones_pago', 'Condiciones de pago'], ['incluye', 'Qué incluye el precio'],
          ['asesor.nombre', 'Tu nombre'], ['asesor.correo', 'Tu correo'], ['asesor.telefono', 'Tu teléfono']].forEach(([k, n]) => { if (vacio(getPath(d, k))) f.push([k, n]); });
        if (!(d.tarifas || []).some(t => !vacio(t.valor))) f.push(['tarifas', 'Al menos una tarifa con su valor']);
        return f;
      },
      preparar: d => ({ ...d, codigo_cotizacion: vacio(d.codigo_cotizacion) ? 'CA' + Math.floor(1000 + Math.random() * 9000) : d.codigo_cotizacion, asesor: vacio(d.asesor) ? { ...ASESOR } : d.asesor }),
      meta: d => `Vigente hasta el ${fecha(d.vigencia, 'de')}`,
      // Fotos que se buscan en el banco y se guardan en él (mismas claves que el motor del plugin).
      fotos(d) {
        const destino = d.destino || String(d.titulo_destino || '').split(',')[0];
        return [
          { clave: claveDestino(destino), tipo: 'destino', nombre: destino, ciudad: '', get: () => d.foto_portada, set: u => { d.foto_portada = u; } },
          ...(d.tarifas || []).filter(t => !vacio(t.hotel)).map(t => ({ clave: claveHotel(t.hotel, destino), tipo: 'hotel', nombre: t.hotel, ciudad: destino, get: () => t.foto, set: u => { t.foto = u; } })),
        ];
      },
      ejemploTexto: `Hola, te paso lo de la familia Rodríguez para que les armemos la cotización:

Van a Santa Marta del 14 al 18 de agosto de 2026, son 2 adultos y 2 niños (8 y 11 años). Quieren acomodación cuádruple si se puede.

Opciones que me dio el proveedor (por persona):
- Hotel Zuana Beach Resort, cuádruple: $1.640.000
- Hotel Irotama, familiar: $1.480.000
- Hotel Casa Verde, cuádruple: $1.190.000

Incluye: tiquetes Bogotá - Santa Marta - Bogotá con equipaje de bodega, traslados aeropuerto - hotel - aeropuerto, 4 noches de alojamiento con desayuno, tour a Playa Cristal en el Parque Tayrona con almuerzo típico, tarjeta de asistencia médica.
No incluye: almuerzos y cenas no mencionados, entrada al Parque Tayrona para extranjeros, propinas.

Itinerario: vuelo de ida el 14 a las 7:10 AM, tour a Playa Cristal el 16 saliendo 7:00 AM, vuelo de regreso el 18 a las 5:40 PM.

Para reservar piden el 50% de abono y el saldo 20 días antes del viaje. La cotización vale hasta el 30 de julio.`,
      forma: '{"codigo_cotizacion":"","titulo_destino":"","parrafo_intro":"","destino":"","fecha_llegada":"","fecha_salida":"","noches":"","pasajeros":"","acomodacion":"","incluye":[],"no_incluye":[],"tarifas":[{"hotel":"","acomodacion":"","valor":""}],"itinerario":[{"servicio":"","fecha":"","detalle":""}],"condiciones_pago":"","vigencia":""}',
      reglas: `- "titulo_destino": de 4 a 8 palabras, por ejemplo "Santa Marta, cinco días".
- "parrafo_intro": una o dos frases para el cliente, en primera persona del plural ("Preparamos esta cotización para..."). Puedes resaltar con **negrita** el grupo de viajeros.
- "noches" y "pasajeros" en texto corto: "4 noches", "4 personas (2 adultos, 2 niños)".
- "incluye" y "no_incluye": un servicio por elemento, frases cortas que empiecen en mayúscula.
- "itinerario": solo servicios con fecha u hora dados en el texto.
- "condiciones_pago": redacta en un párrafo lo que el texto dice sobre abonos, saldos y cancelaciones.
- "codigo_cotizacion": solo si el texto trae uno.`,
    },

    confirmacion: {
      nombre: 'Confirmación', titulo: 'Nueva <span class="c">confirmación</span>', eyebrow: 'Confirmación de reserva', icono: 'badge-check',
      desc: 'Confirma la reserva con los números de vuelo, hotel y traslados.', hojas: '3 hojas',
      boton: 'Generar la confirmación', archivo: 'Confirmacion', codigo: d => d.codigo_reserva, tituloDe: d => d.titulo_viaje, clienteDe: d => d.nombre_viajero,
      armar: armarConfirmacion, flujo: { limite: 1178, juntar: true, compacto: true }, desdeBase: true,
      pegar: 'Pega aquí las reservas del sistema',
      ayuda: ['Las reservas copiadas del sistema: tiquete, récord, vuelos', 'Confirmaciones de hoteles y traslados', 'Pagos recibidos y lo que falta por pagar'],
      grupos: [
        { t: 'La reserva', sub: 'Lo que va en la portada.', icono: 'badge-check', campos: [
          T('codigo_reserva', 'Código de reserva', 4, { req: 1, ph: 'CAM-2026-0000' }), T('titulo_viaje', 'Título del viaje', 8, { req: 1 }),
          T('nombre_viajero', 'Titular', 6, { req: 1 }), T('destino', 'Destino', 6, { req: 1 }),
          D('fecha_salida', 'Fecha de ida', 4, { req: 1 }), D('fecha_regreso', 'Fecha de regreso', 4, { req: 1 }), T('pasajeros', 'Pasajeros', 4),
          { k: 'estado_pago', label: 'Estado de pago', w: 4, tipo: 'opciones', req: 1, opciones: ESTADOS_RESERVA, normalizar: normalEstadoReserva },
          A('parrafo_confirmacion', 'Mensaje al viajero', 8, { filas: 2, ayuda: 'Va después de «Hola …, confirmamos tu reserva con Caminos.»' })] },
        { t: 'Vuelos', sub: 'Un tiquete por bloque; una línea por trayecto.', icono: 'ticket', campos: [
          { tipo: 'bloques', k: 'aereo', req: 1, mas: 'Agregar tiquete', min: 0, titulo: 'Tiquete', campos: [T('aerolinea', 'Aerolínea'), T('tiquete', 'Número de tiquete'), T('record', 'Récord')],
            filas: { k: 'trayectos', mas: 'Agregar trayecto', cols: COLS_TRAYECTO } }] },
        { t: 'Hoteles', sub: 'Una línea por hotel.', icono: 'building-2', campos: [{ tipo: 'filas', k: 'hoteles', mas: 'Agregar hotel', min: 0, cols: COLS_HOTEL }] },
        { t: 'Traslados', sub: 'Una línea por traslado. Se agrupan por operador.', icono: 'route', campos: [
          { tipo: 'filas', k: 'traslados', mas: 'Agregar traslado', min: 0, cols: [T('operador', 'Operador', 1.3), ...COLS_TRASLADO] }] },
        { t: 'Servicios y pagos', sub: 'Lo que quedó confirmado y cómo va el pago.', icono: 'file-text', campos: [
          L('servicios_confirmados', 'Servicios confirmados', 12),
          { tipo: 'filas', k: 'pagos', req: 1, mas: 'Agregar pago', min: 0, cols: [T('concepto', 'Concepto', 2), T('valor', 'Valor', 1.2, { ph: '$0' }),
            { k: 'estado', label: 'Estado', w: 1.2, tipo: 'opciones', opciones: ESTADOS_PAGO, normalizar: normalEstadoPago }] },
          A('nota_importante', 'Nota importante', 12, { filas: 2 })] },
        { t: 'Tu contacto', sub: 'Para que el viajero sepa a quién escribir.', icono: 'pencil', campos: [
          T('asesor', 'Tu nombre', 4, { req: 1 }), T('asesor_correo', 'Tu correo', 4, { req: 1 }), T('asesor_telefono', 'Tu teléfono', 4, { req: 1 })] },
      ],
      validar(d) {
        const f = [];
        [['codigo_reserva', 'Código de reserva'], ['titulo_viaje', 'Título del viaje'], ['nombre_viajero', 'Titular'], ['destino', 'Destino'],
          ['fecha_salida', 'Fecha de ida'], ['fecha_regreso', 'Fecha de regreso'], ['estado_pago', 'Estado de pago'],
          ['asesor', 'Tu nombre'], ['asesor_correo', 'Tu correo'], ['asesor_telefono', 'Tu teléfono']].forEach(([k, n]) => { if (vacio(d[k])) f.push([k, n]); });
        for (const t of d.aereo || []) if ((t.trayectos || []).length && vacio(t.record)) f.push(['aereo', `Récord del tiquete de ${t.aerolinea || 'la aerolínea'}`]);
        const pagos = (d.pagos || []).filter(x => !vacio(x.concepto) || !vacio(x.valor));
        if (pagos.some(x => vacio(x.estado))) f.push(['pagos', 'Estado de cada pago (Pagado, Pendiente o Anulado)']);
        const vivos = pagos.filter(x => x.estado !== 'Anulado');
        if (d.estado_pago === 'Pagado en su totalidad' && vivos.some(x => x.estado === 'Pendiente'))
          f.push(['pagos', 'La reserva dice «Pagado en su totalidad», pero hay pagos en «Pendiente»']);
        if (d.estado_pago === 'Pendiente de pago' && vivos.some(x => x.estado === 'Pagado'))
          f.push(['estado_pago', 'Hay pagos recibidos: el estado de la reserva debería ser «Abono recibido» o «Pagado en su totalidad»']);
        return f;
      },
      // Los datos de ejemplo de la asesora solo se usan si no viene ninguno (si vienen de la base, lo que falte queda marcado).
      preparar: d => (vacio(d.asesor) && vacio(d.asesor_correo) ? { ...d, asesor: ASESOR.nombre, asesor_correo: ASESOR.correo, asesor_telefono: vacio(d.asesor_telefono) ? ASESOR.telefono : d.asesor_telefono } : { ...d }),
      meta: d => `Viaje del ${rango(d.fecha_salida, d.fecha_regreso)}`,
      ejemploTexto: `Confirmación para enviar a Laura Pineda (reserva CAM-2026-3140), viaje a San Andrés.
2 adultos: Laura Pineda y Andrés Pineda.

TIQUETE AVIANCA 134-2298110457  RÉCORD HX7LQP
AV 8574  12OCT  BOGADZ  0615  0825
AV 8577  17OCT  ADZBOG  1740  1950

HOTEL DECAMERON AQUARIUM  IN 12OCT OUT 17OCT  DBL  CONF DC-7745120
TRASLADOS SAN ANDRÉS TOURS: AEROPUERTO-HOTEL 12OCT 09:00 CONF SAT-5521 / HOTEL-AEROPUERTO 17OCT 15:00 CONF SAT-5522

Incluye: tiquetes con equipaje de bodega, 5 noches todo incluido, traslados, tarjeta de turista, asistencia médica.
Pagos: abono $3.200.000 (pagado el 2 de septiembre), saldo $2.950.000 pagado el 20 de septiembre. Queda pagado en su totalidad.
Recordarle llevar la cédula original y pagar la tarjeta de turista si no la compró en línea.`,
      forma: '{"codigo_reserva":"","titulo_viaje":"","nombre_viajero":"","parrafo_confirmacion":"","destino":"","pasajeros":"","estado_pago":"","fecha_salida":"","fecha_regreso":"","aereo":[{"aerolinea":"","tiquete":"","record":"","trayectos":[{"vuelo":"","fecha":"","ruta":"","sale":"","llega":""}]}],"hoteles":[{"hotel":"","entrada":"","salida":"","acomodacion":"","confirmacion":""}],"traslados":[{"operador":"","trayecto":"","fecha":"","hora":"","confirmacion":""}],"servicios_confirmados":[],"pagos":[{"concepto":"","valor":"","estado":""}],"nota_importante":""}',
      reglas: `- Copia los códigos (tiquete, récord, confirmaciones) exactamente como vienen.
- "titulo_viaje": corto, por ejemplo "San Andrés, cinco noches".
- "ruta" con guion largo y espacios: "BOG — ADZ". "sale" y "llega" en formato 24 horas "06:15"; si llega al día siguiente, "09:10 +1".
- "trayecto" de traslados con guion largo: "Aeropuerto — Hotel". "acomodacion" en palabras: "Doble", "Sencilla".
- "estado_pago": exactamente uno de "Pagado en su totalidad", "Abono recibido" o "Pendiente de pago".
- "pagos": una fila por pago, con "estado" exactamente "Pagado", "Pendiente" o "Anulado".
- "nota_importante": un recordatorio práctico para el viajero, solo si el texto lo trae.
- "parrafo_confirmacion": una frase opcional para el viajero, por ejemplo "Estos son los números de confirmación de cada servicio; tenlos a mano durante el viaje."`,
    },

    voucher: {
      nombre: 'Voucher', titulo: 'Nuevo <span class="c">voucher</span>', eyebrow: 'Voucher de servicio', icono: 'ticket',
      desc: 'Comprobante de un servicio para presentar en el hotel o con el proveedor.', hojas: '1 hoja',
      boton: 'Generar el voucher', archivo: 'Voucher', codigo: d => d.codigo_voucher, tituloDe: d => d.nombre_servicio, clienteDe: d => d.nombre_viajero,
      armar: armarVoucher, flujo: { limite: 1178, etiqueta: 'Uso del voucher', sinPoliticas: true },
      pegar: 'Pega aquí la reserva del servicio',
      ayuda: ['La confirmación del hotel, tiquete u operador', 'Titular y acompañantes', 'Qué incluye y cómo se usa el voucher'],
      grupos: [
        { t: 'El servicio', sub: 'Un voucher ampara un solo servicio.', icono: 'ticket', campos: [
          { k: 'tipo', label: 'Tipo de servicio', w: 4, tipo: 'opciones', req: 1, opciones: [['hotel', 'Hotel'], ['aereo', 'Aéreo'], ['traslado', 'Traslado']] },
          T('codigo_voucher', 'Código de voucher', 4, { req: 1, ph: 'CAM-VCH-0000-01' }), T('codigo_reserva', 'Reserva asociada', 4),
          T('nombre_servicio', 'Nombre del servicio', 6, { req: 1, ayuda: 'Ejemplo: «Alojamiento — Hotel Dorado La 70».' }), T('proveedor', 'Proveedor u operador', 6, { req: 1 }),
          D('vigencia.desde', 'Válido desde', 4, { req: 1 }), D('vigencia.hasta', 'Válido hasta', 4, { req: 1 }), T('ubicacion', 'Ubicación', 4)] },
        { t: 'Viajeros', sub: 'El titular y quienes viajan con él.', icono: 'pencil', campos: [T('nombre_viajero', 'Titular', 6, { req: 1 }), L('acompanantes', 'Acompañantes (uno por renglón)', 6, { filas: 3 })] },
        { t: 'Hotel', sub: 'Una línea por hotel.', icono: 'building-2', cuando: ['tipo', 'hotel'], campos: [{ tipo: 'filas', k: 'hoteles', req: 1, mas: 'Agregar hotel', cols: COLS_HOTEL }] },
        { t: 'Tiquete', sub: 'Una línea por trayecto.', icono: 'ticket', cuando: ['tipo', 'aereo'], campos: [
          T('aereo.aerolinea', 'Aerolínea'), T('aereo.tiquete', 'Número de tiquete'), T('aereo.record', 'Récord', 4, { req: 1 }),
          { tipo: 'filas', k: 'aereo.trayectos', req: 1, mas: 'Agregar trayecto', cols: COLS_TRAYECTO }] },
        { t: 'Traslados', sub: 'Una línea por traslado.', icono: 'route', cuando: ['tipo', 'traslado'], campos: [{ tipo: 'filas', k: 'traslados', req: 1, mas: 'Agregar traslado', cols: COLS_TRASLADO }] },
        { t: 'Uso del voucher', sub: 'Qué cubre y cómo se presenta.', icono: 'file-text', campos: [
          L('incluye', 'Este voucher incluye', 12, { filas: 5 }), A('instrucciones', 'Instrucciones de uso', 6, { filas: 4 }), A('condiciones', 'Condiciones', 6, { filas: 4 })] },
      ],
      validar(d) {
        const f = [];
        [['codigo_voucher', 'Código de voucher'], ['nombre_servicio', 'Nombre del servicio'], ['nombre_viajero', 'Titular'], ['proveedor', 'Proveedor u operador'],
          ['vigencia.desde', 'Válido desde'], ['vigencia.hasta', 'Válido hasta']].forEach(([k, n]) => { if (vacio(getPath(d, k))) f.push([k, n]); });
        if (d.tipo === 'hotel') {
          const filas = (d.hoteles || []).filter(x => !vacio(x.hotel));
          if (!filas.length) f.push(['hoteles', 'Datos del hotel (nombre, entrada, salida)']);
          else if (!filas.some(x => !vacio(x.confirmacion))) f.push(['hoteles', 'Número de confirmación del hotel']);
        } else if (d.tipo === 'aereo') {
          if (!(d.aereo?.trayectos || []).length) f.push(['aereo.trayectos', 'Trayectos del tiquete']);
          if (vacio(d.aereo?.record)) f.push(['aereo.record', 'Récord del tiquete']);
        } else if (d.tipo === 'traslado') {
          const filas = d.traslados || [];
          if (!filas.length) f.push(['traslados', 'Traslados (trayecto y fecha)']);
          else if (!filas.some(x => !vacio(x.confirmacion))) f.push(['traslados', 'Número de confirmación del traslado']);
        } else f.push(['tipo', 'Tipo de servicio']);
        return f;
      },
      meta: d => `Válido del ${rango(d.vigencia.desde, d.vigencia.hasta)}`,
      ejemploTexto: `Voucher para el hotel de la familia Castaño en Salento.
Titular: Diana Castaño. Acompañantes: Julián Castaño, Sofía Castaño.
Reserva CAM-2026-3322.

Hotel Bosques del Cocora, Salento, Quindío.
Entrada 23 de octubre de 2026, salida 26 de octubre de 2026, habitación triple, confirmación BC-40718.
Incluye 3 noches, desayuno diario, caminata guiada al Valle de Cocora y parqueadero.
El check-in es desde las 3:00 PM, deben presentar el voucher y la cédula en recepción.
El voucher no es reembolsable ni transferible.`,
      forma: '{"tipo":"hotel|aereo|traslado","codigo_voucher":"","nombre_servicio":"","proveedor":"","vigencia":{"desde":"","hasta":""},"nombre_viajero":"","acompanantes":[],"ubicacion":"","codigo_reserva":"","hoteles":[{"hotel":"","entrada":"","salida":"","acomodacion":"","confirmacion":""}],"aereo":{"aerolinea":"","tiquete":"","record":"","trayectos":[{"vuelo":"","fecha":"","ruta":"","sale":"","llega":""}]},"traslados":[{"trayecto":"","fecha":"","hora":"","confirmacion":""}],"incluye":[],"instrucciones":"","condiciones":""}',
      reglas: `- Un voucher ampara UN solo servicio: "tipo" es "hotel", "aereo" o "traslado", y solo se llena la sección de ese tipo.
- "nombre_servicio": por ejemplo "Alojamiento — Hotel Bosques del Cocora".
- "vigencia": las fechas en que se usa el servicio (entrada y salida del hotel, fecha del vuelo o de los traslados).
- "codigo_voucher": solo si el texto trae uno.
- "acompanantes": un nombre por elemento.
- "instrucciones" y "condiciones": redacta en tono cercano, con "tú", lo que dice el texto.`,
    },
  };
  // Itinerario largo y corto: mismo motor y misma plantilla; el corto no lleva frase, vuelos ni hoteles.
  const COLS_VUELO = [T('vuelo', 'Vuelo', 0.9), D('fecha', 'Fecha', 1.3), T('origen', 'Origen', 1.2), T('destino', 'Destino', 1.2), T('sale', 'Sale', 0.8), T('llega', 'Llega', 1)];
  const gruposItinerario = largo => [
    { t: 'El viaje', sub: 'Lo que va en la portada.', icono: 'map', campos: [
      T('codigo', 'Código', 4, { req: 1 }), A('titulo', 'Título del viaje', 8, { req: 1, filas: 2, ayuda: 'Usa un salto de línea para partirlo en dos renglones.' }),
      T('subtitulo', 'Subtítulo', 4, { ph: 'Viaje de fe 2026' }), T('destino', 'Destino principal', 4), T('pasajero', 'Pasajero o grupo', 4, { req: 1 }),
      D('fecha_inicio', 'Inicio', 4, { req: 1 }), D('fecha_fin', 'Fin', 4, { req: 1 }), T('acomodacion', 'Acomodación', 4),
      T('grupo', 'Grupo', 6), T('acompanamiento', 'Acompañamiento espiritual', 6),
      { k: 'foto_portada', label: 'Foto de portada (opcional)', w: 12, tipo: 'foto', ayuda: 'Va en el encabezado, con el degradado de protección. Si la dejas vacía, la buscamos en el banco por el destino principal; sin foto, la portada queda coral.' }] },
    { t: 'Bienvenida', sub: 'El primer texto que lee el viajero.', icono: 'sparkles', campos: [
      A('bienvenida', 'Bienvenida', 12, { filas: 4 }), ...(largo ? [A('frase', 'Frase destacada', 12, { filas: 2 })] : [])] },
    ...(largo ? [{ t: 'Vuelos', sub: 'Internacionales e internos. Si no hay, la sección no aparece.', icono: 'ticket', campos: [
      { tipo: 'filas', k: 'vuelos', titulo: 'Vuelos confirmados', mas: 'Agregar vuelo', min: 0, cols: COLS_VUELO },
      { tipo: 'filas', k: 'vuelos_internos', titulo: 'Vuelos internos', mas: 'Agregar vuelo interno', min: 0, cols: COLS_VUELO }] }] : []),
    { t: 'Día a día', sub: 'Un bloque por día. Un día nunca se parte entre dos hojas.', icono: 'route', campos: [
      { tipo: 'bloques', k: 'dias', req: 1, titulo: 'Día', numerar: true, mas: 'Agregar día', campos: [
        D('fecha', 'Fecha', 3), T('titulo', 'Título del día', 6), T('lugar', 'Lugar en el mapa', 3, { ph: 'Chiang Mai' }), A('descripcion', 'Qué hacemos', 12, { filas: 3 }),
        { k: 'comidas', label: 'Comidas incluidas', w: 4, tipo: 'coma', ph: 'Desayuno, Almuerzo' }, { k: 'etiquetas', label: 'Etiquetas', w: 4, tipo: 'coma', ph: 'Noche a bordo' },
        T('hotel', 'Hotel de esa noche', 4), { k: 'foto', label: 'Foto del día (opcional)', w: 12, tipo: 'foto', max: 900 }] }] },
    { t: 'Qué incluye', sub: 'Un renglón por ítem. Empieza un renglón con # para poner un subtítulo de grupo.', icono: 'badge-check', campos: [
      L('incluye', 'Incluye', 6, { grupos: true }), L('no_incluye', 'No incluye', 6, { grupos: true })] },
    ...(largo ? [{ t: 'Hoteles', sub: 'Los hoteles confirmados. Con foto, salen también en tarjetas.', icono: 'building-2', campos: [
      { tipo: 'bloques', k: 'hoteles', titulo: 'Hotel', numerar: true, mas: 'Agregar hotel', min: 0, campos: [
        T('nombre', 'Nombre', 6), T('ciudad', 'Ciudad', 6), T('direccion', 'Dirección', 8), T('telefono', 'Teléfono', 4),
        { k: 'foto', label: 'Foto (opcional; si la dejas vacía, la buscamos en el banco)', w: 12, tipo: 'foto', max: 900 }] }] }] : []),
    { t: 'Antes de viajar', sub: 'Recomendaciones por tema y una nota final.', icono: 'file-text', campos: [
      { tipo: 'bloques', k: 'recomendaciones', titulo: 'Tema', mas: 'Agregar tema', min: 0, campos: [T('tema', 'Tema', 12), L('items', 'Recomendaciones (una por renglón)', 12, { filas: 4 })] },
      A('nota', 'Nota final', 12, { filas: 2 })] },
  ];
  const baseItinerario = {
    archivo: 'Itinerario', codigo: d => d.codigo, tituloDe: d => String(d.titulo || '').replace(/\s*\n\s*/g, ' '), clienteDe: d => d.grupo || d.pasajero,
    armar: armarItinerario, flujo: null,
    validar(d) {
      const f = [];
      [['codigo', 'Código del itinerario'], ['titulo', 'Título del viaje'], ['fecha_inicio', 'Fecha de inicio'], ['fecha_fin', 'Fecha de fin'], ['pasajero', 'Pasajero o grupo']]
        .forEach(([k, n]) => { if (vacio(d[k])) f.push([k, n]); });
      if (!(d.dias || []).some(x => !vacio(x.titulo) || !vacio(x.descripcion))) f.push(['dias', 'Al menos un día del recorrido']);
      return f;
    },
    preparar: d => ({ ...d, codigo: vacio(d.codigo) ? 'CA' + Math.floor(1000 + Math.random() * 9000) : d.codigo }),
    meta: d => `Del ${rangoHero(d.fecha_inicio, d.fecha_fin)}`,
    fotos: d => [
      ...(vacio(d.destino) ? [] : [{ clave: claveDestino(d.destino), tipo: 'destino', nombre: d.destino, ciudad: '', get: () => d.foto_portada, set: u => { d.foto_portada = u; } }]),
      ...(d.hoteles || []).filter(h => !vacio(h.nombre)).map(h => ({ clave: claveHotel(h.nombre, h.ciudad), tipo: 'hotel', nombre: h.nombre, ciudad: h.ciudad || '', get: () => h.foto, set: u => { h.foto = u; } })),
    ],
    ayuda: ['El programa día por día (sirve el texto del Word del proveedor)', 'Vuelos, hoteles, qué incluye y qué no', 'Recomendaciones para el viajero'],
    reglasBase: `- "titulo": usa \n para partirlo en dos renglones, por ejemplo "Peregrinación a\nFátima y Lourdes".
- "descripcion" de cada día en dos o tres líneas, en primera persona del plural ("salimos", "visitamos"). Conserva todos los datos: lugares, horas y detalles. No agregues lugares ni actividades.
- "comidas": solo las incluidas ("Desayuno", "Almuerzo", "Cena"). "hotel": el hotel de esa noche, si lo hay.
- "lugar" de cada día: la ciudad donde termina el día, en español, tal como la nombra el texto ("Chiang Mai", "Fátima"). Vacío si el día es solo de vuelo.
- "incluye" y "no_incluye": frases cortas; si el texto agrupa ítems, usa {"grupo": "...", "items": [...]}.
- "recomendaciones": lista de {"tema", "items"}. "nota": un aviso final corto, solo si lo hay.
- "codigo": solo si el texto trae uno.`,
  };
  DOCS.itinerario = {
    ...baseItinerario, interactivo: htmlItinerario, nombre: 'Itinerario', titulo: 'Nuevo <span class="c">itinerario</span>', eyebrow: 'Itinerario de viaje', icono: 'route',
    desc: 'El día a día del viaje, con vuelos, hoteles, fotos y recomendaciones.', hojas: 'Hojas según el viaje', boton: 'Generar el itinerario',
    pegar: 'Pega aquí el programa del viaje', grupos: gruposItinerario(true),
    forma: '{"codigo":"","titulo":"","subtitulo":"","destino":"","fecha_inicio":"","fecha_fin":"","grupo":"","acompanamiento":"","pasajero":"","acomodacion":"","bienvenida":"","frase":"","vuelos":[{"vuelo":"","fecha":"","origen":"","destino":"","sale":"","llega":""}],"vuelos_internos":[],"dias":[{"fecha":"","titulo":"","lugar":"","descripcion":"","comidas":[],"etiquetas":[],"hotel":""}],"incluye":[],"no_incluye":[],"hoteles":[{"nombre":"","ciudad":"","direccion":"","telefono":""}],"recomendaciones":[{"tema":"","items":[]}],"nota":""}',
    reglas: baseItinerario.reglasBase + `
- "frase": una frase destacada del viaje, solo si el texto la trae.
- "llega" de un vuelo que aterriza otro día: la hora y la fecha, por ejemplo "15:00 05/09".`,
    ejemploTexto: `Itinerario para el grupo de la Parroquia Nuestra Señora de Lourdes, peregrinación a Fátima y Santiago de Compostela, del 10 al 16 de mayo de 2027. Código CA4410. Acompaña el Pbro. Andrés Salazar. Pasajera: Marta Lucía Gómez, acomodación doble.

Vuelos: IB6584 10 de mayo Bogotá - Madrid sale 16:05 llega 08:35 del 11/05. TP1017 11 de mayo Madrid - Lisboa sale 11:10 llega 11:25. IB6585 16 de mayo Madrid - Bogotá sale 12:05 llega 15:20.

Día 1 (10 de mayo): encuentro en la parroquia y traslado al aeropuerto El Dorado. Noche a bordo.
Día 2 (11 de mayo): llegada a Lisboa, visita a la iglesia de San Antonio y traslado a Fátima. Cena. Hotel Santa Maria.
Día 3 (12 de mayo): misa en la Capilla de las Apariciones, visita a Aljustrel y rosario de las velas en la noche. Desayuno y cena. Hotel Santa Maria.
Día 4 (13 de mayo): peregrinación del 13 de mayo en el santuario y salida hacia Santiago de Compostela. Desayuno y cena. Hotel San Francisco.
Día 5 (14 de mayo): misa del peregrino en la catedral y recorrido por el casco antiguo. Desayuno y cena. Hotel San Francisco.
Día 6 (15 de mayo): tren a Madrid, tarde libre. Desayuno. Hotel Catalonia Gran Vía.
Día 7 (16 de mayo): traslado al aeropuerto y regreso a Bogotá. Desayuno.

Incluye: tiquetes internacionales con equipaje de 23 kg, hoteles con desayuno, 4 cenas, bus privado, guía en español, tren Santiago - Madrid, seguro médico.
No incluye: almuerzos, propinas, gastos personales.
Hoteles: Hotel Santa Maria, Fátima, Rua de Santo António 9. Hotel San Francisco, Santiago de Compostela, Campillo San Francisco 3. Hotel Catalonia Gran Vía, Madrid, Gran Vía 7.
Recomendaciones: llevar pasaporte vigente y copia; zapatos cómodos para caminar; ropa abrigada para las noches en Fátima.`,
  };
  DOCS.itinerario_corto = {
    ...baseItinerario, interactivo: htmlItinerario, nombre: 'Itinerario corto', titulo: 'Nuevo <span class="c">itinerario corto</span>', eyebrow: 'Itinerario corto', icono: 'map',
    desc: 'Para pasadías y viajes de uno a cuatro días, por lo general terrestres.', hojas: '2 hojas', boton: 'Generar el itinerario',
    pegar: 'Pega aquí el plan del viaje', grupos: gruposItinerario(false),
    forma: '{"codigo":"","titulo":"","subtitulo":"","destino":"","fecha_inicio":"","fecha_fin":"","grupo":"","acompanamiento":"","pasajero":"","acomodacion":"","bienvenida":"","dias":[{"fecha":"","titulo":"","lugar":"","descripcion":"","comidas":[],"etiquetas":[],"hotel":""}],"incluye":[],"no_incluye":[],"recomendaciones":[{"tema":"","items":[]}],"nota":""}',
    reglas: baseItinerario.reglasBase + `
- Es un viaje corto (1 a 4 días): no lleva vuelos, hoteles ni frase destacada. Si es pasadía, "fecha_inicio" y "fecha_fin" son iguales.`,
    ejemploTexto: `Pasadía a Monserrate con el grupo de oración de la Parroquia San Pedro Claver, el sábado 20 de marzo de 2027. Código CA5120. Responsable: Carolina Méndez. Acompaña el Pbro. Felipe Rojas.

Salimos a las 6:30 AM desde la parroquia en bus, subimos en teleférico, misa a las 9:00 AM en el santuario del Señor Caído, luego viacrucis por el sendero y almuerzo en el restaurante Casa Santa Clara. Regreso a la parroquia a las 4:00 PM.

Incluye: transporte, tiquetes de teleférico ida y regreso, almuerzo, seguro de asistencia.
No incluye: gastos personales.
Recomendaciones: llevar ropa abrigada y paraguas, tomar agua durante el viaje, llevar el documento de identidad.`,
  };
  DOCS.voucher.preparar = d => ({
    ...d,
    tipo: ['hotel', 'aereo', 'traslado'].includes(d.tipo) ? d.tipo : 'hotel',
    codigo_voucher: vacio(d.codigo_voucher) ? `CAM-VCH-${Math.floor(1000 + Math.random() * 9000)}-01` : d.codigo_voucher,
  });


  // Cada nodo del esquema se vuelve {el, leer()}; así el formulario se lee igual que se dibuja.
  // Listas de un renglón por ítem. Un renglón que empieza con "#" es un subtítulo de grupo
  // (en el itinerario: {grupo, items}).
  const listaATexto = v => (Array.isArray(v) ? v.flatMap(x => (x && typeof x === 'object') ? ['# ' + (x.grupo || ''), ...(x.items || [])] : [x]).join('\n') : v || '');
  function textoALista(t, grupos) {
    const out = [];
    for (const l of t.split('\n').map(x => x.trim()).filter(Boolean)) {
      if (grupos && l.startsWith('#')) out.push({ grupo: l.replace(/^#+\s*/, ''), items: [] });
      else {
        const item = l.replace(/^[-•*]\s*/, '');
        const ult = out.at(-1);
        if (grupos && ult && typeof ult === 'object') ult.items.push(item); else out.push(item);
      }
    }
    return out;
  }
  // Foto: se reduce en el navegador (como preparar_foto del motor) y se guarda como data URL.
  function campoFoto(spec, valor, div, id) {
    let url = valor || '';
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.id = id; input.className = 'campo';
    const vista = document.createElement('div');
    vista.className = 'foto-vista';
    const pintar = () => {
      vista.innerHTML = url ? `<span class="foto-mini" style="background-image:url('${url}')"></span>${delBanco(url) ? '<span class="ayudita" style="margin:0;">Del banco de fotos</span>' : ''}<button type="button" class="enlace">Quitar foto</button>` : '';
      vista.querySelector('.enlace')?.addEventListener('click', () => { url = ''; input.value = ''; pintar(); });
    };
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (!f) return;
      const img = new Image();
      const blobUrl = URL.createObjectURL(f);
      img.onload = () => {
        const max = spec.max || 1600, k = Math.min(1, max / img.naturalWidth);
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        url = cv.toDataURL('image/jpeg', 0.85);
        URL.revokeObjectURL(blobUrl);
        pintar();
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); vista.innerHTML = '<span class="ayudita">No pudimos abrir esa imagen. Si es HEIC, conviértela a JPG o PNG.</span>'; };
      img.src = blobUrl;
    });
    div.append(input, vista);
    pintar();
    return { el: div, leer: () => url, input };
  }
  function campo(spec, valor) {
    const id = 'f-' + Math.random().toString(36).slice(2, 9);
    const div = document.createElement('div');
    if (spec.w) div.className = 's' + spec.w;
    if (spec.req) div.dataset.req = spec.k;
    if (spec.tipo === 'foto') {
      div.innerHTML = `<label class="lbl" for="${id}">${esc(spec.label)}</label>`;
      const n = campoFoto(spec, valor, div, id);
      if (spec.ayuda) div.insertAdjacentHTML('beforeend', `<p class="ayudita">${esc(spec.ayuda)}</p>`);
      return n;
    }
    let input;
    if (spec.tipo === 'area' || spec.tipo === 'lineas') {
      input = document.createElement('textarea');
      input.rows = spec.filas || (spec.tipo === 'lineas' ? 7 : 3);
      input.value = spec.tipo === 'lineas' ? listaATexto(valor) : valor || '';
    } else if (spec.tipo === 'opciones') {
      input = document.createElement('select');
      input.innerHTML = spec.opciones.map(([v, n]) => `<option value="${esc(v)}">${esc(n)}</option>`).join('');
      const v = spec.normalizar ? spec.normalizar(valor) : valor;
      input.value = spec.opciones.some(([o]) => o === v) ? v : spec.opciones[0][0];
    } else {
      input = document.createElement('input');
      if (spec.tipo === 'fecha') { input.type = 'date'; input.value = RE_ISO.test(valor || '') ? String(valor).trim().replace(/-(\d)(?!\d)/g, '-0$1') : ''; }
      else input.value = spec.tipo === 'coma' ? (Array.isArray(valor) ? valor.join(', ') : valor || '') : valor || '';
      if (spec.ph) input.placeholder = spec.ph;
    }
    input.className = 'campo';
    input.id = id;
    input.dataset.k = spec.k;
    div.innerHTML = `<label class="lbl" for="${id}">${esc(spec.label)}</label>`;
    div.append(input);
    if (spec.ayuda) div.insertAdjacentHTML('beforeend', `<p class="ayudita">${esc(spec.ayuda)}</p>`);
    const leer = () => spec.tipo === 'lineas' ? textoALista(input.value, spec.grupos)
      : spec.tipo === 'coma' ? input.value.split(',').map(x => x.trim()).filter(Boolean) : input.value.trim();
    return { el: div, leer, input };
  }
  function filas(spec, valores) {
    const wrap = document.createElement('div');
    wrap.className = 'filas-wrap';
    if (spec.req) wrap.dataset.req = spec.k;
    const lista = document.createElement('div');
    lista.className = 'filas';
    const items = [];
    const plantillaCols = spec.cols.map(c => `minmax(0, ${c.w}fr)`).join(' ') + ' 44px';
    const agregar = (v = {}) => {
      const fila = document.createElement('div');
      fila.className = 'fila';
      fila.style.gridTemplateColumns = plantillaCols;
      const celdas = spec.cols.map(c => { const n = campo({ ...c, w: 0, req: 0 }, v[c.k]); fila.append(n.el); return [c.k, n]; });
      const quitarBtn = document.createElement('button');
      quitarBtn.type = 'button'; quitarBtn.className = 'quitar'; quitarBtn.setAttribute('aria-label', 'Quitar fila');
      quitarBtn.innerHTML = '<i data-lucide="trash-2"></i>';
      const item = { vivo: true, leer: () => Object.fromEntries(celdas.map(([k, n]) => [k, n.leer()])) };
      quitarBtn.addEventListener('click', () => { item.vivo = false; fila.remove(); });
      fila.append(quitarBtn);
      items.push(item);
      lista.append(fila);
      iconos(fila);
    };
    const iniciales = (valores || []).filter(v => !Object.values(v || {}).every(vacio));
    (iniciales.length ? iniciales : Array(spec.min ?? 1).fill({})).forEach(agregar);
    const mas = document.createElement('button');
    mas.type = 'button'; mas.className = 'btn btn-txt mas';
    mas.innerHTML = `<i data-lucide="plus"></i>${esc(spec.mas)}`;
    mas.addEventListener('click', () => agregar());
    if (spec.titulo) wrap.insertAdjacentHTML('afterbegin', `<span class="lbl" style="color:var(--carbon);margin-bottom:12px;">${esc(spec.titulo)}</span>`);
    wrap.append(lista, mas);
    iconos(wrap);
    return { el: wrap, leer: () => items.filter(i => i.vivo).map(i => i.leer()).filter(v => !Object.values(v).every(vacio)) };
  }
  function bloquesRepetidos(spec, valores) {
    const wrap = document.createElement('div');
    wrap.className = 'filas-wrap';
    if (spec.req) wrap.dataset.req = spec.k;
    const lista = document.createElement('div');
    lista.className = 'filas';
    const items = [];
    const agregar = (v = {}, i = 0) => {
      const caja = document.createElement('div');
      caja.className = 'subgrupo';
      const titulo = spec.numerar ? `${spec.titulo} ${i + 1}` : spec.titulo;
      caja.innerHTML = `<div class="subgrupo-head"><span class="lbl">${esc(titulo)}</span><button type="button" class="enlace">Quitar</button></div>`;
      const rej = document.createElement('div');
      rej.className = 'rejilla';
      const nodos = spec.campos.map(c => { const n = campo(c, v[c.k]); rej.append(n.el); return [c.k, n]; });
      const sub = spec.filas ? filas(spec.filas, v[spec.filas.k]) : null;
      if (sub) rej.append(sub.el);
      caja.append(rej);
      const item = { vivo: true, leer: () => ({ ...Object.fromEntries(nodos.map(([k, n]) => [k, n.leer()])), ...(sub ? { [spec.filas.k]: sub.leer() } : {}) }) };
      caja.querySelector('.enlace').addEventListener('click', () => { item.vivo = false; caja.remove(); });
      items.push(item);
      lista.append(caja);
    };
    (valores && valores.length ? valores : Array(spec.min ?? 1).fill({})).forEach((v, i) => agregar(v, i));
    const mas = document.createElement('button');
    mas.type = 'button'; mas.className = 'btn btn-txt mas';
    mas.innerHTML = `<i data-lucide="plus"></i>${esc(spec.mas)}`;
    mas.addEventListener('click', () => agregar({}, items.length));
    wrap.append(lista, mas);
    iconos(wrap);
    return { el: wrap, leer: () => items.filter(i => i.vivo).map(i => i.leer()).filter(v => (spec.filas && (v[spec.filas.k] || []).length) || spec.campos.some(c => !vacio(v[c.k]))) };
  }

  let formulario = null; // { nodos: [[clave, nodo]], grupos: [[spec, el]] }
  function dibujarFormulario(doc, datos) {
    const cont = $('#form-grupos');
    cont.innerHTML = '';
    const nodos = [], grupos = [];
    for (const g of doc.grupos) {
      const tarjetaG = document.createElement('div');
      tarjetaG.className = 'papel grupo';
      tarjetaG.innerHTML = `<div class="grupo-head"><span class="tile"><i data-lucide="${g.icono}"></i></span><div><h2 class="sec">${esc(g.t)}</h2><p>${esc(g.sub)}</p></div></div>`;
      const rej = document.createElement('div');
      rej.className = 'rejilla';
      for (const c of g.campos) {
        const n = c.tipo === 'filas' ? filas(c, getPath(datos, c.k)) : c.tipo === 'bloques' ? bloquesRepetidos(c, getPath(datos, c.k)) : campo(c, getPath(datos, c.k));
        rej.append(n.el);
        nodos.push([c.k, n, g]);
      }
      tarjetaG.append(rej);
      cont.append(tarjetaG);
      grupos.push([g, tarjetaG]);
    }
    formulario = { nodos, grupos };
    const tipo = nodos.find(([k]) => k === 'tipo')?.[1].input;
    const mostrar = () => grupos.forEach(([g, el]) => { if (g.cuando) el.hidden = tipo?.value !== g.cuando[1]; });
    tipo?.addEventListener('change', mostrar);
    mostrar();
    iconos(cont);
  }
  function leerFormulario() {
    const d = {};
    const tipo = formulario.nodos.find(([k]) => k === 'tipo')?.[1].leer();
    for (const [k, n, g] of formulario.nodos) {
      if (g.cuando && g.cuando[1] !== tipo) continue;
      setPath(d, k, n.leer());
    }
    return d;
  }

  // ================= estado y navegación =================
  let docId = 'cotizacion';
  let docActual = null;
  const doc = () => DOCS[docId];

  const EJEMPLOS_RECIENTES = [
    { doc: 'cotizacion', fecha: '2026-09-24', ejemplo: true, datos: EJEMPLOS.cotizacion },
    { doc: 'confirmacion', fecha: '2026-09-22', ejemplo: true, datos: EJEMPLOS.confirmacion },
    { doc: 'voucher', fecha: '2026-09-19', ejemplo: true, datos: EJEMPLOS.voucher },
    { doc: 'itinerario', fecha: '2026-09-17', ejemplo: true, datos: EJEMPLOS.itinerario },
    { doc: 'itinerario_corto', fecha: '2026-09-15', ejemplo: true, datos: EJEMPLOS.itinerario_corto },
  ];
  let guardados = [];
  try { guardados = JSON.parse(localStorage.getItem('caminos-demo-docs-v2') || '[]'); } catch (_) { guardados = []; }
  // Las fotos pesan: si no caben en el almacenamiento del navegador, se guarda sin ellas.
  const sinFotos = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'string' && v.startsWith('data:image/') ? '' : v)));
  const guardar = () => {
    const lista = guardados.slice(0, 20);
    try { localStorage.setItem('caminos-demo-docs-v2', JSON.stringify(lista)); }
    catch (_) { try { localStorage.setItem('caminos-demo-docs-v2', JSON.stringify(lista.map(sinFotos))); } catch (_) {} }
  };
  // Lista compartida: colección «documentos» de la base de la app, la misma para todas las asesoras (se ve en
  // vivo lo que genera cada una). El navegador guarda además una copia, por si la base no está disponible.
  // Un documento por tipo y código: volver a generarlo lo actualiza en vez de duplicarlo.
  let dbDocs = null;
  const idDoc = (doc, datos) => doc + '__' + (slug(DOCS[doc]?.codigo(datos)) || 'sin-codigo');
  const momento = r => String(r.cuando || r.fecha || '');
  async function subirDoc(r) {
    if (!dbDocs) return;
    try { await dbDocs.doc('documentos/' + idDoc(r.doc, r.datos)).set({ doc: r.doc, fecha: r.fecha, cuando: r.cuando || new Date().toISOString(), datos: sinFotos(r.datos) }); } catch (_) {}
  }
  (async () => {
    dbDocs = window.claude?.use ? await window.claude.use('db').catch(() => null) : null;
    if (!dbDocs) return;
    let primera = true;
    dbDocs.collection('documentos').onSnapshot(snap => {
      const vivos = snap.docs.filter(d => d.exists);
      // La primera vez, lo que este navegador tenía guardado y aún no está en la lista compartida se sube.
      if (primera) { primera = false; const ids = new Set(vivos.map(d => d.id)); guardados.filter(g => DOCS[g.doc] && !ids.has(idDoc(g.doc, g.datos))).forEach(subirDoc); }
      const mapa = new Map();
      for (const r of [...vivos.map(d => d.data()), ...guardados]) {
        if (!r || !DOCS[r.doc] || !r.datos) continue;
        const k = idDoc(r.doc, r.datos);
        if (!mapa.has(k) || momento(r) > momento(mapa.get(k))) mapa.set(k, r);
      }
      guardados = [...mapa.values()].sort((a, b) => momento(b).localeCompare(momento(a)));
      if (!$('#v-inicio').hidden || !$('#v-documentos').hidden) pintarListas();
    }, () => {});
  })();

  const VISTAS = ['inicio', 'documentos', 'doc', 'banco'];
  function ir(vista) {
    VISTAS.forEach(v => { $('#v-' + v).hidden = v !== vista; });
    $$('.nav button').forEach(b => { if (b.dataset.ir === vista) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (vista === 'inicio' || vista === 'documentos') pintarListas();
    if (vista === 'banco' && Banco.listo) pintarBanco();
    window.scrollTo({ top: 0 });
  }
  function abrirDoc(id, datos) {
    docId = id;
    conversion = null;
    ultimaLectura = null;
    $('#releer').hidden = true;
    mostrarConversion();
    const d = doc();
    $('#doc-eyebrow').textContent = d.eyebrow;
    $('#doc-titulo').innerHTML = d.titulo;
    $('#pegado-lbl').textContent = d.pegar;
    $('#ayuda-lista').innerHTML = d.ayuda.map(a => `<li><span class="check"><i data-lucide="check"></i></span>${esc(a)}</li>`).join('');
    iconos($('#ayuda-lista'));
    $('#btn-generar').innerHTML = `<i data-lucide="file-text"></i>${esc(d.boton)}`;
    ir('doc');
    if (datos) {
      dibujarFormulario(d, datos);
      paso(3);
      $('#prev-titulo').textContent = `${d.nombre} ${d.codigo(datos)} · ${d.tituloDe(datos)}`;
      $('#prev-meta').textContent = 'Armando el documento…';
      mostrarDocumento(leerFormulario());
      return;
    }
    $('#pegado').value = d.ejemploTexto;
    estado1('Texto de ejemplo. Reemplázalo por la información real.');
    $('#desde-base').hidden = !d.desdeBase;
    $('#estado-base').textContent = '';
    paso(1);
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-ir], [data-doc]');
    if (!b) return;
    ev.preventDefault();
    if (b.dataset.doc) abrirDoc(b.dataset.doc); else ir(b.dataset.ir);
  });

  // ================= inicio e historial =================
  function pintarTipos() {
    const tarjetas = Object.entries(DOCS).map(([id, d]) => ({ id, ...d, listo: true }));
    $('#docs').innerHTML = tarjetas.map(t => `
      <button type="button" class="papel doc" data-tipo="${t.id}">
        <div class="doc-head"><span class="tile"><i data-lucide="${t.icono}"></i></span>
          <span class="tag ${t.listo ? 'tag-listo' : 'tag-pronto'}">${t.listo ? 'Listo en la demo' : 'Versión completa'}</span></div>
        <h3>${esc(t.nombre)}</h3>
        <p>${esc(t.desc)}</p>
        <div class="doc-pie"><span>${esc(t.hojas)}</span><i data-lucide="arrow-right"></i></div>
      </button>`).join('');
    $$('#docs .doc').forEach(b => b.addEventListener('click', () => abrirDoc(b.dataset.tipo)));
    iconos();
  }
  function filasTabla(items, agrupar) {
    if (!items.length) return `<tbody><tr><td colspan="5" class="vacio">Todavía no has generado documentos.</td></tr></tbody>`;
    const cab = `<thead><tr><th>Código</th><th>Documento</th><th>Viaje</th><th>Fecha</th><th></th></tr></thead>`;
    if (agrupar) {
      // Un expediente por viaje: la cotización CA3311, la confirmación CAM-2026-3311 y el voucher CAM-VCH-3311-01 van juntos.
      const grupos = new Map();
      items.forEach((r, i) => {
        const exp = expedienteDe(DOCS[r.doc].codigo(r.datos));
        if (!grupos.has(exp)) grupos.set(exp, []);
        grupos.get(exp).push(i);
      });
      return cab + [...grupos].map(([exp, idx]) => {
        const nombres = idx.map(i => DOCS[items[i].doc].nombre);
        const cuenta = [...new Set(nombres)].map(n => { const k = nombres.filter(x => x === n).length; return k > 1 ? `${n} (${k})` : n; }).join(' · ');
        return `<tbody><tr class="exp-fila"><td colspan="5"><span class="exp-cod">${esc(exp)}</span><span class="exp-docs">${esc(cuenta)}</span></td></tr>` +
          idx.map(i => filaDoc(items[i], i)).join('') + '</tbody>';
      }).join('');
    }
    return cab + '<tbody>' + items.map((r, i) => filaDoc(r, i)).join('') + '</tbody>';
  }
  function filaDoc(r, i) {
        const d = DOCS[r.doc];
        return `<tr>
        <td class="cod">${esc(d.codigo(r.datos))}</td>
        <td><b>${esc(d.nombre)}</b></td>
        <td>${esc(d.tituloDe(r.datos))}${d.clienteDe(r.datos) ? `<br><span style="color:var(--pizarra);font-size:13px;">${esc(d.clienteDe(r.datos))}</span>` : ''}</td>
        <td>${esc(fecha(r.fecha, 'de'))}</td>
        <td style="text-align:right;white-space:nowrap;">${r.ejemplo ? '<span class="tag tag-pronto">Ejemplo</span> ' : ''}<button type="button" class="enlace" data-abrir="${i}">Abrir</button></td>
      </tr>`;
  }
  function pintarListas() {
    const todos = [...guardados, ...EJEMPLOS_RECIENTES];
    $('#tabla-recientes').innerHTML = filasTabla(todos.slice(0, 4));
    $('#tabla-todos').innerHTML = filasTabla(todos, true);
    $$('[data-abrir]').forEach(b => b.addEventListener('click', () => { const r = todos[+b.dataset.abrir]; abrirDoc(r.doc, DOCS[r.doc].preparar(clonar(r.datos))); }));
  }

  // ================= pasos =================
  function paso(n) {
    [1, 2, 3].forEach(i => { $('#paso-' + i).hidden = i !== n; });
    $$('#pasos .paso').forEach(li => {
      const k = +li.dataset.paso;
      li.classList.toggle('hecho', k < n);
      if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      li.querySelector('i').innerHTML = k < n ? '<i data-lucide="check"></i>' : String(k);
    });
    iconos($('#pasos'));
    window.scrollTo({ top: 0 });
  }
  function estado1(txt, tipo) {
    const el = $('#estado-1');
    el.className = 'estado' + (tipo === 'error' ? ' error' : tipo === 'cargando' ? ' girando' : '');
    el.innerHTML = (tipo === 'cargando' ? '<i data-lucide="loader-circle"></i>' : tipo === 'error' ? '<i data-lucide="circle-alert"></i>' : '') + `<span>${esc(txt)}</span>`;
    iconos(el);
  }

  // ================= Claude (capacidad "sample": usa la cuenta de claude.ai de quien abre la página) =================
  let samplePromesa = null;
  const obtenerSample = () => (samplePromesa ??= (window.claude?.use ? window.claude.use('sample').catch(() => null) : Promise.resolve(null)));
  let ctl = null;
  const instruccion = (d, texto, base) => `Eres el asistente de Caminos, una agencia de viajes colombiana. Un asesor pegó información para preparar un documento de tipo "${d.nombre}". Conviértela en los datos del documento.

Reglas:
- No inventes nada: cifras, fechas, códigos, hoteles, servicios y condiciones salen solo del texto. Si algo no está, déjalo como "" (o [] en las listas).
- Fechas en formato AAAA-MM-DD. Hoy es ${hoy()}; si el texto no da el año, usa el próximo que tenga sentido.
- Valores en pesos como en el texto, con punto de miles y signo: "$1.640.000".
- Español de Colombia, trato de "tú", sin emojis. Títulos en sentence case.
${d.reglas}${base ? `

Ya tenemos estos datos, que vienen ${/^el /.test(conversion?.desde || '') ? 'del ' + conversion.desde.slice(3) : 'de ' + (conversion?.desde || 'un documento anterior')}. Consérvalos y complétalos con la información nueva; si la información nueva contradice un dato, manda la nueva. En "dias", conserva cada fecha y súmale lo que diga el texto:
${JSON.stringify(sinFotos(base))}` : ''}

Responde solo con JSON, con exactamente esta forma:
${d.forma}

Información:
"""
${texto}
"""`;
  const MENSAJES = {
    not_granted: 'No diste permiso para usar Claude en esta página. Puedes llenar el documento a mano.',
    rate_limited: 'Claude está recibiendo muchas solicitudes. Espera un momento y vuelve a intentarlo.',
    cancelled: 'Detuviste la lectura.',
  };
  // Para gastar menos del plan, se lee con el nivel rápido de Claude. Si esa lectura falla se reintenta una vez
  // con el nivel normal, y la asesora puede pedir «Leer de nuevo con más precisión» si algo quedó incompleto.
  let ultimaLectura = null; // { texto, base } de la última lectura rápida
  async function ordenar(texto, base, nivel) {
    const d = doc();
    const sample = await obtenerSample();
    if (!sample) {
      estado1(conversion ? 'En esta vista no se puede usar Claude (ábrela desde claude.ai). Seguimos con los datos que trajimos.' : 'En esta vista no se puede usar Claude (ábrela desde claude.ai). Cargamos los datos del ejemplo para que veas el resultado.', 'error');
      dibujarFormulario(d, d.preparar(clonar(conversion ? conversion.base : EJEMPLOS[docId])));
      marcarFaltantes();
      paso(2);
      return;
    }
    const btns = ['#btn-ordenar', '#btn-mano', '#btn-releer'].map(x => $(x));
    btns.forEach(x => { x.disabled = true; }); $('#btn-detener').hidden = false;
    estado1(nivel === 'quick' ? 'Leyendo la información… suele tardar entre 10 y 30 segundos.' : 'Leyendo con más precisión… puede tardar hasta un minuto.', 'cargando');
    $('#estado-releer').textContent = nivel === 'quick' ? '' : 'Leyendo con más precisión…';
    ctl = new AbortController();
    try {
      let datos;
      try { datos = await sample.json(instruccion(d, texto, base), { signal: ctl.signal, modelTier: nivel }); }
      catch (err) {
        if (nivel !== 'quick' || ['cancelled', 'not_granted', 'rate_limited'].includes(err?.code)) throw err;
        nivel = 'default';
        datos = await sample.json(instruccion(d, texto, base), { signal: ctl.signal, modelTier: nivel });
      }
      if (base) { datos = fusionar(base, datos || {}); conversion.base = datos; }
      dibujarFormulario(d, d.preparar(datos || {}));
      estado1('');
      ultimaLectura = nivel === 'quick' ? { texto, base } : null;
      $('#releer').hidden = !ultimaLectura;
      $('#estado-releer').textContent = '';
      marcarFaltantes();
      paso(2);
    } catch (err) {
      const msj = MENSAJES[err?.code] || 'No pudimos ordenar la información. Revisa el texto o llena el documento a mano.';
      if (!$('#paso-2').hidden) $('#estado-releer').textContent = msj; else estado1(msj, 'error');
    } finally {
      btns.forEach(x => { x.disabled = false; }); $('#btn-detener').hidden = true;
    }
  }
  $('#btn-ordenar').addEventListener('click', () => {
    const texto = $('#pegado').value.trim();
    if (!texto) { estado1('Pega primero la información.', 'error'); return; }
    $('#releer').hidden = true;
    ordenar(texto, conversion?.base, 'quick');
  });
  $('#btn-releer').addEventListener('click', () => {
    if (!ultimaLectura) return;
    if (conversion && ultimaLectura.base) conversion.base = ultimaLectura.base; // se parte de los datos previos, no de la lectura rápida
    ordenar(ultimaLectura.texto, ultimaLectura.base, 'default');
  });
  $('#btn-detener').addEventListener('click', () => ctl?.abort());
  $('#btn-mano').addEventListener('click', () => {
    $('#releer').hidden = true;
    dibujarFormulario(doc(), doc().preparar(conversion ? clonar(conversion.base) : {}));
    if (conversion) marcarFaltantes(); else $('#aviso-faltan').hidden = true;
    paso(2);
  });
  $('#btn-volver-1').addEventListener('click', () => paso(1));

  // ================= validación =================
  function marcarFaltantes() {
    const falta = doc().validar(leerFormulario());
    $$('#paso-2 .falta').forEach(x => x.classList.remove('falta'));
    falta.forEach(([k]) => $(`#paso-2 [data-req="${k}"]`)?.classList.add('falta'));
    $('#aviso-titulo').textContent = 'Faltan datos para generar el documento.';
    $('#lista-faltan').innerHTML = falta.map(([, n]) => `<li>${esc(n)}</li>`).join('');
    $('#aviso-faltan').hidden = !falta.length;
    return falta;
  }
  $('#paso-2').addEventListener('input', ev => ev.target.closest('.falta')?.classList.remove('falta'));
  $('#paso-2').addEventListener('change', ev => {
    if (docId !== 'confirmacion' || ev.target.dataset.k !== 'estado_pago' || ev.target.value !== 'Pagado en su totalidad') return;
    $$('#paso-2 [data-req="pagos"] select[data-k="estado"], #paso-2 .filas-wrap select[data-k="estado"]').forEach(x => { if (x.value !== 'Anulado') x.value = 'Pagado'; });
  });
  $('#paso-2').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (marcarFaltantes().length) { $('#aviso-faltan').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const datos = leerFormulario();
    const slots = doc().fotos ? doc().fotos(datos).filter(f => f.clave) : [];
    // Antes de generar: las fotos que faltan se buscan en el banco (como exige el motor del plugin).
    let delBancoN = 0;
    for (const f of slots) if (!f.get()) { const b = fotoDelBanco(f.clave); if (b) { f.set(blobUrl(b.asset)); delBancoN++; } }
    if (!(await mostrarDocumento(datos))) return;
    // Después de generar: las fotos nuevas que ubicó el asesor se guardan en el banco.
    let nuevas = 0;
    const hechas = new Map();
    for (const f of slots) {
      const u = f.get();
      if (!u || !u.startsWith('data:image/')) continue;
      // La misma clave dos veces (un hotel en dos filas de tarifas) se guarda una sola vez.
      if (hechas.has(f.clave)) { if (hechas.get(f.clave)) f.set(blobUrl(hechas.get(f.clave))); continue; }
      let id = null;
      try { id = await guardarEnBanco({ ...f, url: u, documento: `${doc().nombre} ${doc().codigo(datos)}` }); } catch (_) {}
      hechas.set(f.clave, id);
      if (id) { nuevas++; f.set(blobUrl(id)); } // el documento guardado apunta al banco en vez de llevar la foto dentro
    }
    const partes = [];
    if (delBancoN) partes.push(`Usamos ${delBancoN} ${delBancoN === 1 ? 'foto' : 'fotos'} del banco`);
    if (nuevas) partes.push(`Guardamos ${nuevas} ${nuevas === 1 ? 'foto nueva' : 'fotos nuevas'} en el banco`);
    if (partes.length) { $('#estado-3').className = 'estado'; $('#estado-3').textContent = partes.join(' · ') + '.'; }
    const codigo = doc().codigo(datos);
    const nuevo = { doc: docId, fecha: hoy(), cuando: new Date().toISOString(), datos };
    guardados = [nuevo, ...guardados.filter(g => !(g.doc === docId && DOCS[g.doc].codigo(g.datos) === codigo))];
    guardar();
    subirDoc(nuevo);
  });

  // ================= de un documento al siguiente =================
  // Cotización → confirmación → voucher, y confirmación → itinerario. Se copia lo que ya existe,
  // se conserva el número del viaje y lo que falta queda marcado en el formulario. Nada se inventa:
  // lo único sugerido son las instrucciones y condiciones estándar del voucher, a la vista para revisarlas.
  let conversion = null; // { desde, texto, pegar, base }
  const expedienteDe = cod => {
    const s = String(cod || '').trim().toUpperCase();
    let m;
    if ((m = /^CA-?(\d{3,})$/.exec(s)) || (m = /^CAM-\d{4}-(\d{3,})$/.exec(s)) || (m = /^CAM-(?:VCH|CONF|ITI|COT)-(\d{3,})(?:-\d+)?$/.exec(s))) return 'CA' + m[1];
    return s || 'Sin código';
  };
  const numeroViaje = cod => (/^CA(\d+)$/.exec(expedienteDe(cod)) || [])[1];
  const plano = l => (l || []).flatMap(x => typeof x === 'string' ? [x] : (x && x.items) || []).filter(x => !vacio(x));
  const tieneAlgo = v => Array.isArray(v) ? v.some(tieneAlgo) : v && typeof v === 'object' ? Object.values(v).some(tieneAlgo) : typeof v === 'number' || (typeof v === 'string' && !!v.trim());
  function fusionar(base, nuevo) {
    if (base && nuevo && typeof base === 'object' && typeof nuevo === 'object' && !Array.isArray(base) && !Array.isArray(nuevo)) {
      const r = { ...base };
      for (const k of Object.keys(nuevo)) r[k] = fusionar(base[k], nuevo[k]);
      return r;
    }
    return tieneAlgo(nuevo) ? nuevo : base;
  }
  const dosDig = n => String(n).padStart(2, '0');
  const diaUTC = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
  const isoUTC = d => d.toISOString().slice(0, 10);
  const extremos = fechas => { const f = fechas.filter(x => diaUTC(x)).sort(); return { desde: f[0] || '', hasta: f[f.length - 1] || '' }; };
  // Aeropuertos frecuentes en los viajes de Caminos, para escribir la ciudad en el itinerario.
  const IATA = { BOG: 'Bogotá', MDE: 'Medellín', CLO: 'Cali', CTG: 'Cartagena', SMR: 'Santa Marta', ADZ: 'San Andrés', BAQ: 'Barranquilla', PEI: 'Pereira', AXM: 'Armenia',
    BGA: 'Bucaramanga', CUC: 'Cúcuta', LET: 'Leticia', MZL: 'Manizales', PSO: 'Pasto', NVA: 'Neiva', MTR: 'Montería', VUP: 'Valledupar', EYP: 'Yopal', IBE: 'Ibagué',
    MAD: 'Madrid', BCN: 'Barcelona', CDG: 'París', ORY: 'París', FCO: 'Roma', CIA: 'Roma', LIS: 'Lisboa', OPO: 'Oporto', LDE: 'Lourdes', TLV: 'Tel Aviv', AMM: 'Amán',
    IST: 'Estambul', FRA: 'Fráncfort', MUC: 'Múnich', AMS: 'Ámsterdam', LHR: 'Londres', ZRH: 'Zúrich', VCE: 'Venecia', MXP: 'Milán', NAP: 'Nápoles', ATH: 'Atenas',
    CAI: 'El Cairo', MEX: 'Ciudad de México', CUN: 'Cancún', GDL: 'Guadalajara', PTY: 'Panamá', SJO: 'San José', MIA: 'Miami', FLL: 'Fort Lauderdale', MCO: 'Orlando',
    JFK: 'Nueva York', LIM: 'Lima', CUZ: 'Cusco', UIO: 'Quito', GYE: 'Guayaquil', GRU: 'São Paulo', GIG: 'Río de Janeiro', EZE: 'Buenos Aires', SCL: 'Santiago',
    PUJ: 'Punta Cana', SDQ: 'Santo Domingo', HAV: 'La Habana', AUA: 'Aruba', CUR: 'Curazao', BKK: 'Bangkok', CNX: 'Chiang Mai', CEI: 'Chiang Rai', DXB: 'Dubái' };
  const ciudadIata = c => IATA[String(c || '').trim().toUpperCase()] || String(c || '').trim();
  const partirRuta = r => String(r || '').split(/\s*[—–-]\s*/).map(ciudadIata);

  function mostrarConversion() {
    const c = conversion;
    $('#aviso-conv').hidden = !c;
    $('#conv-nota-1').hidden = !c;
    if (!c) return;
    const de = t => (/^el /.test(t) ? 'del ' + t.slice(3) : 'de ' + t);
    $('#conv-titulo').textContent = `Trajimos los datos ${de(c.desde)}.`;
    $('#conv-texto').textContent = c.texto;
    $('#conv-pegar-txt').textContent = c.pegar;
    $('#conv-nota-1').textContent = `Lo que pegues aquí se suma a los datos que trajimos ${de(c.desde)}.`;
  }
  $('#conv-pegar').addEventListener('click', () => { paso(1); $('#pegado').focus(); });
  function abrirConvertido(id, datos, info) {
    abrirDoc(id);
    conversion = { ...info, base: datos };
    $('#pegado').value = '';
    estado1('');
    dibujarFormulario(doc(), doc().preparar(clonar(datos)));
    mostrarConversion();
    marcarFaltantes();
    paso(2);
  }
  function elegir(titulo, sub, ops) {
    return new Promise(ok => {
      const dl = $('#elegir');
      $('#elegir-titulo').textContent = titulo;
      $('#elegir-sub').textContent = sub;
      $('#elegir-ops').innerHTML = ops.map((o, i) => `<button value="${i}"><b>${esc(o.t)}</b>${o.d ? `<span>${esc(o.d)}</span>` : ''}</button>`).join('');
      dl.returnValue = '';
      dl.onclose = () => ok(dl.returnValue === '' ? null : +dl.returnValue);
      dl.showModal();
    });
  }
  const SIGUIENTE = {
    cotizacion: [{ t: 'Convertir en confirmación', icono: 'badge-check', hacer: cotAConf }],
    confirmacion: [{ t: 'Crear voucher', icono: 'ticket', hacer: confAVoucher }, { t: 'Crear itinerario', icono: 'route', hacer: c => confAItinerario(c) }],
    voucher: [{ t: 'Crear itinerario', icono: 'route', hacer: voucherAItinerario }],
  };
  function pintarSiguiente(datos) {
    const ops = SIGUIENTE[docId] || [];
    $('#siguiente').hidden = !ops.length;
    $('#sig-botones').innerHTML = ops.map((o, i) => `<button type="button" class="btn btn-sec" data-sig="${i}"><i data-lucide="${o.icono}"></i>${esc(o.t)}</button>`).join('');
    $$('#sig-botones [data-sig]').forEach(b => b.addEventListener('click', () => ops[+b.dataset.sig].hacer(clonar(datos))));
    iconos($('#siguiente'));
  }

  async function cotAConf(c) {
    const tarifas = (c.tarifas || []).filter(t => !vacio(t.hotel) || !vacio(t.valor));
    let t = tarifas[0] || null;
    if (tarifas.length > 1) {
      const i = await elegir('¿Qué hotel eligió el cliente?', 'La confirmación lleva solo el hotel que se reservó.',
        tarifas.map(x => ({ t: x.hotel || 'Opción sin nombre', d: [x.acomodacion, x.valor && `${x.valor} por persona`].filter(Boolean).join(' · ') })));
      if (i === null) return;
      t = tarifas[i];
    }
    const num = numeroViaje(c.codigo_cotizacion), anio = String(c.fecha_llegada || hoy()).slice(0, 4);
    const datos = {
      codigo_reserva: num ? `CAM-${anio}-${num}` : (c.codigo_cotizacion || ''), titulo_viaje: c.titulo_destino || '', nombre_viajero: '', parrafo_confirmacion: '',
      destino: c.destino || '', pasajeros: c.pasajeros || '', estado_pago: '', fecha_salida: c.fecha_llegada || '', fecha_regreso: c.fecha_salida || '',
      aereo: [], traslados: [], nota_importante: '',
      hoteles: t && !vacio(t.hotel) ? [{ hotel: t.hotel, entrada: c.fecha_llegada || '', salida: c.fecha_salida || '', acomodacion: t.acomodacion || c.acomodacion || '', confirmacion: '' }] : [],
      servicios_confirmados: [], // repetiría el «incluye» que el cliente ya vio en la cotización
      pagos: t && !vacio(t.valor) ? [{ concepto: `Valor por persona${t.hotel ? ' — ' + t.hotel : ''}`, valor: t.valor, estado: '' }] : [],
      asesor: c.asesor?.nombre || '', asesor_correo: c.asesor?.correo || '', asesor_telefono: c.asesor?.telefono || '',
    };
    abrirConvertido('confirmacion', datos, {
      desde: `la cotización ${c.codigo_cotizacion}`, pegar: 'Pegar la reserva del sistema',
      texto: 'Pasamos el destino, las fechas, los pasajeros, el hotel elegido, el valor y tus datos. «Servicios confirmados» queda vacío porque el cliente ya vio lo que incluye en la cotización (puedes escribirlo si quieres). Completa lo marcado —el titular, los vuelos y los números de confirmación— o pega la reserva del sistema y Claude llena el resto.',
    });
  }

  async function confAVoucher(c) {
    const ops = [];
    (c.hoteles || []).filter(h => !vacio(h.hotel)).forEach(h => ops.push({ tipo: 'hotel', h, t: `Hotel — ${h.hotel}`, d: [rango(h.entrada, h.salida), h.acomodacion, h.confirmacion && `Conf. ${h.confirmacion}`].filter(Boolean).join(' · ') }));
    const porOperador = new Map();
    (c.traslados || []).filter(x => !vacio(x.trayecto)).forEach(x => { const op = x.operador || 'Traslados'; if (!porOperador.has(op)) porOperador.set(op, []); porOperador.get(op).push(x); });
    porOperador.forEach((filas, op) => ops.push({ tipo: 'traslado', op, filas, t: `Traslados — ${op}`, d: `${filas.length} ${filas.length === 1 ? 'traslado' : 'traslados'}` }));
    (c.aereo || []).filter(a => (a.trayectos || []).length).forEach(a => ops.push({ tipo: 'aereo', a, t: `Tiquete — ${a.aerolinea || 'aerolínea'}`, d: [a.record && `Récord ${a.record}`, `${a.trayectos.length} ${a.trayectos.length === 1 ? 'trayecto' : 'trayectos'}`].filter(Boolean).join(' · ') }));
    if (!ops.length) { $('#estado-3').className = 'estado error'; $('#estado-3').textContent = 'Esta confirmación no tiene hoteles, traslados ni tiquetes para hacer un voucher.'; return; }
    let i = 0;
    if (ops.length > 1) {
      i = await elegir('¿De qué servicio hacemos el voucher?', 'Un voucher ampara un solo servicio. Para los demás, vuelve a tocar «Crear voucher».', ops);
      if (i === null) return;
    }
    const o = ops[i], num = numeroViaje(c.codigo_reserva);
    const datos = {
      tipo: o.tipo, codigo_voucher: num ? `CAM-VCH-${num}-${dosDig(i + 1)}` : `${c.codigo_reserva || 'VCH'}-${dosDig(i + 1)}`, codigo_reserva: c.codigo_reserva || '',
      nombre_viajero: c.nombre_viajero || '', acompanantes: [], ubicacion: c.destino || '',
      hoteles: [], aereo: { aerolinea: '', tiquete: '', record: '', trayectos: [] }, traslados: [], incluye: [],
      condiciones: 'Voucher no reembolsable ni transferible. Válido únicamente para las fechas y el titular indicados.',
    };
    if (o.tipo === 'hotel') Object.assign(datos, {
      nombre_servicio: `Alojamiento — ${o.h.hotel}`, proveedor: o.h.hotel, vigencia: { desde: o.h.entrada || '', hasta: o.h.salida || '' }, hoteles: [o.h],
      instrucciones: 'Presenta este voucher junto con tu documento de identidad original en la recepción del hotel al momento del registro de entrada.' });
    else if (o.tipo === 'traslado') Object.assign(datos, {
      nombre_servicio: `Traslados — ${o.op}`, proveedor: o.op, vigencia: extremos(o.filas.map(x => x.fecha)),
      traslados: o.filas.map(x => ({ trayecto: x.trayecto || '', fecha: x.fecha || '', hora: x.hora || '', confirmacion: x.confirmacion || '' })),
      instrucciones: 'Preséntate en el punto de encuentro 10 minutos antes de la hora indicada, con este voucher a la mano.' });
    else Object.assign(datos, {
      nombre_servicio: `Tiquete aéreo — ${o.a.aerolinea || ''}`.trim(), proveedor: o.a.aerolinea || '', vigencia: extremos(o.a.trayectos.map(x => x.fecha)), aereo: o.a,
      instrucciones: 'Preséntate en el mostrador de la aerolínea con tu documento de identidad: 3 horas antes en vuelos internacionales y 2 horas antes en nacionales.' });
    abrirConvertido('voucher', datos, {
      desde: `la confirmación ${c.codigo_reserva}`, pegar: 'Pegar la reserva del servicio',
      texto: 'Pasamos el servicio, las fechas, el titular y los números de confirmación. Las instrucciones y condiciones son un texto sugerido: revísalas. Agrega los acompañantes y lo que incluye.',
    });
  }

  // Desde un voucher: si ya existe la confirmación del mismo viaje, lo mejor es partir de ella (trae todos
  // los vuelos, hoteles y traslados); si no, el itinerario se arma solo con el servicio del voucher.
  async function voucherAItinerario(v) {
    const exp = expedienteDe(v.codigo_reserva || v.codigo_voucher);
    const conf = [...guardados, ...EJEMPLOS_RECIENTES].find(r => r.doc === 'confirmacion' && expedienteDe(r.datos.codigo_reserva) === exp);
    if (conf) {
      const i = await elegir('¿Desde dónde armamos el itinerario?', `Encontramos la confirmación ${conf.datos.codigo_reserva} de este mismo viaje.`, [
        { t: `Desde la confirmación ${conf.datos.codigo_reserva}`, d: 'Recomendado: trae todos los vuelos, hoteles y traslados del viaje.' },
        { t: `Solo con este voucher`, d: v.nombre_servicio || '' }]);
      if (i === null) return;
      if (i === 0) return confAItinerario(clonar(conf.datos));
    }
    const tipo = v.tipo || 'hotel';
    confAItinerario({
      codigo_reserva: v.codigo_reserva || v.codigo_voucher || '', titulo_viaje: v.ubicacion || v.nombre_servicio || '', nombre_viajero: v.nombre_viajero || '',
      destino: v.ubicacion || '', fecha_salida: v.vigencia?.desde || '', fecha_regreso: v.vigencia?.hasta || v.vigencia?.desde || '',
      aereo: tipo === 'aereo' && v.aereo ? [v.aereo] : [], hoteles: tipo === 'hotel' ? (v.hoteles || []) : [],
      traslados: tipo === 'traslado' ? (v.traslados || []).map(x => ({ operador: v.proveedor || '', ...x })) : [],
      servicios_confirmados: plano(v.incluye), nota_importante: '',
    }, `el voucher ${v.codigo_voucher}`);
  }

  function confAItinerario(c, desde) {
    const trayectos = (c.aereo || []).flatMap(a => a.trayectos || []).filter(t => !vacio(t.ruta) || !vacio(t.vuelo))
      .sort((a, b) => `${a.fecha} ${a.sale}`.localeCompare(`${b.fecha} ${b.sale}`));
    const siguiente = f => { const d = diaUTC(f); if (!d) return ''; d.setUTCDate(d.getUTCDate() + 1); return isoUTC(d); };
    const vuelos = trayectos.map(t => {
      const [origen = '', destino = ''] = partirRuta(t.ruta);
      const mas = /\+\s*1/.test(t.llega || ''), hora = String(t.llega || '').replace(/\s*\+\s*1/, '').trim();
      const sig = mas && siguiente(t.fecha);
      return { vuelo: String(t.vuelo || '').replace(/\s+/g, ''), fecha: t.fecha || '', origen, destino, sale: t.sale || '', llega: sig ? `${hora} ${sig.slice(8, 10)}/${sig.slice(5, 7)}` : hora, _mas: mas };
    });
    // Borrador del día a día: solo con lo que dice la confirmación (vuelos, traslados, hoteles).
    const ini = diaUTC(c.fecha_salida), fin = diaUTC(c.fecha_regreso) || ini;
    // La ciudad solo se escribe cuando hay evidencia ese día: un vuelo que aterriza, o el hotel en el que se
    // registra al llegar (y las noches siguientes en ese hotel). Los demás días quedan para que la asesora los complete.
    const dias = [], ciudadHotel = {};
    let llegaManana = '';
    if (ini && fin) for (let d = new Date(ini), n = 0; d <= fin && n < 60; d.setUTCDate(d.getUTCDate() + 1), n++) {
      const f = isoUTC(d), hechos = [];
      let titulo = '', aBordo = false, llegaHoy = '';
      if (llegaManana) { llegaHoy = llegaManana; hechos.push(`Llegada a ${llegaHoy}`); titulo = `Llegada a ${llegaHoy}`; llegaManana = ''; }
      const delDia = vuelos.filter(v => v.fecha === f);
      for (const v of delDia) {
        hechos.push(`Vuelo ${v.vuelo} de ${v.origen} a ${v.destino}, sale a las ${v.sale}${v._mas ? ' y llega al día siguiente' : v.llega ? `, llega a las ${v.llega}` : ''}`);
        if (v._mas) { aBordo = true; llegaManana = v.destino; } else llegaHoy = v.destino;
      }
      (c.traslados || []).filter(x => x.fecha === f).forEach(x => hechos.push(`Traslado ${String(x.trayecto || '').toLowerCase()}${x.hora ? ` a las ${x.hora}` : ''}`));
      (c.hoteles || []).filter(h => h.salida === f).forEach(h => hechos.push(`Salida del ${h.hotel}`));
      (c.hoteles || []).filter(h => h.entrada === f).forEach(h => { hechos.push(`Registro en el ${h.hotel}`); if (llegaHoy && !aBordo) ciudadHotel[h.hotel] = llegaHoy; });
      const hotel = (c.hoteles || []).find(h => h.entrada <= f && f < h.salida);
      const lugar = aBordo ? '' : (llegaHoy || (hotel && ciudadHotel[hotel.hotel]) || '');
      const ultimo = f === isoUTC(fin);
      if (!titulo) {
        if (n === 0 && delDia.length) titulo = `Salida desde ${delDia[0].origen}`;
        else if (ultimo && delDia.length) titulo = `Regreso a ${delDia[delDia.length - 1].destino}`;
        else if (delDia.length) titulo = `${aBordo ? 'Vuelo' : 'Llegada'} a ${delDia[delDia.length - 1].destino}`;
        else titulo = lugar;
      }
      dias.push({ fecha: f, titulo, lugar, descripcion: hechos.length ? hechos.join('. ') + '.' : '',
        comidas: [], etiquetas: aBordo && !hotel ? ['Noche a bordo'] : [], hotel: hotel?.hotel || '' });
    }
    const hoteles = [...new Map((c.hoteles || []).filter(h => !vacio(h.hotel)).map(h => [h.hotel, { nombre: h.hotel, ciudad: ciudadHotel[h.hotel] || '', direccion: '', telefono: '' }])).values()];
    let incluye = plano(c.servicios_confirmados), noIncluye = [];
    if (!incluye.length) {
      const exp = expedienteDe(c.codigo_reserva);
      const cot = [...guardados, ...EJEMPLOS_RECIENTES].find(r => r.doc === 'cotizacion' && expedienteDe(r.datos.codigo_cotizacion) === exp);
      if (cot) { incluye = plano(cot.datos.incluye); noIncluye = plano(cot.datos.no_incluye); }
    }
    const largo = vuelos.length > 0 || dias.length > 4;
    const datos = {
      codigo: expedienteDe(c.codigo_reserva), titulo: c.titulo_viaje || '', subtitulo: '', destino: c.destino || '',
      fecha_inicio: c.fecha_salida || '', fecha_fin: c.fecha_regreso || '', grupo: '', acompanamiento: '', pasajero: c.nombre_viajero || '',
      acomodacion: (c.hoteles || [])[0]?.acomodacion || '', bienvenida: '', dias, incluye, no_incluye: noIncluye,
      recomendaciones: [], nota: c.nota_importante || '',
      ...(largo ? { frase: '', vuelos: vuelos.map(({ _mas, ...v }) => v), vuelos_internos: [], hoteles } : {}),
    };
    abrirConvertido(largo ? 'itinerario' : 'itinerario_corto', datos, {
      desde: desde || `la confirmación ${c.codigo_reserva}`, pegar: 'Pegar el programa del viaje',
      texto: 'Pasamos las fechas, los vuelos, los hoteles y lo que incluye, y armamos un borrador del día a día con los vuelos, traslados y hoteles de cada fecha. Completa las actividades de cada día, o pega el programa del proveedor y Claude lo completa sin perder lo que ya está.',
    });
  }

  // ================= vista previa =================
  const GAP = 28;
  async function mostrarDocumento(datos) {
    const d = doc();
    let html;
    $('#btn-generar').disabled = true;
    try { html = await d.armar(datos); } catch (err) {
      $('#btn-generar').disabled = false;
      paso(2);
      $('#aviso-titulo').textContent = 'No pudimos armar el documento.';
      $('#lista-faltan').innerHTML = `<li>${esc(err.message)}</li>`;
      $('#aviso-faltan').hidden = false;
      return false;
    }
    $('#btn-generar').disabled = false;
    docActual = datos;
    ponerVista('pdf');
    $('#vistas').hidden = !d.interactivo;
    $('#btn-html').hidden = !d.interactivo;
    $('#btn-publicar').hidden = !d.interactivo;
    pintarSiguiente(datos);
    mostrarPublicado(d.interactivo ? publicacionDe(datos) : null);
    const fuentes = `<style>${FUENTES}</style>`;
    const vista = `<style>html,body{background:transparent!important}.page{box-shadow:0 12px 32px rgba(31,32,36,.14)}.page+.page{margin-top:${GAP}px}</style>`;
    html = html.replace('<head>', '<head>' + fuentes).replace('</head>', vista + '</head>');
    const frame = $('#doc-frame');
    const medir = n => { frame.style.height = (n * ALTO_PAGINA + (n - 1) * GAP) + 'px'; ajustarEscala(); };
    $('#prev-titulo').textContent = `${d.nombre} ${d.codigo(datos)} · ${d.tituloDe(datos)}`;
    $('#prev-meta').textContent = 'Acomodando el contenido en las hojas…';
    $('#estado-3').textContent = '';
    $('#btn-pdf').disabled = true;
    frame.onload = async () => {
      const fd = frame.contentDocument;
      medir(fd.querySelectorAll('section.page').length);
      try { await Promise.race([fd.fonts.ready, new Promise(r => setTimeout(r, 4000))]); } catch (_) {}
      const n = d.flujo ? fluir(fd, d.flujo) : fd.querySelectorAll('section.page').length;
      medir(n);
      $('#prev-meta').textContent = `${n} ${n === 1 ? 'hoja' : 'hojas'} tamaño carta · ${d.meta(datos)}`;
      $('#btn-pdf').disabled = !downloads;
    };
    frame.srcdoc = html;
    paso(3);
    return true;
  }
  function ajustarEscala() {
    const cont = $('#escala'), inner = $('#escala-in'), frame = $('#doc-frame');
    const s = cont.clientWidth / 1061;
    inner.style.transform = `scale(${s})`;
    cont.style.height = (parseFloat(frame.style.height || 0) * s) + 'px';
  }
  new ResizeObserver(() => { if (!$('#paso-3').hidden) ajustarEscala(); }).observe($('#escala'));
  $('#btn-editar').addEventListener('click', () => { if (docActual) dibujarFormulario(doc(), docActual); marcarFaltantes(); paso(2); });

  // ================= versión interactiva: vista previa y descarga =================
  function ponerVista(v) {
    $$('#vistas [data-vista]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vista === v)));
    $('#escala').hidden = v !== 'pdf';
    $('#marco-html').hidden = v !== 'html';
    $('#pantallas').hidden = v !== 'html';
  }
  $$('#vistas [data-vista]').forEach(b => b.addEventListener('click', async () => {
    ponerVista(b.dataset.vista);
    if (b.dataset.vista === 'html' && docActual && doc().interactivo) {
      $('#html-frame').srcdoc = await doc().interactivo(docActual); // en la vista previa las fotos del banco se ven directo
    } else ajustarEscala();
  }));
  $$('#pantallas [data-pantalla]').forEach(b => b.addEventListener('click', () => {
    $$('#pantallas [data-pantalla]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('#marco-html').classList.toggle('celular', b.dataset.pantalla === 'celular');
  }));
  $('#marco-html').classList.add('celular');
  $('#btn-html').addEventListener('click', async () => {
    const out = $('#estado-3'), btn = $('#btn-html');
    if (!downloads) { out.textContent = 'La descarga funciona al abrir la app desde claude.ai.'; return; }
    btn.disabled = true;
    out.className = 'estado girando';
    out.innerHTML = '<i data-lucide="loader-circle"></i><span>Preparando la versión interactiva…</span>';
    iconos(out);
    try {
      const html = await doc().interactivo(docActual, { incrustar: true }); // fotos, letras y logos van dentro del archivo
      const nombre = `${doc().archivo}-${doc().codigo(docActual)}.html`;
      await downloads.save({ filename: nombre, data: html });
      out.className = 'estado'; out.textContent = `Guardaste ${nombre}. Se abre en cualquier navegador, también sin conexión.`;
    } catch (err) {
      out.className = 'estado error';
      out.textContent = err?.code === 'declined' ? 'Cancelaste la descarga.' : 'No se pudo preparar la versión interactiva. Inténtalo de nuevo.';
    } finally { btn.disabled = false; }
  });

  // ================= publicar para el grupo =================
  // El itinerario (versión de grupo, sin nombre de pasajero) se sube como archivo al repositorio
  // público de GitHub a través del conector Composio; GitHub Pages lo sirve en un enlace fijo.
  // Cada código de viaje guarda su ruta en la base de la app (colección "publicados"), así que
  // volver a publicar reemplaza el mismo archivo y el enlace que tienen los pasajeros no cambia.
  const SITIO = { dueno: 'directoroperaciones-bot', repo: 'itinerarios', web: 'https://directoroperaciones-bot.github.io/itinerarios/' };
  const COMPOSIO = 'Composio';
  let mcp = null, publicados = {};
  (async () => {
    mcp = window.claude?.use ? await window.claude.use('mcp').catch(() => null) : null;
    if (!mcp) $('#btn-publicar').title = 'Publicar funciona al abrir la app desde claude.ai con Composio conectado';
    const db = window.claude?.use ? await window.claude.use('db').catch(() => null) : null;
    if (db) db.collection('publicados').onSnapshot(snap => {
      publicados = {};
      snap.docs.filter(x => x.exists).forEach(x => { publicados[x.id] = x.data(); });
      if (docActual && doc().interactivo) mostrarPublicado(publicacionDe(docActual));
    }, () => {});
  })();
  const slugCodigo = c => String(c || 'viaje').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase() || 'VIAJE';
  const publicacionDe = datos => publicados[slugCodigo(doc().codigo(datos))] || null;
  function mostrarPublicado(pub) {
    $('#publicado').hidden = !pub;
    if (!pub) return;
    $('#pub-enlace').textContent = pub.url; $('#pub-enlace').href = pub.url; $('#pub-abrir').href = pub.url;
    const cuando = pub.cuando ? new Date(pub.cuando).toLocaleString('es-CO', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }) : pub.fecha;
    $('#pub-nota').textContent = `Publicado el ${cuando} · si actualizas el itinerario, el enlace sigue siendo el mismo`;
  }
  $('#pub-copiar').addEventListener('click', async () => {
    const url = $('#pub-enlace').href, b = $('#pub-copiar');
    try { await navigator.clipboard.writeText(url); } catch (_) {
      const r = document.createRange(); r.selectNodeContents($('#pub-enlace')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); document.execCommand('copy');
    }
    b.innerHTML = '<i data-lucide="check"></i>Copiado'; iconos(b);
    setTimeout(() => { b.innerHTML = '<i data-lucide="copy"></i>Copiar enlace'; iconos(b); }, 2000);
  });
  const aBase64 = texto => new Promise((ok, mal) => {
    const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = mal;
    fr.readAsDataURL(new Blob([texto], { type: 'text/plain' }));
  });
  const MENSAJES_MCP = {
    server_not_connected: 'Composio no está conectado en esta cuenta de Claude. Conéctalo en claude.ai → Configuración → Conectores y vuelve a intentar.',
    needs_reauth: 'La conexión con Composio se venció. Vuelve a conectarla en claude.ai → Configuración → Conectores.',
    selection_required: 'Hay más de una conexión de Composio. Elige cuál usar en el aviso de Claude y vuelve a intentar.',
    not_in_manifest: 'Esta página no tiene permiso para usar Composio. Recarga la página y acepta el permiso cuando Claude lo pida.',
    blocked_by_policy: 'La organización no permite usar Composio desde esta página.',
    approval_required: 'La organización exige aprobar cada uso de Composio; desde esta página todavía no se puede.',
  };
  $('#btn-publicar').addEventListener('click', async () => {
    const out = $('#estado-3'), btn = $('#btn-publicar');
    if (!mcp) { out.className = 'estado error'; out.textContent = 'Publicar funciona al abrir la app desde claude.ai con el conector Composio.'; return; }
    const codigo = slugCodigo(doc().codigo(docActual));
    const previa = publicados[codigo];
    // La ruta lleva unas letras al azar para que el enlace no se pueda adivinar; se conserva entre publicaciones.
    const ruta = previa?.ruta || `${codigo}-${Array.from(crypto.getRandomValues(new Uint8Array(6)), n => 'abcdefghijkmnpqrstuvwxyz23456789'[n % 32]).join('')}.html`;
    btn.disabled = true;
    out.className = 'estado girando';
    out.innerHTML = `<i data-lucide="loader-circle"></i><span>${previa ? 'Actualizando' : 'Publicando'} el itinerario del grupo…</span>`;
    iconos(out);
    try {
      // Versión de grupo: el mismo enlace es para todos los pasajeros, sin nombre individual.
      const html = await doc().interactivo({ ...docActual, pasajero: '' }, { incrustar: true });
      const lista = await mcp.listTools().catch(() => null);
      let contenido;
      if (lista?.fileArgs) contenido = { $file: { data: new Blob([html], { type: 'text/plain' }), name: 'itinerario.txt', type: 'text/plain' } };
      else {
        contenido = await aBase64(html);
        if (contenido.length > 950000) throw { code: 'muy_grande' };
      }
      const r = await mcp.callTool(COMPOSIO, 'COMPOSIO_MULTI_EXECUTE_TOOL', {
        tools: [{ tool_slug: 'GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS', arguments: {
          owner: SITIO.dueno, repo: SITIO.repo, path: ruta, content: contenido,
          message: `${previa ? 'Actualizar' : 'Publicar'} itinerario ${codigo}` } }],
        sync_response_to_workbench: false,
        thought: 'Publicar el itinerario interactivo del grupo en GitHub Pages.',
        current_step: 'PUBLICAR_ITINERARIO',
      });
      let p = r?.payload;
      if (typeof p === 'string') { try { p = JSON.parse(p); } catch (_) {} }
      const res = p?.data?.results?.[0]?.response;
      if (!res?.successful) throw { code: 'no_publicado', message: res?.error || p?.error || '' };
      const pub = { codigo, ruta, url: SITIO.web + ruta, titulo: doc().tituloDe(docActual) || '', fecha: hoy(),
        cuando: new Date().toISOString(), documento: doc().nombre };
      publicados[codigo] = pub;
      const db = await window.claude.use('db').catch(() => null);
      if (db) await db.doc('publicados/' + codigo).set(pub).catch(() => {});
      mostrarPublicado(pub);
      out.className = 'estado';
      out.textContent = previa
        ? 'Listo: actualizamos el itinerario. En más o menos un minuto los pasajeros ven los cambios con el mismo enlace.'
        : 'Listo: el itinerario queda en línea en más o menos un minuto. Copia el enlace y ánclalo en el grupo de WhatsApp.';
    } catch (err) {
      out.className = 'estado error';
      const c = err?.code;
      out.textContent = MENSAJES_MCP[c]
        || (c === 'muy_grande' ? 'El itinerario es demasiado pesado para publicarlo desde esta vista. Prueba con fotos más livianas.'
        : c === 'no_publicado' ? 'GitHub no aceptó la publicación' + (err.message ? `: ${String(err.message).slice(0, 160)}` : '.') + ' Inténtalo de nuevo.'
        : c === 'tool_error' ? 'Composio respondió con un error: ' + String(err.message || '').slice(0, 160)
        : c === 'server_unavailable' || c === 'upstream_error'
          ? 'No tuvimos respuesta a tiempo. Puede que sí se haya publicado: espera un minuto y abre el enlace; si no cambió, vuelve a publicar.'
          : 'No se pudo publicar. Inténtalo de nuevo.');
    } finally { btn.disabled = false; }
  });


  // ================= base de operación (AppSheet → Google Sheets), SOLO LECTURA =================
  // La app consulta la hoja «NO BORRAR - DATOS HERRAMIETA» con la herramienta de lectura de Google Sheets
  // a través de Composio. Nunca escribe: `lecturaBase` es la única función que toca la base y solo puede
  // llamar a GOOGLESHEETS_BATCH_GET sobre esta hoja; no hay en el código ninguna llamada de escritura a ella.
  // De PASAJEROS solo se leen el id y el nombre (columnas A a C): nada de documentos ni datos personales.
  const BASE = { hoja: '1k32N3e4r5jS0iWvyPWsUGr6XLY7homB5sEhJIj9Bjbg', herramienta: 'GOOGLESHEETS_BATCH_GET' };
  // Composio devuelve los datos completos solo si la respuesta es corta (si es grande, la guarda en su espacio y
  // entrega una muestra). Por eso la lectura va por pasos pequeños y trae solo las filas de la venta pedida.
  async function lecturaBase(rangos) {
    if (!mcp) throw { code: 'sin_mcp' };
    const r = await mcp.callTool(COMPOSIO, 'COMPOSIO_MULTI_EXECUTE_TOOL', {
      tools: [{ tool_slug: BASE.herramienta, arguments: { spreadsheet_id: BASE.hoja, ranges: rangos } }],
      sync_response_to_workbench: false, thought: 'Leer (solo lectura) la venta en la base de operación.', current_step: 'LEER_BASE',
    });
    let p = r?.payload;
    if (typeof p === 'string') { try { p = JSON.parse(p); } catch (_) {} }
    const res = p?.data?.results?.[0]?.response;
    if (res?.successful && !res.data && res.data_preview) throw { code: 'muy_grande' };
    const vr = res?.data?.valueRanges;
    if (!res?.successful || !Array.isArray(vr)) throw { code: 'no_leida', message: res?.error || p?.error || '' };
    return vr.map(x => x.values || []);
  }
  // Une rangos de columnas de una misma hoja (cada uno con su fila de títulos) en filas con nombre de columna.
  function tablaDe(partes, desdeFila = 1) {
    const anchos = partes.map(pt => (pt[0] || []).length), titulos = partes.flatMap(pt => (pt[0] || []).map(x => String(x).trim()));
    const n = Math.max(0, ...partes.map(pt => pt.length));
    const filas = [];
    for (let i = desdeFila; i < n; i++) {
      const f = partes.flatMap((pt, j) => { const x = pt[i] || []; return Array.from({ length: anchos[j] }, (_, k) => String(x[k] ?? '').trim()); });
      if (f.some(Boolean)) filas.push(Object.fromEntries(titulos.map((t, k) => [t, f[k]])));
    }
    return filas;
  }
  // Filas de la hoja (numeradas desde 1) cuyo valor en una columna leída está en el conjunto buscado.
  const filasCon = (col, buscados) => col.map((f, i) => [i + 1, String((f || [])[0] ?? '').trim()]).filter(([n, v]) => n > 1 && buscados.has(v)).map(([n]) => n);
  // Agrupa números de fila seguidos en tramos, de a lo sumo `max` filas cada uno.
  function tramosDe(nums, max = 40) {
    const t = [];
    for (const n of [...nums].sort((a, b) => a - b)) { const u = t.at(-1); if (u && n === u[1] + 1 && n - u[0] < max) u[1] = n; else t.push([n, n]); }
    return t;
  }
  // Lee de una hoja solo las filas indicadas y solo las columnas indicadas (con sus títulos).
  async function filasDeHoja(hoja, columnas, nums) {
    const tramos = tramosDe(nums);
    const titulos = await lecturaBase(columnas.map(c => `${hoja}!${c[0]}1:${c[1]}1`));
    const filas = [];
    for (let i = 0; i < tramos.length; i += 3) { // pocos tramos por llamada, para que la respuesta sea corta
      const grupo = tramos.slice(i, i + 3);
      const vals = await lecturaBase(grupo.flatMap(([a, b]) => columnas.map(c => `${hoja}!${c[0]}${a}:${c[1]}${b}`)));
      grupo.forEach((_, g) => filas.push(...tablaDe(columnas.map((_, k) => [titulos[k][0] || [], ...vals[g * columnas.length + k]]))));
    }
    return filas;
  }
  async function leerVentaDeBase(consecutivo, avance = () => {}) {
    const num = String(consecutivo).toUpperCase().replace(/^CA-?/, '').trim();
    avance('Buscando la venta…');
    // 1) PIPELINE: solo las columnas que usa la confirmación.
    const PL = await lecturaBase(['A', 'C', 'F', 'I:K', 'V', 'X', 'AB:AC', 'AG:AH'].map(c => { const [a, b = a] = c.split(':'); return `PIPELINE!${a}1:${b}3000`; }));
    const venta = tablaDe(PL).find(v => String(v.Numero_Consecutivo).trim() === num || String(v.Codigo_Visual_VYE).toUpperCase() === 'CA' + num);
    if (!venta) return null;
    const idV = venta.ID_Venta;
    avance('Leyendo servicios y pagos…');
    // 2) Qué filas son de esta venta (solo se leen las columnas de códigos).
    const [colSv, colPg, provs, planes, asesores] = await lecturaBase(['SERVICIOS!B1:B6000', 'CONTROL_PAGOS!B1:B6000', 'PROVEEDORES!A1:C1000', 'PANEL_DE_COSTEOS!A1:B1000', 'ASESORES!A1:B100']);
    const ids = new Set([idV]);
    const SERVICIOS = await filasDeHoja('SERVICIOS', [['A', 'H'], ['X', 'X'], ['AE', 'AE']], filasCon(colSv, ids));
    const CONTROL_PAGOS = await filasDeHoja('CONTROL_PAGOS', [['B', 'F']], filasCon(colPg, ids));
    // 3) Pasajeros: solo id y nombre de los de esta venta.
    avance('Leyendo pasajeros…');
    const idsPax = new Set([...String(venta.Pasajeros_Viajando || '').split(/\s*,\s*/), venta.Titular_Vacacional, ...SERVICIOS.map(x => x.ID_Pasajero)].filter(Boolean));
    const [colPax] = await lecturaBase(['PASAJEROS!A1:A6000']);
    const PASAJEROS = idsPax.size ? await filasDeHoja('PASAJEROS', [['A', 'C']], filasCon(colPax, idsPax)) : [];
    return { PIPELINE: [venta], SERVICIOS, CONTROL_PAGOS, PASAJEROS, PROVEEDORES: tablaDe([provs]), PANEL_DE_COSTEOS: tablaDe([planes]), ASESORES: tablaDe([asesores]) };
  }
  const isoDeBase = f => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(f || ''); return m ? `${m[3]}-${dosDig(m[2])}-${dosDig(m[1])}` : (RE_ISO.test(f || '') ? f : ''); };
  const pesos = n => { const v = Math.round(Number(String(n).replace(/[^\d.-]/g, ''))); return Number.isFinite(v) && String(n).trim() ? '$' + v.toLocaleString('es-CO').replace(/,/g, '.') : ''; };
  const MINUS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'van', 'von']);
  const nombrePropio = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim().split(' ')
    .map((w, i) => (i > 0 && MINUS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  const oracion = t => { const x = String(t || '').toLowerCase().trim(); return x.charAt(0).toUpperCase() + x.slice(1); };

  function confirmacionDesdeBase(tab, consecutivo) {
    const num = String(consecutivo).toUpperCase().replace(/^CA-?/, '').trim();
    const venta = (tab.PIPELINE || []).find(v => String(v.Numero_Consecutivo).trim() === num || String(v.Codigo_Visual_VYE).toUpperCase() === 'CA' + num);
    if (!venta) return null;
    const idV = venta.ID_Venta;
    const servicios = (tab.SERVICIOS || []).filter(x => x.ID_Venta === idV);
    const nombreDe = Object.fromEntries((tab.PASAJEROS || []).map(x => [x.ID_Pasajero, nombrePropio(x.Nombre_Completo)]));
    const proveedor = Object.fromEntries((tab.PROVEEDORES || []).map(x => [x['ID Proveedor'], nombrePropio(x['Nombre Comercial'] || x['Razón Social'])]));
    const idsPax = String(venta.Pasajeros_Viajando || '').split(/\s*,\s*/).filter(Boolean);
    const pax = [...new Set([...idsPax, ...servicios.map(x => x.ID_Pasajero).filter(Boolean)])].map(i => nombreDe[i]).filter(Boolean);
    const titular = nombrePropio(nombreDe[venta.Titular_Vacacional] || venta.Titular_Vacacional || '') || pax[0] || '';
    const ida = isoDeBase(venta.Fecha_Ida), regreso = isoDeBase(venta.Fecha_Regreso);
    const plan = (tab.PANEL_DE_COSTEOS || []).find(x => x.ID_Costeo && x.ID_Costeo === venta.Paquete_Religioso);
    const asesora = (tab.ASESORES || []).find(x => x.Email === venta.Agente);
    // Vuelos: un tiquete por localizador; los trayectos salen de la ruta («BOG-IPI // PSO-BOG»). La base no trae
    // número de vuelo, fecha ni horas por trayecto: quedan para completar.
    const porLoc = new Map();
    servicios.filter(x => x.Tipo_Servicio === 'Vuelo').forEach(x => {
      const k = x.Localizador || x.ID_Servicio;
      if (!porLoc.has(k)) porLoc.set(k, { x, tiquetes: [] });
      if (x.Tiquete) porLoc.get(k).tiquetes.push(x.Tiquete.replace(/[‐–]/g, '-'));
    });
    const tramos = ruta => String(ruta || '').split(/\s*\/\/\s*/).flatMap(seg => {
      const pts = seg.split(/\s*-\s*/).map(s => s.trim()).filter(Boolean);
      const lugar = t => (/^[A-Za-z]{3}$/.test(t) ? t.toUpperCase() : nombrePropio(t)); // código de aeropuerto o nombre de ciudad
      return pts.slice(1).map((d, i) => ({ vuelo: '', fecha: '', ruta: `${lugar(pts[i])} — ${lugar(d)}`, sale: '', llega: '' }));
    });
    const aereo = [...porLoc.values()].map(({ x, tiquetes }) => ({
      aerolinea: String(x['Aerolínea'] || '').split(',')[0].trim(), record: x.Localizador || '',
      tiquete: tiquetes.length <= 4 ? tiquetes.join(' · ') : `${tiquetes.slice(0, 3).join(' · ')} y ${tiquetes.length - 3} más`,
      trayectos: tramos(x.Ruta),
    }));
    const acomodacion = (servicios.find(x => x.Tipo_Acomodacion) || {}).Tipo_Acomodacion || venta.Acomodacion_Religiosa || '';
    const hoteles = [...new Map(servicios.filter(x => x.Tipo_Servicio === 'Hotel').map(x => [x.Proveedor + x.Localizador, {
      hotel: proveedor[x.Proveedor] || '', entrada: ida, salida: regreso, acomodacion: x.Tipo_Acomodacion || acomodacion, confirmacion: x.Localizador || '' }])).values()];
    const unico = (tipo, texto) => [...new Set(servicios.filter(x => x.Tipo_Servicio === tipo).map(texto).filter(Boolean))];
    const servicios_confirmados = [
      ...unico('Vuelo', x => `Tiquetes aéreos ${String(x['Aerolínea'] || '').split(',')[0].trim()}`.trim()),
      ...unico('Plan Terrestre', x => `Plan terrestre${proveedor[x.Proveedor] ? ' con ' + proveedor[x.Proveedor] : ''}${x.Tipo_Acomodacion ? ` (acomodación ${x.Tipo_Acomodacion.toLowerCase()})` : ''}`),
      ...unico('Hotel', x => proveedor[x.Proveedor] ? `Alojamiento en ${proveedor[x.Proveedor]}` : 'Alojamiento'),
      ...unico('Asistencia', () => 'Tarjeta de asistencia médica'),
    ];
    const pagos = (tab.CONTROL_PAGOS || []).filter(x => x.ID_Venta === idV).map(x => ({
      concepto: `Abono del ${fecha(isoDeBase(x.Fecha_Abono), 'de') || x.Fecha_Abono}${x.Metodo_Pago ? ' · ' + oracion(x.Metodo_Pago) : ''}`,
      valor: pesos(x.Monto), estado: normalEstadoPago(x.Estado_Pago) }));
    // La columna Saldo_Pendiente de la base no es confiable para saber si ya se pagó todo: sin pagos es
    // «Pendiente de pago»; con pagos, la asesora elige entre «Abono recibido» y «Pagado en su totalidad».
    const recibidos = pagos.filter(x => x.estado === 'Pagado');
    const estado_pago = recibidos.length ? '' : 'Pendiente de pago';
    const n = pax.length || Number(venta.Numero_Pasajeros_Estimados) || 0;
    return {
      codigo_reserva: `CAM-${(ida || hoy()).slice(0, 4)}-${num}`,
      titulo_viaje: plan ? nombrePropio(plan.Nombre_Plan) : venta.Destino || '', nombre_viajero: titular, parrafo_confirmacion: '',
      destino: venta.Destino || '', pasajeros: n ? `${n} ${n === 1 ? 'persona' : 'personas'}${pax.length > 1 && pax.length <= 6 ? ': ' + pax.join(', ') : ''}` : '',
      estado_pago, fecha_salida: ida, fecha_regreso: regreso, aereo, hoteles, traslados: [], servicios_confirmados, pagos, nota_importante: '',
      asesor: asesora ? nombrePropio(asesora.Nombre) : '', asesor_correo: venta.Agente || '', asesor_telefono: '',
    };
  }
  const MENSAJES_BASE = {
    sin_mcp: 'Traer de la base funciona al abrir la app desde claude.ai con el conector Composio.',
    no_leida: 'No pudimos leer la base. Revisa que la cuenta de Google conectada en Composio tenga acceso a la hoja.',
    muy_grande: 'La respuesta de la base llegó incompleta (demasiados datos en una sola consulta). Inténtalo de nuevo; si se repite, avísanos.',
  };
  $('#btn-base').addEventListener('click', async () => {
    const cons = $('#base-cons').value.trim(), out = $('#estado-base'), btn = $('#btn-base');
    const pinta = (txt, tipo) => { out.className = 'estado' + (tipo ? ' ' + tipo : ''); out.innerHTML = (tipo === 'girando' ? '<i data-lucide="loader-circle"></i>' : '') + `<span>${esc(txt)}</span>`; iconos(out); };
    if (!/^(CA-?)?\d{3,}$/i.test(cons)) { pinta('Escribe el consecutivo de la venta, por ejemplo 2900 o CA2900.', 'error'); return; }
    btn.disabled = true;
    pinta('Consultando la base (solo lectura)…', 'girando');
    try {
      const tab = await leerVentaDeBase(cons, t => pinta(`${t} (solo lectura)`, 'girando'));
      const datos = tab && confirmacionDesdeBase(tab, cons);
      if (!datos) { pinta(`No encontramos la venta ${cons.toUpperCase()} en la base. Revisa el consecutivo.`, 'error'); return; }
      out.textContent = '';
      const faltan = [];
      if (datos.aereo.some(a => a.trayectos.some(t => !t.vuelo))) faltan.push('número de vuelo, fecha y horas de cada trayecto');
      if (!datos.estado_pago) faltan.push('el estado de pago (la base no dice si ya se pagó todo: elige «Abono recibido» o «Pagado en su totalidad»)');
      if (!datos.hoteles.length) faltan.push('hoteles, si los hay (la venta no tiene hoteles registrados)');
      else faltan.push('el nombre y las fechas exactas de cada hotel');
      if (!datos.asesor_telefono) faltan.push('tu teléfono');
      abrirConvertido('confirmacion', datos, {
        desde: `la venta ${cons.toUpperCase().replace(/^(\d)/, 'CA$1')} de la base`, pegar: 'Pegar la reserva para completar',
        texto: `Trajimos de la base los pasajeros, las fechas, los tiquetes con su localizador, los servicios y los pagos con su estado. Revisa y completa lo que la base no tiene: ${faltan.join('; ')}. Puedes pegar la reserva del sistema y Claude lo suma.`,
      });
    } catch (err) {
      const c = err?.code;
      pinta(MENSAJES_BASE[c] || MENSAJES_MCP[c] || (c === 'tool_error' ? 'Composio respondió con un error al leer la base.' : 'No pudimos consultar la base. Inténtalo de nuevo.'), 'error');
    } finally { btn.disabled = false; }
  });

  // ================= PDF (se rasteriza en el navegador; en la versión completa lo hace el motor) =================
  let downloads = null;
  (async () => {
    downloads = window.claude?.use ? await window.claude.use('downloads').catch(() => null) : null;
    if (!downloads) $('#btn-pdf').title = 'La descarga funciona al abrir la demo desde claude.ai';
  })();
  $('#btn-pdf').addEventListener('click', async () => {
    const out = $('#estado-3');
    if (!downloads) { out.textContent = 'La descarga funciona al abrir la demo desde claude.ai.'; return; }
    if (!window.html2canvas || !window.jspdf) { out.textContent = 'No se pudo cargar el generador de PDF. Recarga la página e inténtalo de nuevo.'; return; }
    const btn = $('#btn-pdf');
    btn.disabled = true;
    out.className = 'estado girando';
    out.innerHTML = '<i data-lucide="loader-circle"></i><span>Preparando el PDF…</span>';
    iconos(out);
    try {
      const fd = $('#doc-frame').contentDocument;
      await fd.fonts.ready;
      const pdf = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
      const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
      const paginas = [...fd.querySelectorAll('section.page')];
      for (let i = 0; i < paginas.length; i++) {
        const canvas = await html2canvas(paginas[i], { scale: 1.6, backgroundColor: '#FFFFFF', useCORS: true, logging: false, windowWidth: 1061 });
        if (i) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, H);
      }
      const nombre = `${doc().archivo}-${doc().codigo(docActual)}.pdf`;
      await downloads.save({ filename: nombre, data: pdf.output('blob') });
      out.className = 'estado'; out.textContent = `Guardaste ${nombre}.`;
    } catch (err) {
      out.className = 'estado error';
      out.textContent = err?.code === 'declined' ? 'Cancelaste la descarga.' : 'No se pudo generar el PDF. Inténtalo de nuevo.';
    } finally { btn.disabled = false; }
  });

  // ================= arranque =================
  iniciarBanco();
  pintarTipos();
  pintarListas();
  iconos();
  obtenerSample();
})();
