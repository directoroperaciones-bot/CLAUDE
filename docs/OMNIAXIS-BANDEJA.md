# Enviar cotizaciones y confirmaciones a OMNIAXIS

## Cómo funciona

1. La asesora genera una **cotización** o una **confirmación** en Caminos Documentos (a mano, desde un PDF o con
   «Traer de la base»).
2. Al descargar el PDF, o con el botón **«Enviar a OMNIAXIS»**, la app pregunta si quiere enviarla:
   - **Venta nueva:** elige el tipo de venta (Vacacional, Religioso, Mayorista, Receptivo, Referido, Propio).
   - **Venta que ya existe** (el documento tiene un CA que está en la base): la app muestra el destino y la fecha
     de esa venta para confirmar que es la misma.
3. La app agrega **una fila** a la hoja **BANDEJA - Caminos Documentos** (pestaña `BANDEJA`), en la carpeta
   «Caminos Documentos - OMNIAXIS» de Drive:
   https://docs.google.com/spreadsheets/d/12x_xmEeK4neZZfgRq3ISDsMkLDH4GQCFbVUI-wGMm2M/edit
4. Un **bot de AppSheet** en OMNIAXIS lee la fila y crea la venta en PIPELINE con su consecutivo (o actualiza la
   que ya existe), y deja anotado en la bandeja qué hizo.

**La app nunca escribe en la base** («NO BORRAR - DATOS HERRAMIETA»): solo la lee, como siempre. La base solo la
cambia AppSheet. En el código, `escribirBandeja()` se niega si el destino fuera la base.

## Columnas de la bandeja

| Columna | Qué trae |
|---|---|
| ID_Envio | Clave única de 8 caracteres (como las de AppSheet) |
| Fecha_Envio | dd/mm/aaaa hh:mm |
| Tipo_Documento | Cotización o Confirmación |
| Clave_Documento | El documento en «Mis documentos» (ej. `cotizacion__ca99102`) |
| Codigo_Documento | CA99102, CAM-2026-2934… |
| Consecutivo_Existente | El consecutivo **solo si ya existe en la base** (ej. 2934); vacío si es venta nueva |
| Agente, Asesor_Nombre | Correo y nombre de la asesora |
| Titular | Titular (confirmación) |
| Destino, Fecha_Ida, Fecha_Regreso | Fechas en dd/mm/aaaa, como en PIPELINE |
| Numero_Pasajeros, Pasajeros | Número y texto de pasajeros |
| Tipo_Venta | El que eligió la asesora (venta nueva) |
| Tipo_De_Viaje | NACIONAL / INTERNACIONAL, **sugerido** por el destino |
| Estado_Sugerido | Cotizado (cotización) o Confirmada (confirmación) |
| Valor_Venta, Moneda | Valor final (si la cotización tiene una sola tarifa) y moneda |
| Detalle_Valores | Las tarifas (cotización) o los pagos (confirmación), uno por renglón |
| Incluye, No_Incluye, Servicios | Listas del documento; servicios = vuelos, hoteles y traslados con sus códigos |
| Observaciones | Notas para revisar |
| Estado_Envio | La app escribe **Pendiente**; el bot lo cambia a **Procesado** |
| ID_Venta, Consecutivo_Asignado, Fecha_Procesado | Los llena el bot |
| Enlace_PDF | Reservado para guardar el PDF en Drive (paso siguiente) |

No lleva costos internos (netos, markups, comisiones): esos los completa la asesora en OMNIAXIS, como hoy.

## Configurar el bot en AppSheet (una sola vez)

Se hace en el editor de OMNIAXIS (appsheet.com → la app → editar).

### 1. Agregar la bandeja como tabla
1. **Data → Tables → Add table** → Google Sheets → «BANDEJA - Caminos Documentos» → pestaña `BANDEJA`.
2. Permisos de la tabla: **Updates only** para los usuarios (las filas nuevas las pone la app).
3. En **Columns**: `ID_Envio` es la clave (Key). `Fecha_Ida` y `Fecha_Regreso` tipo **Date**; `Numero_Pasajeros`,
   `Valor_Venta` y `Consecutivo_Existente` tipo **Number**; `Fecha_Procesado` tipo **DateTime**; el resto **Text**
   (o **LongText** para Detalle_Valores, Incluye, No_Incluye y Servicios).
4. En la tabla: **Locale = Spanish (Colombia)**, para que lea las fechas dd/mm/aaaa.

### 2. Revisar cómo se asigna el consecutivo
En la tabla **PIPELINE**, columna `Numero_Consecutivo`: mira su **Initial value** (por ejemplo
`MAX(PIPELINE[Numero_Consecutivo]) + 1`) y lo mismo en `ID_Venta` (`UNIQUEID()`) y `Codigo_Visual_VYE`.
Cuando un bot agrega una fila, AppSheet aplica esos valores iniciales igual que en el formulario. Si el
consecutivo se asigna de otra forma (un script o una acción), avísame y ajustamos el paso 4.
Revisa también si `ID_Cliente` u otra columna es **obligatoria** (Require): el bot debe llenarla o la venta no se crea.

### 3. Acciones
En **Actions**, crea:

**a) «Crear venta desde bandeja»** (tabla BANDEJA)
- Do this: *Data: add a new row to another table using values from this row* → tabla **PIPELINE**.
- Valores:
  - `Agente` = `[Agente]`
  - `Fecha_Registro` = `TODAY()`
  - `Destino` = `[Destino]`
  - `Fecha_Ida` = `[Fecha_Ida]` · `Fecha_Regreso` = `[Fecha_Regreso]`
  - `Estado` = `[Estado_Sugerido]`
  - `Tipo_Venta` = `[Tipo_Venta]` · `Tipo_De_Viaje` = `[Tipo_De_Viaje]`
  - `Numero_Pasajeros_Estimados` = `[Numero_Pasajeros]`
  - `Observaciones` = `CONCATENATE("Caminos Documentos ", [Tipo_Documento], " ", [Codigo_Documento], " · envío ", [ID_Envio])`
  - No asignes `ID_Venta` ni `Numero_Consecutivo`: los pone AppSheet con su valor inicial.

**b) «Marcar Confirmada»** (tabla PIPELINE)
- Do this: *Data: set the values of some columns in this row* → `Estado` = `"Confirmada"`.
- Only if: `[Estado] = "Cotizado"` (nunca baja una venta Facturada o Cancelada).

**c) «Actualizar venta existente»** (tabla BANDEJA)
- Do this: *Data: execute an action on a set of rows* → tabla PIPELINE →
  filas: `FILTER("PIPELINE", [Numero_Consecutivo] = [_THISROW].[Consecutivo_Existente])` → acción «Marcar Confirmada».

**d) «Marcar procesado»** (tabla BANDEJA)
- Do this: *Data: set the values of some columns in this row*:
  - `Estado_Envio` = `"Procesado"`
  - `Fecha_Procesado` = `NOW()`
  - `Consecutivo_Asignado` = `IF(ISNOTBLANK([Consecutivo_Existente]), [Consecutivo_Existente], ANY(SELECT(PIPELINE[Numero_Consecutivo], CONTAINS([Observaciones], [_THISROW].[ID_Envio]))))`
  - `ID_Venta` = `ANY(SELECT(PIPELINE[ID_Venta], IF(ISNOTBLANK([_THISROW].[Consecutivo_Existente]), [Numero_Consecutivo] = [_THISROW].[Consecutivo_Existente], CONTAINS([Observaciones], [_THISROW].[ID_Envio]))))`

### 4. Bot
En **Automation → Bots → New bot** «Bandeja de Caminos Documentos»:
- **Event:** Data change → **Adds only** → tabla BANDEJA → condición `[Estado_Envio] = "Pendiente"`.
- **Process:**
  1. *Branch on a condition:* `ISBLANK([Consecutivo_Existente])`
     - **Sí (venta nueva):** paso «Run a data action» → «Crear venta desde bandeja».
     - **No (venta existente):** si `[Estado_Sugerido] = "Confirmada"` → «Run a data action» → «Actualizar venta existente».
  2. Paso final (en las dos ramas): «Run a data action» → «Marcar procesado».

### 5. Probar
1. Comparte la bandeja con las cuentas de Google que usan las asesoras en Composio (si no, la app no puede escribir).
2. En Caminos Documentos, genera una cotización de prueba y envíala como venta nueva.
3. En la bandeja aparece la fila **Pendiente**; en uno o dos minutos el bot la deja **Procesado** con su
   `Consecutivo_Asignado`, y la venta aparece en OMNIAXIS como **Cotizado**.
4. Completa en OMNIAXIS lo que el documento no trae (cliente, netos, markup) y borra la venta de prueba si no sirve.

## Pendiente: el PDF en Drive
Composio no tiene hoy una herramienta de Google Drive que reciba el PDF tal como lo entrega la app (como contenido
codificado). Propuesta: la app guarda el contenido en un archivo de texto temporal en la carpeta de la bandeja y un
pequeño Apps Script de la hoja lo convierte en PDF cada pocos minutos, lo nombra con el consecutivo y pone el enlace
en `Enlace_PDF`. Mientras tanto, el PDF se vuelve a generar cuando se quiera desde «Mis documentos».
