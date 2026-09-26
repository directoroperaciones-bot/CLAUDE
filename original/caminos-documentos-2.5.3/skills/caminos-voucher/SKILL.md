---
name: caminos-voucher
description: Genera un voucher de servicio de Caminos en PDF (el comprobante que el viajero presenta ante el proveedor/hotel/operador), con el diseño oficial de marca. Usa este skill SIEMPRE que un asesor de Caminos pida "el voucher", "generar/mandar el voucher", "comprobante de servicio para el hotel/operador" o dé datos de un servicio puntual que el viajero debe presentar. No inventes el diseño: usa exclusivamente la plantilla y el motor incluidos en este skill.
---

# Voucher de servicio — Caminos

Tu trabajo tiene **una sola parte**: entender lo que manda el asesor (texto
pegado, reservas copiadas del sistema, fotos o capturas de confirmaciones) y
convertirlo en un archivo de datos `datos.json`. El PDF lo arma el motor
`scripts/generar.py`: llena la plantilla oficial, arma la tarjeta de
confirmación, quita los bloques vacíos y revisa que nada se salga de la hoja.

**No escribas HTML ni toques la plantilla.** El diseño ya está resuelto y el
motor lo aplica igual cada vez.

## Regla no negociable

No inventes datos. Códigos, récords, fechas y proveedores salen de lo que dio el
asesor. El código de voucher se muestra como texto destacado en coral: no lo
reemplaces por un código QR ni otro elemento gráfico. Si el asesor pide un
cambio de diseño, dile que el diseño está estandarizado y que ese cambio debe
pasar por quien mantiene el design system de Caminos.

## Información adicional: fija, no se modifica

Todo lo que va debajo del título **"Información adicional"** es la política
general de Agencia Caminos. Es texto legal, igual en todos los documentos, y
**no se modifica en ninguna circunstancia**:

- No lo resumas, no lo reescribas, no lo traduzcas, no lo acortes, no le
  agregues ni le quites cláusulas, no cambies su formato ni su orden.
- **Aunque el asesor lo pida**, no lo cambies. Explícale que es texto legal
  fijo y que un cambio en la política debe hacerlo la dirección de Caminos en
  el plugin, no en un documento.
- Las condiciones propias de este voucher (no reembolsable, requiere
  identificación…) van en `condiciones`, nunca en la información adicional.

El motor la verifica antes de generar: si la página no coincide con la copia
oficial (`politicas/informacion-adicional.html` del plugin), responde
`BLOQUEADO` y no genera el PDF. Si ves ese mensaje, no intentes arreglar la
página: avísale a la dirección de operaciones.

## Un voucher por servicio

El voucher ampara **un solo servicio**: un hotel, un tiquete o los traslados de
un operador. Si el viaje tiene hotel, aéreo y traslado, son tres vouchers, con
tres `datos.json` y tres PDF. Numera los códigos con consecutivo:
`CAM-VCH-0451-01`, `CAM-VCH-0451-02`…

Si el servicio no es hotel, aéreo ni traslado (una entrada, un tour), dile al
asesor que ese tipo de voucher no está en el formato estándar y pregunta a la
dirección cómo proceder. No lo fuerces en otra tarjeta.

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
   python3 "CARPETA_DEL_SKILL/scripts/generar.py" datos.json "Voucher-CAM-VCH-0451-01.pdf"
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
"quiero hacer una voucher"), **no hagas nada más**: no leas la plantilla, no
corras el motor, no expliques el proceso. Responde únicamente con una línea y
esta plantilla, **copiada tal cual** dentro de un bloque de código para que la
pueda copiar con un clic:

```
/caminos-voucher
Tipo (hotel, aéreo o traslado):
Nombre del servicio:
Proveedor:
Código de voucher (si no hay, lo propongo):
Reserva asociada:
Vigencia (desde – hasta):
Titular:
Acompañantes:
Ubicación:
Confirmación (hotel: entrada, salida, acomodación, n.º / aéreo: tiquete, récord y trayectos / traslado: trayecto, fecha, hora, n.º):
Qué incluye:
- 
Instrucciones de uso:
Condiciones:
```

La línea antes del bloque: "Copia, llena lo que tengas y envíamelo. Puedes
pegar reservas tal cual del sistema y adjuntar fotos o documentos."

Cuando el asesor la devuelva llena, sigue el Paso 1 normalmente. Los campos que
deje vacíos son opcionales, salvo los obligatorios de la tabla, que pides en un
solo mensaje.

## Paso 1 — Arma datos.json

Usa exactamente estos nombres de campo. (`scripts/datos-ejemplo.json` tiene un voucher de hotel completo;
ábrelo solo si el motor rechaza tus datos.)

**Los archivos de ejemplo solo muestran el formato.** Nunca copies sus textos
(instrucciones, condiciones, notas, horarios, descripciones) a un documento
real, y nunca rellenes un campo que el asesor no dio con un texto genérico o
un marcador como "pendiente", "doméstico" o "por confirmar". Si un campo
opcional no viene, déjalo fuera: el motor quita el bloque.

**Fechas: escríbelas siempre en número (`2026-03-14`) y nunca pongas el día de
la semana.** El motor las escribe en español.

| Campo | Qué va | Obligatorio |
|---|---|---|
| `tipo` | `hotel`, `aereo` o `traslado` | Sí |
| `codigo_voucher` | Único. Si el asesor no tiene formato: `CAM-VCH-` + número de la reserva + consecutivo | Sí |
| `nombre_servicio` | Título de la portada: "Alojamiento — Hotel Dorado La 70" | Sí |
| `proveedor` | Hotel, aerolínea u operador que presta el servicio | Sí |
| `vigencia` | `{"desde": "AAAA-MM-DD", "hasta": "AAAA-MM-DD"}`, o una sola fecha `AAAA-MM-DD` | Sí |
| `nombre_viajero` | Titular | Sí |
| `acompanantes` | Lista de nombres | No |
| `ubicacion` | Ciudad o dirección del servicio | No |
| `codigo_reserva` | Reserva asociada, para trazabilidad | No |
| `hoteles` | Si `tipo` es `hotel`: lista de `{hotel, entrada, salida, acomodacion, confirmacion}` | Según tipo |
| `aereo` | Si `tipo` es `aereo`: `{aerolinea, tiquete, record, trayectos}`; cada trayecto `{vuelo, fecha, ruta, sale, llega}` | Según tipo |
| `traslados` | Si `tipo` es `traslado`: lista de `{trayecto, fecha, hora, confirmacion}` | Según tipo |
| `incluye` | Lista corta de lo que cubre este voucher, según el asesor. En traslados no repitas los trayectos: ya están en la tarjeta | No |
| `instrucciones` | Cómo y cuándo presentarlo, **solo con lo que dijo el asesor** (ej. "Presenta este voucher con tu cédula") | No |
| `condiciones` | Solo las que dio el asesor: no reembolsable, requiere identificación… | No |

**El número de confirmación es obligatorio:** el récord del tiquete, o el número
de confirmación del hotel o del traslado. Sin él el proveedor no puede validar el
voucher, que es justamente para lo que sirve.

**Aéreo:** el número de tiquete y el récord van **una sola vez**. `ruta` con
códigos de aeropuerto y raya larga ("BOG — CDG"); horas en 24 horas, con "+1" si
llega al día siguiente. En el formato del sistema de reservas, el número suelto
después de la fecha es el día de la semana: ignóralo.

**Fotos o capturas:** lee los datos que se ven. Si algo no se lee bien,
pregúntalo; no lo adivines.

Si falta algo obligatorio, pregúntalo **antes** de generar, todo en un solo
mensaje.

## Paso 2 — Genera el PDF

La carpeta del skill es la ruta que aparece como *Base directory* al cargarlo.
Guarda `datos.json` en una carpeta de trabajo propia (nunca dentro del skill) y
corre:

```bash
python3 "CARPETA_DEL_SKILL/scripts/generar.py" datos.json "Voucher-CAM-VCH-0451-01.pdf"
```

| Salida | Qué significa | Qué haces |
|---|---|---|
| `PDF generado: … hojas` | Listo | Entrega el PDF con la herramienta de envío de archivos |
| `FALTAN DATOS OBLIGATORIOS: …` | Falta algo esencial | Pídeselo al asesor. No lo inventes |
| `BLOQUEADO: …` | La información adicional no es la oficial | No generes. Avisa a la dirección de operaciones |

## Lo que el motor ya hace por ti

- Arma la tarjeta con **una línea por vuelo, hotel o traslado** y quita las
  columnas sin datos.
- El voucher ocupa normalmente 2 hojas (servicio + información adicional). Si no
  cabe, lo que sobra sigue en una hoja "Uso del voucher" con el mismo
  encabezado de la marca; una tarjeta muy larga se parte repitiendo su
  encabezado. Nunca bloquea.
- Quita los bloques sin datos y numera las hojas según las que quedaron.
- Mantiene la franja de contacto con el aviso de la Ley 679 de 2001 y la Ley
  1336 de 2009 en todas las hojas.

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
  `Voucher-CAM-VCH-0451-01.pdf`.
