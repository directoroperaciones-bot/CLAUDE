---
name: caminos-itinerario-corto
description: Genera el itinerario corto de Caminos en PDF, para viajes de 1 a 4 días, por lo general nacionales y terrestres (pasadías, fines de semana, peregrinaciones cercanas como Chiquinquirá, Monserrate o Las Lajas). Usa este skill cuando el asesor pida "el itinerario corto", "itinerario del pasadía", "itinerario del fin de semana" o escriba /caminos-itinerario-corto. Para viajes largos o internacionales usa caminos-itinerario. Mismo diseño oficial; no inventes contenido.
---

# Itinerario corto — Caminos

Es el itinerario de Caminos para **viajes de 1 a 4 días**. Tiene el mismo
diseño oficial que el itinerario largo y lo arma el mismo motor, pero con menos
bloques y una meta clara: **2 hojas** (el viaje en la hoja 1 y la información
adicional en la hoja 2).

Tu trabajo tiene **una sola parte**: entender lo que manda el asesor y
convertirlo en `datos.json`. El PDF lo arma el motor del itinerario.

**No escribas HTML ni toques la plantilla.**

## Regla no negociable

No inventes contenido del recorrido. Lugares, horarios, hoteles y comidas salen
de lo que dio el asesor. Puedes resumir la descripción de cada día con sus
mismos datos, sin agregar lugares ni actividades. Si el asesor pide un cambio de
diseño, dile que el diseño está estandarizado y que ese cambio debe pasar por
quien mantiene el design system de Caminos.

## Información adicional: fija, no se modifica

Todo lo que va debajo del título **"Información adicional"** es la política
general de Agencia Caminos. Es texto legal, igual en todos los documentos, y
**no se modifica en ninguna circunstancia**, aunque el asesor lo pida. Un cambio
en la política lo hace la dirección de Caminos en el plugin. Las indicaciones
propias del viaje van en `recomendaciones` o en `nota`.

El motor la verifica antes de generar: si la página no coincide con la copia
oficial, responde `BLOQUEADO` y no genera el PDF. Si ves ese mensaje, avísale a
la dirección de operaciones.

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
   python3 "CARPETA_DEL_SKILL/../caminos-itinerario/scripts/generar.py" --compacto datos.json "Itinerario-CA9001.pdf"
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

Si el mensaje no trae datos del viaje (solo el comando, o algo como "quiero
hacer un itinerario corto"), **no hagas nada más**: no leas otros archivos, no
corras el motor, no expliques el proceso. Responde únicamente con una línea y
esta plantilla, **copiada tal cual** dentro de un bloque de código:

```
/caminos-itinerario-corto
Código:
Destino (ciudad o país principal):
Título del viaje:
Subtítulo (opcional):
Fecha de inicio:
Fecha de fin:
Pasajero o grupo:
Grupo o parroquia:
Acompañamiento espiritual:
Acomodación (si hay noche de hotel):
Bienvenida (opcional):
Día a día (qué se hace cada día, comidas incluidas, hotel de la noche):
Incluye / No incluye (opcional):
Recomendaciones (opcional):
Fotos (adjúntalas y di dónde va cada una: portada o día N):
```

La línea antes del bloque: "Copia, llena lo que tengas y envíamelo. Puedes
pegar el programa tal cual o adjuntar el Word o PDF."

## Paso 1 — Arma datos.json

Usa los mismos campos del itinerario largo. El ejemplo de este documento es
`../caminos-itinerario/scripts/datos-ejemplo-corto.json` (peregrinación de 2
días a Chiquinquirá, 2 hojas). **Solo muestra el formato: nunca copies sus
textos** ni rellenes campos que el asesor no dio.

**Fechas siempre en número (`2026-06-12`), sin día de la semana.** El motor las
escribe en español.

| Campo | Qué va | Obligatorio |
|---|---|---|
| `codigo` | Ej. `CA9001` | Sí |
| `titulo` | Usa `\n` para partirlo en dos líneas: "Peregrinación a\nChiquinquirá" | Sí |
| `destino` | Ciudad o país principal del viaje, ej. `San Andrés`. Con él se busca la foto de portada en el banco | Sí, si no hay `foto_portada` |
| `subtitulo` | "Viaje de fe 2026" | No |
| `fecha_inicio`, `fecha_fin` | `AAAA-MM-DD` (iguales si es pasadía) | Sí |
| `pasajero` | Nombre del pasajero o del grupo | Sí |
| `grupo`, `acompanamiento`, `acomodacion` | Textos | No |
| `bienvenida` | Un párrafo corto | No |
| `dias` | Lista de `{fecha, titulo, descripcion, comidas, etiquetas, hotel}`; opcional `foto` | Sí, al menos uno |
| `foto_portada` | Archivo de la foto del destino (ver "Fotos") | No |
| `incluye`, `no_incluye` | Listas cortas | No |
| `recomendaciones` | Lista de `{tema, items}`, uno o dos temas | No |
| `nota` | Un aviso final corto | No |

En un viaje corto normalmente **no van** `frase`, `vuelos`, `vuelos_internos`
ni `hoteles`. Si el viaje tiene vuelo, varios hoteles o más de 4 días, usa el
skill `caminos-itinerario`.

- `descripcion` de cada día en dos o tres líneas, en primera persona del plural
  ("salimos", "visitamos"). Conserva todos los datos que dio el asesor: lugares,
  horas y detalles como "desde la parroquia" o "por el sendero".
- **Todo lo que el asesor dio va en el documento.** Si dijo qué incluye o qué no
  incluye, llena `incluye` y `no_incluye`; si dio recomendaciones, llena
  `recomendaciones`. Solo omites lo que el asesor no mencionó.
- `comidas`: solo las incluidas (`Desayuno`, `Almuerzo`, `Cena`).
- `hotel`: el hotel de esa noche, si hay ("Hotel Sausalito").

Si falta algo obligatorio, pregúntalo **antes** de generar, en un solo mensaje.

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

La carpeta de este skill es la ruta que aparece como *Base directory* al
cargarlo. El motor está en el skill del itinerario, dentro del mismo plugin.
`--compacto` le pide que intente dejar todo en menos hojas. Guarda `datos.json` en una carpeta de trabajo propia y corre:

```bash
python3 "CARPETA_DEL_SKILL/../caminos-itinerario/scripts/generar.py" --compacto datos.json "Itinerario-CA9001.pdf"
```

| Salida | Qué haces |
|---|---|
| `PDF generado: 2 hojas` | Entrégalo con la herramienta de envío de archivos |
| `PDF generado: 3 hojas o más` | Acorta: resume las descripciones, deja una sola lista de recomendaciones, quita la bienvenida si es larga. Vuelve a generar. Si con eso no baja a 2 hojas, entrégalo así y dile al asesor que el contenido no cabe en una sola hoja |
| `FALTAN DATOS OBLIGATORIOS: …` | Pídeselo al asesor. No lo inventes |
| `CONSULTA EL BANCO DE FOTOS: …` | Consulta el banco con las claves que da, descarga lo que encuentre, agrega `"banco_consultado": true` y vuelve a correr |
| `BLOQUEADO: …` | No generes. Avisa a la dirección de operaciones |

El motor ya quita los bloques vacíos, numera las hojas, mantiene la franja de
contacto con el aviso de la Ley 679 de 2001 y la Ley 1336 de 2009 en todas las
hojas y revisa que nada toque el pie. No hace falta revisar el PDF como imagen.

Si el motor no corre por falta de `wkhtmltopdf`, `pdftoppm` o Pillow, sigue la
sección "Si el motor no corre" del skill `caminos-itinerario`. No uses otro
programa para hacer el PDF.

## Notas

- Español de Colombia, "tú" para el viajero, nunca "usted".
- Nombra el PDF como `Itinerario-CA9001.pdf`.
