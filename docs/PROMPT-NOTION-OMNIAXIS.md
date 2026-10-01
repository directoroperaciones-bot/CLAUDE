# Pedido para Notion: configurar el envío a OMNIAXIS y documentarlo

> Copia todo lo que está debajo de la línea y pégalo en Notion AI (o en el agente de Notion) como un solo mensaje.

---

Hola. Necesito tu ayuda con dos cosas al tiempo:

1. **Guiarme paso a paso** para configurar en AppSheet (mi app OMNIAXIS) un bot que cree ventas a partir de una hoja
   «bandeja». Yo hago los clics en el editor de AppSheet; tú me dices qué hacer, en orden, y me preguntas qué veo
   antes de seguir.
2. **Documentar todo en Notion** mientras avanzamos, para que quede el manual de cómo funciona y cómo se mantiene.

Escríbeme en español de Colombia, con frases cortas y sin jerga. No soy programadora.

## Contexto

Soy la directora de operaciones de **Agencia de Viajes Caminos** (Colombia). Tenemos dos herramientas:

- **OMNIAXIS:** nuestra app de operación en **AppSheet**, sobre la hoja de Google Sheets
  **«NO BORRAR - DATOS HERRAMIETA»**
  (https://docs.google.com/spreadsheets/d/1k32N3e4r5jS0iWvyPWsUGr6XLY7homB5sEhJIj9Bjbg/edit).
  Esa hoja es **muy delicada**: nadie la edita a mano; solo AppSheet la cambia.
- **Caminos Documentos:** una app web (en claude.ai) donde las asesoras arman cotizaciones y confirmaciones en PDF
  con la imagen de la agencia. Puede leer la venta desde la base (solo lectura) y leer PDFs de proveedores.

**Lo nuevo:** cuando la asesora genera una cotización o una confirmación, la app pregunta «¿Enviar a OMNIAXIS?».
Si dice que sí, la app **agrega una fila** en otra hoja, la **bandeja**:
**«BANDEJA - Caminos Documentos»**, pestaña `BANDEJA`
(https://docs.google.com/spreadsheets/d/12x_xmEeK4neZZfgRq3ISDsMkLDH4GQCFbVUI-wGMm2M/edit),
en la carpeta de Drive «Caminos Documentos - OMNIAXIS».
**La app nunca escribe en la base.** Lo que falta es el bot de AppSheet que lea la bandeja y cree o actualice la
venta en la tabla **PIPELINE**, con el **consecutivo que asigna AppSheet**.

## Reglas que no se pueden romper

1. La base «NO BORRAR - DATOS HERRAMIETA» **solo la cambia AppSheet**. Nada de editar celdas a mano ni scripts que
   escriban en ella.
2. El **consecutivo** (`Numero_Consecutivo` / `Codigo_Visual_VYE`, ej. 2934 / CA2934) lo asigna **AppSheet con su
   lógica de siempre**. El bot no inventa números.
3. A la base solo llega el **valor final** que vio el cliente. Los netos, markups y comisiones los completa la asesora
   en OMNIAXIS, como hoy.
4. Un bot **nunca baja el estado** de una venta: una venta «Facturado» o «Cancelada» no vuelve a «Confirmada».
5. Antes de activar el bot para todos, se prueba con **una venta de prueba** que luego se borra desde AppSheet.

## Columnas de la bandeja (pestaña `BANDEJA`, en este orden, A → AC)

| Columna | Qué trae | Tipo sugerido en AppSheet |
|---|---|---|
| ID_Envio | Clave única de 8 caracteres | Text (**Key**) |
| Fecha_Envio | dd/mm/aaaa hh:mm | Text o DateTime |
| Tipo_Documento | «Cotización» o «Confirmación» | Enum |
| Clave_Documento | Identificador del documento en la app | Text |
| Codigo_Documento | Código del documento (ej. CA99102, CAM-2026-2934) | Text |
| Consecutivo_Existente | Consecutivo de la venta **solo si ya existe** en la base (ej. 2934); vacío si es nueva | Number |
| Agente | Correo de la asesora | Email |
| Asesor_Nombre | Nombre de la asesora | Text |
| Titular | Titular de la reserva (en confirmaciones) | Text |
| Destino | Destino | Text |
| Fecha_Ida | dd/mm/aaaa | Date |
| Fecha_Regreso | dd/mm/aaaa | Date |
| Numero_Pasajeros | Número | Number |
| Pasajeros | Texto («2 adultos», «3 personas: …») | Text |
| Tipo_Venta | Vacacional, Religioso, Mayorista, Receptivo, Referido o Propio (venta nueva) | Enum |
| Tipo_De_Viaje | NACIONAL o INTERNACIONAL (**sugerido** por el destino) | Enum |
| Estado_Sugerido | «Cotizado» (cotización) o «Confirmada» (confirmación) | Enum |
| Valor_Venta | Valor final si la cotización tiene una sola tarifa | Number / Price |
| Moneda | COP, USD o EUR | Enum |
| Detalle_Valores | Tarifas o pagos, uno por renglón | LongText |
| Incluye | Lo que incluye, uno por renglón | LongText |
| No_Incluye | Lo que no incluye, uno por renglón | LongText |
| Servicios | Vuelos, hoteles y traslados con sus códigos | LongText |
| Observaciones | Notas para revisar | LongText |
| Estado_Envio | La app escribe «Pendiente»; el bot lo cambia a «Procesado» | Enum |
| ID_Venta | Lo llena el bot | Ref → PIPELINE |
| Consecutivo_Asignado | Lo llena el bot | Number |
| Fecha_Procesado | Lo llena el bot | DateTime |
| Enlace_PDF | Reservado (paso futuro: guardar el PDF en Drive) | Url |

## Lo que ya sé de la base (tabla PIPELINE)

- Columnas: ID_Venta, ID_Cliente, Agente, Fecha_Registro, Solicitante, Pasajeros_Viajando, Tipo_Venta, Tipo_De_Viaje,
  Destino, Fecha_Ida, Fecha_Regreso, Estado, Observaciones, …, Total_Cobrado, Titular_Vacacional, …,
  Numero_Pasajeros_Estimados, …, Paquete_Religioso, Acomodacion_Religiosa, …, Canal_Venta, Numero_Consecutivo,
  Codigo_Visual_VYE, …
- `ID_Venta` son claves de 8 caracteres (tipo `UNIQUEID()`).
- Valores que se usan hoy:
  - **Estado:** Cotizado, Confirmada, Facturado, Cancelada.
  - **Tipo_Venta:** Vacacional, Religioso, Mayorista, Receptivo, Referido, Propio.
  - **Tipo_De_Viaje:** NACIONAL, INTERNACIONAL.
- Fechas en formato dd/mm/aaaa. El último consecutivo es CA2934 (1 de octubre de 2026).
- **No sé todavía** (revisémoslo juntas en el editor):
  - cómo se asigna `Numero_Consecutivo` (su *Initial value* o si lo hace otra acción o script);
  - lo mismo para `ID_Venta` y `Codigo_Visual_VYE`;
  - si `ID_Cliente` u otra columna es **obligatoria** (Require). Si lo es, decidimos qué pone el bot.

## Lo que hay que configurar en AppSheet

### Paso 1. Agregar la bandeja como tabla
- Data → Add table → Google Sheets → «BANDEJA - Caminos Documentos» → pestaña `BANDEJA`.
- Permisos de la tabla para los usuarios: **solo actualizar** (las filas nuevas las pone la app).
- Tipos de columna como en la tabla de arriba; `ID_Envio` es la clave.
- Locale de la tabla: **Spanish (Colombia)**, para leer bien las fechas dd/mm/aaaa.

### Paso 2. Revisar cómo nace una venta
- En PIPELINE, revisar el *Initial value* de `ID_Venta`, `Numero_Consecutivo` y `Codigo_Visual_VYE`, y qué columnas
  son obligatorias. Escribirlo en la documentación.

### Paso 3. Acciones
1. **«Crear venta desde bandeja»** (tabla BANDEJA) → *Data: add a new row to another table using values from this row* → PIPELINE:
   - `Agente` = `[Agente]`
   - `Fecha_Registro` = `TODAY()`
   - `Destino` = `[Destino]`
   - `Fecha_Ida` = `[Fecha_Ida]`, `Fecha_Regreso` = `[Fecha_Regreso]`
   - `Estado` = `[Estado_Sugerido]`
   - `Tipo_Venta` = `[Tipo_Venta]`, `Tipo_De_Viaje` = `[Tipo_De_Viaje]`
   - `Numero_Pasajeros_Estimados` = `[Numero_Pasajeros]`
   - `Observaciones` = `CONCATENATE("Caminos Documentos ", [Tipo_Documento], " ", [Codigo_Documento], " · envío ", [ID_Envio])`
   - **No** asignar `ID_Venta` ni `Numero_Consecutivo`: que AppSheet use sus valores iniciales.
2. **«Marcar Confirmada»** (tabla PIPELINE) → *set the values of some columns in this row* → `Estado` = `"Confirmada"`.
   Solo si: `[Estado] = "Cotizado"`.
3. **«Actualizar venta existente»** (tabla BANDEJA) → *execute an action on a set of rows* → PIPELINE →
   `FILTER("PIPELINE", [Numero_Consecutivo] = [_THISROW].[Consecutivo_Existente])` → acción «Marcar Confirmada».
4. **«Marcar procesado»** (tabla BANDEJA) → *set the values of some columns in this row*:
   - `Estado_Envio` = `"Procesado"`
   - `Fecha_Procesado` = `NOW()`
   - `Consecutivo_Asignado` = `IF(ISNOTBLANK([Consecutivo_Existente]), [Consecutivo_Existente], ANY(SELECT(PIPELINE[Numero_Consecutivo], CONTAINS([Observaciones], [_THISROW].[ID_Envio]))))`
   - `ID_Venta` = `ANY(SELECT(PIPELINE[ID_Venta], IF(ISNOTBLANK([_THISROW].[Consecutivo_Existente]), [Numero_Consecutivo] = [_THISROW].[Consecutivo_Existente], CONTAINS([Observaciones], [_THISROW].[ID_Envio]))))`

### Paso 4. Bot «Bandeja de Caminos Documentos»
- **Evento:** Data change → **Adds only** → tabla BANDEJA → condición `[Estado_Envio] = "Pendiente"`.
- **Proceso:**
  1. *Branch on a condition* `ISBLANK([Consecutivo_Existente])`:
     - **Sí (venta nueva):** Run a data action → «Crear venta desde bandeja».
     - **No (venta existente):** si `[Estado_Sugerido] = "Confirmada"` → Run a data action → «Actualizar venta existente».
  2. En las dos ramas, al final: Run a data action → «Marcar procesado».

### Paso 5. Probar
1. Compartir la bandeja (edición) con las cuentas de Google que usan las asesoras en Composio.
2. Desde Caminos Documentos, enviar una cotización de prueba como venta nueva.
3. Ver la fila «Pendiente» en la bandeja → en uno o dos minutos debe quedar «Procesado» con su `Consecutivo_Asignado`,
   y la venta debe aparecer en OMNIAXIS como «Cotizado».
4. Enviar una confirmación de esa misma venta (con su CA) → la venta debe pasar a «Confirmada».
5. Borrar la venta de prueba desde AppSheet (no desde la hoja).
6. Si algo falla: revisar en AppSheet **Monitor → Automation monitor** el error del bot y anotarlo en la documentación.

### Paso 6 (opcional). Ver los documentos dentro de la venta
- En la tabla BANDEJA, `ID_Venta` como **Ref** a PIPELINE: así cada venta muestra sus envíos como lista relacionada,
  sin agregar columnas a PIPELINE.

## Lo que quiero que documentes en Notion

Crea una página **«OMNIAXIS · Envío desde Caminos Documentos»** con estas secciones:

1. **Para qué sirve** (en dos o tres frases).
2. **Cómo funciona**: diagrama simple: asesora → Caminos Documentos → BANDEJA → bot de AppSheet → PIPELINE.
3. **Reglas** (las 5 de arriba).
4. **Enlaces**: base, bandeja, carpeta de Drive y app Caminos Documentos.
5. **Columnas de la bandeja**: como una base de datos o tabla de Notion.
6. **Configuración de AppSheet**: tabla, acciones (con sus fórmulas tal cual) y bot. Con lo que encontremos en el paso 2.
7. **Checklist de prueba** (paso 5), con casillas.
8. **Problemas frecuentes y cómo resolverlos**: bot que no corre, fechas mal leídas, columna obligatoria vacía,
   la asesora no puede enviar (bandeja sin compartir o Composio desconectado).
9. **Pendientes**:
   - guardar el PDF en Drive con su consecutivo (con un pequeño Apps Script en la bandeja);
   - activar el envío para todas las asesoras (cada una con Composio conectado);
   - decidir qué pasa con `ID_Cliente` en ventas nuevas.
10. **Historial de cambios** con la fecha de hoy.

Empecemos por el paso 1. Dime exactamente dónde hago clic y qué debo ver en pantalla.
