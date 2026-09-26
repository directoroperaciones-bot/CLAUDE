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
- `iconos/` — íconos de `lucide-static@0.445.0` (licencia ISC en `iconos/LICENSE`).

```
python3 demo/build.py
```

En la demo, Claude se usa desde la cuenta de claude.ai de quien abre la página
(capacidad `sample` de los artifacts), sin API paga. El PDF se genera en el
navegador rasterizando la plantilla; en la versión completa lo hará el motor
del plugin (`generar.py` + wkhtmltopdf), con texto seleccionable.
