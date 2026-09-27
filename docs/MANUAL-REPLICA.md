# Manual de réplica: herramienta de documentos de viaje para una agencia

> **Para Claude (Claude Code o claude.ai).** Este manual te guía para construir, para una agencia de viajes nueva, una herramienta igual a **Caminos Documentos**, la app que se hizo para Agencia Caminos (Bogotá, Colombia). La estructura y el funcionamiento son los mismos. Lo que cambia es la identidad de la agencia: su sistema de diseño, sus textos, su base de datos, sus fotos y sus conexiones.
>
> **Para la persona que te entrega este manual:** tú tienes los datos de la agencia. Claude te los va a ir pidiendo por etapas. No tienes que saber programar: responde lo que te pregunte y aprueba cada etapa antes de pasar a la siguiente.

---

## 0. Cómo debes trabajar (directrices para Claude)

1. **Lee este manual completo antes de empezar.** Después presenta a la persona, en pocas líneas, qué vas a construir y las etapas (sección 3). Pide su OK para empezar.
2. **Trabaja por etapas, en orden.** No pases a la siguiente sin que la actual esté construida, probada y aprobada por la persona.
3. **Pregunta de a poco.** Haz como máximo 3 o 4 preguntas por mensaje, en lenguaje sencillo, con un ejemplo de respuesta tomado de Caminos. La persona puede no ser técnica.
4. **Nunca inventes datos de la agencia**, como colores, textos legales, direcciones, precios o nombres. Si falta algo, pregúntalo. Si la persona no lo tiene, deja un espacio marcado como pendiente y dilo.
5. **Usa el código de Caminos como referencia**, no lo copies a ciegas. El código completo está en el repositorio público `https://github.com/directoroperaciones-bot/CLAUDE`, carpeta `demo/`: `app.html`, `app.js`, `interactivo.js`, `build.py`, `geo/`, `iconos/`, `publicar/`. La carpeta `original/` tiene el plugin de plantillas de Caminos. Léelo para entender cada pieza y adáptalo a la nueva agencia. **Todo lo que diga "Caminos" debe cambiar**: nombres, colores, textos, logos, contacto, códigos, URL.
6. **Habla en el idioma de la persona**, sin tecnicismos. Cuando uses un término técnico, explícalo en una frase.
7. **Al final de cada etapa**, muestra lo construido (captura, enlace o archivo). Di qué probaste, qué quedó pendiente y qué necesitas para la etapa siguiente.
8. **Guarda el trabajo**: haz commit y push al repositorio de la agencia al terminar cada etapa, y lleva al día un archivo `LEEME.md` con lo construido.
9. **Confirma antes de cualquier acción que no se pueda deshacer o que publique algo** (borrar archivos, publicar en un sitio público, escribir en cuentas externas), salvo que la persona ya lo haya autorizado para esa acción.

---

## 1. Reglas que nunca se rompen

Estas reglas vienen de lo aprendido con Caminos. Cúmplelas en el código, no solo en la intención.

| # | Regla | Cómo cumplirla |
|---|---|---|
| R1 | **La base de datos de la agencia es SOLO LECTURA.** Nunca editar, borrar ni escribir nada en ella. | Una sola función del código toca la base y solo usa herramientas de lectura (por ejemplo `GOOGLESHEETS_BATCH_GET`). Ninguna llamada de escritura. Si necesitas explorar la base con un navegador, usa la orden "REGLA ABSOLUTA: SOLO LECTURA. NO MODIFIQUES NADA." |
| R2 | **Nunca mostrar valores internos en un documento para el cliente.** Solo valores finales o totales. | Netos, markups, comisiones, TA, costos y utilidades se usan solo para calcular. Los nombres de mayoristas, consolidadores u operadores internos nunca aparecen; solo se muestran hoteles. Pregunta a la persona qué es interno. |
| R3 | **Claude no inventa datos al leer textos.** | La instrucción a Claude exige sacar cifras, fechas, códigos, hoteles y condiciones solo del texto. Lo que falta queda vacío y marcado. |
| R4 | **Las fotos no pueden tener compromiso de derechos de autor.** | Solo fotos propias de la agencia, o de dominio público o CC0. No usar CC BY, porque obliga a dar crédito en cada documento. |
| R5 | **Nada con personas pasa por un repositorio público.** | Fotos de pasajeros, nombres o datos personales nunca van a un repositorio público, ni por un minuto. El enlace público del itinerario lleva la versión de grupo, sin nombres individuales. |
| R6 | **Datos mínimos de pasajeros.** | De la tabla de pasajeros, solo leer ID y nombre. |
| R7 | **El diseño lo ponen las plantillas, no Claude.** | Claude solo ordena datos en JSON. El documento siempre se arma con la plantilla oficial de la agencia. |

---

## 2. Qué se va a construir (resumen)

Una **app web de un solo archivo HTML**, publicada como *artifact* en claude.ai, que las asesoras abren desde su cuenta de Claude. Sirve para:

- **Cinco documentos** con el diseño de la agencia:
  - **Cotización:** unas 3 hojas.
  - **Confirmación:** las hojas que necesite, en modo compacto cuando ahorra una.
  - **Voucher:** 1 hoja, un solo servicio.
  - **Itinerario:** según el viaje.
  - **Itinerario corto:** 2 hojas.
- **Tres formas de llenar un documento:**
  - Traer la venta de la base de la agencia con su número (solo lectura).
  - Pegar texto para que Claude lo ordene.
  - Llenarlo a mano.
- **Conversión entre documentos:** cotización → confirmación → voucher → itinerario, sin volver a digitar.
- **PDF** tamaño carta, descargable.
- **Itinerario interactivo** para el celular del viajero:
  - Portada con cuenta regresiva.
  - Días desplegables.
  - **Mapa de la ruta con un avión que recorre el viaje.**
  - Lista para empacar que se puede marcar.
  - **Funciona sin internet.**
- **Publicar para el grupo:** sube el itinerario a GitHub Pages y da un enlace fijo para WhatsApp. Si se corrige y se vuelve a publicar, el enlace no cambia.
- **Mis documentos:** lista compartida en vivo entre las asesoras, agrupada por viaje.
- **Banco de fotos:** una foto por destino y por hotel. Se usa sola en cada documento, se busca también por otros nombres del destino y se llena con fotos propias de la agencia.
- **Guía en video:** un video corto por módulo, con los colores de la agencia.

Arquitectura, sin servidor propio:

```
Asesoras ──► App (artifact en claude.ai)
               ├─ Claude (capacidad sample)      → ordena el texto pegado
               ├─ Base de la app (capacidad db)  → documentos, fotos, publicados
               ├─ Archivos (capacidad assets)    → fotos del banco
               ├─ Descargas (capacidad downloads)→ PDF y HTML
               └─ Composio (capacidad mcp) ──► Google Sheets / base de la agencia (SOLO LECTURA)
                                            └─► GitHub (repositorio público) ──► GitHub Pages ──► Grupo por WhatsApp
Código fuente: repositorio de GitHub de la agencia → build.py → un solo HTML → se publica en claude.ai
```

¿Por qué así? No hay que pagar hosting, servidores ni API de Claude, porque Claude corre con la suscripción de la cuenta. GitHub Pages es gratis y no pone logos de terceros. Netlify y Vercel se descartaron por los créditos, su marca y las limitaciones de uso comercial.

---

## 3. Las etapas

| Etapa | Qué se logra | Qué necesitas de la persona |
|---|---|---|
| 1 | Conocer la agencia | Datos generales, cómo trabajan hoy |
| 2 | Identidad y plantillas | Sistema de diseño, logos, textos legales, ejemplos de sus documentos |
| 3 | Conexiones | Composio, GitHub, Google |
| 4 | La app base con los 5 documentos | Revisar y aprobar cada documento |
| 5 | Traer de la base | Acceso de lectura a su base y su regla de precio |
| 6 | Conversiones y expedientes | Formatos de código de sus documentos |
| 7 | Itinerario interactivo, mapa y avión | Destinos que venden, lugares especiales |
| 8 | Publicar para el grupo | Aprobar el sitio público |
| 9 | Mis documentos compartidos | Cuántas personas la usan y con qué cuenta |
| 10 | Banco de fotos | Instagram de empresa o carpeta de fotos |
| 11 | Guía en video | Aprobar los videos |
| 12 | Entrega | Prueba final con un caso real |

---

### Etapa 1 — Conocer la agencia

**Pregunta (de a pocas):**

1. Nombre comercial de la agencia, ciudad y país.
2. ¿A qué se especializan? (Ejemplo de Caminos: "turismo religioso y peregrinaciones, más viajes vacacionales nacionales e internacionales".)
3. ¿Qué documentos hacen hoy y cómo? (Word, Canva, un sistema…) Pide un ejemplo real de cada uno, con los datos del cliente tachados si hace falta.
4. ¿Cuántas personas harán documentos? ¿Comparten una misma cuenta de Claude o cada una tiene la suya? (Esto define cómo se comparte la lista de la etapa 9.)
5. Idioma y tono de los textos. (Caminos: "español de Colombia, trato de *tú*, sin emojis".)
6. Moneda y formato de valores. (Caminos: pesos con punto de miles, `$1.640.000`.)
7. ¿Tienen una base de datos de operación con las ventas? ¿En qué? (AppSheet, Google Sheets, Excel, un CRM.)

**Construye:** un archivo `AGENCIA.md` con las respuestas. Todo lo que construyas después debe salir de ahí.

**Listo cuando:** la persona confirma que el resumen está bien.

---

### Etapa 2 — Identidad y plantillas

**Pregunta:**

1. **Sistema de diseño.** Que lo pegue o lo suba: colores (hex), tipografía, logos, elementos gráficos, fotos de marca. Si lo tiene como artifact de claude.ai (tipo *Design System*), pide el enlace. Si no tiene uno formal, pide el manual de marca o el logo en SVG, y propón una paleta a partir del logo para que la apruebe.
2. **Logos en SVG**: versión a color y versión blanca para fondos de color. Con ® si lo usan.
3. **Tipografía.** Si es de Google Fonts o tiene licencia libre, pide los archivos TTF (Regular, Medium, Bold). Van incrustados para que el PDF mida igual en todas partes.
4. **Textos legales:** política general, términos y condiciones, leyendas obligatorias del país. (Caminos incluye la leyenda de las Leyes 679 de 2001 y 1336 de 2009 de Colombia.)
5. **Datos de contacto** para el pie: web, Instagram, Facebook, dirección, teléfono, correo.
6. **Eslogan**, si tienen. (Caminos: "Para ir más lejos".)

**Construye:**

- Las **5 plantillas HTML** tamaño carta, con marcadores `{{campo}}`. Toma como referencia la estructura de `original/caminos-documentos-2.5.3/skills/*/template/*.html`:
  - Encabezado de color con logo.
  - Secciones con título y raya de acento.
  - Tarjetas y tablas.
  - Pie con código del documento y "· 1 de N".
  - Hoja final de información adicional (políticas).
- Aplica **solo** la identidad de la nueva agencia. Nada de coral #F25061, Poppins ni estrella de Caminos, salvo que la agencia use algo igual.
- Una hoja de información adicional con sus textos legales, tal cual los entregaron.

**Listo cuando:** la persona ve las 5 plantillas con datos de ejemplo y las aprueba.

---

### Etapa 3 — Conexiones

Explica cada conexión en una frase antes de pedirla.

1. **Composio.** Es un conector que le permite a la app leer la base y publicar en GitHub. La persona crea o usa una cuenta en composio.dev y lo conecta en claude.ai: Configuración → Conectores.
2. **Google en Composio**, con la cuenta que tiene acceso de lectura a la base de operación.
3. **GitHub:**
   - Una cuenta de la agencia (Caminos usó `directoroperaciones-bot`).
   - Un repositorio para el código de la app.
   - Un repositorio **público** para los itinerarios publicados (Caminos: `itinerarios`).
   - Conectar la cuenta en Composio.
   - Si trabajas en Claude Code en la web, que instale la app de Claude en GitHub para esos repositorios.
4. **Claude:** la app usa la cuenta de claude.ai de quien la abre. No hace falta API paga.

**Construye:**

- En el repositorio de itinerarios, activa GitHub Pages sobre `main` y sube:
  - `index.html`: portada sencilla con la identidad de la agencia.
  - `.nojekyll`: vacío.
  - `sw.js`: el service worker del anexo A.
- Verifica que el sitio abre en `https://<cuenta>.github.io/<repositorio>/`.

**Listo cuando:** Composio responde con Google y con GitHub, y el sitio público abre.

---

### Etapa 4 — La app base con los 5 documentos

**Construye** (siguiendo `demo/app.html` y `demo/app.js` de referencia):

1. **Estructura del proyecto:**

   | Archivo | Qué es |
   |---|---|
   | `app.html` | Pantallas y estilos |
   | `app.js` | Lógica |
   | `interactivo.js` | Itinerario interactivo (etapa 7) |
   | `build.py` | Arma el HTML final |
   | `iconos/` | Íconos Lucide 0.445.0 en SVG |
   | `geo/` | Datos del mapa (etapa 7) |
   | `publicar/` | Archivos del sitio público |

2. **`build.py`** arma **un solo HTML**:
   - Incrusta plantillas, logos (data URI, con ancho y alto del `viewBox` y sin metadatos C2PA), fuentes en base64, íconos, datos del mapa y código.
   - Se detiene con error si queda un recurso sin incrustar o falta un marcador.
   - Escapa `</` dentro del JavaScript.
   - ¿Por qué un solo archivo? Un artifact no puede cargar archivos de otros sitios, salvo scripts de cdnjs.
3. **Librerías:** solo html2canvas 1.4.1 y jsPDF 2.5.1 desde cdnjs, para el PDF.
4. **Pantallas:**
   - Inicio: una tarjeta por documento, una tarjeta "Guía de uso" y los documentos recientes.
   - Mis documentos.
   - Banco de fotos.
   - Guía en video.
5. **Los 3 pasos, iguales para todos los documentos:**
   - **Paso 1 — Información:**
     - Traer de la base (etapa 5).
     - Pegar texto → **Ordenar la información**, que llama a Claude con la capacidad `sample`.
     - Llenar a mano.
     - Botón Detener.
     - Ayuda "Qué puedes pegar".
   - **Paso 2 — Revisar los datos:**
     - Formulario generado desde un esquema por documento (objeto `DOCS`).
     - Campos: texto, fecha, área, líneas, tablas de filas, bloques, listas cerradas y foto.
     - Obligatorios marcados y aviso "Faltan datos".
     - Validación de coherencia.
     - Botón "Leer con más precisión".
   - **Paso 3 — Documento listo:**
     - Vista previa con conteo de hojas.
     - Descargar PDF (html2canvas a escala 1,6, JPEG al 92 %, jsPDF carta, guardado con la capacidad `downloads`).
     - Editar datos.
     - Siguiente paso.
6. **Claude, en nivel rápido:**
   - Llama a `sample.json(instrucción, {modelTier: 'quick'})`. Si falla, reintenta con `'default'`.
   - La instrucción dice:
     - Quién es el asistente (de la agencia nueva).
     - Que no invente nada.
     - Formato de fechas AAAA-MM-DD y de moneda.
     - Idioma y tono.
     - Reglas propias del documento.
     - "Responde solo con JSON, con exactamente esta forma: …"
     - Si viene de otro documento: "Ya tenemos estos datos… consérvalos y complétalos; si la información nueva contradice un dato, manda la nueva."
7. **Motor de hojas** (función `fluir`; detalle en el anexo B): reparte midiendo, con título pegado a su contenido, tablas partidas con encabezado repetido, "subir", "juntar" y modo compacto.
8. **Datos de la asesora** (nombre, correo, teléfono) guardados en el navegador para no escribirlos cada vez. En producción, **sin datos ficticios ni textos de "demo"**.
9. **Capacidades del artifact**, declaradas al publicar: `sample`, `db`, `assets`, `downloads` y `mcp` (servidor Composio, herramienta `COMPOSIO_MULTI_EXECUTE_TOOL`). Si la app se abre fuera de claude.ai, cada función avisa y el resto sigue funcionando.

**Pregunta en esta etapa**, por documento:

- **Cotización:**
  - ¿Los valores van por persona o por el total?
  - ¿Qué condiciones de pago suelen usar?
  - ¿Cuánto dura la vigencia?
- **Confirmación:**
  - ¿Qué estados de pago usan? Deben ser listas cerradas; Caminos usa "Pagado en su totalidad / Abono recibido / Pendiente de pago" para la reserva y "Pagado / Pendiente / Anulado" por pago.
- **Voucher:**
  - ¿Qué instrucciones y condiciones ponen para hotel, tiquete y traslado?
- **Itinerario:**
  - ¿Llevan acompañamiento espiritual o guía?
  - ¿Recomendaciones fijas?

Los esquemas de campos de cada documento están en el anexo C.

**Prueba:** genera cada documento con datos de ejemplo inventados y marcados como ejemplo, y descarga el PDF. Revisa que no queden textos de otra agencia.

**Listo cuando:** la persona genera los 5 documentos ella misma y aprueba el resultado.

---

### Etapa 5 — Traer de la base (solo lectura)

**Pregunta:**

1. ¿Dónde está la base? Pide el enlace o ID de la hoja de Google, o cómo se accede. Recuérdale que **solo se va a leer**.
2. ¿Con qué número identifican una venta? (Caminos: el consecutivo, "2900" o "CA2900".)
3. Tablas y columnas: ventas, servicios, pagos, pasajeros, proveedores, opciones cotizadas, paquetes, asesores. Si es AppSheet, pide que te deje ver el editor en modo lectura, o que pegue las fórmulas.
4. **Regla de precio.** ¿De dónde sale el valor que ve el cliente? Pide la fórmula exacta.
   - Caminos, primero: si hay servicios, suma de `Gran_Total_Servicio`.
   - Si no hay servicios: valor total de la opción = (Neto_Tkt + TA_Tkt) + Neto_Hotel/Markup + Neto_Terrestre/Markup + Neto_Asistencia/Markup + Neto_Otros/Markup. Si el markup está vacío o es menor o igual a 0, se usa el neto.
   - Si tampoco hay opciones y es un paquete: precio por acomodación del costeo.
5. **¿Qué columnas son internas** y nunca deben salir? (Regla R2.)
6. ¿Qué proveedores se pueden nombrar ante el cliente? (Caminos: solo los de categoría "Hotel".)
7. ¿Hay columnas que no son confiables? (En Caminos, `Saldo_Pendiente` no lo era, así que la app nunca deduce "pagado en su totalidad".)

**Construye:**

- Una sola función `lecturaBase(rangos)`, que usa solo `GOOGLESHEETS_BATCH_GET` vía Composio.
- **Lectura por pasos pequeños.** Composio devuelve solo una muestra (`data_preview`) cuando la respuesta es grande: en Caminos, 122 KB fallaron. Pasos:
  1. Buscar la venta leyendo solo las columnas necesarias de la tabla de ventas.
  2. Leer solo la columna de códigos de las tablas hijas para ubicar las filas de esa venta.
  3. Traer solo esas filas, de a pocos tramos por llamada.
  4. Traer solo ID y nombre de los pasajeros.
  5. Para la cotización, además, las opciones y el paquete.
- Detectar la respuesta recortada y avisar.
- Mostrar el avance: "Buscando la venta…", "Leyendo servicios y pagos…".
- Traducir los datos de la base a la confirmación y a la cotización. Lo que la base no trae queda marcado para completar.
- Explicar en un aviso de dónde salió el precio, para que la asesora lo compare con su sistema.

**Prueba:** con 2 o 3 números de venta reales que dé la persona, compara el precio contra su sistema. Confirma que no aparece ningún valor interno.

**Listo cuando:** la persona trae una venta real y los datos coinciden.

---

### Etapa 6 — Conversiones y expedientes

**Pregunta:** los formatos de código. (Caminos: cotización `CA2900`, confirmación `CAM-2026-2900`, voucher `CAM-VCH-2900-01`, itinerario `CA2900`.)

**Construye:**

- Barra **Siguiente paso** en el documento listo:
  - **Cotización → Confirmación:** pregunta qué hotel u opción eligió el cliente. No copia "servicios confirmados". El estado de pago queda vacío.
  - **Confirmación → Voucher:** pregunta de qué servicio es el voucher: cada hotel, los traslados por operador o cada tiquete. La vigencia sale de las fechas del servicio y, si no tiene, de las del viaje. Pone instrucciones sugeridas por tipo.
  - **Confirmación → Itinerario:** arma un borrador del día a día **solo con lo seguro** (llegadas de vuelo, check-in, traslados con fecha). Trae el "qué incluye" de la cotización del mismo viaje.
  - **Voucher → Itinerario:** si existe la confirmación del mismo viaje, parte de ella.
- **Pegar para completar:** lo pegado se suma a lo que había. Se envía a Claude lo previo y se fusiona el resultado. **Se conserva lo que la asesora editó a mano.**
- `expedienteDe(código)`: saca el número del viaje de cualquier código, para agrupar.

**Listo cuando:** un mismo viaje pasa por los 4 documentos sin volver a digitar.

---

### Etapa 7 — Itinerario interactivo, mapa y avión (la parte más importante)

**Pregunta:**

1. Destinos que más venden.
2. Santuarios, pueblos o sitios pequeños que visitan y que quizá no aparezcan como ciudad. (Caminos agregó a mano Lourdes, Fátima, Asís, Loreto, Lisieux, Montserrat, Medjugorje, Covadonga, Cafarnaúm, Caná…)
3. Nombres locales de lugares que deben ubicarse en su ciudad. (Caminos: Las Lajas → Ipiales, Monserrate → Bogotá, Tayrona → Santa Marta.)

**Construye** (referencia: `demo/interactivo.js`; detalle en el anexo D):

- `htmlItinerario(datos, {incrustar})` genera **un solo HTML autocontenido**, con letras, logos, íconos, fotos en JPEG de 900 a 1.600 px, datos del mapa y código. Contiene:
  - Portada con foto (o el color de marca), título, fechas y cuenta regresiva: "Faltan N días", "Sales mañana", "Hoy empieza tu viaje", "Día X de Y", "Gracias por viajar con nosotros".
  - Menú de secciones.
  - Días desplegables; el de hoy se abre solo y dice "Hoy".
  - Vuelos.
  - Hoteles con llamada y Google Maps.
  - Qué incluye.
  - Lista para marcar con barra de progreso, guardada en el celular.
  - Condiciones.
  - Pie de contacto.
- **Mapa sin servicios externos:**
  - Contornos de Natural Earth (`world-atlas@2.0.2`, dominio público).
  - Ciudades de GeoNames (`all-the-cities@3.1.0`, CC BY 4.0, con la atribución en la página).
  - Se preparan con un script como `geo/preparar.py`, que agrega los lugares especiales de esta agencia.
- **Paradas:**
  - Campo "Lugar en el mapa" de cada día, y nombres en el título.
  - Traducción de nombres en español.
  - Vuelos del día para mostrar las conexiones.
  - En nombres repetidos, la combinación con la ruta más corta.
  - El mapa aparece solo con 3 destinos distintos o más.
- **Avión:**
  - "Recorrer la ruta" anima el avión por cada tramo mientras se dibuja la línea.
  - Acercamiento suave de 700 ms.
  - En vuelos de 2.500 km o más, la vista abarca las dos puntas y luego se acerca.
  - Pausas de 1,6 s, y de 2,6 s en vuelos largos.
  - Respeta "reducir movimiento".
- Botones **Descargar HTML** y vista **Celular / Computador** en el paso 3.

**Prueba:**

- Un viaje de varios países con conexiones.
- Un viaje con ciudades de nombre repetido.
- Un pasadía, que no debe mostrar mapa.
- Abre el HTML descargado en un celular sin internet.

**Listo cuando:** la persona ve el avión recorrer un viaje real y abre el archivo sin internet.

---

### Etapa 8 — Publicar para el grupo

**Construye** (referencia: sección "publicar para el grupo" de `demo/app.js`):

- Botón **Publicar para el grupo**:
  1. Arma la versión de grupo, sin nombre de pasajero.
  2. Nombre de archivo `<CÓDIGO>-<6 letras al azar>.html`.
  3. Sube el archivo con `COMPOSIO_MULTI_EXECUTE_TOOL` → `GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS`. Usa el archivo como adjunto (`$file`, hasta 16 MB) o, si no se puede, en base64 (hasta unos 950 KB).
  4. Guarda la ruta en la colección `publicados` de la base de la app, para que **el enlace no cambie** al volver a publicar.
  5. Muestra el cuadro "Enlace del grupo" con Copiar y Abrir.
- Mensajes claros para cada error de conexión: Composio no conectado, conexión vencida, permiso no aceptado, archivo muy pesado.
- El `sw.js` del sitio (anexo A) guarda cada itinerario abierto para verlo sin internet.

**Prueba:** publica, abre el enlace en un celular con internet, apaga los datos y vuelve a abrirlo. Corrige algo, publica de nuevo y confirma que el enlace es el mismo.

**Listo cuando:** la persona lo prueba en su celular con y sin internet.

---

### Etapa 9 — Mis documentos compartidos

**Construye:**

- Colección `documentos` en la base de la app:
  - Un registro por `<tipo>__<código>`: volver a generar actualiza, no duplica.
  - Los datos se guardan **sin fotos**.
- Escucha en vivo (`onSnapshot`), con copia local de los últimos 20 en el navegador.
- Lista agrupada por viaje, con Abrir.
- Si cada asesora tiene su propia cuenta de Claude, explica cómo compartir el artifact con permisos para que vean la misma base.

**Listo cuando:** lo que genera una persona aparece en la pantalla de otra.

---

### Etapa 10 — Banco de fotos

**Pregunta:**

1. **¿Cuál es el Instagram de la empresa?** Para leerlo de forma oficial, la cuenta debe ser de empresa o creador y conectarse en Composio (toolkit `instagram`); la persona inicia sesión una vez. Instagram bloquea la lectura sin conexión desde servidores (error 429).
2. ¿Tienen una carpeta de fotos de viajes en Google Drive? (Caminos: "FOTOS VIAJES", por año y destino.) Se lee en modo solo lectura.
3. ¿Todas esas fotos son propias? ¿Hay alguna de un banco pagado o de un proveedor que no se deba usar?
4. Si faltan destinos, ¿autoriza completar con fotos de dominio público o CC0 de Wikimedia Commons?

**Construye:**

- Colección `fotos`:
  - Campos: `clave` (`destino:<slug>` o `hotel:<slug>--<ciudad>`), `tipo`, `nombre`, `ciudad`, `asset`, `ancho`, `alto`, `fecha`, `documento` (origen), `alias` y `fuente`.
  - Las fotos van en la capacidad `assets`.
- Al generar un documento: busca la foto del destino y de cada hotel. Si la asesora pone una foto nueva, se guarda, salvo que ya exista una igual o más ancha.
- `fotoParecida`: si no hay clave exacta, usa el destino del banco cuyo nombre o alias aparezca completo dentro del destino escrito; gana el nombre más largo. Ejemplo: "Cartagena de Indias" usa la foto de Cartagena.
- Pantalla del banco: buscar, filtrar, subir y quitar (se confirma tocando dos veces).
- **Carga inicial:**
  - Elige solo lugares y paisajes, **sin personas en primer plano**.
  - Recorta a 2:1 (1.600 × 800) para la portada.
  - Revisa cada foto a ojo en hojas de miniaturas.
  - Da prioridad a las fotos propias.
  - Guarda el origen de cada foto.
  - Respeta R4 y R5: si tienes que mover fotos entre servidores, nunca por un repositorio público si tienen personas.

**Listo cuando:** la persona ve el banco lleno y un documento toma la foto solo.

---

### Etapa 11 — Guía en video

**Construye** (así se hizo en Caminos):

1. Una copia de la app con **respuestas simuladas** de la base, de Claude y de GitHub, y datos ficticios. Así no aparecen clientes reales ni se toca la base.
2. Un script de Playwright que hace los clics y escribe como una persona:
   - Cursor visible.
   - Círculo en cada clic.
   - Subtítulos en el idioma de la agencia.
   - Portada de cada módulo con los colores de la agencia.
3. Grabación en WebM a 1280 × 800 y conversión a MP4 (H.264) con ffmpeg.
4. Cinco módulos:
   1. Cotización.
   2. Confirmación.
   3. Voucher.
   4. Itinerario y enlace del grupo.
   5. Mis documentos y banco de fotos.
5. Una página de guía con los videos y los pasos escritos, publicada como artifact aparte y enlazada desde la app (tarjeta "Guía de uso" y menú).

Grabar sirve también de prueba completa: en Caminos reveló dos errores. Corrige lo que falle antes de publicar los videos.

**Listo cuando:** la persona aprueba los videos.

---

### Etapa 12 — Entrega

1. Prueba con la persona un caso real de punta a punta: traer de la base → cotización → confirmación → voucher → itinerario → publicar.
2. Revisa las reglas de la sección 1 una por una y reporta cómo se cumple cada una.
3. Deja en el repositorio:
   - `LEEME.md` con qué es cada archivo, cómo se arma (`python3 build.py`) y cómo se publica.
   - La copia segura en la rama `main`.
4. Pide fijar la app en la barra lateral de claude.ai. El icono de un artifact es genérico (por ejemplo, "plane"); no puede ser el logo.
5. Entrega a la persona:
   - Enlace de la app.
   - Enlace de la guía.
   - Enlace del sitio público.
   - Lista de pendientes.

---

## Anexo A — Service worker del sitio público (`sw.js`)

Guarda cada itinerario abierto. Con conexión, trae siempre la versión más reciente; sin conexión, o si la red tarda más de 6 segundos, muestra la guardada.

```js
const CACHE = '<agencia>-itinerarios';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request, url = new URL(r.url);
  if (r.method !== 'GET' || url.origin !== location.origin) return;
  const guardada = () => caches.match(url.pathname).then(m => m || caches.match(r));
  const red = fetch(r).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(url.pathname, copia)); }
    return res;
  });
  e.respondWith(new Promise(listo => {
    let hecho = false;
    const dar = res => { if (!hecho && res) { hecho = true; listo(res); } };
    const t = setTimeout(() => guardada().then(dar), 6000);
    red.then(res => { clearTimeout(t); dar(res); })
      .catch(() => guardada().then(m => dar(m || Response.error())));
  }));
});
```

En la página del itinerario, el registro se hace solo en contexto seguro:

```js
if ('serviceWorker' in navigator && window.isSecureContext && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  if (window.caches) caches.open('<agencia>-itinerarios').then(c => c.add(location.pathname)).catch(() => {});
}
```

## Anexo B — Motor de hojas

| Documento | Límite de alto (px) | Opciones |
|---|---|---|
| Cotización | 1.156 | La nota que sigue a una tabla viaja con ella |
| Confirmación | 1.178 | `juntar` + `compacto` |
| Voucher | 1.178 | `sinPoliticas`; las hojas de continuación dicen "Uso del voucher" |
| Itinerario | Motor propio | Un día nunca se parte entre hojas |

- Holgura de 6 px sobre el límite.
- **Bloques:** un título viaja con su raya y su primer elemento.
- **Repartir:** busca el primer bloque que se pasa del límite. Si es una tabla o una lista, la parte en la primera fila que no cabe y repite el encabezado; una fila de dos columnas nunca se parte. Si no se puede partir, pasa el bloque y todo lo que sigue a la hoja siguiente, o a una hoja nueva copiada de la última. Hasta 60 vueltas.
- **Subir:** si el primer bloque de una hoja cabe al final de la anterior, sube. Se confirma midiendo.
- **Juntar:** prueba cada hoja por separado y todo en una sola secuencia; se queda con la opción de menos hojas.
- **Compacto:** prueba márgenes más cortos y se queda **solo si ahorra una hoja**. Nunca es una regla de máximo de hojas.
- **sinPoliticas:** la hoja de políticas sirve de molde y al final se quita.
- Al final, numera el pie de cada hoja: "· 2 de 3".
- Las fuentes van incrustadas para que la medición sea exacta.

## Anexo C — Campos de cada documento (referencia de Caminos)

**Cotización**

- **El viaje:**
  - Código (obligatorio).
  - Título de 4 a 8 palabras (obligatorio).
  - Párrafo de presentación.
  - Destino.
  - Llegada y salida (obligatorias).
  - Noches, pasajeros, acomodación.
  - Foto del destino.
- **Qué incluye:** incluye (obligatorio) y no incluye, un servicio por renglón.
- **Tarifas:**
  - "Los valores son": por persona o total.
  - Filas de hotel u opción, acomodación, valor y foto.
  - Al menos una fila con valor.
- **Itinerario de servicios** (opcional): servicio, fecha, detalle.
- **Condiciones y asesora:** condiciones de pago, vigencia, nombre, correo y teléfono (todos obligatorios).

**Confirmación**

- **La reserva:** código, título, titular, destino, ida, regreso, pasajeros, estado de pago (lista cerrada) y mensaje al viajero.
- **Vuelos:** un bloque por tiquete (aerolínea, tiquete, récord) con trayectos (vuelo, fecha, trayecto "BOG — ADZ", sale, llega en 24 h, "+1" si llega al día siguiente).
- **Hoteles:** hotel, entrada, salida, acomodación, confirmación.
- **Traslados:** operador, trayecto, fecha, hora, confirmación.
- **Servicios y pagos:** servicios confirmados, pagos (concepto, valor, estado en lista cerrada) y nota importante.
- **Contacto de la asesora.**
- **Validaciones:** récord obligatorio en cada tiquete, estado en cada pago y coherencia entre el estado general y los pagos.

**Voucher**

- **El servicio:** tipo (hotel, aéreo o traslado), código, reserva asociada, nombre del servicio, proveedor, válido desde y hasta, ubicación.
- **Viajeros:** titular y acompañantes.
- Solo la sección del tipo elegido: hotel, tiquete o traslados.
- **Uso del voucher:** qué incluye, instrucciones y condiciones.

**Itinerario** (el corto no lleva frase, vuelos ni hoteles)

- **El viaje:** código, título (en uno o dos renglones), subtítulo, destino principal, pasajero o grupo, inicio, fin, acomodación, grupo, acompañamiento y foto de portada.
- **Bienvenida:** texto y frase destacada.
- **Vuelos:** confirmados e internos (vuelo, fecha, origen, destino, sale, llega).
- **Día a día:** fecha, título, **lugar en el mapa**, qué hacemos, comidas incluidas, etiquetas, hotel de esa noche y foto.
- **Qué incluye / no incluye**, con subtítulos de grupo (una línea que empieza con `#`).
- **Hoteles:** nombre, ciudad, dirección, teléfono y foto.
- **Antes de viajar:** recomendaciones por tema y nota final.

## Anexo D — Algoritmo del mapa

1. **Lugares de cada día:**
   - En cada tramo del título (separado por "—", comas, "y" o "/"), toma el nombre de ciudad más a la derecha y más largo (hasta 4 palabras, con mayúscula inicial).
   - Ignora palabras de acción: salida, llegada, regreso, traslado, visita, misa, tour…
   - Agrega el campo "Lugar en el mapa". "Madrid, Cundinamarca" desambigua.
2. **Candidatos:**
   - Busca en el índice de ciudades.
   - Suma los nombres en español que GeoNames trae en inglés (Roma → Rome, Jerusalén → Jerusalem…).
   - Sin contexto, descarta homónimas 25 veces más pequeñas que la mayor.
3. **Vuelos del día**, ordenados por hora:
   - Agrega la punta que el título no nombra.
   - Una conexión sin nombrar va antes de la ciudad a la que llega el vuelo siguiente del mismo día.
4. **Elección de la ruta:** programación dinámica que minimiza los kilómetros entre paradas consecutivas más una penalidad para ciudades pequeñas.
5. **Paradas:** se unen días consecutivos en la misma ciudad. Una parada que solo es conexión se marca como "Conexión en el vuelo X".
6. **Dibujo:**
   - SVG con proyección equirectangular centrada en la ruta, con márgenes y proporción entre 1,15:1 y 1,9:1.
   - Solo los países que tocan la vista, simplificados.
   - Países visitados resaltados.
   - Tramos como curvas cuadráticas hacia un mismo lado.
   - Paradas numeradas con su nombre.
7. **Animación:**
   - La vista es un `viewBox` que se interpola en 700 ms.
   - El encuadre incluye las vecinas a menos de 2.500 km.
   - En tramos largos, la vista es la unión del encuadre de salida y el de llegada, y a los 1,35 s pasa al de llegada.
   - La línea se revela con `stroke-dasharray` medido en píxeles de pantalla.
   - Durante el viaje, arranca en la parada de hoy.

## Anexo E — Documentación completa de Caminos

La descripción detallada de cómo quedó construida Caminos Documentos, sección por sección, está en el documento "Caminos Documentos — cómo está construida la herramienta". Si la persona te lo entrega, úsalo como referencia adicional. El código de referencia está en `https://github.com/directoroperaciones-bot/CLAUDE` (carpeta `demo/`).
