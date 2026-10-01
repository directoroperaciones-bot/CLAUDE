---
name: nuevo-lector
description: Convierte el PDF de un proveedor nuevo (o un formato que la app ya aprendió) en un lector por código permanente de Caminos Documentos, con su prueba. Úsala cuando la usuaria entregue PDFs de un proveedor para que la app los lea sin IA, o cuando pida revisar o pasar a código los formatos aprendidos.
---

# Nuevo lector de PDF de proveedor

La app lee los PDF de proveedores en tres niveles (ver `docs/TRASPASO.md`, sección «Lector de PDF»):
1. **Lectores por código** (`demo/lectores.js`): sin IA, probados en `pruebas/probar-lectores.js`.
2. **Formatos aprendidos**: cuando llega un proveedor nuevo, Claude (capacidad `sample`) lo lee y además arma una
   *plantilla* (frases que lo identifican + expresiones regulares). Se guarda en la colección `lectores` de la base
   de la app solo si, aplicada al mismo PDF, saca lo mismo que leyó Claude. La siguiente vez se lee sin IA.
3. **Claude**, para lo que no reconoce ninguno de los anteriores.

Esta skill sube un proveedor al nivel 1. Un lector por código es más sólido que una plantilla: entiende tablas,
bloques repetidos, textos legales y limpia lo que no debe ver el cliente.

## Reglas que no se rompen
- Los PDF y sus textos tienen datos reales de pasajeros: **nunca** se suben al repositorio sin anonimizar.
- El lector nunca copia datos internos del proveedor (netos, comisiones, formas de pago, «su agente», cuentas)
  ni datos personales (documentos, fechas de nacimiento, teléfonos de pasajeros). Hoteles, aerolíneas y
  operadores de traslados sí se nombran.
- No inventa: lo que el PDF no trae queda vacío para que la asesora lo complete.
- No borres una plantilla aprendida de la base sin el visto bueno de la usuaria.
- No publiques en el enlace de producción sin su visto bueno.

## Pasos
1. **Conseguir el texto como lo ve la app.** Prepara una carpeta de trabajo (fuera del repo) con los PDF,
   `pdfjs-dist@3.11.174` (`npm i`), `mock.js` y `mocksample-pdf.js` de `pruebas/`, y arma la página:
   `pruebas/armar.sh <carpeta>/app.html mock.js mocksample-pdf.js`. Luego:
   `NODE_PATH=$(npm root -g) node pruebas/texto-de-pdf.js <carpeta> <carpeta>/node_modules/pdfjs-dist/build archivo.pdf`.
   Si el formato ya fue aprendido, lee la plantilla con `ArtifactData` (`list`, colección `lectores`, url de la
   app) para ver qué frases y campos usó.
2. **Anonimizar** el texto: cambia nombres, localizadores, números de tiquete, de reserva y de confirmación por
   inventados con la misma forma. Guárdalo como `pruebas/lectores/<id-del-lector>.txt` y verifica con `grep`
   que no quede ningún dato real.
3. **Escribir el lector** en `demo/lectores.js`, como los existentes:
   - `reconoce(t)`: 2 o más frases fijas del formato (encabezados, etiquetas, nombre o web del proveedor).
     Nunca datos que cambian.
   - `leer(t)`: devuelve el viaje neutro `{ pasajeros, titular, referencia, destino, vuelos[], hoteles[],
     traslados[], servicio, programa, condiciones[], instrucciones[] }`. Usa `fechaISO`, `hora`, `nombrePropio`,
     `referenciaCaminos` (une el PDF a su expediente si trae «CA1234»).
   - Agrégalo a `LECTORES`, antes de los genéricos (`programa-tour`).
   - Si hace falta un tipo de servicio que `aDocumento` no cubre, amplíalo ahí, no en el lector.
4. **Probar**: `node pruebas/probar-lectores.js --guardar`, revisa a mano el `.esperado.json` nuevo contra el PDF
   (cada fecha, hora, código y nombre), y luego `node pruebas/probar-lectores.js` debe decir «Todo bien».
   Comprueba también que ningún lector anterior cambió su resultado.
5. **Probar en la app**: `python3 demo/build.py`, sube el PDF real en la página de prueba al documento que
   corresponda y genera el documento: el voucher debe caber en **1 hoja**. Corre `pruebas/probar-pdf.js`.
6. Si el lector reemplaza una plantilla aprendida, pide permiso a la usuaria y entonces bórrala de la base
   (`ArtifactData delete`, colección `lectores`).
7. Commit y push a la rama de trabajo. Cuéntale a la usuaria, en español sencillo, qué proveedor ya se lee sin IA
   y qué debe revisar.
