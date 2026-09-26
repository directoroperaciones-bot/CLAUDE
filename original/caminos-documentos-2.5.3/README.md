# Plugin: caminos-documentos

Plugin de Caminos con los skills que generan los documentos comerciales
oficiales en PDF, todos con el diseño de marca ya resuelto (colores,
tipografía Poppins, logo, estrella de marca — tomados directamente del
Design System de Caminos, sin reinterpretar nada).

Cada asesor invoca el skill que corresponde a lo que necesita — Claude
elige automáticamente según la solicitud:

| Skill | Cuándo se activa | Estado |
|---|---|---|
| `caminos-cotizacion` | "hazme una cotización", "cotiza este viaje" | ✅ Listo — meta de 3 hojas; continúa si hace falta |
| `caminos-confirmacion` | "manda la confirmación", "confirma la reserva" | ✅ Listo — meta de 3 hojas; continúa si hace falta |
| `caminos-voucher` | "el voucher para el hotel", "comprobante de servicio" | ✅ Listo — 2 páginas |
| `caminos-itinerario` | "el itinerario", "el día a día del viaje" | ✅ Listo — páginas variables |
| `caminos-itinerario-corto` | "el itinerario corto", "el del pasadía" | ✅ Listo — 2 hojas, mismo motor del itinerario |

## Cómo funciona cada skill (el "puente")

Cada skill NO diseña nada por su cuenta. Es un puente de 3 pasos:

1. **Lee** su plantilla HTML (`template/*.html`) — ya tiene el header
   coral, el logo, la tipografía y los colores exactos del design system,
   con marcadores `{{campo}}` donde va la información del viaje.
2. **Llena** los marcadores con los datos reales que da el asesor
   (nunca inventa cifras, fechas, condiciones ni textos legales — pregunta
   si falta algo esencial).
3. **Renderiza a PDF** con `wkhtmltopdf` y entrega el archivo.

Esto es justo lo que pediste: los skills no tienen la colorimetría "adentro"
en el sentido de reinventarla — la traen tal cual del design system real
(los mismos SVG de logo, el mismo hex `#F25061`, la misma Poppins) y solo se
ocupan de su tarea específica (cotizar, confirmar o dar el voucher).

## Estructura

```
caminos-documentos/
├── .claude-plugin/plugin.json    ← manifiesto del plugin
├── README.md                     ← este archivo
├── fuentes/                      ← Poppins (Regular, Medium, Bold)
├── motor/comun.py                ← piezas comunes de los cuatro motores
├── motor/flujo.py                ← reparto con medición exacta y hojas de continuación
├── politicas/                    ← información adicional oficial + candado
└── skills/
    ├── caminos-cotizacion/
    │   ├── SKILL.md              ← instrucciones y reglas no negociables
    │   ├── template/             ← la plantilla con el diseño
    │   └── assets/               ← logos con ® y estrella de marca
    ├── caminos-confirmacion/     (misma estructura)
    ├── caminos-voucher/          (misma estructura)
    ├── caminos-itinerario/       (scripts/: generar.py, empaquetador.py)
    └── caminos-itinerario-corto/ (solo SKILL.md; usa el motor del itinerario)
```

Todo el diseño viaja dentro del plugin: colores, tipografía, logos, franja de
contacto y página de políticas. No depende del design system ni del skill
`caminos-design` para funcionar.

## Información adicional: texto legal fijo

La página "Información adicional" (política general de Agencia Caminos) es
igual en los cuatro documentos y **no se modifica en ninguna circunstancia**,
ni aunque el asesor lo pida. La copia oficial está en
`politicas/informacion-adicional.html`, y `politicas/verificar.py` bloquea la
generación del PDF si la página de un documento no coincide con ella.

Para cambiar la política (decisión de la dirección), se edita
`politicas/informacion-adicional.html` **y** la misma sección en las cuatro
plantillas, y se publica una nueva versión del plugin.

## Motor de documentos

Ningún documento lo escribe la IA en HTML. Claude solo convierte lo que manda
el asesor (texto, reservas pegadas del sistema, Word, PDF, fotos) en un archivo
de datos `datos.json`, y el programa `scripts/generar.py` de cada skill arma el
PDF:

- llena la plantilla oficial y quita los bloques vacíos;
- escribe las fechas en español y calcula el día de la semana;
- reparte el contenido entre hojas (tarjetas de confirmación, días del
  itinerario, listas) y sube el contenido cuando sobra espacio;
- mide el PDF real y avisa si algo no cabe;
- se niega a generar si falta un dato obligatorio o si la información
  adicional no es la oficial.

Así el resultado es igual con cualquier modelo (probado con Haiku) y cada
documento gasta menos créditos. Verificado: con los datos de los ejemplos
aprobados, los cinco PDF salen idénticos píxel por píxel (en la hoja 2 de la
confirmación solo cambia el suavizado de los íconos de una lista; no se nota).

| Skill | Motor | Ejemplos |
|---|---|---|
| Cotización | `skills/caminos-cotizacion/scripts/generar.py` | `datos-ejemplo.json` |
| Confirmación | `skills/caminos-confirmacion/scripts/generar.py` | `datos-ejemplo.json` |
| Voucher | `skills/caminos-voucher/scripts/generar.py` | `datos-ejemplo.json` |
| Itinerario | `skills/caminos-itinerario/scripts/generar.py` (+ `empaquetador.py`) | `datos-ejemplo.json`, `datos-ejemplo-corto.json` |

Lo que comparten los cuatro está en `motor/comun.py`. La cotización, la
confirmación y el voucher reparten su contenido con `motor/flujo.py`, que mide
la altura exacta de cada bloque y, si algo no cabe, lo pasa a la hoja siguiente
o abre una hoja de continuación con el mismo diseño. **El número de hojas es
una meta, no un límite: ningún documento se bloquea por espacio.**

Los datos del asesor (nombre, correo y teléfono) son obligatorios en la
cotización y la confirmación. Claude los toma del mensaje o del proyecto de
Claude desde el que trabaja el asesor; si no los encuentra, los pide.

## Fotos y banco de fotos

La cotización, el itinerario y el itinerario corto aceptan fotos:

- **Foto del destino** (`foto_portada`): va en el encabezado (estándar aprobado).
  Reemplaza el bloque coral de la portada, con el degradado de protección
  (`motor/proteccion.png`). Con `"estilo_foto": "cuerpo"` la portada queda coral
  y la foto va debajo de los datos del viaje.
- **Hoteles**: en la cotización, tarjetas "Tus opciones de hotel" antes de las
  tarifas; en el itinerario, "Tus hoteles" antes de la tabla.
- **Días del itinerario**: la foto va a la derecha del texto del día.

Si el asesor adjunta fotos sin decir dónde van, Claude pregunta una sola vez con
las opciones reales. Las capturas de vuelos o reservas se leen como datos.

El **Banco de fotos Caminos** (https://claude.ai/artifact/WPzKkP7MwdKBaGrrGVpZ1Y) guarda las fotos por clave
(`destino:san-andres`, `hotel:calypso--san-andres`). Claude consulta el banco
cuando falta una foto y guarda las que los asesores ubican. Las fotos pasan
como archivos, nunca por el chat. Para que los asesores puedan usarlo, el
dueño lo comparte con ellos como **Editor**.

**Consulta obligatoria (2.5.3):** Claude no puede saltarse el banco. Si falta la
foto de portada o la de un hotel y `datos.json` no trae `"banco_consultado": true`,
el motor no genera: responde `CONSULTA EL BANCO DE FOTOS` (código 5) con las
claves exactas y la consulta que debe hacer. Después de generar, el motor
imprime `GUARDA EN EL BANCO` con las fotos nuevas ya medidas, para que Claude
las suba sin calcular nada. Las claves de hotel ignoran la palabra "Hotel",
"Hostal" u "Hostería" al inicio: "Hotel Calypso" y "Calypso" son la misma foto.
En los itinerarios, `destino` es obligatorio si no hay foto de portada.

## Dos formas de pedir un documento

1. **Escribir directo** (la más común): `/caminos-cotizacion` y los datos como
   salgan, con reservas pegadas del sistema, fotos o el Word del programa. El
   skill ordena la información y pregunta lo que falte.
2. **Plantilla de texto**: si el asesor escribe solo `/caminos-cotizacion` (o
   cualquiera de los otros) sin datos, Claude responde al instante con una
   plantilla corta para copiar, llenar y enviar.

## El itinerario es distinto a los otros tres

Cotización, confirmación y voucher tienen un número fijo de páginas. El
itinerario **no**: depende de cuántos días tenga el viaje y de qué bloques
entregue el asesor.

Por eso no se arma con "una página por sección" sino con **bloques que se apilan
hasta llenar cada hoja**. Los bloques grandes (incluye, hoteles,
recomendaciones) **se parten entre páginas** en vez de saltar enteros, que es lo
que producía los huecos enormes. Un día nunca se parte.

Resultado medido con los dos extremos:

| Caso | Antes | Ahora |
|---|---|---|
| Peregrinación de 23 días a Tailandia y Europa | 11 páginas, 3 con huecos de 300–500 px | **9 páginas**, sin huecos evitables |
| Peregrinación de 2 días a Chiquinquirá | 3 páginas, casi vacías | **2 páginas** llenas |

El motor del itinerario (`scripts/generar.py` y `scripts/empaquetador.py`) aplica
este reparto y además mide el PDF real: si una hoja se pasa, vuelve a repartir
con más margen.

## Qué pasa cuando falta información

Los documentos se arman por bloques y **se adaptan a lo que el asesor entregue**,
pero esto no es automático: los cuatro SKILL.md traen una sección de *Reglas de
omisión* que define cómo hacerlo bien.

Lo esencial:

- Una lista o tabla sin elementos → se borra **toda la sección**, no se deja la
  tabla con solo los encabezados.
- Una página que quedaría sin contenido propio → **no se genera**.
- La numeración se calcula **al final**, contando las páginas que realmente
  existen. Nunca con una fórmula fija.
- Nunca se omiten: la página de información adicional, la franja de contacto ni
  la página 1.
- Si lo que falta es esencial para el documento, el skill **pregunta** en vez de
  entregar algo incompleto.

Verificado con un caso real: el mismo itinerario que en un viaje de 23 días
ocupa 11 páginas, en un viaje de 2 días sin vuelos ni hoteles queda en 3 páginas
limpias, correctamente numeradas.

## Números de confirmación

Confirmación y voucher llevan tarjetas con los números de confirmación de cada
servicio, en **tablas compactas donde cada vuelo, hotel o traslado ocupa una
sola línea**:

| Servicio | Una línea por… | Columnas |
|---|---|---|
| Aéreo | cada trayecto | Vuelo · Fecha · Trayecto · Sale · Llega |
| Hotel | cada hotel | Hotel · Entrada · Salida · Acomodación · Confirmación |
| Traslado | cada traslado | Trayecto · Fecha · Hora · Confirmación |

El número de tiquete y el récord van en el encabezado de la tarjeta, porque
pertenecen al tiquete completo y no a cada trayecto. Los códigos van en coral.

Probado con un caso exigente: un tiquete de **5 trayectos + 3 hoteles + 2
traslados** (10 confirmaciones) sigue cabiendo en las 3 páginas del documento.
Las tarjetas que no caben en la página 1 continúan en la 2, antes de los
servicios; una tarjeta nunca se parte por la mitad.

## Logo con marca registrada

Los logos del plugin llevan el **®**, que no existía en los SVG del design
system. Se reconstruyó en vector a partir del logo original de la marca (misma
proporción, posición y color) y se agregó a los SVG oficiales sin tocar ningún
otro trazo del logo. Es legible a todos los tamaños que usan los documentos,
desde 46 px en portada hasta el mínimo de 34 px en los encabezados.

Pendiente fuera del plugin: el design system (y el skill `caminos-design`)
todavía tienen los logos sin ®. Conviene actualizarlos con estos mismos archivos
para que todas las piezas de la marca coincidan.

## Elementos fijos en los tres documentos

Los tres documentos comparten dos elementos obligatorios, iguales en todos:

- **Página final "Información adicional"** — la política general de Agencia
  Caminos en dos columnas: transporte aéreo, equipaje, cancelaciones y no
  show, fuerza mayor, modificaciones al itinerario y reembolsos, y precios y
  vigencia. Texto legal literal, ocupa exactamente una página.
- **Franja de contacto al pie de todas las páginas** — sitio web, redes,
  dirección de la oficina (Calle 79 # 16a-20 Of. 507, Bogotá) y el aviso
  obligatorio de la Ley 679 de 2001 y la Ley 1336 de 2009.

Los SKILL.md instruyen explícitamente no eliminar ni reescribir ninguno de
los dos.

## Validado

Las tres plantillas se renderizaron y **se revisaron página por página** con
datos de ejemplo. Paginación verificada: cotización 3, confirmación 2, voucher 2
(las tres limitadas a máximo 3 hojas) e itinerario 11 páginas con un viaje real de
23 días — 18 páginas revisadas una por una — sin páginas en blanco, sin bloques montados sobre
el pie, sin texto cortado, con la franja de contacto en todas.

### Hallazgos técnicos del motor de render (documentados en cada SKILL.md)

Dos trampas del motor `wkhtmltopdf` hacían que los documentos salieran
pequeños y cortados. Quedan resueltas en las plantillas y documentadas para
que no se repitan:

| Problema | Causa | Solución aplicada |
|---|---|---|
| Contenido ocupaba solo 2/3 del ancho | La regla CSS `@page` creaba una caja propia | Se eliminó `@page`; las páginas usan `width:100%` |
| Todo salía a ~77% del tamaño | El lienzo real es 1061×1373 px, no 816×1056 | Se rediseñó a la escala correcta |
| Salía en A4 en vez de Letter | Falta de `-s Letter` | Comando de render fijo y documentado |
| `--disable-smart-shrinking` y `--footer-html` no hacen nada | Este build usa Qt sin parchar y los ignora | Se quitaron del comando; la franja va dentro de cada página |
| CSS Grid no renderizaba | El motor no lo soporta | Todo el layout pasó a flexbox |

El comando de render correcto está en los tres SKILL.md y **no debe
modificarse**.

## Instalación

El plugin se entrega como un archivo `caminos-documentos.plugin`. En el chat
aparece como una tarjeta: al aceptarla, los cuatro skills quedan instalados.

Después de instalar, basta con pedir el documento en lenguaje normal
("hazme la cotización de…", "el voucher del hotel para…"). No hay que nombrar el
skill: Claude elige el que corresponde.

Requisitos del entorno donde se genera el PDF: `wkhtmltopdf` y la tipografía
Poppins. Cada skill los verifica al empezar e instala Poppins desde `fuentes/` si
falta.

### Para actualizar

Cambia la versión en `.claude-plugin/plugin.json`, vuelve a empaquetar la
carpeta completa como `.plugin` e instálalo de nuevo. Si jurídica cambia la
política general, se edita en las cuatro plantillas (`template/*.html`).
