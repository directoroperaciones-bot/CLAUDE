---
name: caminos-confirmacion
description: Genera una confirmación de reserva de Caminos en PDF, con el diseño oficial de marca, una vez el cliente ya pagó/reservó. Usa este skill SIEMPRE que un asesor de Caminos pida "confirmar una reserva", "mandar la confirmación", "generar confirmación de pago/reserva" o dé datos de una reserva ya cerrada esperando el documento para el cliente. No inventes el diseño: usa exclusivamente la plantilla y el motor incluidos en este skill.
---

# Confirmación de reserva — Caminos

Tu trabajo tiene **una sola parte**: entender lo que manda el asesor (texto
pegado, reservas aéreas copiadas del sistema, fotos o capturas de confirmaciones
de hotel y traslado) y convertirlo en un archivo de datos `datos.json`. El PDF lo
arma el motor `scripts/generar.py`: llena la plantilla oficial, arma las tarjetas
de confirmación, las reparte entre hojas, quita los bloques vacíos y revisa que
nada se salga de la hoja.

**No escribas HTML ni toques la plantilla.** El diseño ya está resuelto y el
motor lo aplica igual cada vez.

## Regla no negociable

No inventes datos. Códigos, récords, fechas, montos y proveedores salen de lo
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
- El asesor solo entrega los datos del viaje. Esa página no lleva datos del
  viaje. Las indicaciones propias de esta reserva van en `nota_importante`.

El motor la verifica antes de generar: si la página no coincide con la copia
oficial (`politicas/informacion-adicional.html` del plugin), responde
`BLOQUEADO` y no genera el PDF. Si ves ese mensaje, no intentes arreglar la
página: avísale a la dirección de operaciones.

## Ruta rápida (sigue esto siempre)

El asesor está esperando. Haz lo mínimo:

1. Si el mensaje no trae datos, responde con la plantilla (ver "Si el asesor
   llama el skill sin datos") y detente.
2. Si falta un dato obligatorio, pídelo en un solo mensaje y detente.
3. Si todo está, **en una sola llamada a la terminal** escribe `datos.json` y
   corre el motor:

   ```bash
   mkdir -p caminos-trabajo && cd caminos-trabajo && cat > datos.json <<'FIN'
   { ...los datos, con los campos de la tabla del Paso 1... }
   FIN
   python3 "CARPETA_DEL_SKILL/scripts/generar.py" datos.json "Confirmacion-CAM-2026-2790.pdf"
   ```

4. Si responde `PDF generado`, entrega el PDF con la herramienta de envío de
   archivos y escribe una sola línea. Si responde otra cosa, sigue la tabla del
   Paso 2.

**No hagas nada más:** no leas los archivos de ejemplo ni la plantilla (los
campos están en la tabla del Paso 1), no instales nada si el motor corre, no
conviertas el PDF a imágenes para revisarlo y no le expliques el proceso al
asesor. Cada paso extra es tiempo de espera.

## Si el asesor llama el skill sin datos

Si el mensaje del asesor no trae datos del viaje (solo el comando, o algo como
"quiero hacer una confirmación"), **no hagas nada más**: no leas la plantilla, no
corras el motor, no expliques el proceso. Responde únicamente con una línea y
esta plantilla, **copiada tal cual** dentro de un bloque de código para que la
pueda copiar con un clic:

```
/caminos-confirmacion
Código de reserva:
Título del viaje:
Titular:
Destino:
Pasajeros:
Fecha de ida:
Fecha de regreso:
Estado de pago:
Aéreo (aerolínea, número de tiquete, récord; pega los trayectos tal cual del sistema):
Hoteles (hotel · entrada · salida · acomodación · n.º de confirmación):
- 
Traslados (operador · trayecto · fecha · hora · n.º de confirmación):
- 
Servicios confirmados:
- 
Pagos (concepto · valor · estado):
- 
Nota para el viajero:
Asesor (nombre, correo, teléfono):
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

Usa exactamente estos nombres de campo. (`scripts/datos-ejemplo.json` tiene una confirmación completa;
ábrelo solo si el motor rechaza tus datos.)

**Los archivos de ejemplo solo muestran el formato.** Nunca copies sus textos
(instrucciones, condiciones, notas, horarios, descripciones) a un documento
real, y nunca rellenes un campo que el asesor no dio con un texto genérico o
un marcador como "pendiente", "doméstico" o "por confirmar". Si un campo
opcional no viene, déjalo fuera: el motor quita el bloque.

**Fechas: escríbelas siempre en número (`2026-09-04`) y nunca pongas el día de
la semana.** El motor las escribe en español con el formato de cada parte del
documento.

| Campo | Qué va | Obligatorio |
|---|---|---|
| `codigo_reserva` | Ej. `CAM-2026-2790` | Sí |
| `codigo_documento` | Ej. `CAM-CONF-2790`. Si lo omites, el motor lo deriva | No |
| `titulo_viaje` | Título de la portada: "Santuario de Las Lajas" | Sí |
| `nombre_viajero` | Titular de la reserva | Sí |
| `parrafo_confirmacion` | Una frase después de "Hola …, confirmamos tu reserva con Caminos." | No |
| `destino` | Texto | Sí |
| `pasajeros` | "2 adultos" | No |
| `estado_pago` | "Pagado en su totalidad", "Abono recibido, saldo pendiente" | Sí |
| `fecha_salida`, `fecha_regreso` | `AAAA-MM-DD` | Sí |
| `aereo` | Lista de tiquetes (ver abajo) | No |
| `hoteles` | Lista de `{hotel, entrada, salida, acomodacion, confirmacion}` | No |
| `traslados` | Lista de `{operador, trayecto, fecha, hora, confirmacion}` | No |
| `servicios_confirmados` | Lista corta de textos | No |
| `pagos` | Lista de `{concepto, valor, estado}`; valor "$8.500.000" | No |
| `nota_importante` | Punto de encuentro, hora, documentos que debe llevar | No |
| `asesor`, `asesor_correo`, `asesor_telefono` | Textos (ver "Datos del asesor") | Sí, los tres |

**Aéreo: un elemento por tiquete.** Cada uno lleva `aerolinea`, `tiquete`,
`record` y `trayectos`, que es la lista de `{vuelo, fecha, ruta, sale, llega}`.

- El número de tiquete y el récord van **una sola vez por tiquete**, no en cada
  trayecto. Si hay varias aerolíneas o varios pasajeros con récord distinto,
  son varios elementos en `aereo`.
- `ruta` con códigos de aeropuerto y raya larga: "BOG — CDG".
- `sale` y `llega` en 24 horas: "21:35". Si llega al día siguiente: "15:00 +1".
- En el formato del sistema de reservas (`AF 435 Y 04SEP 5 BOGCDG HK1 2135 1500+1`)
  el número suelto después de la fecha es el día de la semana: ignóralo.
- **El récord es obligatorio si hay vuelos.** Si no viene, pídelo: sin él el
  pasajero no puede gestionar nada con la aerolínea.

**Hoteles y traslados:** pide siempre el número de confirmación de cada uno. Si
el asesor no lo tiene, deja el campo vacío; no escribas "pendiente".

**Fotos o capturas** de confirmaciones: lee los datos que se ven. Si algo no se
lee bien (un código, una fecha), pregúntalo; no lo adivines.

Si falta algo obligatorio (la columna "Sí"), pregúntalo **antes** de generar,
todo en un solo mensaje. No presentes como obligatorio lo que no lo es.

## Paso 2 — Genera el PDF

La carpeta del skill es la ruta que aparece como *Base directory* al cargarlo.
Guarda `datos.json` en una carpeta de trabajo propia (nunca dentro del skill) y
corre:

```bash
python3 "CARPETA_DEL_SKILL/scripts/generar.py" datos.json "Confirmacion-CAM-2026-2790.pdf"
```

| Salida | Qué significa | Qué haces |
|---|---|---|
| `PDF generado: … hojas` | Listo | Entrega el PDF con la herramienta de envío de archivos |
| `FALTAN DATOS OBLIGATORIOS: …` | Falta algo esencial | Pídeselo al asesor. No lo inventes |
| `BLOQUEADO: …` | La información adicional no es la oficial | No generes. Avisa a la dirección de operaciones |

**Número de hojas:** la meta son 3 hojas (2 si la reserva es corta). Si el
contenido no cabe, **no es un error**: el motor continúa en hojas adicionales
con el mismo diseño y nunca bloquea la confirmación. No quites trayectos,
hoteles, traslados ni pagos para forzar menos hojas.

## Lo que el motor ya hace por ti

- Arma una tarjeta por tiquete, una de hoteles y una por operador de traslado,
  con **una línea por vuelo, hotel o traslado**.
- Quita la columna entera cuando ningún ítem tiene ese dato.
- Llena la hoja 1 con las tarjetas que caben y pasa el resto a la hoja
  siguiente. Una tarjeta larga (un tiquete con muchos trayectos) se parte
  entre hojas repitiendo su encabezado con aerolínea, tiquete y récord.
- Si todo cabe en menos hojas, lo sube. Si no cabe en 3, sigue en hojas de
  continuación; nunca bloquea.
- Quita los bloques sin datos y numera las hojas según las que quedaron.
- Mantiene la franja de contacto con el aviso de la Ley 679 de 2001 y la Ley
  1336 de 2009 en todas las hojas, y la página de información adicional al
  final.

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
- Nombra el PDF con el tipo de documento y su código:
  `Confirmacion-CAM-2026-2790.pdf`.
