#!/usr/bin/env python3
"""Arma la demo de la app de documentos de Caminos en un solo archivo HTML.

Uso:
    python3 demo/build.py

Lee la plantilla oficial de la cotización, los logos y los datos de ejemplo
directamente de original/ (sin modificarlos) y los incrusta en
demo/app.html. El resultado queda en demo/caminos-documentos-demo.html.
"""
import base64
import json
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(RAIZ, 'original', 'caminos-documentos-2.5.3')
COT = os.path.join(PLUGIN, 'skills', 'caminos-cotizacion')
DEMO = os.path.join(RAIZ, 'demo')


def leer(ruta):
    with open(ruta, encoding='utf-8') as f:
        return f.read()


def data_uri(ruta):
    return 'data:image/svg+xml;base64,' + base64.b64encode(open(ruta, 'rb').read()).decode()


def main():
    plantilla = leer(os.path.join(COT, 'template', 'cotizacion.html'))
    assets = {
        '../assets/brand/estrella-crema.svg': os.path.join(COT, 'assets', 'brand', 'estrella-crema.svg'),
        '../assets/logos/caminos-logo-white.svg': os.path.join(COT, 'assets', 'logos', 'caminos-logo-white.svg'),
        '../assets/logos/caminos-logo-coral.svg': os.path.join(COT, 'assets', 'logos', 'caminos-logo-coral.svg'),
    }
    for rel, ruta in assets.items():
        plantilla = plantilla.replace(rel, data_uri(ruta))
    sobra = re.findall(r'src="\.\./[^"]+"', plantilla)
    if sobra:
        raise SystemExit('Quedaron recursos sin incrustar: ' + ', '.join(sobra))

    ejemplo = json.loads(leer(os.path.join(COT, 'scripts', 'datos-ejemplo.json')))
    ejemplo.pop('banco_consultado', None)

    # Íconos Lucide (lucide-static@0.445.0, el set del sistema de diseño), sin el comentario de licencia.
    carpeta = os.path.join(DEMO, 'iconos')
    iconos = {}
    for nombre in sorted(os.listdir(carpeta)):
        if nombre.endswith('.svg'):
            svg = re.sub(r'<!--.*?-->', '', leer(os.path.join(carpeta, nombre)), flags=re.S)
            iconos[nombre[:-4]] = re.sub(r'\s+', ' ', svg).strip()

    app = leer(os.path.join(DEMO, 'app.html'))
    reemplazos = {
        '"__ICONOS__"': json.dumps(iconos),
        '"__PLANTILLA__"': json.dumps(plantilla, ensure_ascii=False),
        '"__EJEMPLO__"': json.dumps(ejemplo, ensure_ascii=False),
        '__LOGO_CORAL__': data_uri(assets['../assets/logos/caminos-logo-coral.svg']),
        '__ESTRELLA_CREMA__': data_uri(assets['../assets/brand/estrella-crema.svg']),
    }
    for marca, valor in reemplazos.items():
        if marca not in app:
            raise SystemExit('app.html no tiene la marca ' + marca)
        # </script> dentro de un string JS cerraría el bloque antes de tiempo.
        app = app.replace(marca, valor.replace('</', '<\\/') if marca.startswith('"') else valor)

    salida = os.path.join(DEMO, 'caminos-documentos-demo.html')
    with open(salida, 'w', encoding='utf-8') as f:
        f.write(app)
    print(f'Listo: {os.path.relpath(salida, RAIZ)} ({len(app) // 1024} KB)')


if __name__ == '__main__':
    main()
