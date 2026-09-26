---
name: caminos-itinerario
description: Genera el itinerario de viaje de Caminos en PDF — el documento día a día que recibe el viajero antes de salir, con vuelos, recorrido diario, hoteles y recomendaciones. Usa este skill SIEMPRE que un asesor de Caminos pida "el itinerario", "armar el itinerario de la peregrinación", "el documento del viaje para los peregrinos", "el día a día del viaje" o entregue el detalle de un viaje ya confirmado para dárselo al pasajero. Para viajes cortos de 1 a 4 días (pasadías, fines de semana) usa caminos-itinerario-corto. No inventes el diseño ni el contenido del recorrido: usa el motor incluido y los datos reales del viaje.
---

# Itinerario de viaje — Caminos

Tu trabajo tiene **una sola parte**: entender lo que manda el asesor (el
programa del viaje en Word o PDF, texto pegado, reservas aéreas copiadas del
sistema, fotos o capturas) y convertirlo en un archivo de datos `datos.json`. El
PDF lo arma el motor `scripts/generar.py`: construye los bloques con el diseño
oficial, los reparte entre hojas sin dejar huecos evitables, mide el PDF real y
corrige si algo toca el pie.

**No escribas HTML ni toques la plantilla.** El diseño y la paginación ya están
resueltos y el motor los aplica igual cada vez.

## Regla no negociable

No inventes contenido del recorrido. Lugares, horarios, hoteles, comidas y
vuelos salen de lo que dio el asesor. Si el programa del asesor es muy extenso,
puedes **resumir la descripción de cada día** con sus mismos datos, sin agregar
lugares ni actividades. Si el asesor pide un cambio de diseño, dile que el
diseño está estandarizado y que ese cambio debe pasar por quien mantiene el
design system de Caminos.

## Información adicional: fija, no se modifica

Todo lo que va debajo del título **"Información adicional"** es la política
general de Agencia Caminos. Es texto legal, igual en todos los documentos, y
**no se modifica en ninguna circunstancia**:

- No lo resumas, no lo reescribas, no lo traduzcas, no lo acortes, no le
  agregues ni le quites cláusulas, no cambies su formato ni su orden.
- **Aunque el asesor lo pida**, no lo cambies. Explícale que es texto legal
  fijo y que un cambio en la política debe hacerlo la dirección de Caminos en
  el plugin, no en un documento.
- Las indicaciones propias del viaje van en `recomendaciones` o en `nota`,
  nunca en la información adicional. Si el programa del asesor trae su propia
  sección de políticas o condiciones generales, **no la copies**: el documento
  ya lleva la oficial.

El motor la verifica antes de generar: si la página no coincide con la copia
oficial (`politicas/informacion-adicional.html` del plugin), responde
`BLOQUEADO` y no genera el PDF. Si ves ese mensaje, no intentes arreglar la
página: avísale a la dirección de operaciones.

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
   python3 "CARPETA_DEL_SKILL/scripts/generar.py" datos.json "Itinerario-CA2790.pdf"
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
"quiero hacer una itinerario"), **no hagas nada más**: no leas la plantilla, no
corras el motor, no expliques el proceso. Responde únicamente con una línea y
esta plantilla, **copiada tal cual** dentro de un bloque de código para que la
pueda copiar con un clic:

```
/caminos-itinerario
Código:
Destino (ciudad o país principal):
Título del viaje:
Subtítulo (opcional):
Fecha de inicio:
Fecha de fin:
Pasajero:
Grupo o parroquia:
Acompañamiento espiritual:
Acomodación:
Bienvenida (opcional):
Vuelos (pega los vuelos tal cual del sistema):
Día a día (o adjunta el Word/PDF del programa):
Incluye / No incluye:
Hoteles (nombre · ciudad · dirección · teléfono):
Recomendaciones:
Fotos (adjúntalas y di dónde va cada una: portada, día N o el hotel):
```

La línea antes del bloque: "Copia, llena lo que tengas y envíamelo. Puedes
pegar reservas tal cual del sistema y adjuntar fotos o documentos."

Cuando el asesor la devuelva llena, sigue el Paso 1 normalmente. Los campos que
deje vacíos son opcionales, salvo los obligatorios de la tabla, que pides en un
solo mensaje.

## Paso 1 — Arma datos.json

Usa exactamente los campos de la tabla. Hay dos ejemplos completos en `scripts/`
(ábrelos solo si el motor rechaza tus datos): `datos-ejemplo.json` (peregrinación de
23 días con vuelos, hoteles y recomendaciones, 9 hojas) y
`datos-ejemplo-corto.json` (viaje terrestre de 2 días, 2 hojas). Usa exactamente
esos nombres de campo.

**Los archivos de ejemplo solo muestran el formato.** Nunca copies sus textos
(instrucciones, condiciones, notas, horarios, descripciones) a un documento
real, y nunca rellenes un campo que el asesor no dio con un texto genérico o
un marcador como "pendiente", "doméstico" o "por confirmar". Si un campo
opcional no viene, déjalo fuera: el motor quita el bloque.

**Fechas: escríbelas siempre en número (`2026-09-04`) y nunca pongas el día de
la semana.** El motor las escribe en español con el formato de cada parte.

| Campo | Qué va | Obligatorio |
|---|---|---|
| `codigo` | Código del itinerario, ej. `CA2790` | Sí |
| `codigo_documento` | Ej. `CAM-ITI-2790`. Si lo omites, el motor lo deriva | No |
| `subtitulo` | Línea pequeña sobre el título: "Viaje espiritual y cultural 2026" | No |
| `titulo` | Título de la portada. Usa `\n` para partirlo en dos líneas: "Peregrinación a\nTailandia y Europa" | Sí |
| `destino` | Ciudad o país principal del viaje, ej. `San Andrés`. Con él se busca la foto de portada en el banco | Sí, si no hay `foto_portada` |
| `fecha_inicio`, `fecha_fin` | `AAAA-MM-DD` | Sí |
| `pasajero` | Nombre del pasajero o del grupo | Sí |
| `grupo`, `acompanamiento`, `acomodacion` | Parroquia o grupo, sacerdote acompañante, tipo de habitación | No |
| `bienvenida` | Uno o dos párrafos, separados por una línea en blanco | No |
| `frase` | Una frase destacada. Si falta espacio, es lo primero que se quita | No |
| `vuelos` | Vuelos internacionales: lista de `{vuelo, fecha, origen, destino, sale, llega}` | No |
| `vuelos_internos` | Vuelos dentro del destino, misma estructura | No |
| `dias` | Lista de `{fecha, titulo, descripcion, comidas, etiquetas, hotel}`; opcional `foto` | Sí, al menos uno |
| `foto_portada` | Archivo de la foto del destino (ver "Fotos") | No |
| `incluye` | Lista de textos. Para agrupar por destino, agrega `{"grupo": "En París", "items": [...]}` | No |
| `no_incluye` | Lista de textos | No |
| `hoteles` | Lista de `{nombre, ciudad, direccion, telefono}`; opcional `foto` | No |
| `recomendaciones` | Lista de `{tema, items}`, ej. tema "Documentación y salud" | No |
| `nota` | Un aviso final corto | No |

**Cada día:**

- `titulo` corto: "Bangkok — Chiang Mai", "Llegada a Lourdes".
- `descripcion` en uno o dos párrafos cortos, en primera persona del plural
  ("visitamos", "salimos"), con los datos del programa del asesor.
- `comidas`: solo las incluidas, de estas: `Desayuno`, `Almuerzo`, `Cena`.
- `etiquetas`: otras marcas del día, por ejemplo `Noche a bordo`.
- `hotel`: el hotel de esa noche tal como debe leerse ("Hotel Century Park").
- El número del día lo pone el motor en orden. No lo escribas.

**Vuelos:** solo van en la tabla si tienes al menos el número de vuelo o el
horario. Si el programa dice solo "vuelo incluido", no lo pongas en `vuelos`:
el vuelo ya se menciona en el día, y pregúntale al asesor por el número y la
hora. `vuelo` sin espacio ("AF435"), `origen` y `destino` con el nombre
de la ciudad, horas en 24 horas. Si llega otro día, ponlo en `llega`:
"15:00 05/09". En el formato del sistema de reservas, el número suelto después
de la fecha es el día de la semana: ignóralo.

**Documentos del asesor (Word, PDF, fotos):** lee el programa completo y pasa
cada día a `dias`. Si algo no se lee bien o hay datos contradictorios (dos
hoteles para la misma noche, fechas que no cuadran con el número de días),
pregúntalo; no lo adivines.

Si falta algo obligatorio, pregúntalo **antes** de generar, todo en un solo
mensaje. Los vuelos, hoteles y recomendaciones son opcionales: un viaje
terrestre corto no los necesita.

## Fotos

Las fotos hacen la guía de viaje más atractiva y los clientes las piden. El
motor sabe ponerlas en tres lugares:

- **Foto del destino** (`foto_portada`): va en el encabezado. Reemplaza el
  bloque coral de la portada, con el degradado de protección del sistema de
  diseño, y el título queda sobre la foto. Es el estándar aprobado por la
  dirección. Solo si el asesor lo pide expresamente, pon
  `"estilo_foto": "cuerpo"`: la portada queda coral y la foto va debajo de los
  datos del viaje.
- **Un día** (`foto` dentro de ese día en `dias`): va a la derecha del texto
  del día.
- **Un hotel** (`foto` dentro de ese hotel en `hoteles`): sale en "Tus
  hoteles", antes de la tabla de hoteles.

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
   cada una? Opciones: portada, día 3, día 5, hotel Century Park o no usar". No adivines.
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

**Claves:** `destino:<destino>` para la portada y `hotel:<hotel>--<ciudad>` para cada
hotel de `hoteles`. Cada nombre va en minúsculas, sin tildes, con guiones en
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
python3 "CARPETA_DEL_SKILL/scripts/generar.py" datos.json "Itinerario-CA2790.pdf"
```

| Salida | Qué significa | Qué haces |
|---|---|---|
| `PDF generado: … hojas` | Listo | Entrega el PDF con la herramienta de envío de archivos |
| `FALTAN DATOS OBLIGATORIOS: …` | Falta algo esencial | Pídeselo al asesor. No lo inventes |
| `CONSULTA EL BANCO DE FOTOS: …` | Faltan fotos y no consultaste el banco | Consulta con las claves que da, descarga lo que encuentre, agrega `"banco_consultado": true` y vuelve a correr |
| `NO CABE: …` | Un bloque es más alto que una hoja entera (muy raro) | Acorta la descripción de los días más largos y vuelve a correr |
| `BLOQUEADO: …` | La información adicional no es la oficial | No generes. Avisa a la dirección de operaciones |

El itinerario no tiene un número fijo de hojas: depende de cuántos días tenga
el viaje. **Entre menos hojas, mejor**, pero sin montar nada sobre el pie.

## Lo que el motor ya hace por ti

- Apila los bloques en este orden: datos del viaje, bienvenida, frase, vuelos,
  día a día, incluye, no incluye, hoteles, recomendaciones, nota.
- Un día **nunca** se parte entre hojas. Las listas, la tabla de hoteles y las
  recomendaciones **sí** se parten, repitiendo el encabezado de la tabla, y un
  subtítulo de grupo nunca queda solo al final de una hoja.
- Pone en cada hoja interior el encabezado de la sección que contiene.
- Quita los bloques sin datos y numera las hojas según las que quedaron.
- Mide el PDF real y, si una hoja se pasa, vuelve a repartir con más margen.
- Mantiene la franja de contacto con el aviso de la Ley 679 de 2001 y la Ley
  1336 de 2009 en todas las hojas, y la información adicional al final, sola en
  su hoja.

No hace falta convertir el PDF a imágenes para revisarlo: el motor ya hizo esa
comprobación. Míralo solo si el asesor reporta un problema.

## Si el motor no corre

- **Falta `wkhtmltopdf`:** intenta `apt-get install -y wkhtmltopdf`. Si no se
  puede, díselo al asesor y detente. **No uses otro programa para hacer el PDF**
  (Chrome, WeasyPrint, reportlab): cada uno pagina distinto y el diseño está
  calibrado para este.
- **Falta `pdftoppm` o Pillow:** `apt-get install -y poppler-utils` y
  `pip install pillow --break-system-packages`.
- La tipografía Poppins la instala el motor sola si no está.

## Notas

- Español de Colombia, "tú" para el viajero, nunca "usted".
- Nombra el PDF con el tipo de documento y su código: `Itinerario-CA2790.pdf`.
