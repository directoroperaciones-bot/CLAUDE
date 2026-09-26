#!/usr/bin/env python3
"""Prepara los datos del mapa de ruta del itinerario interactivo.

Uso:
    python3 demo/geo/preparar.py CARPETA_CON_LOS_PAQUETES

Necesita, descomprimidos en esa carpeta (npm pack + tar):
  - world-atlas@2.0.2      (contornos de países de Natural Earth, dominio público; ISC)
  - all-the-cities@3.1.0   (ciudades de GeoNames con más de 1.000 habitantes; CC BY 4.0)
    ya convertido a cities.min.json con
    [nombre, nombre_alterno, país, código_de_tipo, población, lat, lon] por ciudad.

Escribe demo/geo/paises.json y demo/geo/ciudades.json, que build.py incrusta en la app.
El archivo HTML que recibe el viajero solo lleva los contornos y las ciudades de su ruta.
"""
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))

# Ciudades pequeñas que igual deben estar: santuarios y pueblos de las rutas de Caminos.
INCLUIR = {('Assisi', 'IT'), ('Loreto', 'IT'), ('Lourdes', 'FR'), ('Fátima', 'PT'), ('Vatican City', 'VA'),
           ('Lisieux', 'FR'), ('Nevers', 'FR'), ('Ars-sur-Formans', 'FR'),
           ('Paray-le-Monial', 'FR'), ('Cascia', 'IT'), ('Pietrelcina', 'IT'), ('Montserrat', 'ES')}

# Lugares que GeoNames no trae como ciudad. Coordenadas aproximadas (centro del lugar), agregadas
# a mano solo para dibujar la ruta.
A_MANO = [
    ['Medjugorje', 'BA', 2300, 43.190, 17.678],
    ['Montserrat', 'ES', 0, 41.593, 1.837],
    ['Covadonga', 'ES', 0, 43.309, -5.056],
    ['Cafarnaúm', 'IL', 0, 32.881, 35.575],
    ['Caná', 'IL', 0, 32.747, 35.342],
]


def paises(carpeta):
    topo = json.load(open(os.path.join(carpeta, 'world-atlas-2.0.2', 'package', 'countries-50m.json')))
    sx, sy = topo['transform']['scale']
    tx, ty = topo['transform']['translate']
    arcos = []
    for arco in topo['arcs']:
        x = y = 0
        puntos = []
        for dx, dy in arco:
            x += dx
            y += dy
            puntos.append((x * sx + tx, y * sy + ty))
        arcos.append(puntos)

    def anillo(indices):
        pts = []
        for i in indices:
            a = arcos[i] if i >= 0 else list(reversed(arcos[~i]))
            pts.extend(a if not pts else a[1:])
        # Centésimas de grado (~1 km) y sin puntos repetidos: suficiente para un mapa de ruta.
        out, previo = [], None
        for lon, lat in pts:
            p = (round(lon * 100), round(lat * 100))
            if p != previo:
                out.extend(p)
                previo = p
        return out

    salida = []
    for g in topo['objects']['countries']['geometries']:
        if g['type'] == 'Polygon':
            polis = [g['arcs']]
        elif g['type'] == 'MultiPolygon':
            polis = g['arcs']
        else:
            continue
        anillos = [anillo(r) for p in polis for r in p]
        anillos = [r for r in anillos if len(r) >= 6]
        if anillos:
            salida.append([g.get('properties', {}).get('name', ''), anillos])
    return salida


def ciudades(carpeta):
    todas = json.load(open(os.path.join(carpeta, 'cities.min.json')))
    sel = []
    for nombre, _alt, cc, codigo, pob, lat, lon in todas:
        if pob >= 10000 or cc == 'CO' or codigo in ('PPLC', 'PPLA') or (nombre, cc) in INCLUIR:
            sel.append([nombre, cc, pob, lat, lon])
    sel.extend(A_MANO)
    return sel


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    carpeta = sys.argv[1]
    p, c = paises(carpeta), ciudades(carpeta)
    with open(os.path.join(AQUI, 'paises.json'), 'w', encoding='utf-8') as f:
        json.dump(p, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(AQUI, 'ciudades.json'), 'w', encoding='utf-8') as f:
        json.dump(c, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(p)} países, {len(c)} ciudades')


if __name__ == '__main__':
    main()
