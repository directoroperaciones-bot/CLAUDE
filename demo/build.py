#!/usr/bin/env python3
"""Arma la demo de la app de documentos de Caminos en un solo archivo HTML.

Uso:
    python3 demo/build.py

Lee las plantillas oficiales (cotización, confirmación, voucher e itinerario),
los logos, las fuentes y los datos de ejemplo directamente de original/ (sin
modificarlos) y los incrusta en demo/app.html junto con demo/app.js. El
resultado queda en demo/caminos-documentos-demo.html.
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
    svg = leer(ruta)
    # Sin width/height, html2canvas (PDF) toma el tamaño por defecto de 300×150 y recorta el logo:
    # se le ponen las medidas del viewBox. De paso sale la firma C2PA, que no se ve y pesa.
    svg = re.sub(r'<metadata>.*?</metadata>', '', svg, flags=re.S)
    raiz = re.match(r'\s*(?:<\?xml[^>]*>\s*)?<svg\b[^>]*>', svg)
    vb = re.search(r'viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)', raiz.group(0)) if raiz else None
    if vb and not re.search(r'\swidth=', raiz.group(0)):
        svg = svg[:raiz.end() - 1] + f' width="{vb.group(1)}" height="{vb.group(2)}"' + svg[raiz.end() - 1:]
    return 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode('utf-8')).decode()


def main():
    # Plantillas oficiales y datos de ejemplo de cada documento, leídos del plugin sin tocarlo.
    plantillas, ejemplos = {}, {}
    for doc in ('cotizacion', 'confirmacion', 'voucher'):
        skill = os.path.join(PLUGIN, 'skills', 'caminos-' + doc)
        tpl = leer(os.path.join(skill, 'template', doc + '.html'))
        for rel in sorted(set(re.findall(r'src="(\.\./assets/[^"]+\.svg)"', tpl))):
            tpl = tpl.replace(rel, data_uri(os.path.join(skill, rel[3:])))
        sobra = re.findall(r'src="\.\./[^"]+"', tpl)
        if sobra:
            raise SystemExit(f'{doc}: quedaron recursos sin incrustar: ' + ', '.join(sobra))
        plantillas[doc] = tpl
        ej = json.loads(leer(os.path.join(skill, 'scripts', 'datos-ejemplo.json')))
        ej.pop('banco_consultado', None)
        ejemplos[doc] = ej
    # Itinerario (largo y corto usan la misma plantilla y el mismo motor). La plantilla
    # no se llena por marcadores: el motor arma las hojas con sus piezas (CSS, pie,
    # página de información adicional), así que se incrusta entera y aparte sus recursos.
    iti = os.path.join(PLUGIN, 'skills', 'caminos-itinerario')
    plantillas['itinerario'] = leer(os.path.join(iti, 'template', 'itinerario.html'))
    for nombre, archivo in (('itinerario', 'datos-ejemplo.json'), ('itinerario_corto', 'datos-ejemplo-corto.json')):
        ej = json.loads(leer(os.path.join(iti, 'scripts', archivo)))
        ej.pop('banco_consultado', None)
        ejemplos[nombre] = ej
    recursos = {rel: data_uri(os.path.join(iti, rel[3:])) for rel in (
        '../assets/brand/estrella-crema.svg', '../assets/logos/caminos-logo-white.svg', '../assets/logos/caminos-logo-coral.svg')}
    recursos['proteccion.png'] = 'data:image/png;base64,' + base64.b64encode(
        open(os.path.join(PLUGIN, 'motor', 'proteccion.png'), 'rb').read()).decode()
    logos = os.path.join(COT, 'assets')

    # Íconos Lucide (lucide-static@0.445.0, el set del sistema de diseño), sin el comentario de licencia.
    carpeta = os.path.join(DEMO, 'iconos')
    iconos = {}
    for nombre in sorted(os.listdir(carpeta)):
        if nombre.endswith('.svg'):
            svg = re.sub(r'<!--.*?-->', '', leer(os.path.join(carpeta, nombre)), flags=re.S)
            iconos[nombre[:-4]] = re.sub(r'\s+', ' ', svg).strip()

    # Poppins del plugin (las mismas que usa el motor para el PDF), para medir y dibujar igual.
    fuentes = ''.join(
        "@font-face{font-family:'Poppins';font-style:normal;font-weight:%d;src:url(data:font/ttf;base64,%s) format('truetype');}"
        % (peso, base64.b64encode(open(os.path.join(PLUGIN, 'fuentes', f'Poppins-{nombre}.ttf'), 'rb').read()).decode())
        for nombre, peso in (('Regular', 400), ('Medium', 500), ('Bold', 700)))
    # Para el itinerario interactivo (se publica en línea): las mismas Poppins recortadas al alfabeto latino, en
    # woff2 (fuentes-web/, hechas con pyftsubset). Pesan ~7 KB cada una en lugar de ~160 KB.
    fuentes_web = ''.join(
        "@font-face{font-family:'Poppins';font-style:normal;font-weight:%d;src:url(data:font/woff2;base64,%s) format('woff2');}"
        % (peso, base64.b64encode(open(os.path.join(DEMO, 'fuentes-web', f'Poppins-{nombre}.woff2'), 'rb').read()).decode())
        for nombre, peso in (('Regular', 400), ('Medium', 500), ('Bold', 700)))

    app = leer(os.path.join(DEMO, 'app.html')).replace('/*__APP_JS__*/', leer(os.path.join(DEMO, 'app.js')))
    app = app.replace('/*__INTERACTIVO__*/', leer(os.path.join(DEMO, 'interactivo.js')))
    reemplazos = {
        '"__ICONOS__"': json.dumps(iconos),
        '"__FUENTES__"': json.dumps(fuentes),
        '"__FUENTES_WEB__"': json.dumps(fuentes_web),
        '"__RECURSOS__"': json.dumps(recursos),
        '"__CIUDADES__"': leer(os.path.join(DEMO, 'geo', 'ciudades.json')),
        '"__PAISES__"': leer(os.path.join(DEMO, 'geo', 'paises.json')),
        '"__PLANTILLAS__"': json.dumps(plantillas, ensure_ascii=False),
        '"__EJEMPLOS__"': json.dumps(ejemplos, ensure_ascii=False),
        '__LOGO_CORAL__': data_uri(os.path.join(logos, 'logos', 'caminos-logo-coral.svg')),
        '__ESTRELLA_CREMA__': data_uri(os.path.join(logos, 'brand', 'estrella-crema.svg')),
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
