// Saca el texto de uno o varios PDF exactamente como lo ve la app (mismo pdf.js, mismo orden y datos personales
// ya ocultos), para escribir o revisar un lector por código.
// Uso: NODE_PATH=$(npm root -g) node pruebas/texto-de-pdf.js <carpeta> <pdfjs-dist/build/> archivo1.pdf [archivo2.pdf …]
// <carpeta>: contiene app.html armada con `pruebas/armar.sh <carpeta>/app.html mock.js mocksample-pdf.js` y los PDF.
// Escribe <carpeta>/texto-<archivo>.txt. Esos textos tienen datos reales: NO van al repositorio sin anonimizar.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const T = path.resolve(process.argv[2] || '.'), LIB = path.resolve(process.argv[3] || 'node_modules/pdfjs-dist/build') + '/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route(/fonts\./, r => r.abort());
  await p.route(/(cdnjs|jsdelivr).*(pdf\.min\.js|pdf\.worker\.min\.js)$/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(LIB + r.request().url().split('/').pop()) }));
  await p.goto('file://' + T + '/app.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { window.__respuesta = {}; });
  for (const f of process.argv.slice(4)) {
    await p.click('[data-ir="inicio"]'); await p.click('[data-tipo="voucher"]');
    await p.setInputFiles('#pdf-archivo', path.join(T, f));
    await p.waitForFunction(() => !document.querySelector('#paso-2').hidden || /error/.test(document.querySelector('#estado-pdf').className), null, { timeout: 30000 });
    const salida = path.join(T, 'texto-' + f.replace(/\.pdf$/i, '.txt'));
    fs.writeFileSync(salida, await p.inputValue('#pegado'));
    console.log('Listo:', salida);
  }
  await b.close();
})();
