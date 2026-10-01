// Prueba de los lectores por código (demo/lectores.js), sin navegador ni IA.
// Uso:  node pruebas/probar-lectores.js            → compara con los resultados esperados
//       node pruebas/probar-lectores.js --guardar  → (re)escribe los esperados; revísalos antes de guardar el cambio
// Cada caso es pruebas/lectores/<lector>.txt (texto de un PDF real, ANONIMIZADO: nombres y códigos inventados)
// y su <lector>.esperado.json con el lector que debe reconocerlo y lo que debe salir en cada documento.
const fs = require('fs'), path = require('path'), assert = require('assert');
// Como en la app, los códigos de aeropuerto se escriben con el nombre de la ciudad.
const IATA = { SMR: 'Santa Marta', BOG: 'Bogotá', CLO: 'Cali' };
const L = require('../demo/lectores.js')({ ciudadIata: c => IATA[c] || c });
const dir = path.join(__dirname, 'lectores');
const DOCS = ['confirmacion', 'voucher', 'cotizacion', 'itinerario'];
const guardar = process.argv.includes('--guardar');
let fallas = 0;
const caso = (nombre, fn) => { try { fn(); console.log('  ok  ', nombre); } catch (e) { fallas++; console.log('  FALLA', nombre, '\n', e.message.slice(0, 1500)); } };

console.log('Lectores por código:');
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.txt')).sort()) {
  const id = f.replace(/\.txt$/, ''), texto = fs.readFileSync(path.join(dir, f), 'utf8');
  const r = L.reconocer(texto);
  const obtenido = { lector: r?.lector.id || null, documentos: Object.fromEntries(DOCS.map(d => [d, r ? L.aDocumento(r.viaje, d) : null])) };
  const archivo = path.join(dir, id + '.esperado.json');
  if (guardar) { fs.writeFileSync(archivo, JSON.stringify(obtenido, null, 2) + '\n'); console.log('  guardado', archivo); continue; }
  caso(id, () => assert.deepStrictEqual(JSON.parse(JSON.stringify(obtenido)), JSON.parse(fs.readFileSync(archivo, 'utf8'))));
}

console.log('Ningún lector toma un texto que no es suyo:');
caso('texto cualquiera', () => assert.strictEqual(L.reconocer('Hola, te confirmo el viaje a Cartagena del 3 al 6 de noviembre.'), null));

console.log('Plantillas aprendidas (datos, no código):');
const pl = { id: 'aprendido-prueba', nombre: 'Orden de traslado de prueba', servicio: 'traslado',
  huella: ['TRANSPORTES DE PRUEBA S.A.S.', 'ORDEN DE SERVICIO DE TRASLADO', 'www.transportesdeprueba.co'],
  campos: [{ campo: 'titular', patron: 'Pasajero principal:\\s*(.+)' }, { campo: 'traslado.trayecto', patron: 'Servicio:\\s*(.+)' },
    { campo: 'traslado.fecha', patron: 'Fecha del servicio:\\s*(\\S+)' }, { campo: 'traslado.hora', patron: 'Hora de recogida:\\s*(\\S+)' },
    { campo: 'traslado.confirmacion', patron: 'Confirmaci[oó]n:\\s*(\\S+)' }] };
const orden = 'TRANSPORTES DE PRUEBA S.A.S.\nORDEN DE SERVICIO DE TRASLADO\nPasajero principal: ANA MARIA PEREZ\nServicio: Aeropuerto - Hotel\nFecha del servicio: 12/11/2026\nHora de recogida: 14:30\nConfirmacion: TP-123\nwww.transportesdeprueba.co';
caso('se aplica a su formato', () => {
  const r = L.reconocer(orden, [pl]);
  assert.strictEqual(r.lector.tipo, 'aprendido');
  assert.deepStrictEqual(L.aDocumento(r.viaje, 'voucher').traslados, [{ trayecto: 'Aeropuerto - Hotel', fecha: '2026-11-12', hora: '14:30', confirmacion: 'TP-123' }]);
  assert.strictEqual(r.viaje.titular, 'Ana Maria Perez');
});
caso('no se aplica si falta una frase de su huella', () => assert.strictEqual(L.reconocer(orden.replace('ORDEN DE SERVICIO', 'ORDEN'), [pl]), null));
caso('se rechaza una plantilla con campos desconocidos', () => assert.strictEqual(L.plantillaValida({ ...pl, campos: [{ campo: 'eval', patron: '(.+)' }] }), false));
caso('se rechaza una expresión inválida o muy larga', () => {
  assert.strictEqual(L.plantillaValida({ ...pl, campos: [{ campo: 'titular', patron: '(' }] }), false);
  assert.strictEqual(L.plantillaValida({ ...pl, campos: [{ campo: 'titular', patron: 'x'.repeat(301) }] }), false);
});
caso('se rechaza una huella muy corta', () => assert.strictEqual(L.plantillaValida({ ...pl, huella: ['ab', 'cd'] }), false));
caso('los lectores por código van antes que las aprendidas', () => {
  const t = fs.readFileSync(path.join(dir, 'hotel-agencia.txt'), 'utf8');
  assert.strictEqual(L.reconocer(t, [{ ...pl, huella: ['Check-in', 'Titular de la reserva'] }]).lector.tipo, 'codigo');
});

console.log(fallas ? `\n${fallas} prueba(s) fallaron.` : '\nTodo bien.');
process.exit(fallas ? 1 : 0);
