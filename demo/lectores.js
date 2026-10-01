"use strict";
// Lectores por código: convierten el texto de un PDF de proveedor en datos, SIN usar IA.
// Cada lector reconoce un formato (por frases fijas que siempre trae) y lo lleva a un «viaje» neutro:
//   { pasajeros, titular, referencia, destino, vuelos[], hoteles[], traslados[], programa, condiciones[], instrucciones[] }
// y aDocumento(viaje, doc) lo pasa a los campos del documento que eligió la asesora.
// Las plantillas aprendidas (las que arma Claude cuando llega un proveedor nuevo) se aplican con
// aplicarPlantilla(): son datos (frases y expresiones regulares), nunca código que se ejecute.
// Para agregar un lector a mano, ver .claude/skills/nuevo-lector/SKILL.md.
function crearLectores({ ciudadIata = c => c } = {}) {
  // ---------- utilidades ----------
  const norm = t => String(t || '').replace(/[‐‑–—]/g, '-').replace(/\r/g, '').replace(/[ \t\u00A0]+/g, ' ');
  const lineas = t => norm(t).split('\n').map(x => x.trim()).filter(x => x && !/^--- Hoja \d+ ---$/.test(x) && !/^\[PDF .*\]$/.test(x));
  const MENORES = new Set(['de', 'del', 'y', 'e', 'a', 'al', 'en', 'por', 'con', 'para', 'o', 'u']);
  // «LLEGADA A LA PAZ» → «Llegada a La Paz»; «EXCURSIóN SAONA» → «Excursión Saona».
  const nombrePropio = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim()
    .replace(/(^|[\s(“"'/+-])(\p{L})(\p{L}*)/gu, (m, a, b, c, i) => a + ((i > 0 && MENORES.has(b + c) && a === ' ') ? b + c : b.toUpperCase() + c));
  const frase = t => { const x = String(t || '').trim(); return x ? x.charAt(0).toUpperCase() + x.slice(1) : ''; };
  const dos = n => String(n).padStart(2, '0');
  const MES = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };
  // Fechas: 27/10/2026, 24-09-2026, 2026-10-27, «23 Sep. 2026», «23 de septiembre de 2026», «Sep 23, 2026».
  function fechaISO(s) {
    s = String(s || '');
    let m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return `${m[1]}-${dos(m[2])}-${dos(m[3])}`;
    m = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s);
    if (m) return `${m[3]}-${dos(m[2])}-${dos(m[1])}`;
    m = /(\d{1,2})\.?\s*(?:de\s+)?([a-záéíóú]{3,})\.?,?\s*(?:de\s+|del\s+)?(\d{4})/i.exec(s);
    if (m && MES[m[2].slice(0, 3).toLowerCase()]) return `${m[3]}-${dos(MES[m[2].slice(0, 3).toLowerCase()])}-${dos(m[1])}`;
    m = /([a-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})/i.exec(s);
    if (m && MES[m[1].slice(0, 3).toLowerCase()]) return `${m[3]}-${dos(MES[m[1].slice(0, 3).toLowerCase()])}-${dos(m[2])}`;
    return '';
  }
  const hora = s => { const m = /(\d{1,2}):(\d{2})/.exec(String(s || '')); return m ? `${dos(m[1])}:${m[2]}` : ''; };
  const despues = (L, re, salto = 1) => { const i = L.findIndex(x => re.test(x)); return i >= 0 ? L[i + salto] || '' : ''; };
  const valor = (t, re) => { const m = re.exec(norm(t)); return m ? m[1].trim() : ''; };
  const unicos = xs => [...new Set(xs.filter(Boolean))];
  // Referencia de Caminos dentro del PDF (CA2773, CA-2773): une el documento a su expediente.
  const referenciaCaminos = t => { const m = /\bCA-?(\d{3,5})\b/.exec(norm(t)); return m ? 'CA' + m[1] : ''; };
  const AEROLINEAS = { avianca: 'AV', latam: 'LA', copa: 'CM', wingo: 'P5', jetsmart: 'JA', satena: '9R', clic: 'VE', iberia: 'IB', 'air europa': 'UX',
    american: 'AA', united: 'UA', delta: 'DL', arajet: 'DM', 'air france': 'AF', klm: 'KL', lufthansa: 'LH', 'turkish': 'TK', aeromexico: 'AM' };
  const codigoAerolinea = n => { const k = Object.keys(AEROLINEAS).find(a => String(n || '').toLowerCase().includes(a)); return k ? AEROLINEAS[k] : ''; };

  // ---------- 1) E-ticket de aerolínea emitido por GDS (Amadeus), como el de Avianca ----------
  const eticketGds = {
    id: 'eticket-gds', nombre: 'E-ticket de aerolínea (Amadeus)',
    reconoce: t => /E-?Ticket/i.test(norm(t)) && /Localizador:/i.test(t) && /\bItinerario\b/.test(t) && /\(([A-Z]{3})\)/.test(t),
    leer(t) {
      t = norm(t);
      const cia = /Cia:\s*([^|\n]+?)\s*-\s*Localizador:\s*([A-Z0-9]{5,8})/i.exec(t);
      const aerolinea = cia ? nombrePropio(cia[1]) : '';
      const pax = [...t.matchAll(/^([A-ZÁÉÍÓÚÑ ]{5,}?)\s*\|?\s*([A-Z]{3}(?:-[A-Z]{3})+)\s*\|?\s*(\d{3}-\d{10})/gm)].map(m => ({ nombre: nombrePropio(m[1]), tiquete: m[3] }));
      // Cada vuelo llega como: Ciudad (IATA) / fecha - / hora / aeropuerto, dos veces; luego duración, aerolínea y número.
      const L = lineas(t), trayectos = [];
      const punto = j => {
        const enLinea = /\(([A-Z]{3})\)\s*$/.exec(L[j] || '');
        const sola = /^\(([A-Z]{3})\)$/.exec(L[j + 1] || '');
        const iata = enLinea?.[1] || sola?.[1];
        const k = sola ? j + 2 : j + 1;
        if (!iata || !/^\d{2}\/\d{2}\/\d{4}/.test(L[k] || '') || !/^\d{1,2}:\d{2}$/.test(L[k + 1] || '')) return null;
        return { iata, fecha: fechaISO(L[k]), hora: hora(L[k + 1]), sig: k + 3 };
      };
      for (let i = 0; i < L.length; i++) {
        const a = punto(i); if (!a) continue;
        const b = punto(a.sig); if (!b) continue;
        const resto = L.slice(b.sig, b.sig + 5).join(' ').replace(/\d+\s*h(\s*\d+\s*m)?/, ' ');
        const num = /(?:^|\s)(\d{2,4})(?:\s|$)/.exec(resto);
        const cod = codigoAerolinea(resto) || codigoAerolinea(aerolinea);
        trayectos.push({ vuelo: num ? `${cod} ${num[1]}`.trim() : '', fecha: a.fecha, origen: a.iata, destino: b.iata, sale: a.hora,
          llega: b.fecha && b.fecha !== a.fecha ? `${b.hora} +1` : b.hora });
        i = b.sig - 1;
      }
      return { pasajeros: pax.map(p => p.nombre), titular: pax[0]?.nombre || '',
        vuelos: [{ aerolinea, record: cia?.[2] || '', tiquetes: pax.map(p => p.tiquete), trayectos }], hoteles: [], traslados: [] };
    },
  };

  // ---------- 2) Tiquete de tren de Trenitalia (también vendido por Rail Europe) ----------
  const trenitalia = {
    id: 'trenitalia', nombre: 'Tiquete de tren Trenitalia',
    reconoce: t => /Trenitalia/i.test(t) && /Departure station/i.test(t) && /Arrival station/i.test(t),
    leer(t) {
      const L = lineas(t), traslados = [], pasajeros = [];
      let codigo = '', viaje = '';
      for (let i = 0; i < L.length; i++) {
        if (/^Ticket Code:/i.test(L[i])) codigo = valor(L[i], /Ticket Code:\s*(\S+)/i);
        if (/^TRAVEL from /i.test(L[i])) viaje = L[i].replace(/^TRAVEL from\s+/i, '').replace(/\s+To\s+/i, ' — ');
        if (/^Passenger Name/i.test(L[i]) && L[i + 1]) pasajeros.push(nombrePropio(L[i + 1]));
        if (!/^Departure station$/i.test(L[i])) continue;
        const sale = /Hours\s*(\d{1,2}:\d{2})\s*-\s*(\S+)/i.exec(L[i + 2] || '');
        const j = L.findIndex((x, k) => k > i && /^Arrival station$/i.test(x));
        const llega = j > 0 ? /Hours\s*(\d{1,2}:\d{2})\s*-\s*(\S+)/i.exec(L[j + 2] || '') : null;
        const tren = valor(L.slice(i, i + 12).join('\n'), /Train:\s*(.+)/i);
        if (!sale) continue;
        const clave = `${L[i + 1]}|${sale[1]}|${sale[2]}`;
        if (traslados.some(x => x._clave === clave)) continue; // las hojas repetidas no duplican el tramo
        traslados.push({ _clave: clave, operador: 'Trenitalia', trayecto: `Tren ${tren ? tren + ': ' : ''}${L[i + 1]} — ${j > 0 ? L[j + 1] : ''}`,
          fecha: fechaISO(sale[2]), hora: hora(sale[1]), llega: llega ? hora(llega[1]) : '', confirmacion: codigo, viaje });
      }
      const nombres = unicos(pasajeros);
      return { pasajeros: nombres, titular: nombres[0] || '', referencia: referenciaCaminos(t), vuelos: [], hoteles: [],
        traslados: traslados.map(({ _clave, ...x }) => x),
        servicio: { tipo: 'tren', nombre: unicos(traslados.map(x => x.viaje)).map(v => `Tren ${v}`).join(' y ') || 'Tiquetes de tren', proveedor: 'Trenitalia' },
        instrucciones: ['Presenta el tiquete (impreso o en el celular) al personal del tren cuando lo pidan.'].filter(() => /Ticket Code/i.test(t)),
        condiciones: [] };
    },
  };

  // ---------- 3) Voucher de hotel de agencia («Código del alojamiento», «Titular de la reserva») ----------
  const hotelAgencia = {
    id: 'hotel-agencia', nombre: 'Voucher de hotel (reserva de agencia)',
    reconoce: t => /C[óo]digo del alojamiento/i.test(t) && /Check-in/i.test(t) && /Titular de la reserva/i.test(t),
    leer(t) {
      const L = lineas(t), tn = norm(t);
      const iCod = L.findIndex(x => /^C[óo]digo del alojamiento/i.test(x));
      const hotel = (L[iCod + 1] || '').replace(/\s*-\s*(all inclusive|todo incluido|solo alojamiento|desayuno incluido)\s*$/i, '').trim();
      const direccion = valor(tn, /Direcci[óo]n:\s*([^\n]+)/i);
      const partes = direccion.split(',').map(x => x.trim()).filter(Boolean);
      const telefono = valor(tn, /Tel[ée]fono:\s*([^|\n]+)/i);
      const entrada = despues(L, /^Check-in$/i), salida = despues(L, /^Check-out$/i);
      const iHab = L.findIndex((x, k) => /^Habitaci[óo]n$/i.test(x) && !/^Habitaci[óo]n$/i.test(L[k + 1] || ''));
      const regimen = despues(L, /^R[ée]gimen$/i);
      const adultos = valor(tn, /\b(\d+)\s*adultos?\b/i), ninos = valor(tn, /\b(\d+)\s*(?:niños?|menores)\b/i);
      const noches = valor(tn, /Duraci[óo]n:\s*(\d+)\s*noches?/i);
      const titular = nombrePropio(despues(L, /^Titular de la reserva$/i));
      const condiciones = [];
      if (/No Reembolsable/i.test(tn)) condiciones.push('Tarifa no reembolsable.');
      const pen = /penalidad del (\d+\s*%)[\s\S]{0,200}?(\d{2}\/\d{2}\/\d{4})[\s\S]{0,40}?(\d{1,2}:\d{2})/i.exec(tn);
      if (pen) condiciones.push(`Cancelación hasta el ${pen[2]}, ${pen[3]} (hora local): penalidad del ${pen[1].replace(/\s/g, '')}.`);
      const noShow = /no show\)?\s*el costo ser[áa] del (\d+\s*%)/i.exec(tn);
      if (noShow) condiciones.push(`Si no te presentas: ${noShow[1].replace(/\s/g, '')} del total.`);
      if (/no permite realizar cambios de nombre/i.test(tn)) condiciones.push('No se permiten cambios de nombre.');
      const instrucciones = [];
      const hIn = hora(entrada), hOut = hora(salida);
      const codigos = valor(L[iCod] || '', /alojamiento\s*(.+)$/i);
      if (hIn || hOut) instrucciones.push(`Check-in desde las ${hIn || '—'}; check-out hasta las ${hOut || '—'}.`);
      if (codigos.includes('/')) instrucciones.push(`Código del alojamiento: ${codigos}.`);
      if (/documento de identidad con\s+foto/i.test(tn)) instrucciones.push('En el check-in pueden pedirte documento de identidad con foto y tarjeta de crédito o depósito para imprevistos.');
      const solicitudes = despues(L, /^Solicitudes especiales$/i);
      if (solicitudes && !/sujetos a disponibilidad/i.test(solicitudes)) instrucciones.push(`Solicitud especial: ${solicitudes.toLowerCase()} (sujeta a disponibilidad).`);
      return { pasajeros: titular ? [titular] : [], titular, referencia: referenciaCaminos(t), vuelos: [], traslados: [],
        destino: partes.length >= 2 ? partes.slice(-2).join(', ') : direccion,
        hoteles: [{ hotel, ciudad: partes.length >= 2 ? partes[partes.length - 2] : '', direccion, telefono: telefono.split('/')[0].trim(),
          entrada: fechaISO(entrada), salida: fechaISO(salida), noches, acomodacion: L[iHab + 1] || '', regimen,
          ocupacion: [adultos && `${adultos} ${adultos === '1' ? 'adulto' : 'adultos'}`, ninos && `${ninos} ${ninos === '1' ? 'niño' : 'niños'}`].filter(Boolean).join(' y '),
          confirmacion: codigos.split('/')[0].trim() }],
        condiciones, instrucciones };
    },
  };

  // ---------- 4) Cupón de excursión («PICK UP», «No. RESERVA», «FECHA / DATE») ----------
  const cuponExcursion = {
    id: 'cupon-excursion', nombre: 'Cupón de excursión',
    reconoce: t => /PICK UP:/i.test(t) && /No\. RESERVA:/i.test(t) && /FECHA \/ DATE:/i.test(t),
    leer(t) {
      const L = lineas(t), tn = norm(t);
      const campo = re => valor(tn, re);
      const titular = nombrePropio(campo(/NOMBRE \/ NAME:\s*([^|\n]+)/i));
      const hotel = nombrePropio(campo(/HOTEL:\s*([^|\n]+)/i));
      const fecha = fechaISO(campo(/FECHA \/ DATE:\s*([^|\n]+)/i));
      const pick = campo(/PICK UP:\s*([^|\n]+)/i);
      const paxs = /(\d+)\s*ADL/i.exec(campo(/PAXS:\s*([^|\n]+)/i));
      const ninos = /(\d+)\s*(?:CHD|NIN)/i.exec(campo(/PAXS:\s*([^|\n]+)/i));
      // El nombre de la excursión: los renglones en mayúsculas entre la referencia y la fecha de impresión.
      const iRef = L.findIndex(x => /No\. REFERENCIA:/i.test(x));
      const nombres = [];
      for (let k = iRef + 1; k < L.length && k < iRef + 5; k++) { if (/Impresa:|Pagina:|NOMBRE/i.test(L[k])) break; nombres.push(nombrePropio(L[k])); }
      const servicio = unicos(nombres).join(' — ') || 'Excursión';
      // Políticas en español (antes de la versión en inglés), una por literal a), b)…; se omiten las de otros servicios.
      const pol = (/POL[ÍI]TICAS[^\n]*\n([\s\S]*?)(?:CANCELLATION|$)/i.exec(tn) || [])[1] || '';
      const condiciones = pol.replace(/\n/g, ' ').split(/\s(?=[a-h]\)\s)/).map(x => x.replace(/^[a-h]\)\s*/, '').trim())
        .filter(x => x && !/Cirque du Soleil/i.test(x)).map(frase);
      const lugarRecogida = pick.replace(/\d{1,2}:\d{2}(:\d{2})?/, '').trim().toLowerCase().replace(/recepcion/, 'recepción').replace(/lobby/, 'lobby');
      const recogida = pick ? `Recogida${hora(pick) ? ` a las ${hora(pick)}` : ''}${lugarRecogida ? ` en la ${lugarRecogida}` : ''}${hotel ? ` del ${hotel}` : ''}` : '';
      return { pasajeros: titular ? [titular] : [], titular, referencia: referenciaCaminos(t), vuelos: [], hoteles: [],
        destino: '', traslados: [{ operador: '', trayecto: `${servicio}${hotel ? ` (recogida en ${hotel})` : ''}`, fecha, hora: hora(pick),
          confirmacion: campo(/No\. RESERVA:\s*([^|\s]+)/i) }],
        servicio: { tipo: 'excursion', nombre: servicio, proveedor: '', ubicacion: hotel ? `Recepción del ${hotel}` : '',
          ocupacion: [paxs && `${paxs[1]} ${paxs[1] === '1' ? 'adulto' : 'adultos'}`, ninos && `${ninos[1]} ${ninos[1] === '1' ? 'niño' : 'niños'}`].filter(Boolean).join(' y ') },
        instrucciones: [recogida && recogida + '.', 'Presenta este cupón el día de la excursión.'].filter(Boolean), condiciones };
    },
  };

  // ---------- 5) Programa de tour del operador (Word: «DIA 1 – …», «► INCLUYE:») ----------
  const programaTour = {
    id: 'programa-tour', nombre: 'Programa de tour del operador',
    reconoce: t => /^\s*D[IÍ]A\s*0?1\b/im.test(norm(t)) && /INCLUYE/i.test(t) && /^\s*D[IÍ]A\s*0?2\b/im.test(norm(t)),
    leer(t) {
      const L = lineas(t), R = [];
      // Une los renglones partidos: lo que no empieza con viñeta, «DIA» o «►» sigue al renglón anterior.
      for (const l of L) {
        if (R.length && !/^(•|►|-\s|D[IÍ]A\s*\d|\d+\.\s)/i.test(l) && /^(•|-\s|\d+\.\s)/.test(R.at(-1))) R[R.length - 1] += ' ' + l; else R.push(l);
      }
      const sec = {}, dias = [];
      let actual = 'inicio';
      for (const l of R) {
        const d = /^D[IÍ]A\s*0?(\d+)\s*[-:]?\s*\/?\s*(.+)$/i.exec(l);
        const h = /^►\s*([^:]+):?\s*(.*)$/.exec(l);
        if (d) { dias.push({ n: +d[1], titulo: nombrePropio(d[2].replace(/^[-/\s]+/, '').replace(/\s*\/\s*/g, ' / ')), items: [] }); actual = 'dia'; continue; }
        if (h) { actual = h[1].trim().toUpperCase(); sec[actual] = h[2] ? [h[2]] : []; continue; }
        const item = l.replace(/^(•|-)\s*/, '').replace(/\bpor su agente\b/gi, 'por tu asesor de Caminos').replace(/\bsu agente\b/gi, 'tu asesor de Caminos');
        if (actual === 'dia') dias.at(-1).items.push(item); else (sec[actual] ??= []).push(item);
      }
      const titulo = L.find(l => /\b(TOUR|PLAN|PAQUETE|PROGRAMA|CIRCUITO)\b/i.test(l) && l.length < 90) || '';
      const dur = /(\d+)\s*D[IÍ]AS?\s*\/\s*(\d+)\s*NOCHES?/i.exec(norm(t));
      const seccion = (...nombres) => { const k = Object.keys(sec).find(x => nombres.some(n => x.startsWith(n))); return k ? sec[k] : []; };
      const tarifas = seccion('COSTO', 'PRECIO', 'TARIFA', 'VALOR').map(x => {
        const m = /(USD|US\$|EUR|€|COP)?\s*\$?\s*([\d.,]+)\s*-\s*(?:Hab(?:itaci[óo]n)?\.?\s*)?(.+)$/i.exec(x);
        if (!m) return null;
        const moneda = /EUR|€/i.test(m[1] || '') ? 'EUR' : /COP/i.test(m[1] || '') ? 'COP' : 'USD';
        const n = Number(m[2].replace(/,(?=\d{3}\b)/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
        const ac = nombrePropio(m[3]).replace(/^(Single|Simple|Sencillas?)$/i, 'Sencilla').replace(/^Dobles?$/i, 'Doble').replace(/^Triples?$/i, 'Triple');
        return Number.isFinite(n) ? { hotel: '', acomodacion: ac, valor: moneda === 'COP' ? '$' + Math.round(n).toLocaleString('es-CO').replace(/,/g, '.') : `${moneda} ${n.toLocaleString('es-CO', { maximumFractionDigits: 2 }).replace(/,/g, '.')}` } : null;
      }).filter(Boolean);
      const comidas = s => ['Desayuno', 'Almuerzo', 'Cena'].filter(c => new RegExp(c.slice(0, 5), 'i').test(s) && !new RegExp(c.slice(0, 5) + '[^.;]{0,40}(no incluid|costo no)', 'i').test(s));
      const vig = /v[aá]lid[oa]s? hasta (?:el )?([^.\n]+?\d{4})/i.exec(norm(t));
      return { pasajeros: [], titular: '', referencia: referenciaCaminos(t), vuelos: [], hoteles: [], traslados: [],
        programa: { titulo: nombrePropio(titulo), noches: dur ? +dur[2] : 0, dias: dias.map(d => ({ titulo: d.titulo, detalle: d.items.join('\n'), comidas: comidas(d.items.join(' ')) })),
          incluye: seccion('INCLUYE'), no_incluye: seccion('NO INCLUYE'), tarifas, vigencia: vig ? fechaISO(vig[1]) || vig[1] : '',
          notas: seccion('NOTAS', 'A TOMAR EN CUENTA', 'IMPORTANTE') },
        // Las formas de pago y las comisiones son del proveedor: nunca pasan al documento del cliente.
        condiciones: [] };
    },
  };

  const LECTORES = [eticketGds, trenitalia, hotelAgencia, cuponExcursion, programaTour];

  // ---------- plantillas aprendidas (datos, no código) ----------
  // { id, nombre, huella: [frases], servicio: 'hotel'|'vuelo'|'traslado', campos: [{campo, patron}],
  //   repetir?: {inicio, campos: [{campo, patron}]} }. Los nombres de campo posibles están en CAMPOS_PLANTILLA.
  const CAMPOS_PLANTILLA = ['titular', 'pasajero', 'referencia', 'destino',
    'hotel.hotel', 'hotel.direccion', 'hotel.ciudad', 'hotel.telefono', 'hotel.entrada', 'hotel.salida', 'hotel.acomodacion', 'hotel.regimen', 'hotel.confirmacion', 'hotel.noches',
    'vuelo.aerolinea', 'vuelo.record', 'vuelo.tiquete',
    'tramo.vuelo', 'tramo.fecha', 'tramo.origen', 'tramo.destino', 'tramo.sale', 'tramo.llega',
    'traslado.operador', 'traslado.trayecto', 'traslado.fecha', 'traslado.hora', 'traslado.confirmacion',
    'servicio.nombre', 'servicio.proveedor', 'servicio.ubicacion', 'condicion', 'instruccion'];
  const regex = p => { if (typeof p !== 'string' || p.length > 300) return null; try { return new RegExp(p, 'im'); } catch (_) { return null; } };
  function plantillaValida(pl) {
    if (!pl || typeof pl !== 'object' || !Array.isArray(pl.huella) || pl.huella.length < 2 || !Array.isArray(pl.campos)) return false;
    if (pl.huella.some(h => typeof h !== 'string' || h.trim().length < 4 || h.length > 120)) return false;
    const todos = [...pl.campos, ...(pl.repetir?.campos || [])];
    return todos.length > 0 && todos.every(c => CAMPOS_PLANTILLA.includes(c?.campo) && regex(c.patron)) && (!pl.repetir || regex(pl.repetir.inicio));
  }
  const reconocePlantilla = (pl, t) => { const tn = norm(t).toLowerCase(); return pl.huella.every(h => tn.includes(norm(h).toLowerCase().trim())); };
  function aplicarPlantilla(pl, t) {
    t = norm(t);
    const v = { pasajeros: [], titular: '', referencia: '', destino: '', vuelos: [], hoteles: [], traslados: [], condiciones: [], instrucciones: [], servicio: {} };
    const hotel = {}, vuelo = { trayectos: [], tiquetes: [] }, traslado = {};
    const limpiar = (campo, x) => {
      x = String(x || '').trim();
      if (/fecha|entrada|salida/.test(campo)) return fechaISO(x) || x;
      if (/\.(sale|llega|hora)$/.test(campo)) return hora(x) || x;
      if (/^(titular|pasajero)$|hotel\.hotel/.test(campo) && x === x.toUpperCase()) return nombrePropio(x);
      return x;
    };
    const poner = (campo, x, tramo) => {
      if (!x) return;
      const [a, b] = campo.split('.');
      if (campo === 'titular') v.titular = x;
      else if (campo === 'pasajero') v.pasajeros.push(x);
      else if (campo === 'referencia') v.referencia = referenciaCaminos(x) || x;
      else if (campo === 'destino') v.destino = x;
      else if (campo === 'condicion') v.condiciones.push(frase(x));
      else if (campo === 'instruccion') v.instrucciones.push(frase(x));
      else if (a === 'hotel') hotel[b] = x;
      else if (a === 'vuelo') { if (b === 'tiquete') vuelo.tiquetes.push(x); else vuelo[b] = x; }
      else if (a === 'tramo') tramo[b] = x;
      else if (a === 'traslado') traslado[b] = x;
      else if (a === 'servicio') v.servicio[b] = x;
    };
    const tramoSuelto = {};
    for (const c of pl.campos) {
      const re = regex(c.patron);
      const ms = ['pasajero', 'condicion', 'instruccion', 'vuelo.tiquete'].includes(c.campo) ? [...t.matchAll(new RegExp(re.source, 'gim'))] : [re.exec(t)].filter(Boolean);
      for (const m of ms) poner(c.campo, limpiar(c.campo, m[1] ?? m[0]), tramoSuelto);
    }
    if (pl.repetir) {
      const ini = new RegExp(regex(pl.repetir.inicio).source, 'gim');
      const cortes = [...t.matchAll(ini)].map(m => m.index);
      cortes.forEach((c, i) => {
        const bloque = t.slice(c, cortes[i + 1] ?? t.length), tramo = {}, tras = {};
        for (const k of pl.repetir.campos) {
          const m = regex(k.patron).exec(bloque); if (!m) continue;
          const x = limpiar(k.campo, m[1] ?? m[0]);
          if (k.campo.startsWith('traslado.')) tras[k.campo.slice(9)] = x; else poner(k.campo, x, tramo);
        }
        if (Object.keys(tramo).length) vuelo.trayectos.push(tramo);
        if (Object.keys(tras).length) v.traslados.push(tras);
      });
    }
    if (Object.keys(tramoSuelto).length) vuelo.trayectos.push(tramoSuelto);
    if (Object.keys(hotel).length) v.hoteles.push(hotel);
    if (vuelo.trayectos.length || vuelo.record) v.vuelos.push(vuelo);
    if (Object.keys(traslado).length) v.traslados.push(traslado);
    v.pasajeros = unicos([v.titular, ...v.pasajeros]);
    if (!v.titular) v.titular = v.pasajeros[0] || '';
    return v;
  }

  // ---------- del viaje neutro a cada documento ----------
  const anio = f => (f || '').slice(0, 4);
  const fechasDe = v => [...v.vuelos.flatMap(x => x.trayectos.map(t => t.fecha)), ...v.hoteles.flatMap(h => [h.entrada, h.salida]), ...v.traslados.map(x => x.fecha)].filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f || '')).sort();
  const textoPasajeros = v => { const n = v.pasajeros.length; return n ? `${n} ${n === 1 ? 'persona' : 'personas'}${n > 1 ? ': ' + v.pasajeros.join(', ') : ''}` : ''; };
  const llegaCon = t => (/\+1/.test(t.llega || '') ? t.llega : t.llega || '');
  const serviciosDe = v => [
    ...v.vuelos.map(x => `Tiquetes aéreos${x.aerolinea ? ' ' + x.aerolinea : ''}${x.record ? ` (récord ${x.record})` : ''}`),
    ...v.hoteles.map(h => `Alojamiento en ${h.hotel}${h.noches ? `, ${h.noches} ${+h.noches === 1 ? 'noche' : 'noches'}` : ''}${h.regimen ? `, plan ${h.regimen.toLowerCase()}` : ''}`),
    ...(v.servicio?.tipo === 'tren' ? [v.servicio.nombre] : v.servicio?.tipo === 'excursion' ? [`Excursión: ${v.servicio.nombre}`] : v.traslados.map(x => x.trayecto)),
  ].filter(Boolean);
  function aDocumento(v, doc) {
    const f = fechasDe(v), desde = f[0] || '', hasta = f[f.length - 1] || '';
    const num = (v.referencia || '').replace(/^CA/, '');
    if (doc === 'confirmacion') return {
      codigo_reserva: num ? `CAM-${anio(desde) || new Date().getFullYear()}-${num}` : '',
      nombre_viajero: v.titular, pasajeros: textoPasajeros(v), destino: v.destino || '', fecha_salida: desde, fecha_regreso: hasta,
      aereo: v.vuelos.map(x => ({ aerolinea: x.aerolinea || '', record: x.record || '', tiquete: (x.tiquetes || []).join(' · '),
        trayectos: x.trayectos.map(t => ({ vuelo: t.vuelo || '', fecha: t.fecha || '', ruta: t.origen && t.destino ? `${t.origen} — ${t.destino}` : t.ruta || '', sale: t.sale || '', llega: llegaCon(t) })) })),
      hoteles: v.hoteles.map(h => ({ hotel: h.hotel || '', entrada: h.entrada || '', salida: h.salida || '', acomodacion: [h.acomodacion, h.regimen].filter(Boolean).join(' · '), confirmacion: h.confirmacion || '' })),
      traslados: v.traslados.map(x => ({ operador: x.operador || '', trayecto: x.trayecto || '', fecha: x.fecha || '', hora: x.hora || '', confirmacion: x.confirmacion || '' })),
      servicios_confirmados: serviciosDe(v),
      nota_importante: [...(v.instrucciones || []), ...(v.condiciones || [])].join(' '),
    };
    if (doc === 'voucher') {
      const h = v.hoteles[0], a = v.vuelos[0];
      const tipo = h ? 'hotel' : a ? 'aereo' : 'traslado';
      const s = v.servicio || {};
      // La habitación ya va en la tabla del hotel; aquí solo lo que no se ve allí.
      const incluye = h ? [h.noches && `${h.noches} ${+h.noches === 1 ? 'noche' : 'noches'}${h.ocupacion ? ` para ${h.ocupacion}` : ''}`, h.regimen && `Plan ${h.regimen.toLowerCase()}`].filter(Boolean)
        : []; // en trenes y excursiones el servicio ya está en el título y en la tabla: no se repite
      const extra = !h && s.ocupacion ? [`Cupón para ${s.ocupacion}.`] : [];
      return {
        tipo, codigo_reserva: v.referencia || '',
        nombre_servicio: h ? `Alojamiento — ${h.hotel}` : a ? `Tiquete aéreo — ${a.aerolinea || ''}`.trim() : s.tipo === 'excursion' ? (/^excursi/i.test(s.nombre) ? s.nombre : `Excursión — ${s.nombre}`) : s.nombre || (v.traslados[0]?.trayecto || ''),
        proveedor: h ? h.hotel : a ? a.aerolinea || '' : s.proveedor || '',
        vigencia: { desde, hasta }, nombre_viajero: v.titular, acompanantes: v.pasajeros.filter(p => p !== v.titular),
        ubicacion: h ? [h.direccion].filter(Boolean).join('') : s.ubicacion || '',
        hoteles: h ? [{ hotel: h.hotel || '', entrada: h.entrada || '', salida: h.salida || '', acomodacion: h.acomodacion || '', confirmacion: h.confirmacion || '' }] : [],
        aereo: a ? { aerolinea: a.aerolinea || '', tiquete: (a.tiquetes || []).join(' · '), record: a.record || '',
          trayectos: a.trayectos.map(t => ({ vuelo: t.vuelo || '', fecha: t.fecha || '', ruta: t.origen && t.destino ? `${t.origen} — ${t.destino}` : '', sale: t.sale || '', llega: llegaCon(t) })) } : undefined,
        traslados: tipo === 'traslado' ? v.traslados.map(x => ({ trayecto: x.trayecto || '', fecha: x.fecha || '', hora: x.hora || '', confirmacion: x.confirmacion || '' })) : [],
        incluye, instrucciones: [...extra, ...(v.instrucciones || [])].join(' '), condiciones: (v.condiciones || []).join(' '),
      };
    }
    if (doc === 'cotizacion') {
      const p = v.programa;
      const noches = p?.noches || v.hoteles.reduce((n, h) => n + (+h.noches || 0), 0);
      return {
        codigo_cotizacion: v.referencia || '', titulo_destino: p?.titulo || '', destino: v.destino || '',
        fecha_llegada: desde, fecha_salida: hasta, noches: noches ? `${noches} ${noches === 1 ? 'noche' : 'noches'}` : '', pasajeros: textoPasajeros(v),
        acomodacion: v.hoteles[0]?.acomodacion || '',
        incluye: p ? p.incluye : serviciosDe(v), no_incluye: p ? p.no_incluye : [],
        tarifas: p?.tarifas?.length ? p.tarifas.map(x => ({ ...x, hotel: x.hotel || p.titulo })) : [],
        modo_valor: 'persona',
        itinerario: p ? p.dias.map(d => ({ servicio: d.titulo, fecha: '', detalle: d.detalle.replace(/\n/g, ' ') })) : [],
        vigencia: p?.vigencia || '',
      };
    }
    if (doc === 'itinerario' || doc === 'itinerario_corto') {
      const p = v.programa;
      if (!p) return null; // sin programa, el itinerario se arma como desde una confirmación (ver app.js)
      return {
        codigo: v.referencia || '', titulo: p.titulo, destino: v.destino || '',
        dias: p.dias.map(d => ({ fecha: '', titulo: d.titulo, lugar: '', pais: '', descripcion: d.detalle.replace(/\n/g, ' '), comidas: d.comidas, etiquetas: [], hotel: '' })),
        incluye: p.incluye, no_incluye: p.no_incluye,
        recomendaciones: p.notas?.length ? [{ tema: 'Ten en cuenta', items: p.notas }] : [],
      };
    }
    return null;
  }

  // Devuelve { lector, viaje } con el primer lector (o plantilla aprendida) que reconoce el texto, o null.
  function reconocer(texto, plantillas = []) {
    for (const l of LECTORES) if (l.reconoce(texto)) return { lector: { id: l.id, nombre: l.nombre, tipo: 'codigo' }, viaje: l.leer(texto) };
    for (const pl of plantillas) if (plantillaValida(pl) && reconocePlantilla(pl, texto)) return { lector: { id: pl.id, nombre: pl.nombre, tipo: 'aprendido' }, viaje: aplicarPlantilla(pl, texto) };
    return null;
  }
  return { LECTORES, reconocer, aDocumento, aplicarPlantilla, plantillaValida, CAMPOS_PLANTILLA, fechaISO, nombrePropio };
}
if (typeof module !== 'undefined') module.exports = crearLectores;
