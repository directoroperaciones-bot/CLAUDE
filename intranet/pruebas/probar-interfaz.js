// Prueba la intranet completa contra el Supabase simulado (pruebas/demo.html) y toma capturas.
// Uso (desde intranet/):  node pruebas/probar-interfaz.js [carpeta-de-capturas]
// Cualquier error de JavaScript en la página hace fallar la prueba.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DEMO = 'file://' + path.resolve(__dirname, 'demo.html');
const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'capturas'));
fs.mkdirSync(OUT, { recursive: true });

const errores = [];
let ultimoAviso = '';
const pasos = [];
const ok = (m) => { pasos.push('OK     · ' + m); console.log('OK     · ' + m); };
const falla = (m) => { pasos.push('FALLA  · ' + m); console.log('FALLA  · ' + m); errores.push(m); };
const esperar = (cond, m) => (cond ? ok(m) : falla(m + (ultimoAviso ? ` [aviso: ${ultimoAviso}]` : '')));

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true, locale: 'es-CO', timezoneId: 'America/Bogota' });
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => falla('Error de JavaScript: ' + e.message));
  pg.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) falla('Consola: ' + m.text()); });
  pg.on('dialog', (d) => d.accept());

  const foto = async (n, full = true) => pg.screenshot({ path: path.join(OUT, n + '.png'), fullPage: full });
  // Espera el PRÓXIMO aviso (no el que ya estaba en pantalla) y devuelve su texto.
  const limpiarAviso = () => pg.evaluate(() => { const t = document.getElementById('toast'); if (t) { t.className = 'toast'; t.textContent = ''; } });
  const toast = async () => {
    await pg.waitForFunction(() => { const t = document.getElementById('toast'); return t && t.classList.contains('show') && t.textContent; }, null, { timeout: 5000 }).catch(() => {});
    const txt = (await pg.textContent('#toast').catch(() => '')) || '';
    ultimoAviso = txt;
    await limpiarAviso();
    return txt;
  };
  const quieto = () => pg.waitForTimeout(250);
  // Antes de cada acción se borra el aviso anterior, para leer solo el que produce esa acción.
  for (const m of ['click', 'press', 'selectOption']) { const orig = pg[m].bind(pg); pg[m] = async (...a) => { await limpiarAviso(); return orig(...a); }; }
  async function entrar(u) {
    await pg.waitForSelector('#fLogin');
    await pg.fill('#lCorreo', u + '@caminos.simulado');
    await pg.fill('#lClave', 'clave1234');
    await pg.click('#fLogin button[type=submit]');
    await quieto();
  }
  async function salir() {
    await pg.click('.menu > .avatar');
    await pg.click('.menu-pop [data-accion=salir]');
    await pg.waitForSelector('#fLogin');
  }
  const ir = async (v) => { await pg.click(`.tabs [data-view=${v}]`); await quieto(); };
  const pestañas = async () => pg.$$eval('.tabs button', (bs) => bs.map((x) => x.dataset.view));

  await pg.goto(DEMO);
  await pg.evaluate(() => { try { sessionStorage.clear(); } catch (e) { /* nada */ } });
  await pg.reload();

  // --- Acceso: error conserva el correo ---
  await pg.waitForSelector('#fLogin');
  await foto('01-login', false);
  await pg.fill('#lCorreo', 'laura@caminos.simulado');
  await pg.fill('#lClave', 'equivocada');
  await pg.click('#fLogin button[type=submit]');
  await pg.waitForSelector('.err');
  esperar((await pg.inputValue('#lCorreo')) === 'laura@caminos.simulado', 'Tras un error el login conserva el correo');
  esperar(await pg.evaluate(() => document.activeElement.id === 'lClave'), 'Tras un error el foco queda en la contraseña');
  esperar((await pg.textContent('.err')).includes('Correo o contraseña incorrectos'), 'Mensaje de error traducido');

  // --- Primer ingreso de la gerente: contraseña + datos ---
  await pg.fill('#lClave', 'clave1234');
  await pg.click('#fLogin button[type=submit]');
  await pg.waitForSelector('#fClave');
  await foto('02-primer-ingreso', false);
  await pg.fill('#c1', 'nueva12345'); await pg.fill('#c2', 'otra12345');
  await pg.click('#fClave button[type=submit]');
  esperar((await pg.textContent('.err')).includes('no coinciden'), 'Contraseñas distintas se rechazan');
  await pg.fill('#c1', 'nueva12345'); await pg.fill('#c2', 'nueva12345');
  await pg.click('#fClave button[type=submit]');
  await pg.waitForSelector('[data-accion=aceptarDatos]');
  await foto('03-datos', false);
  await pg.click('[data-accion=aceptarDatos]');
  await pg.waitForSelector('.pass');
  const tabsGer = await pestañas();
  esperar(['inicio', 'malla', 'comunicados', 'asistencia', 'informes', 'solicitudes', 'equipo'].every((t) => tabsGer.includes(t)), 'La gerencia-admin ve todas las pestañas: ' + tabsGer.join(', '));
  await foto('04-inicio-gerencia');

  // --- Malla y turnos ---
  await ir('malla');
  esperar(await pg.$('select.shift') !== null, 'La gerencia puede editar la malla');
  const sel = await pg.$('select.shift');
  const opciones = await sel.$$eval('option', (os) => os.map((o) => o.value).filter(Boolean));
  await sel.selectOption(opciones[1]);
  esperar((await toast()).includes('Guardado'), 'Cambiar un turno en la malla guarda');
  await pg.click('[data-semana="7"]'); await quieto();
  await pg.click('[data-accion=copiarSemana]');
  esperar(/copiad|no tiene turnos/.test(await toast()), 'Copiar la semana anterior responde');
  await pg.click('[data-semana="-7"]'); await quieto();
  await pg.fill('input[data-turno$="|nombre"][value="Mañana"]', 'Mañana oficina');
  await pg.press('input[value="Mañana"][data-turno$="|nombre"], input[data-turno$="|nombre"]:focus', 'Tab');
  esperar((await toast()).includes('Guardado'), 'Editar el nombre de un turno guarda');
  await foto('05-malla');

  // --- Asistencia ---
  await ir('asistencia');
  esperar((await pg.$$('table.asis tbody tr')).length >= 5, 'Asistencia lista a las personas');
  await foto('06-asistencia');

  // --- Informes ---
  await ir('informes');
  await pg.waitForSelector('.kpi.hero');
  const barras = await pg.$$('.chart .barra');
  if (barras.length) { await barras[0].hover(); await quieto(); esperar(await pg.isVisible('#tip'), 'El tooltip de la gráfica aparece'); }
  const rank = await pg.$('.rank button');
  if (rank) { await rank.click(); await quieto(); esperar(await pg.$('.detail') !== null, 'Tocar el ranking abre el detalle por persona'); }
  await pg.click('[data-orden="minTarde"]'); await quieto();
  const [descarga] = await Promise.all([pg.waitForEvent('download'), pg.click('[data-accion=exportar]')]);
  const csvRuta = path.join(OUT, descarga.suggestedFilename()); await descarga.saveAs(csvRuta);
  const csv = fs.readFileSync(csvRuta, 'utf8');
  esperar(csv.charCodeAt(0) === 0xFEFF && csv.includes(';') && csv.includes('\r\n') && /^asistencia-\d{4}-\d{2}/.test(descarga.suggestedFilename()), 'CSV con BOM, punto y coma y \\r\\n: ' + descarga.suggestedFilename());
  // Verificación manual de un número: tardes totales = suma de la columna
  const tardesCsv = csv.trim().split('\r\n').slice(1).reduce((s, l) => s + +l.split(';')[5], 0);
  const tardesKpi = +(await pg.textContent('.kpis.six .kpi:nth-child(2) > b'));
  esperar(tardesCsv === tardesKpi, `Llegadas tarde del indicador (${tardesKpi}) = suma del CSV (${tardesCsv})`);
  await pg.selectOption('#iMes', { index: 1 }); await quieto();
  await foto('07-informes');

  // --- Solicitudes (gerencia) ---
  await ir('solicitudes');
  await pg.waitForSelector('.modcard');
  esperar(await pg.$('[data-revisar]') !== null, 'La gerencia ve solicitudes por aprobar');
  await foto('08-solicitudes-gerencia');

  // --- Comunicados: publicar con imagen ---
  await ir('comunicados');
  await pg.fill('#cTitulo', 'Prueba automática de comunicado');
  await pg.fill('#cCuerpo', 'Línea uno\nLínea dos con tilde: operación');
  await pg.selectOption('#cPara', 'todos');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await pg.setInputFiles('#cImgs', { name: 'foto.png', mimeType: 'image/png', buffer: png });
  esperar((await pg.$$('#cPrev .thumb')).length === 1, 'La imagen elegida aparece en la vista previa');
  await pg.click('#fCom button[type=submit]');
  esperar((await toast()).includes('publicado'), 'Publicar comunicado con imagen');
  await pg.fill('#qCom', 'operacion');
  await quieto();
  esperar((await pg.$$('#comLista mark')).length > 0, 'El buscador ignora tildes y resalta la coincidencia');
  esperar(await pg.evaluate(() => document.activeElement.id === 'qCom'), 'El buscador no pierde el foco');
  await pg.fill('#qCom', '');
  await foto('09-comunicados-gerencia');

  // --- Equipo: crear cuenta y restablecer ---
  await ir('equipo');
  await pg.fill('#eNombre', 'Persona Nueva Prueba');
  await pg.fill('#eCorreo', 'nueva@caminos.simulado');
  await pg.click('#fCuenta button[type=submit]');
  await pg.waitForSelector('.clave');
  const temporal = (await pg.textContent('.clave code')).trim();
  esperar(temporal.length === 10 && !/[0O1lI]/.test(temporal), 'Contraseña temporal de 10 caracteres sin confusos: ' + temporal);
  await pg.fill('#eFiltro', 'nueva'); await quieto();
  esperar((await pg.$$('#eTabla tbody tr')).length === 1, 'El buscador de equipo filtra');
  await foto('10-equipo');
  await pg.click('[data-accion=cerrarClave]');

  // --- Guía ---
  await pg.click('.menu > .avatar');
  await pg.click('.menu-pop [data-view=guia]');
  await quieto();
  esperar((await pg.$$('.guia-texto section')).length === 7, 'La gerencia-admin ve las 7 secciones de la guía');
  await foto('11-guia');
  await salir();

  // --- Cuenta nueva: primer ingreso con la temporal ---
  await pg.fill('#lCorreo', 'nueva@caminos.simulado'); await pg.fill('#lClave', temporal);
  await pg.click('#fLogin button[type=submit]');
  await pg.waitForSelector('#fClave');
  ok('La cuenta nueva entra con la contraseña temporal y debe cambiarla');
  await pg.click('[data-accion=salir]');
  await pg.waitForSelector('#fLogin');

  // --- Colaborador: marcar, confirmar comunicado, pedir solicitud ---
  await entrar('camilo');
  await pg.waitForSelector('.pass');
  const tabsCol = await pestañas();
  esperar(!tabsCol.includes('asistencia') && !tabsCol.includes('informes') && !tabsCol.includes('equipo'), 'El colaborador no ve Asistencia, Informes ni Equipo: ' + tabsCol.join(', '));
  esperar(await pg.$('.alerta') !== null, 'Inicio muestra la franja de comunicados pendientes');
  await foto('12-inicio-colaborador');
  let marcadas = 0;
  while (await pg.$('.mark-btn')) {
    await pg.click('.mark-btn'); const t = await toast(); if (!t.includes('registrada')) { falla('Marcar: ' + t); break; }
    marcadas++; await pg.waitForTimeout(150);
  }
  esperar(marcadas >= 2 && await pg.$('.mark-done') !== null, `Flujo completo de marcas (${marcadas} pasos) termina en «Jornada completa»`);
  await foto('13-jornada-completa', false);
  await pg.click('[data-accion=verPendientes]'); await quieto();
  const antes = (await pg.$$('[data-leer]')).length;
  await pg.click('[data-leer]');
  await toast();
  esperar((await pg.$$('[data-leer]')).length === antes - 1, 'El destinatario confirma la lectura');
  await ir('solicitudes');
  await pg.click('[data-soltipo=incapacidad]');
  await pg.fill('#sMotivo', 'Prueba de incapacidad');
  await pg.setInputFiles('#sArch', { name: 'soporte.png', mimeType: 'image/png', buffer: png });
  await pg.click('#fSol button[type=submit]');
  esperar((await toast()).includes('enviada'), 'El colaborador envía una solicitud con soporte');
  esperar(await pg.$('[data-cancelarsol]') !== null, 'La solicitud pendiente se puede cancelar');
  await foto('14-solicitudes-colaborador');
  await salir();

  // --- Revisor de incapacidades aprueba ---
  await entrar('julian');
  await pg.waitForSelector('.pass');
  await ir('solicitudes');
  const aprob = await pg.$$('[data-revisar$="|1"]');
  esperar(aprob.length >= 1, 'Contabilidad ve incapacidades por aprobar');
  const textoVac = await pg.textContent('main');
  esperar(!textoVac.includes('Cita médica'), 'Contabilidad no ve permisos (no es su tipo)');
  await pg.fill('[id^=rc-]', 'Recibida, que te mejores');
  await limpiarAviso(); await aprob[0].click();
  esperar((await toast()).includes('aprobada'), 'Contabilidad aprueba la incapacidad');
  await foto('15-solicitudes-revisor');
  await salir();

  // --- Directora: ve su sede, publica y sigue confirmaciones ---
  await entrar('andrea');
  await pg.waitForSelector('.pass');
  const tabsDir = await pestañas();
  esperar(tabsDir.includes('asistencia') && tabsDir.includes('informes') && !tabsDir.includes('equipo'), 'La directora ve Asistencia e Informes pero no Equipo');
  await ir('comunicados');
  esperar((await pg.$$('.lect')).length > 0, 'La directora ve quién confirmó lectura');
  await ir('informes');
  esperar(await pg.$eval('#iSede', (s) => s.disabled), 'La directora tiene el selector de sede bloqueado');
  await salir();

  // --- Celular (390 px): nada se desborda ---
  await pg.setViewportSize({ width: 390, height: 844 });
  await entrar('andrea');
  await pg.waitForSelector('.pass');
  for (const v of ['inicio', 'malla', 'comunicados', 'asistencia', 'informes', 'solicitudes']) {
    if (v !== 'inicio') await ir(v);
    const ancho = await pg.evaluate(() => document.documentElement.scrollWidth);
    esperar(ancho <= 390, `Celular: ${v} sin desbordes horizontales (ancho ${ancho})`);
    await foto('cel-' + v);
  }
  await salir();
  await foto('cel-login');

  await b.close();
  fs.writeFileSync(path.join(OUT, 'resultado.txt'), pasos.join('\n') + '\n');
  console.log(`\nResultado: ${pasos.length - errores.length} correctas, ${errores.length} fallas. Capturas en ${OUT}`);
  process.exit(errores.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
