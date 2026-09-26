# Demo — app de documentos de Caminos

Maqueta funcional de la app para asesores. Funcionan de punta a punta los cinco
documentos del plugin: **cotización**, **confirmación**, **voucher**,
**itinerario** e **itinerario corto** (con fotos de portada, de los días y de
los hoteles).

- `app.html` — pantallas y estilos de la app.
- `app.js` — formularios, lectura con Claude, puerto en JavaScript de los motores
  (`armar()` de cotización, confirmación y voucher; el reparto de `motor/flujo.py`;
  y el itinerario de `generar.py` + `empaquetador.py`, midiendo cada bloque en vez
  de estimarlo).
- `build.py` — arma `caminos-documentos-demo.html` incrustando las plantillas
  oficiales, los logos, las fuentes Poppins y los datos de ejemplo **leídos de
  `original/` sin modificarlos**.
- `interactivo.js` — genera la **versión interactiva** del itinerario: un solo archivo
  HTML (letras, logos y fotos incluidos) para el celular del viajero, con cuenta
  regresiva, días desplegables, vuelos, hoteles con mapa, lista de preparación que
  se puede marcar y la política general copiada tal cual de la plantilla.
- `geo/` — datos del **mapa de ruta**: `paises.json` (contornos de Natural Earth,
  dominio público, vía `world-atlas`) y `ciudades.json` (GeoNames, CC BY 4.0, vía
  `all-the-cities`), preparados con `geo/preparar.py`. Cada día se ubica por su título
  o por el campo "Lugar en el mapa"; los vuelos del mismo día agregan las conexiones y
  los nombres repetidos se resuelven por la ruta más coherente.
  El mapa solo aparece si el viaje pasa por 3 destinos distintos o más; al recorrer la
  ruta, un avión vuela cada tramo (en los vuelos largos la vista se abre para seguirlo).
- `ejemplos/Itinerario-CA2790.html` — el ejemplo del plugin (Tailandia y Europa) en
  versión interactiva.
- `iconos/` — íconos de `lucide-static@0.445.0` (licencia ISC en `iconos/LICENSE`).

```
python3 demo/build.py
```

En la demo, Claude se usa desde la cuenta de claude.ai de quien abre la página
(capacidad `sample` de los artifacts), sin API paga. El PDF se genera en el
navegador rasterizando la plantilla; en la versión completa lo hará el motor
del plugin (`generar.py` + wkhtmltopdf), con texto seleccionable.
