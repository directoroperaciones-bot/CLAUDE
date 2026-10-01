# Pruebas locales de la app

La app depende de `window.claude.use(...)` (base de datos, archivos, Claude, conectores), que solo existe
dentro de claude.ai. Para probarla fuera, se arma una página con **simulaciones** (mocks) delante de la app
y se maneja con Playwright (Chromium ya viene instalado en las sesiones en la nube de Claude Code).

| Archivo | Qué simula |
|---|---|
| `mock.js` | `db` (en memoria, con una foto de ejemplo en `fotos`) y `assets` (subidas de archivos). Base para casi todo. |
| `mockshared.js` | `db` compartida entre varias pestañas: el almacén vive en Node y se expone con `page.exposeFunction('__dbOp', …)`. Sirve para probar «Mis documentos» entre asesoras y el borrado. |
| `mockpub.js` | `mcp` para «Publicar para el grupo»: registra cada llamada en `window.__llamadas`, guarda lo enviado en `window.__ultimo` y falla a propósito con lo que se ponga en `window.__fallos` (por ejemplo `[{code:'bad_request', message:'file upload failed (415)'}]`). |
| `mockmcp.js` | `mcp` mínimo que acepta todo (contenido en base64 o como archivo). |
| `mocksample.js` | `sample` (Claude): devuelve un JSON fijo y guarda el prompt en `window.__prompt`. |
| `mocksample-pdf.js` | `sample` con `limits()` (imágenes incluidas, salvo `window.__sinImagenes = true`): guarda cada llamada en `window.__llamadas` (prompt, nivel, imágenes) y responde `window.__respuesta`. |
| `probar-pdf.js` | Prueba del lector de PDF: PDF de proveedor, e-ticket (datos personales ocultos), escaneado, archivo dañado, varios a la vez, cdnjs caído, sin lector, texto muy largo. Los PDF de prueba no van en el repositorio (ver el encabezado del archivo). |
| `auditar.js` | Auditoría de saltos de hoja: abre cada documento guardado y mide dónde termina el contenido de cada hoja. |

No se incluye la simulación de la base de operación (Google Sheets), porque se armó con filas reales de la
agencia. Para probar «Traer de la base», hay que crear una simulación con datos inventados que respete los
nombres de columnas descritos en `docs/TRASPASO.md` (sección 8).

## Armar una página de prueba

```bash
pruebas/armar.sh /ruta/prueba.html mock.js mocksample.js
```

Copia los mocks a la misma carpeta de la página y deja allí `h2c/` y `jspdf/` (paquetes npm descomprimidos)
para generar PDF sin depender de cdnjs.

## Auditoría de saltos de hoja (hacerla antes de publicar cambios de diseño)

1. Descargar los documentos guardados de la app con la herramienta `ArtifactData` (`action: query`,
   colección `documentos`, `out_dir: <carpeta>/todosdocs`).
2. Armar la página con `mockshared.js`.
3. `NODE_PATH=$(npm root -g) node pruebas/auditar.js <carpeta> <pagina.html> <etiqueta>`.
4. Revisar `audit-<etiqueta>.json` y las imágenes: una hoja que no es la última y termina antes de ~60 % de
   la altura útil indica un salto malo.
