# Traspaso completo — App «Caminos Documentos»

> **Para Claude (nueva sesión de Claude Code):** este documento es el punto de partida. Contiene el estado
> real del proyecto al 1 de octubre de 2026: qué existe, dónde vive, cómo está construido, qué reglas no se
> pueden romper, qué falló y cómo se arregló, y qué queda pendiente. Léelo completo antes de tocar código.
> Después lee, en este orden: `demo/LEEME.md`, `demo/app.js` (por secciones, ver §4.3), `demo/interactivo.js`,
> `demo/build.py`, `pruebas/LEEME.md` y, si vas a replicar para otra agencia, `docs/MANUAL-REPLICA.md`.
>
> La usuaria (directora de operaciones de la agencia) habla español de Colombia, no es programadora y
> prefiere resultados probados a explicaciones técnicas. Respóndele siempre en español, en frases cortas,
> sin jerga, y muéstrale capturas o el documento resultante cuando cambies algo visible.

---

## 0. Prompt sugerido para abrir la nueva sesión

Copia y pega esto como primer mensaje de la nueva sesión (en el mismo repositorio
`directoroperaciones-bot/CLAUDE`):

```
Vamos a hacer una versión mejorada de la app «Caminos Documentos». Lee primero docs/TRASPASO.md
completo; ahí está todo lo construido, las reglas que nunca se rompen y lo pendiente. Después:
1) confírmame en pocas líneas que entendiste el proyecto y las reglas de seguridad;
2) propón un plan de mejoras por etapas, empezando por lo que más impacto tenga para las asesoras;
3) no publiques nada en el enlace de producción sin mi visto bueno.
Trabaja en una rama nueva a partir de claude/design-system-gtf3k4.
```

---

## 1. Qué es el proyecto

**Caminos** es una agencia de viajes colombiana (agenciacaminos.com.co) especializada en **turismo
religioso** (peregrinaciones a Fátima, Lourdes, Tierra Santa, santuarios en Colombia como Las Lajas, etc.)
y viajes nacionales e internacionales.

**Caminos Documentos** es una app web que usan las **asesoras de ventas** para generar, con la imagen de
la agencia, los documentos que reciben los clientes:

| Documento | Para qué | Salida |
|---|---|---|
| **Cotización** | Propuesta con destino, fechas, qué incluye, tarifas por opción, itinerario día a día y condiciones | PDF tamaño carta |
| **Confirmación** | Reserva confirmada: pasajeros, vuelos con localizador, hoteles, traslados, pagos y su estado | PDF |
| **Voucher** | Comprobante de un servicio (hotel, tiquete aéreo o traslado) para presentar al proveedor | PDF (1 hoja, sin políticas) |
| **Itinerario** | Programa completo del viaje: día a día, vuelos, hoteles, recomendaciones, mapa | PDF + **versión interactiva** (HTML para el celular) |
| **Itinerario corto** | Pasadías y viajes de 1 a 4 días, normalmente terrestres | PDF (2 hojas) + versión interactiva |

Cómo trabaja una asesora:
1. Elige el documento.
2. **Paso 1 — Información:** pega el texto que tenga (correo del proveedor, Word, reserva del sistema) y
   pulsa «Ordenar la información» (Claude lo convierte en campos), o **trae la venta de la base** con su
   consecutivo (ej. `2900` o `CA2900`), o llena a mano.
3. **Paso 2 — Revisar los datos:** formulario completo; lo que falta queda marcado en rojo.
4. **Paso 3 — Documento listo:** vista previa por hojas, **Descargar PDF**; en itinerarios además
   **Descargar HTML** y **Publicar para el grupo** (enlace web para el grupo de WhatsApp).
5. Desde un documento se pasa al siguiente: cotización → confirmación → voucher / itinerario.

---

## 2. Dónde vive todo

### 2.1 Enlaces

| Qué | Dónde |
|---|---|
| **App en producción** (artifact de claude.ai, privado de la cuenta) | https://claude.ai/artifact/WPzKkP7MwdKBaGrrGVpZ1Y — versión 37 al cierre |
| Guía en video (5 videos, uno por documento + guía de uso) | https://claude.ai/artifact/KkjQw9pAN5qGzSf7KZqfk1 |
| Documentación técnica (Claude Doc, 21 secciones, 2 diagramas) | https://claude.ai/code/artifact/0390c787-3892-431f-8991-fe5f0f16be07 |
| Demo antigua (ya no se usa) | https://claude.ai/artifact/WnT9mYEj2DypVyhDKdBN8Z |
| Sitio público de itinerarios (GitHub Pages) | https://directoroperaciones-bot.github.io/itinerarios/ |

> El enlace de la app **antes era el «Banco de fotos Caminos»**. Se reemplazó por la app conservando la base
> de datos y los archivos (las fotos siguen en la colección `fotos`). La página original del banco está
> guardada en `original/banco-de-fotos/index.html`.

### 2.2 Repositorios (GitHub, cuenta `directoroperaciones-bot`)

| Repositorio | Uso |
|---|---|
| `directoroperaciones-bot/CLAUDE` | **Este.** Código de la app. Rama de trabajo: `claude/design-system-gtf3k4` (41 commits). |
| `directoroperaciones-bot/itinerarios` | **Público**, con GitHub Pages. Aquí la app sube cada itinerario publicado (`<CODIGO>-<6 letras>.html`), más `index.html` y `sw.js` (copias de `demo/publicar/`). |
| `directoroperaciones-bot/caminos-fotos-privado` | Privado y vacío; se creó para fotos y no se usó. La usuaria puede borrarlo. |

**Rama `main`:** se creó a partir de la rama de trabajo, pero **está atrasada** (le faltan los commits
desde `6281137`). Un intento de actualizarla quedó bloqueado por falta de revisión. Hay que pedirle a la
usuaria que autorice un merge (o un PR) de `claude/design-system-gtf3k4` a `main`.

### 2.3 Conexiones (conectores de claude.ai de la usuaria)

- **Composio** (conector MCP en claude.ai). La app solo usa una herramienta: `COMPOSIO_MULTI_EXECUTE_TOOL`,
  y a través de ella dos acciones:
  - `GOOGLESHEETS_BATCH_GET` → leer la base de operación (**solo lectura**).
  - `GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS` → publicar itinerarios en el repo `itinerarios`. Actualiza un
    archivo existente **sin** necesitar el `sha` (verificado).
- Composio tiene conectadas la cuenta de Google con acceso a la hoja de la base y la cuenta de GitHub.
- **Google Drive** de la agencia: carpeta «FOTOS VIAJES» (fotos propias; se usó en **solo lectura** para
  cargar 15 fotos al banco).
- **Instagram** de la agencia: **no** se pudo leer (error 429 y sin credenciales). Pendiente: la usuaria
  dijo que las fotos son propias pero no tiene las claves ahora.

### 2.4 Datos de identificación

- Hoja de la base de operación: «NO BORRAR - DATOS HERRAMIETA», id `1k32N3e4r5jS0iWvyPWsUGr6XLY7homB5sEhJIj9Bjbg`
  (es la base de AppSheet de la agencia).
- Correo de la usuaria: directoroperaciones@agenciacaminos.com.co.

---

## 3. Reglas que nunca se rompen

Estas reglas las puso la usuaria (citas textuales) o salen de incidentes reales. Están por encima de
cualquier mejora.

1. **La base de operación es SOLO LECTURA.** «ojo solo lectura y sacar información mas nunca editar nada
   de la base, es muy delicado esto!!!» · «no vayas a borrar nada, solo en modo lectura».
   - En el código, `lecturaBase()` es la **única** función que toca la base y solo puede llamar a
     `GOOGLESHEETS_BATCH_GET`. No debe existir ninguna llamada de escritura a la hoja. Tampoco escribas en
     ella desde la sesión de Claude Code (ni con Composio ni con otra herramienta).
   - Si usas un navegador (Claude in Chrome) para mirar AppSheet: «REGLA ABSOLUTA: SOLO LECTURA. NO
     MODIFIQUES NADA.»
2. **Nunca mostrar valores internos en un documento para el cliente.** «ojo, no pueden mostrarse valores
   internos en un documento de estos, solo valores totales». Nada de netos, markups, costos de proveedor,
   comisiones ni nombres de mayoristas, consolidadores u operadores. Solo el **valor final** de venta. Los
   proveedores solo se nombran si son **hoteles** (categoría «Hotel…» en PROVEEDORES).
3. **Datos personales mínimos.** De PASAJEROS solo se leen **id y nombre** (columnas A–C): nada de
   documentos de identidad, teléfonos ni fechas de nacimiento. La versión publicada para el grupo **no
   lleva el nombre del pasajero**.
4. **No inventar.** Claude no inventa cifras, fechas, códigos, hoteles, vuelos, actividades ni condiciones.
   Lo que no venga en la información queda vacío y marcado para que la asesora lo complete.
5. **Fotos con personas nunca pasan por un repositorio público.** Hubo un incidente: hojas de contacto de
   fotos de Drive (con personas) quedaron unos 2 minutos en una rama de un repo público antes de borrarse.
   Solo paisajes sin personas y fotos de dominio público o CC0 pueden pasar por ahí, y la rama temporal se
   borra enseguida.
6. **Fotos sin problemas de derechos.** Del banco público solo se usaron fotos de Wikimedia con licencia
   **dominio público o CC0**, más fotos propias de la agencia.
7. **No borrar ni sobrescribir sin confirmar** (artifacts, archivos, assets, documentos). Borrar un
   artifact rompe el enlace para todos.
8. **Autorización de la usuaria para GitHub:** «inicia y autorizo todo el proceso para que no me estés
   preguntando» (commits y push a la rama de trabajo). Publicar en el enlace de producción: hasta ahora se
   hizo en cada cambio probado; para la versión mejorada, **pide visto bueno** antes de reemplazar
   producción (ver §0).

---

## 4. Arquitectura

### 4.1 Idea general

Todo es **una sola página HTML** (`demo/caminos-documentos-demo.html`, ~3.900 líneas) publicada como
artifact de claude.ai. No hay servidor propio. La página obtiene sus poderes de la plataforma con
`window.claude.use(nombre)`:

```
                           claude.ai (artifact privado, contrato 0.2.60)
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  caminos-documentos-demo.html  (app.html + app.js + interactivo.js + plantillas)     │
│                                                                                      │
│   sample ──────► Claude de la cuenta de quien abre (lee el texto pegado → JSON)      │
│   db ──────────► base de la app: documentos, borrados, fotos, publicados, diagnostico│
│   assets ──────► archivos de fotos del banco                                         │
│   downloads ───► guardar PDF / HTML en el equipo                                     │
│   mcp ─────────► conector Composio ─┬─► GOOGLESHEETS_BATCH_GET  (base, solo lectura)  │
│                                     └─► GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS        │
└──────────────────────────────────────────────────────────────────┬───────────────────┘
                                                                   ▼
                       GitHub repo público «itinerarios» → GitHub Pages (enlace para WhatsApp)
```

Claude se usa **con la cuenta de claude.ai de quien abre la app** (capacidad `sample`): no hay API paga ni
llaves. El PDF se genera **en el navegador** (html2canvas + jsPDF, desde cdnjs), rasterizando cada hoja.

### 4.2 Archivos del repositorio

```
demo/
  app.html               pantallas, estilos y estructura (inserta app.js e interactivo.js)
  app.js                 toda la lógica (~2.600 líneas)
  interactivo.js         versión interactiva del itinerario + mapa + avión (~800 líneas)
  build.py               arma caminos-documentos-demo.html incrustando todo
  caminos-documentos-demo.html   RESULTADO compilado (es lo que se publica; está versionado)
  fuentes-web/           Poppins 400/500/700 recortadas (latín) en woff2, ~7 KB c/u, para el interactivo
  geo/ciudades.json      34.020 ciudades (GeoNames, CC BY 4.0): [nombre, país ISO, población, lat, lon]
  geo/paises.json        contornos de países (Natural Earth, dominio público), simplificados
  geo/preparar.py        cómo se generaron los dos anteriores
  iconos/                íconos Lucide (lucide-static 0.445.0, licencia ISC)
  publicar/index.html    portada del sitio público de itinerarios
  publicar/sw.js         service worker: guarda cada itinerario abierto para verlo sin internet
  publicar/CA2790-*.html ejemplo publicado
  ejemplos/Itinerario-CA2790.html  ejemplo del plugin en versión interactiva
docs/
  TRASPASO.md            este documento
  MANUAL-REPLICA.md      manual para que otro Claude replique la herramienta en otra agencia
original/                COPIA DE REFERENCIA — NO EDITAR
  caminos-documentos-2.5.3.plugin  plugin original entregado (plantillas, motor Python, políticas)
  caminos-documentos-2.5.3/        el mismo, descomprimido
  banco-de-fotos/index.html        página original del Banco de fotos
pruebas/                 simulaciones (mocks) y auditoría para probar fuera de claude.ai
```

**`original/` no se edita nunca.** `build.py` lee de ahí las plantillas oficiales (cotización,
confirmación, voucher, itinerario), los logos, las fuentes Poppins TTF, la imagen `proteccion.png` y los
datos de ejemplo, y los incrusta.

### 4.3 Mapa de `demo/app.js` (por secciones, en orden)

| Sección (comentario `// ===== … =====`) | Qué hace |
|---|---|
| utilidades | `$`, `esc`, `vacio`, fechas, `clonar`, perfil de la asesora en `localStorage` (`caminos-asesor`) |
| motor: puerto de `motor/comun.py` | relleno de marcadores `{{…}}`, formato de fechas y pesos, igual que el plugin Python |
| motor: cotización / confirmación / voucher | `armarCotizacion`, `armarConfirmacion`, `armarVoucher`: llenan la plantilla oficial con los datos |
| reparto entre hojas | `fluir()`: puerto de `motor/flujo.py` midiendo en el navegador (ver §6.3) |
| banco de fotos | colección `fotos` + `assets`; búsqueda por clave, alias y nombre contenido |
| motor: itinerario | puerto de `generar.py` + `empaquetador.py` del plugin |
| formularios | se dibujan desde un **esquema** por documento (`DOCS.<id>.grupos`) |
| estado y navegación | `DOCS`, documento actual, «Mis documentos» (lista compartida en `db`) |
| inicio e historial | pantalla de inicio, tarjetas, guía de uso |
| pasos | pasos 1-2-3 |
| Claude (`sample`) | prompt `instruccion()`, `ordenar()`: nivel `quick` y si falla `default`; «Leer de nuevo con más precisión» |
| validación | campos obligatorios por documento y marcado de faltantes |
| de un documento al siguiente | `cotAConf`, `confAVoucher`, `confAItinerario`, `voucherAItinerario`, expedientes |
| vista previa | iframe con las hojas, escala, conteo de hojas |
| versión interactiva | vista previa celular/computador y «Descargar HTML» |
| publicar para el grupo | `subirAGithub`, plan de intentos, diagnóstico (ver §9.4) |
| base de operación | `lecturaBase`, `leerVentaDeBase`, `confirmacionDesdeBase`, `cotizacionDesdeBase`, botón «Traer de la base» |
| PDF | html2canvas + jsPDF, una imagen por hoja |
| arranque | inicialización |

### 4.4 Compilar

```bash
python3 demo/build.py      # genera demo/caminos-documentos-demo.html
```

`build.py` reemplaza en `app.html`: `/*__APP_JS__*/`, `/*__INTERACTIVO__*/`, `"__ICONOS__"`,
`"__FUENTES__"` (Poppins TTF completas, para el PDF y la vista previa), `"__FUENTES_WEB__"` (woff2
recortadas, para el interactivo), `"__RECURSOS__"`, `"__CIUDADES__"`, `"__PAISES__"`, `"__PLANTILLAS__"`,
`"__EJEMPLOS__"` y los logos. Las woff2 se hicieron una vez con
`pyftsubset … --unicodes="U+0020-007E,U+00A0-00FF,U+0152-0153,U+2013-2014,U+2018-201E,U+2022,U+2026,U+20AC,U+2122" --flavor=woff2`
(requiere `pip install fonttools brotli`); `build.py` no necesita fonttools.

---

## 5. La plataforma (artifacts de claude.ai)

- **Capacidades declaradas** (se arrastran en cada republicación; **no** pases `capabilities` al publicar
  salvo que quieras cambiarlas, porque una lista no vacía reemplaza todo):
  `sample`, `db`, `assets`, `downloads`, `mcp: {servers: [{server: "Composio", tools: ["COMPOSIO_MULTI_EXECUTE_TOOL"]}]}`.
- **Contrato de ejecución:** 0.2.60 (hay 0.2.66). Subirlo es una decisión explícita (`contract: 'latest'`);
  pruébalo antes.
- **Publicar una nueva versión:** herramienta `Artifact` con `file_path=demo/caminos-documentos-demo.html`,
  `url=https://claude.ai/artifact/WPzKkP7MwdKBaGrrGVpZ1Y` y un `label` corto. El ícono de la pestaña es
  `plane` (no lo cambies). Está fijado en la barra lateral de la usuaria.
- **Base de datos (`db`):** se lee y escribe desde Claude Code con la herramienta `ArtifactData` (con la
  `url` del artifact). Úsala para diagnosticar (ver `diagnostico`) o para cargar fotos al banco.
- **`sample`:** `sample.json(prompt, {modelTier})`. La app usa `quick` (más barato) y si falla reintenta
  con `default`.
- **`mcp`:** `mcp.callTool('Composio', 'COMPOSIO_MULTI_EXECUTE_TOOL', {tools:[{tool_slug, arguments}], sync_response_to_workbench:false, thought, current_step})`.
  La respuesta útil está en `payload.data.results[0].response` (`successful`, `data`, `error`).
  - Límite de entrada de una llamada: **~1 MiB**.
  - Archivos como argumento (`{$file: {data: Blob, name, type}}`, hasta 16 MiB): **la plataforma rechazó
    `text/html` y `text/plain` con «file upload failed (415)» el 30/09/2026**. No dependas de esa vía.
  - Códigos de error que maneja la app: `needs_reauth`, `server_not_connected`, `selection_required`,
    `server_not_found`, `server_unavailable` (reintentable), `not_in_manifest`, `blocked_by_policy`,
    `approval_required`, `tool_error`, `bad_request`, `cancelled`, `rate_limited`, `upstream_error`
    (puede traer `retryable`/`retryAfterMs`), `not_granted`, `capability_disabled`, `capability_removed`,
    `transform_error`, `consent_required`, `user_changed`.
- **Composio y respuestas grandes:** si la respuesta es grande, Composio la guarda en su espacio y entrega
  solo `data_preview`. Por eso la base se lee **por pasos pequeños** (ver §8).

---

## 6. Los documentos

### 6.1 Campos por documento (esquema de formularios en `DOCS.<id>.grupos`)

- **Cotización** (`archivo: 'Cotizacion'`, límite 1156 px, `pegarNota`):
  El viaje (`codigo_cotizacion`, `titulo_destino`, `parrafo_intro`, `destino`, `fecha_llegada`,
  `fecha_salida`, `noches`, `pasajeros`, `acomodacion`, `foto_portada`) · Qué incluye el precio
  (`incluye`, `no_incluye`) · Tarifas (`modo_valor` persona/total, `tarifas[]` {`hotel`, `acomodacion`,
  `valor`, `foto`}) · Itinerario día a día (`itinerario[]` {`servicio`=título del día, `fecha`, `detalle`
  que termina en «Alojamiento: ciudad»}) · Condiciones y asesor (`condiciones_pago`, `vigencia`, `asesor`).
  El itinerario de la cotización se dibuja como **tarjetas por día** (`.dia-cot`, numeradas desde la fecha
  más temprana del viaje, comidas y alojamiento como etiquetas), cada día es un bloque separado para que el
  reparto pueda partir entre hojas.
- **Confirmación** (límite 1178, `juntar`, `compacto`): La reserva (`codigo_reserva`, `titulo_viaje`,
  `nombre_viajero`, `destino`, `fecha_salida`, `fecha_regreso`, `pasajeros`, `estado_pago` de lista cerrada:
  «Pagado en su totalidad» / «Abono recibido» / «Pendiente de pago», `parrafo_confirmacion`,
  `foto_portada`) · Vuelos (`aereo[]` {`aerolinea`, `tiquete`, `record`, `trayectos[]` {`vuelo`, `fecha`,
  `ruta`, `sale`, `llega`}}) · Hoteles · Traslados · Servicios y pagos (`servicios_confirmados`,
  `pagos[]` {`concepto`, `valor`, `estado`: Pagado/Pendiente/Anulado}, `nota_importante`) · Tu contacto.
  Modo compacto solo si ahorra una hoja. **Tu reserva incluye / no incluye** (`incluye`, `no_incluye`): van en la
  hoja 2, después de «Servicios confirmados» y antes de «Información de pago», con las viñetas de la cotización;
  al convertir una cotización pasan solas, y los lectores de PDF las llenan desde un programa de tour.
- **Voucher** (límite 1178, `sinPoliticas`, 1 hoja): `tipo` (hotel / aereo / traslado), `codigo_voucher`
  (`CAM-VCH-####-01`), `codigo_reserva`, `nombre_servicio`, `proveedor`, `ubicacion`, viajeros
  (`nombre_viajero`, `acompanantes`), datos del servicio según tipo, `incluye`, `instrucciones`,
  `condiciones`, `vigencia`. Si el servicio no trae fechas, usa las del viaje.
- **Itinerario / itinerario corto:** El viaje (`codigo`, `titulo` con `\n` para dos renglones,
  `subtitulo`, `destino`, `pasajero`, `fecha_inicio`, `fecha_fin`, `acomodacion`, `grupo`,
  `acompanamiento`, `foto_portada`) · Bienvenida (`bienvenida`, `frase`) · Vuelos (`vuelos[]`,
  `vuelos_internos[]` {`vuelo`, `fecha`, `origen`, `destino`, `sale`, `llega` — «15:00 05/09» si llega otro
  día}) · **Día a día** (`dias[]` {`fecha`, `titulo`, `lugar` (lugar en el mapa), **`pais`** (nuevo),
  `descripcion`, `comidas[]`, `etiquetas[]`, `hotel`, `foto`}) · Qué incluye · Hoteles (`nombre`, `ciudad`,
  `direccion`, `telefono`, `foto`) · Antes de viajar (`recomendaciones[]` {`tema`, `items`}, `nota`).
  El corto no lleva vuelos, hoteles ni frase.

### 6.2 Claude lee el texto pegado

`instruccion(d, texto, base)` arma el prompt: reglas generales (no inventar, fechas AAAA-MM-DD, pesos
«$1.640.000», español de Colombia con «tú», sin emojis) + `d.reglas` propias de cada documento + datos
previos si viene de una conversión (se conservan y se completan; la información nueva manda) + la forma
JSON exacta (`d.forma`). Después `fusionar()` combina con lo que ya había, para no perder lo editado.

**Lector de PDF (paso 1, todos los documentos).** «Subir PDF» o arrastrar el archivo (se pueden varios a la
vez, por ejemplo e-ticket + confirmación del hotel). Sección `lector de PDF` de `app.js`:
- pdf.js **3.11.174** se carga solo al primer uso (cdnjs; si falla, jsDelivr). El worker se carga como script
  normal (`window.pdfjsWorker`) y pdf.js trabaja en la misma página. `isEvalSupported: false` siempre.
- `renglonesDe()` saca el texto en el orden del PDF (así cada celda de una tabla queda junta; en el e-ticket
  de Avianca cada vuelo sale en bloque) y marca con « | » los saltos grandes entre columnas.
- `ocultarPersonales()` tapa **antes de mandar a Claude** números de documento (cédula, pasaporte, C.C., T.I.),
  fechas de años pasados (nacimientos) y celulares colombianos. Las fechas del viaje (este año o el próximo)
  no se tocan.
- Si el PDF casi no tiene texto (escaneado), sus hojas van a Claude como imágenes (`sample` con `images`,
  hasta `limits().images.maxCount`); si la vista no admite imágenes, se avisa.
- **Tres niveles** (cada PDF por separado):
  1. **Lectores por código** (`demo/lectores.js`, sin IA): e-ticket de aerolínea por GDS (Amadeus/Avianca),
     tiquete de tren Trenitalia, voucher de hotel de agencia («Código del alojamiento»), cupón de excursión
     («PICK UP»), programa de tour en Word («DIA 1 – …», «► INCLUYE»). Cada uno lleva el PDF a un «viaje»
     neutro y `aDocumento(viaje, doc)` lo pasa al documento elegido. Trenes y excursiones van como traslados.
     Aviso en el paso 2 con botón «Leer con Claude» (opcional, para pulir la redacción).
  2. **Formatos aprendidos**: si ningún lector lo reconoce, lo lee Claude y, si fue un solo PDF con texto, Claude
     arma además una *plantilla* (frases de huella + expresiones regulares por campo, sin código). Se guarda en
     `db` `lectores/<id>` solo si aplicada al mismo PDF saca ≥ 80 % de las fechas, horas y códigos que leyó Claude.
     La próxima vez ese formato se lee sin IA, para todas las asesoras. Una plantilla mala se borra de esa colección.
  3. **Claude** para lo demás (y para escaneados, como imágenes).
- Para pasar un proveedor a lector por código: skill `.claude/skills/nuevo-lector/SKILL.md`.
- El texto leído queda en el cuadro de texto para revisarlo.
  `ordenar()` recorta el texto si el mensaje pasa `limits().maxPromptBytes` (65.536) y lo avisa.
- Reglas nuevas en `instruccion()`: monedas extranjeras se conservan («USD 949»); no se copian datos del
  proveedor (nombre comercial, contactos, cuentas, formas de pago, comisiones, «su agente»), salvo hoteles,
  aerolíneas de los vuelos y operadores de traslados; de los pasajeros solo el nombre.
- Pruebas: `pruebas/probar-lectores.js` (lectores, sin navegador, con textos anonimizados) y
  `pruebas/probar-pdf.js` (en el navegador). Ver `pruebas/LEEME.md`.

### 6.3 Reparto entre hojas (`fluir()`)

Es la parte más delicada visualmente. Puerto de `motor/flujo.py`, pero **midiendo** cada bloque en el
navegador en vez de estimar.

- Altura útil por hoja: cotización **1156 px**, confirmación y voucher **1178 px**; `HOLGURA_CAJA` 6 px.
- Operaciones: `bloques` (cada sección es un bloque), `partir` (tablas y listas por renglones),
  `repartir`, `subir` (llenar hueco con el bloque siguiente), `juntar` (confirmación), `compacto`,
  `sinPoliticas` (voucher), `pegarNota` (la nota va pegada a su sección).
- `fondoB(el)`: el fondo de un bloque se mide hasta su **último elemento visible**; el margen inferior del
  último renglón **no** cuenta como desborde (este error vaciaba la portada del CA2920).
- `rellenar()`: si una hoja queda con hueco ≥ **300 px** (`HUECO`), intenta subir la sección sin su nota
  final, o partir una tabla/lista (≥ 4 ítems, ≥ 2 por lado); si no se puede, deshace.
- Un día del itinerario **nunca** se parte entre dos hojas, salvo en la cotización cuando sus actividades van en
  filas (4 o más): se parte por filas, con 2 como mínimo en cada hoja y el título «(continuación)».
- **Actividades en filas** (`filasActividades`): si el detalle de un día trae actividades separadas con « • »,
  cada una sale en su fila con la hora en una columna aparte («06:00 – 07:30 · Vuelo…», «02:00 PM - …»). Lo usan
  la cotización, el itinerario en PDF y la versión interactiva; los lectores de PDF y el borrador desde una
  confirmación escriben así los días. Un texto sin « • » sigue siendo un párrafo (los guardados no cambian).
- **Antes de publicar cualquier cambio de diseño, corre la auditoría** (`pruebas/auditar.js`) sobre todos
  los documentos guardados; se le prometió a la usuaria.

---

### 6.4 Políticas fijas de Agencia Caminos

Cotización y confirmación llevan siempre, antes de la hoja de «Información adicional», las hojas
«Políticas de Agencia Caminos» (9 secciones: pago, menores de edad, información de interés, documentos de
viaje, datos de reserva, condiciones generales, cancelación, políticas generales y comportamiento en los
destinos). El texto lo entregó la usuaria y va **tal cual** en `POLITICAS_CAMINOS` (`app.js`, sección de reparto
entre hojas); para cambiarlo se edita ahí. `agregarPoliticasCaminos()` copia la hoja de «Información adicional»
como molde y reparte las viñetas midiendo (hoy ocupan 2 hojas). Se activa con `flujo.politicasCaminos`; el
voucher y el itinerario no las llevan.

## 7. Conversiones y expedientes

- **Barra «Siguiente paso»** al ver un documento:
  - cotización → **confirmación** (pregunta qué opción/hotel eligió el cliente);
  - confirmación → **voucher** (hotel, traslados o tiquete) y → **itinerario**;
  - voucher → **itinerario** (si existe la confirmación del mismo viaje, ofrece partir de ella).
- `confAItinerario(c, desde, {doc, texto})`: arma un **borrador del día a día solo con evidencia**: vuelos
  de cada fecha (incluido «llega al día siguiente»), traslados, entrada/salida de hoteles. La ciudad del día
  solo se escribe si hay evidencia (aterriza un vuelo o hay registro en hotel). Si no hay «incluye», lo toma
  de la cotización del mismo expediente. Con `doc` se fuerza itinerario o itinerario corto.
- **Expediente:** `expedienteDe()` reconoce que `CA3311`, `CAM-2026-3311` y `CAM-VCH-3311-01` son el mismo
  viaje. «Mis documentos» agrupa por expediente.

---

## 8. Traer de la base (solo lectura)

Disponible en **cotización, confirmación, itinerario e itinerario corto** (`DOCS.x.desdeBase: true`).

### 8.1 Cómo se lee

- Entrada: consecutivo `2900` o `CA2900` (valida `^(CA-?)?\d{3,}$`).
- `lecturaBase(rangos)` → `GOOGLESHEETS_BATCH_GET` con `spreadsheet_id` y `ranges`. Única función que toca
  la base.
- Lectura por pasos pequeños (para que Composio no recorte la respuesta):
  1. **PIPELINE**: columnas A, C, F, I:K, V, X, AB:AC, AG:AH hasta la fila 3000 → busca la venta por
     `Numero_Consecutivo` o `Codigo_Visual_VYE` (`CA2900`).
  2. Columna de códigos de SERVICIOS (B) y CONTROL_PAGOS (B) + PROVEEDORES A:D + PANEL_DE_COSTEOS A:B +
     ASESORES A:B.
  3. Solo las **filas de la venta**: SERVICIOS (A:H, R, X, AE), CONTROL_PAGOS (B:F), en tramos de hasta
     40 filas y 3 tramos por llamada.
  4. PASAJEROS: solo A:C (id y nombre) de los pasajeros de la venta.
  5. Solo para cotización: COTIZACION_OPCIONES (A:R) de la venta y el costeo del paquete en
     PANEL_DE_COSTEOS (A:AU).
- Columnas por nombre que usa el código (fila 1 de cada hoja): `ID_Venta`, `Numero_Consecutivo`,
  `Codigo_Visual_VYE`, `Agente` (correo de la asesora), `Destino`, `Fecha_Ida`, `Fecha_Regreso`
  (dd/mm/aaaa), `Pasajeros_Viajando` (ids separados por coma), `Titular_Vacacional`,
  `Paquete_Religioso` (id de costeo), `Acomodacion_Religiosa`, `Numero_Pasajeros_Estimados`;
  SERVICIOS: `ID_Servicio`, `ID_Venta`, `ID_Pasajero`, `Tipo_Servicio` (Vuelo / Hotel / Plan Terrestre /
  Asistencia), `Proveedor`, `Localizador`, `Tiquete`, `Aerolínea`, `Ruta` («BOG-IPI // PSO-BOG»),
  `Tipo_Acomodacion`, `Gran_Total_Servicio`; CONTROL_PAGOS: `ID_Venta`, `Fecha_Abono`, `Monto`,
  `Metodo_Pago`, `Estado_Pago`; PASAJEROS: `ID_Pasajero`, `Nombre_Completo`; PANEL_DE_COSTEOS: `ID_Costeo`,
  `Nombre_Plan`, `Gran_Total_Venta_{Sencilla,Doble,Triple}`; ASESORES: `Email`, `Nombre`;
  COTIZACION_OPCIONES: `Numero_Opcion`, `Nombre_Opcion`, `Neto_Tkt`, `TA_Tkt`, `Neto_/Markup_` de Hotel,
  Terrestre, Asistencia y Otros.

### 8.2 Qué se arma

- **Confirmación** (`confirmacionDesdeBase`): código `CAM-<año>-<num>`, título (nombre del plan o
  destino), titular, pasajeros (con nombres si son 2–6), fechas, **un tiquete por localizador** con
  trayectos sacados de la ruta (la base **no** trae número de vuelo, fecha ni horas: quedan para completar),
  hoteles (solo proveedores de categoría Hotel), servicios confirmados, pagos con estado. El estado de pago
  general: sin pagos → «Pendiente de pago»; con pagos, la asesora elige (la columna `Saldo_Pendiente` no es
  confiable).
- **Itinerario / corto:** la confirmación anterior pasada por `confAItinerario` (borrador por evidencia).
  Mensaje de faltantes: actividades de cada día, vuelos, hoteles.
- **Cotización** (`cotizacionDesdeBase`), regla de precios de Caminos (fórmulas de AppSheet, leídas en solo
  lectura):
  1. Si la venta tiene SERVICIOS → valor = suma de `Gran_Total_Servicio` (por persona si todos los
     pasajeros suman igual; si no, total del viaje).
  2. Si no, COTIZACION_OPCIONES → por opción: `Neto_Tkt + TA_Tkt + Σ(Neto_x ÷ Markup_x)` (si el markup
     está vacío o ≤ 0, el neto).
  3. Si no, el costeo del paquete → `Gran_Total_Venta` por acomodación.
  Al documento solo va el **valor final**; el origen del valor se muestra a la asesora como referencia,
  nunca en el PDF.

---

## 9. Itinerario interactivo, mapa y publicación

### 9.1 Versión interactiva (`interactivo.js` → `htmlItinerario(d, {incrustar, ligero})`)

Un solo archivo HTML autocontenido (letras, logos, íconos y fotos incrustados) pensado para el celular:
cuenta regresiva al viaje, secciones con navegación (Tu viaje, Ruta, Día a día, Vuelos, Hoteles, Qué
incluye, Antes de viajar, Condiciones), días desplegables con marca «Hoy», vuelos, hoteles con enlace a
Google Maps, lista de preparación que se puede marcar, y la política general copiada tal cual de la
plantilla. `ligero`: 0 normal, 1 fotos al 60 %, 2 fotos al 40 % (para que quepa al publicar).

### 9.2 Mapa de la ruta y avión («fundamental» para la usuaria)

- Solo aparece si el viaje pasa por **3 destinos distintos o más**.
- Cada día se ubica por su **título** (en cada tramo separado por «—», «,», «y», «/», el nombre más a la
  derecha; entre los que terminan en la misma palabra, el **más largo**: «Las Lajas» antes que «Lajas») y
  por el campo **«Lugar en el mapa»**.
- **País del día (nuevo):** si el día tiene `pais`, solo valen ciudades de ese país; si el lugar no existe
  ahí, no se pinta (mejor nada que un punto en otro continente). Acepta nombres en español o inglés y
  códigos ISO. Filtra también las ciudades del título de ese día.
- `EXONIMOS`: nombres en español y sitios que se ubican en su ciudad (Roma, Lisboa, Tierra Santa, Las Lajas
  → Ipiales, Monserrate → Bogotá, La Cocha → Pasto, Tayrona → Santa Marta…). Ampliarlo cuando aparezcan
  sitios nuevos.
- Los vuelos del mismo día agregan origen/destino y conexiones.
- Homónimos (Madrid, Córdoba…): se elige la combinación que deja la **ruta más corta**, con un castigo
  para ciudades pequeñas (`castigo = 250·(1 − log10(pob+10)/7)`); sin calificar, se descartan homónimas
  25 veces más pequeñas que la mayor.
- SVG fijo, proyección equirectangular centrada en la ruta, tramos como curvas; botón «Recorrer la ruta»
  con un **avión** que vuela cada tramo (en vuelos largos la vista se abre para seguirlo); chips por
  parada; «Ver en el mapa» desde cada día.

### 9.3 Sin internet

`demo/publicar/sw.js` (service worker del sitio público): con red trae siempre la versión más reciente; sin
red (o si tarda más de 6 s) muestra la guardada. En el HTML descargado, el registro del service worker solo
se activa en contexto seguro (https o localhost).

### 9.4 Publicar para el grupo

- Ruta: `<CODIGO>-<6 letras al azar>.html` (no adivinable); se guarda en `db` `publicados/<codigo>` y se
  reutiliza al volver a publicar (mismo enlace).
- Versión de grupo: `pasajero: ''`.
- `subirAGithub(ruta, contenido, mensaje)` → `GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS` {owner, repo, path,
  content (base64), message}.
- **Plan de intentos (desde v37):** primero el contenido **en base64 dentro del mismo mensaje** con
  `ligero` 0, 1 y 2 (si el base64 pasa de 950.000 caracteres se salta); como último recurso el archivo
  adjunto (`text/html`, luego `text/plain`). Fallas pasajeras (`server_unavailable`, `rate_limited`,
  `upstream_error` reintentable) se reintentan una vez.
- Cada intento queda en `db` `diagnostico/<timestamp>` con código, mensaje, tamaño y vía. Si la usuaria
  dice «falló», **lee esa colección primero** (`ArtifactData list diagnostico`).
- Peso: el CA2897 pasó de **899 KB** (Poppins TTF completas ≈ 630 KB) a **~295 KB** con las woff2.

---

## 10. Banco de fotos

- `db` `fotos/<tipo>__<slug>` con {`clave` (`destino:pasto`, `hotel:<nombre>|<ciudad>`), `tipo`,
  `nombre`, `ciudad`, `asset` (id en `assets`), `ancho`, `alto`, `fecha`, `documento`, `alias[]`,
  `fuente`}. Las fotos se sirven en `/_blob/<asset>`.
- `fotoParecida(clave)`: coincidencia exacta o, si no, el destino cuyo nombre o alias esté contenido en el
  buscado (el más largo). «Medellín, Antioquia» encuentra `medellin`.
- Al generar, cada documento busca foto de portada del destino (cotización, confirmación, itinerario) y de
  hoteles/días; la asesora puede subir otra y queda en el banco.
- Contenido al cierre: **35 destinos** (20 de Wikimedia PD/CC0 + 15 propios de Drive «FOTOS VIAJES») y la
  foto de Medellín (Plaza Botero / Palacio de la Cultura, CC0, asset `0ef7778f4fe3a638f08f7227b942cdf5`,
  alias `antioquia`, `plaza-botero`), elegida por la usuaria entre 6 opciones.
- Al incrustar fotos en el interactivo siempre se reducen (`aDataUrl(url, max, calidad)`).
- Pendiente: fotos del Instagram de la agencia (más contexto religioso real) cuando haya credenciales.

---

## 11. Mis documentos

- Lista **compartida entre asesoras** en `db` `documentos/<doc>__<codigo>` {`doc`, `fecha`, `cuando`,
  `datos` sin fotos}, más copia local en `localStorage` (`caminos-demo-docs-v2`).
- **Eliminar** (solo en Mis documentos): dos toques («¿Eliminar? Toca otra vez», se revierte a los 3,5 s).
  Escribe una **lápida** `borrados/<id>` {`cuando`} y borra `documentos/<id>`; la lápida evita que una copia
  local de otra asesora lo resucite. Volver a generar el documento quita la lápida.
- Al cierre había 13 documentos (confirmaciones 2790, 2900, 2916, 3311, prueba01; cotizaciones CA2920,
  CA2922; itinerarios CA2790, CA2897; corto CA3311; vouchers 2790-05, 2916-02, 3311-01).

### 11.1 Colecciones de la base de la app (resumen)

| Colección | Documento | Contenido |
|---|---|---|
| `documentos` | `<doc>__<codigo>` | documentos guardados |
| `borrados` | `<doc>__<codigo>` | lápidas de borrado |
| `fotos` | `<tipo>__<slug>` | banco de fotos |
| `publicados` | `<codigo>` | {codigo, ruta, url, titulo, fecha, cuando, documento} |
| `diagnostico` | `<timestamp>` | intentos de publicación fallidos o con reintentos |
| `lectores` | `aprendido-<nombre>` | formatos de proveedor aprendidos: {nombre, huella, servicio, campos, repetir?, creado, documento, prueba} |

---

## 12. Cómo se prueba (ver `pruebas/LEEME.md`)

- Playwright + Chromium (preinstalado en la nube: `NODE_PATH=$(npm root -g) node script.js`; no ejecutes
  `playwright install`).
- `pruebas/armar.sh salida.html mock.js …` arma la página con las simulaciones delante.
- html2canvas 1.4.1 y jsPDF 2.5.1 locales (cdnjs puede estar bloqueado en la red de la sesión).
- Para ver PDFs que mande la usuaria: `pymupdf` (PIL no está instalado localmente).
- Lo que se probó en esta etapa con simulaciones: traer de la base (3 ventas + consecutivo inexistente),
  publicar con fallas simuladas (415, transitorias), borrar con 3 asesoras simultáneas, auditoría de saltos
  de hoja de los 12 documentos guardados, mapa con país.

### 12.1 Ciclo de entrega usado hasta ahora

1. Cambiar `demo/*.js|html` → `python3 demo/build.py`.
2. Probar con simulaciones (y auditoría si tocó el diseño de hojas).
3. Commit y `git push -u origin claude/design-system-gtf3k4`.
4. `Artifact` publish al enlace de producción con un `label`.
5. Contarle a la usuaria, en español sencillo, qué cambió y qué debe probar, con captura.

---

## 13. Historial de problemas y lecciones (para no repetirlos)

| Problema | Causa | Arreglo |
|---|---|---|
| «No se pudo publicar» (CA2900, CA2897) | Archivo de ~900 KB por las fuentes TTF; no cabía en el mensaje y la vía de archivo adjunto devuelve 415 | Fuentes woff2 recortadas + base64 primero + versiones livianas + diagnóstico |
| Portada vacía en cotización CA2920 (7 hojas) | El margen inferior del último renglón contaba como desborde; `partir` fallaba y toda la sección saltaba | `fondoB` |
| «Día 01» en el último día | Llegada y salida invertidas en los datos | Numerar desde la fecha más temprana |
| Portada medio vacía CA2929 | Tarifas + nota pegada no cabían | `rellenar` (hueco ≥ 300 px) |
| Itinerario de cotización desbordaba el pie | Todas las tarjetas de día dentro de un solo contenedor | Cada día es un bloque hermano |
| Mapa: Las Lajas en Puerto Rico, Laguna (de La Cocha) en Brasil | Se tomaba la última palabra suelta; homónimos sin contexto | Nombre más largo primero, exónimos de Nariño, campo País |
| Confirmación sin foto del destino | No tenía `foto_portada` | Foto del banco en el encabezado |
| Voucher sin fechas desde la base | Tramos de la base sin fecha | Vigencia = fechas del viaje |
| «Pegar la reserva» borraba lo editado | No se fusionaba con el formulario | `fusionar` con `leerFormulario()` |
| Fotos con personas en repo público (~2 min) | Error de proceso | Regla 5 de §3 |
| Push a `main` bloqueado | Requiere revisión | Pedir autorización / PR |
| Ítems de una lista perdidos o repetidos al repartir hojas (confirmación con incluye largo; CA2922 repetía 2 ítems de «no incluye») | Al deshacer un relleno, la copia de la lista aún no estaba en la hoja y el navegador no le calculaba `flex-wrap` | `dentro()` mira también el estilo escrito en el elemento |

---

## 14. Estado al cierre y pendientes

**Hecho y publicado (v37):** los 5 documentos, Claude para leer texto, traer de la base en 4 documentos,
conversiones, Mis documentos compartido con borrado, banco de fotos, itinerario interactivo con mapa y
avión, publicación para el grupo, guía en video, manual de réplica.

**Pendiente / por confirmar:**
1. **Confirmar con la usuaria** que «Publicar para el grupo» ya funciona en real (CA2897). Si falla:
   leer `diagnostico`.
2. Probar «Traer de la base» en itinerario contra la base real (solo se probó con simulación).
3. Actualizar `main` (autorización de la usuaria).
4. Instagram como fuente de fotos (cuando haya credenciales).
5. Ofrecimientos hechos y no pedidos aún: foto en el voucher; al eliminar un itinerario, borrar también su
   enlace publicado.
6. Repo `caminos-fotos-privado` vacío: la usuaria puede borrarlo.
7. Llenar `pais` automáticamente en los borradores desde la base o la confirmación (hoy queda vacío).

---

## 15. Ideas para la versión mejorada (propuestas, decidir con la usuaria)

Deuda técnica actual y mejoras posibles, de mayor a menor impacto:

1. **PDF con texto real.** Hoy cada hoja es una imagen (no se puede seleccionar ni buscar texto, pesa
   más). Opciones: `window.print()` con CSS de impresión, o jsPDF/pdf-lib dibujando texto. El reparto de
   hojas ya mide en el navegador, así que se puede reutilizar.
2. **Código modular.** `app.js` tiene 2.600 líneas en un solo cierre. Separar en módulos (motor de hojas,
   documentos, base, publicación, banco, mapa) con un empaquetador que siga produciendo **un solo HTML**
   (el artifact lo exige). Mantener `build.py` o pasar a esbuild/vite.
3. **Pruebas automáticas en el repo** con Playwright y las simulaciones de `pruebas/`, más una simulación
   de la base con datos inventados, y GitHub Actions que corra la auditoría de saltos de hoja.
4. **Configuración por agencia** (marca, colores, textos legales, hoja de la base, repo de publicación) en
   un archivo, para replicar sin tocar código (ver `docs/MANUAL-REPLICA.md`).
5. **Mapa:** país por defecto del viaje, sugerencias de lugar mientras se escribe (autocompletar con
   `ciudades.json`), y vista previa del punto en el formulario.
6. **Base de operación:** llenar más campos (vuelos con horas si existen en otra hoja, hoteles con fechas
   reales), siempre en solo lectura.
7. **Versiones de un documento** (historial de cambios) y quién lo generó.
8. **Contrato de artifacts 0.2.66** y revisión de capacidades.

---

## 16. Glosario rápido

- **Asesora:** vendedora de la agencia que usa la app.
- **Consecutivo / CA2900:** número de la venta en la app de operación (AppSheet).
- **Expediente:** todos los documentos de un mismo viaje.
- **Base / app de operación:** AppSheet sobre Google Sheets («NO BORRAR - DATOS HERRAMIETA»).
- **Plugin original:** `caminos-documentos` v2.5.3 (plantillas + motor Python), en `original/`.
- **Artifact:** página publicada en claude.ai con capacidades de plataforma.
- **Composio:** conector MCP que da acceso a Google Sheets y GitHub.
