const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
// Revisión completa del lector de PDF: cada PDF de prueba en cada documento. Comprueba que el formulario se llene
// sin IA, que el documento se genere (completando solo lo que ningún PDF trae: datos de la asesora, valor, condiciones
// de pago…), que los datos clave del PDF lleguen al documento y que no se cuele ningún dato personal o interno.
// Uso: NODE_PATH=$(npm root -g) node pruebas/probar-matriz.js <carpeta> <pdfjs-dist/build/> [pdf1,pdf2]
// <carpeta>: app.html armada con mock.js y mocksample-pdf.js, los PDF (<nombre>.pdf) y claves.json:
//   { "claves": { "<nombre>": ["texto que debe salir", "/expresión/i", …] }, "prohibido": ["/expresión/i", …] }
// claves.json tiene datos reales de los PDF (nombres, códigos): NO va al repositorio.
const fs0 = require('fs'), path0 = require('path');
const T0 = path0.resolve(process.argv[2] || '.');
const aRe = x => (/^\/.*\/[a-z]*$/.test(x) ? new RegExp(x.slice(1, x.lastIndexOf('/')), x.slice(x.lastIndexOf('/') + 1)) : x);
const CONF = JSON.parse(fs0.readFileSync(path0.join(T0, 'claves.json'), 'utf8'));
const CLAVES = Object.fromEntries(Object.entries(CONF.claves).map(([k, v]) => [k, v.map(aRe)]));
const PROHIBIDO = CONF.prohibido.map(aRe);
const T = T0, LIB = path0.resolve(process.argv[3] || 'node_modules/pdfjs-dist/build') + '/';
const DOCS = ['cotizacion', 'confirmacion', 'voucher', 'itinerario', 'itinerario_corto'];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.route(/fonts\./, r => r.abort());
  await p.route(/cdnjs.*pdf\.js\/3\.11\.174\/(.*)/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(LIB + r.request().url().split('/').pop()) }));
  await p.goto('file://' + T + '/app.html'); await p.waitForTimeout(400);
  const res = [];
  for (const pdf of (process.argv[4] ? process.argv[4].split(',') : Object.keys(CLAVES))) for (const doc of DOCS) {
    await p.click('[data-ir="inicio"]'); await p.click(`[data-tipo="${doc}"]`);
    const antes = await p.evaluate(() => window.__llamadas.length);
    await p.setInputFiles('#pdf-archivo', `${T}/${pdf}.pdf`);
    await p.waitForFunction(() => !document.querySelector('#paso-2').hidden, null, { timeout: 30000 });
    const ia = await p.evaluate(() => window.__llamadas.length) - antes;
    const llenos = await p.$$eval('#form-grupos label', ls => ls.map(l => { const el = document.getElementById(l.htmlFor); return el && el.value && !(el.tagName === 'SELECT' && /persona/.test(el.value)) ? l.textContent.trim() : null; }).filter(Boolean));
    const faltan1 = await p.$$eval('#lista-faltan li', xs => xs.map(x => x.textContent));
    // Solo se completa lo que ningún PDF trae: datos de la asesora, valor, condiciones de pago, estado de pago, código y proveedor faltante.
    await p.evaluate(() => {
      const set = (re, v) => [...document.querySelectorAll('#form-grupos label')].filter(l => re.test(l.textContent)).forEach(l => { const el = document.getElementById(l.htmlFor); if (el && !el.value) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } });
      set(/^Tu nombre/, 'Asesora Caminos'); set(/^Tu correo/, 'asesora@agenciacaminos.com.co'); set(/^Tu teléfono/, '300 000 0000');
      set(/^Condiciones de pago/, 'Abono del 40 % para reservar.'); set(/^Código de reserva|^Código$|^Código de voucher/, 'CA9999');
      set(/^Proveedor u operador/, 'Operador local'); set(/^Título del viaje|^Título$/, 'Viaje de prueba'); set(/^Destino/, 'Destino de prueba');
      set(/^Llegada$/, '2026-11-10'); set(/^Salida$/, '2026-11-16'); set(/^Fecha de ida/, '2026-11-10'); set(/^Fecha de regreso/, '2026-11-16');
      set(/^Inicio|^Fecha de inicio/, '2026-11-10'); set(/^Fin|^Fecha de fin/, '2026-11-16'); set(/^Titular/, 'Titular de prueba'); set(/^Pasajero/, 'Pasajero de prueba'); set(/^Válido desde/, '2026-11-10'); set(/^Válido hasta/, '2026-11-16');
      document.querySelectorAll('#form-grupos input[type=date]').forEach(el => { if (!el.value) { el.value = '2026-11-10'; el.dispatchEvent(new Event('input', { bubbles: true })); } });
      [...document.querySelectorAll('#form-grupos label')].filter(l => /^Confirmación$/.test(l.textContent.trim())).forEach(l => { const el = document.getElementById(l.htmlFor); if (el && !el.value) { el.value = 'PRUEBA-1'; el.dispatchEvent(new Event('input', { bubbles: true })); } });
      document.querySelectorAll('#form-grupos input[placeholder="$0"]').forEach(el => { if (!el.value) { el.value = '$1.000.000'; el.dispatchEvent(new Event('input', { bubbles: true })); } });
      document.querySelectorAll('#form-grupos select').forEach(s => { if (!s.value) { const o = [...s.options].find(o => /Abono recibido|Pendiente/.test(o.textContent)); if (o) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); } } });
    });
    await p.click('#btn-generar');
    const r = await Promise.race([
      p.waitForFunction(() => /hoja/.test(document.querySelector('#prev-meta')?.textContent || '') && !document.querySelector('#paso-3').hidden, null, { timeout: 45000 }).then(() => 'ok'),
      p.waitForSelector('#aviso-faltan:not([hidden])', { timeout: 45000 }).then(() => 'faltan')]).catch(() => 'tiempo');
    let fila = { pdf, doc, ia, llenos: llenos.length, faltan1, gen: r };
    if (r === 'ok') {
      await p.waitForTimeout(800);
      const texto = await p.$eval('#doc-frame', f => f.contentDocument.body.innerText);
      fila.hojas = (await p.textContent('#prev-meta')).match(/\d+ hojas?/)?.[0];
      fila.faltanEnDoc = CLAVES[pdf].filter(k => !(k instanceof RegExp ? k : new RegExp(k)).test(texto)).map(String);
      fila.prohibido = PROHIBIDO.filter(re => re.test(texto)).map(String);
      fs.writeFileSync(`${T}/m-${pdf}-${doc}.txt`, texto);
    } else fila.faltan2 = await p.$$eval('#lista-faltan li', xs => xs.map(x => x.textContent));
    res.push(fila);
    console.log(JSON.stringify(fila));
  }
  fs.writeFileSync(T + '/matriz.json', JSON.stringify(res, null, 1));
  await b.close();
})();
