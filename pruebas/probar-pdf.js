const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
// Uso: NODE_PATH=$(npm root -g) node pruebas/probar-pdf.js <carpeta> <pdfjs-dist/build/>
// <carpeta>: app.html armada con `pruebas/armar.sh <carpeta>/app.html mock.js mocksample-pdf.js` y los PDF de prueba
// tour.pdf (programa de un operador), eticket.pdf (e-ticket con datos de pasajeros), escaneado.pdf (sin texto) y
// falso.pdf (no es PDF). Los PDF NO se guardan en el repositorio: tienen datos de proveedores y de pasajeros.
// <pdfjs-dist/build/>: carpeta build de `npm i pdfjs-dist@3.11.174` (la red puede bloquear cdnjs y jsDelivr).
const T = path.resolve(process.argv[2] || '.'), LIB = path.resolve(process.argv[3] || 'node_modules/pdfjs-dist/build') + '/';
const servir = (route, f) => route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(LIB + f) });
(async () => {
  const b = await chromium.launch();
  async function abrir({ cdnjs = true, jsdelivr = true } = {}) {
    const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
    const pedidos = [];
    p.on('pageerror', e => console.log('  ERROR PAGINA:', e.message));
    await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await p.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\/3\.11\.174\/(.*)/, r => { pedidos.push(r.request().url()); return cdnjs ? servir(r, r.request().url().split('/').pop()) : r.abort(); });
    await p.route(/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@3\.11\.174\/build\/(.*)/, r => { pedidos.push(r.request().url()); return jsdelivr ? servir(r, r.request().url().split('/').pop()) : r.abort(); });
    await p.goto('file://' + T + '/app.html');
    await p.waitForTimeout(500);
    p.pedidos = pedidos;
    return p;
  }
  const esperar = p => p.waitForFunction(() => !document.querySelector('#paso-2').hidden || /error/.test(document.querySelector('#estado-pdf').className), null, { timeout: 30000 });
  const est = p => p.$eval('#estado-pdf', e => e.className + ' :: ' + e.textContent);

  // 1) Cotización con el PDF del tour
  let p = await abrir();
  await p.evaluate(() => { window.__respuesta = { titulo_destino: 'La Paz y Uyuni, siete días', destino: 'La Paz y Uyuni, Bolivia', noches: '6 noches', tarifas: [{ hotel: 'Tour La Paz + Uyuni', acomodacion: 'Sencilla', valor: 'USD 949' }, { hotel: 'Tour La Paz + Uyuni', acomodacion: 'Doble', valor: 'USD 849' }], incluye: ['City tour La Paz'], itinerario: [{ servicio: 'Llegada a La Paz', fecha: '', detalle: 'City tour. Alojamiento: La Paz' }] }; });
  await p.click('[data-tipo="cotizacion"]');
  await p.screenshot({ path: T + '/1-paso1.png' });
  console.log('ayuda:', await p.textContent('#pdf-ayuda'));
  await p.setInputFiles('#pdf-archivo', T + '/tour.pdf');
  await esperar(p);
  let ll = await p.evaluate(() => window.__llamadas);
  console.log('1) estado:', await est(p), '| llamadas', ll.length, 'imgs', ll[0]?.imagenes.length, '| pedidos', p.pedidos.map(u => u.split('/').slice(2,3)+'/'+u.split('/').pop()));
  console.log('   prompt bytes', Buffer.byteLength(ll[0].prompt), '| tiene USD $949', ll[0].prompt.includes('USD $949'), '| DIA 07', ll[0].prompt.includes('DIA 07'), '| HOTEL NAIRA', ll[0].prompt.includes('NAIRA'));
  console.log('   tarifas en formulario:', await p.$$eval('#form-grupos input', xs => xs.map(x => x.value).filter(v => /USD/.test(v))));
  fs.writeFileSync(T + '/texto-tour.txt', await p.evaluate(() => document.querySelector('#pegado').value));
  await p.screenshot({ path: T + '/2-paso2.png' });
  await p.close();

  // 2) Confirmación con el e-ticket, cdnjs caído → jsDelivr
  p = await abrir({ cdnjs: false });
  await p.click('[data-tipo="confirmacion"]');
  await p.setInputFiles('#pdf-archivo', T + '/eticket.pdf');
  await esperar(p);
  ll = await p.evaluate(() => window.__llamadas);
  console.log('2) estado:', await est(p), '| pedidos', p.pedidos.map(u => u.split('/')[2]+'/'+u.split('/').pop()));
  fs.writeFileSync(T + '/texto-eticket.txt', await p.evaluate(() => document.querySelector('#pegado').value));
  console.log('   sin cedula/nacimiento/tel:', !/80101979|1082862212|1984|1986|3176479703/.test(ll[0].prompt), '| reglas privacidad en prompt:', ll[0].prompt.includes('nunca números de documento'), '| AJKAVC', ll[0].prompt.includes('AJKAVC'));
  await p.close();

  // 3) Voucher con PDF escaneado → imágenes
  p = await abrir();
  await p.click('[data-tipo="voucher"]');
  await p.setInputFiles('#pdf-archivo', T + '/escaneado.pdf');
  await esperar(p);
  ll = await p.evaluate(() => window.__llamadas);
  console.log('3) estado:', await est(p), '| imagenes', JSON.stringify(ll[0]?.imagenes), '| texto', JSON.stringify(await p.inputValue('#pegado')).slice(0, 140));
  await p.close();

  // 4) Archivo dañado y archivo que no es PDF
  p = await abrir();
  await p.click('[data-tipo="itinerario"]');
  console.log('ayuda itinerario:', await p.textContent('#pdf-ayuda'));
  await p.setInputFiles('#pdf-archivo', T + '/falso.pdf');
  await p.waitForFunction(() => /error/.test(document.querySelector('#estado-pdf').className));
  console.log('4a)', await est(p));
  await p.setInputFiles('#pdf-archivo', { name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('hola') });
  await p.waitForTimeout(300);
  console.log('4b)', await est(p), '| llamadas', (await p.evaluate(() => window.__llamadas)).length);
  await p.close();

  // 5) Dos PDF a la vez en confirmación
  p = await abrir();
  await p.click('[data-tipo="confirmacion"]');
  await p.setInputFiles('#pdf-archivo', [T + '/eticket.pdf', T + '/tour.pdf']);
  await esperar(p);
  ll = await p.evaluate(() => window.__llamadas);
  console.log('5) estado:', await est(p), '| llamadas', ll.length, '| ambos', ll[0].prompt.includes('AJKAVC') && ll[0].prompt.includes('UYUNI'));
  await p.close();

  // 6) Sin imágenes disponibles + escaneado → mensaje; ambos CDN caídos → mensaje
  p = await abrir();
  await p.evaluate(() => { window.__sinImagenes = true; });
  await p.click('[data-tipo="voucher"]');
  await p.setInputFiles('#pdf-archivo', T + '/escaneado.pdf');
  await p.waitForFunction(() => /error/.test(document.querySelector('#estado-pdf').className), null, { timeout: 30000 });
  console.log('6a)', await est(p));
  await p.close();
  p = await abrir({ cdnjs: false, jsdelivr: false });
  await p.click('[data-tipo="voucher"]');
  await p.setInputFiles('#pdf-archivo', T + '/eticket.pdf');
  await p.waitForFunction(() => /error/.test(document.querySelector('#estado-pdf').className), null, { timeout: 30000 });
  console.log('6b)', await est(p));
  await p.close();

  // 7) Texto enorme: se recorta
  p = await abrir();
  await p.click('[data-tipo="cotizacion"]');
  await p.fill('#pegado', 'Día de tour en Uyuni con almuerzo. '.repeat(4000));
  await p.click('#btn-ordenar');
  await p.waitForFunction(() => !document.querySelector('#paso-2').hidden);
  ll = await p.evaluate(() => window.__llamadas);
  console.log('7) bytes prompt', Buffer.byteLength(ll[0].prompt), '| aviso:', await p.textContent('#estado-releer'), '| releer visible', await p.isVisible('#releer'));
  await p.close();
  await b.close();
})();
