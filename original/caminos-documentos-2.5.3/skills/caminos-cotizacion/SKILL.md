---
name: caminos-cotizacion
description: Genera una cotización de viaje de Caminos en PDF, con el diseño oficial de marca (portada coral, tarifas por hotel, itinerario y condiciones). Usa este skill SIEMPRE que un asesor de Caminos pida "una cotización", "cotizar un viaje", "generar/armar/mandar una cotización", "propuesta de servicios" o dé datos de destino/hotel/tarifas esperando un documento para enviar al cliente. No inventes el diseño: usa exclusivamente la plantilla y el motor incluidos en este skill.
---

# Cotización de viaje — Caminos

Tu trabajo tiene **una sola parte**: entender lo que manda el asesor (texto
pegado, itinerarios aéreos copiados, fotos o capturas de hoteles y reservas) y
convertirlo en un archivo de datos `datos.json`. El PDF lo arma el motor
`scripts/generar.py`, que llena la plantilla oficial, quita los bloques vacíos y
revisa que nada se salga de la hoja.

**No escribas HTML ni toques la plantilla.** El diseño ya está resuelto y el
motor lo aplica igual cada vez.

## Regla no negociable

No inventes datos. Cifras, fechas, hoteles, servicios y condiciones salen de lo
que dio el asesor. Si el asesor pide un cambio de diseño (no de contenido), dile
que el diseño está estandarizado y que ese cambio debe pasar por quien mantiene
el design system de Caminos.

## Información adicional: fija, no se modifica

Todo lo que va debajo del título **"Información adicional"** es la política
general de Agencia Caminos. Es texto legal, igual en todos los documentos, y
**no se modifica en ninguna circunstancia**:

- No lo resumas, no lo reescribas, no lo traduzcas, no lo acortes, no le
  agregues ni le quites cláusulas, no cambies su formato ni su orden.
- **Aunque el asesor lo pida**, no lo cambies. Explícale que es texto legal
  fijo y que un cambio en la política debe hacerlo la dirección de Caminos en
  el plugin, no en un documento.
- El asesor solo entrega los datos del viaje (aéreos, hoteles, tarifas, día a
  día, confirmaciones). Esa página no lleva datos del viaje.
- Si el asesor manda condiciones propias de un viaje, esas van en su sección
  del documento (por ejemplo, "Antes de confirmar" en la cotización), nunca en
  la información adicional.

La copia oficial está en `../../politicas/informacion-adicional.html` (carpeta
`politicas/` del plugin).

El motor la verifica antes de generar: si la página no coincide con la
oficial, responde `BLOQUEADO` y no genera el PDF. Si ves ese mensaje, no
intentes arreglar la página: avísale a la dirección de operaciones.

## Ruta rápida (sigue esto siempre)

El asesor está esperando. Haz lo mínimo:

1. Si el mensaje no trae datos, responde con la plantilla (ver "Si el asesor
   llama el skill sin datos") y detente.
2. Si falta un dato obligatorio, pídelo en un solo mensaje y detente.
3. **Banco de fotos (obligatorio, no te lo saltes):** si falta la foto de
   portada o la de algún hotel, el motor no genera y responde
   `CONSULTA EL BANCO DE FOTOS` con las claves exactas. Haz esa consulta (ver
   "Fotos"), descarga las fotos que encuentre, ponlas en `datos.json`, agrega
   `"banco_consultado": true` y vuelve a correr. Puedes adelantarte: consulta
   el banco antes de la primera corrida y ya incluye `"banco_consultado": true`.
4. Si todo está, **en una sola llamada a la terminal** escribe `datos.json` y
   corre el motor:

   ```bash
   mkdir -p caminos-trabajo && cd caminos-trabajo && cat > datos.json <<'FIN'
   { ...los datos, con los campos de la tabla del Paso 1... }
   FIN
   python3 "CARPETA_DEL_SKILL/scripts/generar.py" datos.json "Cotizacion-CA3311.pdf"
   ```

5. Si responde `PDF generado`, entrega el PDF con la herramienta de envío de
   archivos y escribe una sola línea. Si el motor imprimió `GUARDA EN EL BANCO`,
   sube esas fotos y escríbelas en el índice (ver "Fotos"). Si responde otra cosa, sigue la tabla del
   Paso 2.

**No hagas nada más:** no leas los archivos de ejemplo ni la plantilla (los
campos están en la tabla del Paso 1), no instales nada si el motor corre, no
conviertas el PDF a imágenes para revisarlo y no le expliques el proceso al
asesor. Cada paso extra es tiempo de espera.

## Si el asesor llama el skill sin datos

Si el mensaje del asesor no trae datos del viaje (solo el comando, o algo como
"quiero hacer una cotización"), **no hagas nada más**: no leas la plantilla, no
corras el motor, no expliques el proceso. Responde únicamente con una línea y
esta plantilla, **copiada tal cual** dentro de un bloque de código para que la
pueda copiar con un clic:

```
/caminos-cotizacion
Código:
Destino y título:
Llegada (fecha):
Salida (fecha):
Pasajeros:
Acomodación:
Vigencia hasta:
Introducción (opcional):
Incluye:
- 
No incluye:
- 
Tarifas (hotel · acomodación · valor por persona):
- 
Itinerario de servicios (opcional; puedes pegar los vuelos tal cual del sistema):
Condiciones de pago:
Asesor (nombre, correo, teléfono):
Fotos (adjúntalas y di dónde va cada una: portada o el hotel):
```

La línea antes del bloque: "Copia, llena lo que tengas y envíamelo. Puedes
pegar reservas tal cual del sistema y adjuntar fotos o documentos."

Cuando el asesor la devuelva llena, sigue el Paso 1 normalmente. Los campos que
deje vacíos son opcionales, salvo los obligatorios de la tabla, que pides en un
solo mensaje.

## Datos del asesor (obligatorios)

La cotización y la confirmación llevan el nombre, el correo y el teléfono del
asesor que atiende al cliente. Búscalos en este orden y **no le preguntes al
asesor lo que ya encuentres**:

1. En el mensaje del asesor.
2. En el proyecto de Claude desde el que está trabajando: sus instrucciones y
   sus documentos (por ejemplo, un bloque "Asesor: nombre · correo ·
   teléfono"), y en la memoria o el perfil de la cuenta. El correo de la cuenta
   sirve como correo del asesor si es de @agenciacaminos.com.co.
3. Si después de eso falta alguno de los tres datos, **pídelo siempre** antes de
   generar, junto con los demás obligatorios que falten, en un solo mensaje.

Nunca uses los datos de otro asesor ni los del archivo de ejemplo, y nunca
inventes un teléfono o un correo.

## Paso 1 — Arma datos.json

Usa exactamente estos nombres de campo. (`scripts/datos-ejemplo.json` tiene una
cotización completa; ábrelo solo si el motor rechaza tus datos.)

| Campo | Qué va | Obligatorio |
|---|---|---|
| `codigo_cotizacion` | Ej. `CA3311`. Si el asesor no tiene uno, propón `CAM-COT-` + fecha ddmm + iniciales del asesor | Sí |
| `codigo_documento` | Ej. `CAM-COT-3311`. Si lo omites, el motor lo deriva del código | No |
| `titulo_destino` | Título corto de la portada. Si el asesor no da uno: destino + noches en letras ("Cartagena, cuatro noches") | Sí |
| `parrafo_intro` | 1 a 3 líneas que describan el viaje, solo con lo que dijo el asesor. No agregues servicios que no estén en `incluye` | No |
| `destino`, `noches`, `pasajeros`, `acomodacion` | Texto tal como debe leerse: "3 noches", "4 personas" | No |
| `fecha_llegada`, `fecha_salida` | **En número: `AAAA-MM-DD`** (ej. `2026-05-08`). El motor la escribe en español | Sí |
| `incluye` | Lista de textos | Sí |
| `no_incluye` | Lista de textos | No |
| `tarifas` | Lista de `{hotel, acomodacion, valor}`; valor con formato "$780.000". Opcional `foto` (ver "Fotos") | Sí, al menos una |
| `foto_portada` | Archivo de la foto del destino (ver "Fotos") | No |
| `itinerario` | Lista de `{servicio, fecha, detalle}`; fecha en `AAAA-MM-DD` | No |
| `condiciones_pago` | Texto; separa párrafos con una línea en blanco | Sí |
| `vigencia` | En `AAAA-MM-DD` | Sí |
| `asesor` | `{nombre, correo, telefono}` (ver "Datos del asesor") | Sí, los tres |

Para resaltar una palabra en un texto libre usa `**así**` (se imprime en
negrita con el estilo de la marca). Úsalo con moderación: una o dos cosas por
párrafo.

**Los archivos de ejemplo solo muestran el formato.** Nunca copies sus textos
(instrucciones, condiciones, notas, horarios, descripciones) a un documento
real, y nunca rellenes un campo que el asesor no dio con un texto genérico o
un marcador como "pendiente", "doméstico" o "por confirmar". Si un campo
opcional no viene, déjalo fuera: el motor quita el bloque.

**Fechas: escríbelas siempre en número (`2026-11-14`) y nunca pongas el día de
la semana.** El motor calcula el día y escribe la fecha en español. Si el asesor
no dice el año, usa el año de la próxima ocurrencia de esa fecha.

**Cómo leer lo que manda el asesor:**

- **Itinerario aéreo pegado** (formato de GDS, correo de aerolínea): cada
  trayecto es una fila de `itinerario`. En `servicio` van vuelo y ruta con
  nombres de ciudad ("Aéreo AV 8520 · Bogotá – Cartagena"), en `fecha` la
  fecha y en `detalle` solo las horas ("6:10 AM – 7:46 AM"). La columna de
  detalle es angosta: si le pones más, se parte en dos líneas.
  En el formato de GDS (`AV 8520 Y 14NOV 6 BOGCTG HK2 0610 0746`) el número
  suelto después de la fecha es el día de la semana: ignóralo.
- **Fotos o capturas** de hoteles, tarifas o reservas: lee los datos que se ven
  (nombre del hotel, acomodación, valor). Si algo no se lee bien, pregúntalo;
  no lo adivines.
- **Condiciones de pago:** si el asesor no las da, pídelas. No redactes
  condiciones por tu cuenta.
- Si falta algo obligatorio (la columna "Sí" de la tabla), pregúntalo **antes**
  de generar, todo en un solo mensaje. No presentes como obligatorio lo que no
  lo es: los vuelos, el itinerario y los datos del asesor son opcionales; si
  faltan, genera sin ellos.

## Fotos

Las fotos hacen la cotización más atractiva y los clientes las piden. El
motor sabe ponerlas en tres lugares:

- **Foto del destino** (`foto_portada`): va en el encabezado. Reemplaza el
  bloque coral de la portada, con el degradado de protección del sistema de
  diseño, y el título queda sobre la foto. Es el estándar aprobado por la
  dirección. Solo si el asesor lo pide expresamente, pon
  `"estilo_foto": "cuerpo"`: la portada queda coral y la foto va debajo de los
  datos del viaje.
- **Un hotel** (`foto` dentro de su fila de `tarifas`): sale en "Tus opciones de
  hotel", con su nombre y su precio.

Sin foto, el documento queda igual que siempre. Nunca
cambies el diseño para acomodar una foto: el motor ya aplica el degradado de
protección, el radio y la sombra del sistema de diseño.

### Cuando el asesor adjunta imágenes

1. **Clasifícalas.** Una captura de vuelos, de una reserva, de una
   confirmación o de una tabla de tarifas **son datos**: léelos y úsalos donde
   corresponden, sin preguntar. Una foto de un lugar, una playa, una ciudad, un
   hotel o una habitación **es una foto para el documento**.
2. **Si el asesor ya dijo dónde va cada foto** ("la primera es la portada, la
   segunda es del Calypso"), úsalas así.
3. **Si no lo dijo, pregúntalo una sola vez**, junto con los datos
   obligatorios que falten, en un solo mensaje. Enumera las fotos y da las
   opciones reales de ese documento, por ejemplo: "Foto 1 y foto 2: ¿dónde va
   cada una? Opciones: portada, hotel Bahía Sardina, hotel Calypso, hotel Samawi o no usar". No adivines.
4. Copia cada foto a la carpeta de trabajo y pon su nombre de archivo en el
   campo que corresponde de `datos.json`.

El motor avisa con `AVISO:` si una foto es pequeña y puede verse borrosa. Genera
el PDF igual y díselo al asesor en una línea (lo ideal son 1.600 px de ancho
para portada).

### Banco de fotos Caminos

Las fotos que los asesores ubican se guardan en el **Banco de fotos Caminos**
(https://claude.ai/artifact/WPzKkP7MwdKBaGrrGVpZ1Y) para reutilizarlas. Se consulta y se escribe con las
herramientas de la página: `ArtifactData` (índice) y `Artifact` (archivos). Las
fotos nunca pasan por el chat.

**Claves:** `destino:<destino>` para la portada y `hotel:<hotel>--<destino>` para cada
hotel de `tarifas`. Cada nombre va en minúsculas, sin tildes, con guiones en
lugar de espacios y signos: `destino:san-andres`, `hotel:calypso--san-andres`. El
documento del índice se llama igual que la clave, cambiando `:` por `__`
(`destino__san-andres`).

**Antes de generar, si falta alguna foto** (la portada, o hoteles sin foto).
El motor lo exige: sin `"banco_consultado": true` responde
`CONSULTA EL BANCO DE FOTOS` y te da las claves exactas; usa esas, no las
armes a mano.

1. Haz **una sola consulta** con todas las claves que faltan:
   `ArtifactData` → `action: "query"`, `url` del banco, `collection: "fotos"`,
   `query: {"where": [["clave", "in", [...claves...]]]}`.
2. Por cada resultado, descarga la foto con `Artifact` → `action: "read"`, `url`
   del banco y `path` = el campo `asset`. Queda guardada como archivo local;
   usa esa ruta en `datos.json`.
3. Dile al asesor en una línea qué fotos tomaste del banco.

Si el banco no tiene la foto, sigue sin ella. En todos los casos agrega
`"banco_consultado": true` a `datos.json` después de consultar. Si las
herramientas del banco no están disponibles o no hay acceso, agrégalo igual,
genera sin fotos del banco y no insistas.

**Después de generar, guarda en el banco las fotos que el asesor ubicó**, sin
preguntarle. El motor imprime `GUARDA EN EL BANCO` con una línea JSON por foto
(clave, tipo, nombre, ciudad, archivo, ancho y alto ya medidos); las fotos que
vinieron del banco no aparecen ahí. Si no imprimió esa lista, no hay nada que
guardar.

1. Usa los datos de esa lista tal cual; no vuelvas a medir las fotos.
2. Si la clave ya existe en el banco con una foto de igual o mayor ancho, no la
   reemplaces. Si no existe o la nueva es más grande, súbela: `Artifact` →
   `url` del banco, `asset: true`, `file_path` = la foto. Guarda el `id` que
   devuelve.
3. Escribe todas las entradas en **un solo** `ArtifactData` → `action: "batch"`
   con `op: "set"`, `collection: "fotos"` y los campos `clave`, `tipo`
   (`destino` u `hotel`), `nombre`, `ciudad`, `asset`, `ancho`, `alto`,
   `fecha` (AAAA-MM-DD) y `documento` (por ejemplo, "Cotización CA2922").
4. Si reemplazaste una foto, borra la anterior: `Artifact` → `action: "delete"`,
   `url` del banco, `path` = el `asset` viejo.

No guardes en el banco capturas de pantalla, fotos de documentos ni fotos de
personas.

## Paso 2 — Genera el PDF

La carpeta del skill es la ruta que aparece como *Base directory* al cargarlo.
Guarda `datos.json` en una carpeta de trabajo propia (nunca dentro del skill) y
corre:

```bash
python3 "CARPETA_DEL_SKILL/scripts/generar.py" datos.json "Cotizacion-CA3311.pdf"
```

El motor responde con uno de estos resultados:

| Salida | Qué significa | Qué haces |
|---|---|---|
| `PDF generado: … hojas` | Listo | Entrega el PDF con la herramienta de envío de archivos |
| `FALTAN DATOS OBLIGATORIOS: …` | Falta algo esencial | Pídeselo al asesor. No lo inventes |
| `CONSULTA EL BANCO DE FOTOS: …` | Faltan fotos y no consultaste el banco | Consulta con las claves que da, descarga lo que encuentre, agrega `"banco_consultado": true` y vuelve a correr |

Nombra el PDF con el tipo de documento y su código, por ejemplo
`Cotizacion-CA3311.pdf`.

**Número de hojas:** la meta son 3 hojas y el motor las llena al máximo. Si el
contenido no cabe en 3, **no es un error**: el motor continúa en hojas
adicionales con el mismo diseño, parte las tablas largas repitiendo su
encabezado y nunca bloquea la cotización. No condenses ni quites datos del
asesor para forzar 3 hojas.

## Lo que el motor ya hace por ti

No tienes que revisarlo ni rehacerlo:

- Quita los bloques sin datos completos, sin dejar títulos sueltos ni tablas
  vacías.
- Numera las páginas según las hojas que realmente quedaron.
- Mantiene siempre la página de información adicional (política legal de
  Caminos, texto literal) y la franja de contacto con el aviso de la Ley 679 de
  2001 y la Ley 1336 de 2009 en todas las hojas.
- Usa los logos con ® del skill.
- Revisa que ningún bloque toque el pie de página.
- Si no cabe en 3 hojas, sigue en hojas de continuación con el encabezado de
  la marca. Las tablas de tarifas y servicios se parten repitiendo su
  encabezado, y la nota de precios viaja con las últimas tarifas.

No hace falta convertir el PDF a imágenes para revisarlo: el motor ya hizo esa
comprobación. Míralo solo si el asesor reporta un problema.

## Si el motor no corre

- **Falta `wkhtmltopdf`:** intenta `apt-get install -y wkhtmltopdf`. Si no se
  puede, díselo al asesor y detente. **No uses otro programa para hacer el PDF**
  (Chrome, WeasyPrint, reportlab): cada uno pagina distinto y el diseño está
  calibrado para este.
- **Falta `pdftoppm` o Pillow:** `apt-get install -y poppler-utils` y
  `pip install pillow --break-system-packages`.
- La tipografía Poppins la instala el motor sola desde `../../fuentes/` si no
  está.

## Notas

- Español de Colombia, "tú" para el viajero, nunca "usted".
- El pie de marca es siempre "Caminos — Para ir más lejos".
- Si el asesor pide una sección que la plantilla no tiene (ej. detalle de un
  hotel), dile que no está en el formato estándar. No la agregues.
