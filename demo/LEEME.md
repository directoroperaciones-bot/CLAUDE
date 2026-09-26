# Demo — app de documentos de Caminos

Maqueta funcional de la app para asesores. Hoy funciona la **cotización** de
punta a punta; los demás documentos aparecen como "versión completa".

- `app.html` — la app (pantallas, formulario y puerto en JavaScript de `armar()` del motor de la cotización).
- `build.py` — arma `caminos-documentos-demo.html` incrustando la plantilla oficial,
  los logos y los datos de ejemplo **leídos de `original/` sin modificarlos**.
- `iconos/` — íconos de `lucide-static@0.445.0` (licencia ISC en `iconos/LICENSE`).

```
python3 demo/build.py
```

En la demo, Claude se usa desde la cuenta de claude.ai de quien abre la página
(capacidad `sample` de los artifacts), sin API paga. El PDF se genera en el
navegador rasterizando la plantilla; en la versión completa lo hará el motor
del plugin (`generar.py` + wkhtmltopdf), con texto seleccionable.
