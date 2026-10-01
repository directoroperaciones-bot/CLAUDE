#!/usr/bin/env bash
# Arma una página de prueba local: la app compilada con simulaciones (mocks) de claude.use() delante.
# Uso: pruebas/armar.sh salida.html mock.js [mock2.js ...]
# Requiere en la carpeta de salida: h2c/package/dist/html2canvas.min.js y jspdf/package/dist/jspdf.umd.min.js
# (npm pack html2canvas@1.4.1 jspdf@2.5.1 y descomprimir), porque la red puede bloquear cdnjs.
set -e
salida=$1; shift
raiz=$(cd "$(dirname "$0")/.." && pwd)
python3 "$raiz/demo/build.py" >/dev/null
{ printf '<!doctype html><html><head><meta charset="utf-8">'; for m in "$@"; do printf '<script src="%s"></script>' "$m"; done; printf '</head><body>'; cat "$raiz/demo/caminos-documentos-demo.html"; } > "$salida"
sed -i -e 's#https://cdnjs.cloudflare.com/ajax/libs/html2canvas/[^"]*#h2c/package/dist/html2canvas.min.js#' \
       -e 's#https://cdnjs.cloudflare.com/ajax/libs/jspdf/[^"]*#jspdf/package/dist/jspdf.umd.min.js#' "$salida"
echo "Listo: $salida"
