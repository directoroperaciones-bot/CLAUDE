#!/usr/bin/env python3
"""Motor del voucher de servicio de Caminos.

Uso:
    python3 generar.py datos.json Voucher-CAM-VCH-0451-01.pdf

Un voucher ampara UN servicio (un hotel, un tiquete o los traslados de un
operador). Claude solo arma datos.json (ver datos-ejemplo.json). Este programa
llena la plantilla oficial, arma la tarjeta de confirmación, quita los bloques
vacíos, verifica la información adicional y genera el PDF.

Códigos de salida:
    0  PDF generado
    2  faltan datos obligatorios (se listan; hay que pedírselos al asesor)
    4  la información adicional no coincide con la oficial (no se genera)
"""
import json
import os
import re
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(AQUI)
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(SKILL)), 'motor'))
import comun as c  # noqa: E402
import flujo  # noqa: E402

PLANTILLA = os.path.join(SKILL, 'template', 'voucher.html')
ASSETS = os.path.join(SKILL, 'assets')
TIPOS = ('hotel', 'aereo', 'traslado')


def validar(d):
    falta = []
    for k, nombre in [('codigo_voucher', 'código de voucher'), ('nombre_servicio', 'nombre del servicio'),
                      ('nombre_viajero', 'titular'), ('proveedor', 'proveedor u operador')]:
        if c.vacio(d.get(k)):
            falta.append(nombre)
    v = d.get('vigencia')
    if c.vacio(v) or (isinstance(v, dict) and (c.vacio(v.get('desde')) or c.vacio(v.get('hasta')))):
        falta.append('vigencia')
    tipo = (d.get('tipo') or '').lower()
    if tipo not in TIPOS:
        falta.append('tipo de servicio (hotel, aereo o traslado)')
    elif tipo == 'hotel':
        filas = [x for x in d.get('hoteles') or [] if not c.vacio(x.get('hotel'))]
        if not filas:
            falta.append('datos del hotel (nombre, entrada, salida)')
        elif not any(not c.vacio(x.get('confirmacion')) for x in filas):
            falta.append('número de confirmación del hotel')
    elif tipo == 'aereo':
        a = d.get('aereo') or {}
        if not a.get('trayectos'):
            falta.append('trayectos del tiquete')
        if c.vacio(a.get('record')):
            falta.append('récord del tiquete')
    elif tipo == 'traslado':
        filas = d.get('traslados') or []
        if not filas:
            falta.append('traslados (trayecto y fecha)')
        elif not any(not c.vacio(x.get('confirmacion')) for x in filas):
            falta.append('número de confirmación del traslado')
    return falta


def tarjeta(d, pats):
    tipo = d['tipo'].lower()
    if tipo == 'hotel':
        filas = [x for x in d['hoteles'] if not c.vacio(x.get('hotel'))]
        return c.tarjeta(pats['hotel'], 'hotel', filas, titulo_hotel=d.get('proveedor'))
    if tipo == 'aereo':
        a = d['aereo']
        filas = [x for x in a['trayectos'] if any(not c.vacio(x.get(k)) for k in c.COLUMNAS['aereo'])]
        return c.tarjeta(pats['aereo'], 'aereo', filas, a.get('aerolinea') or d.get('proveedor'), a.get('tiquete'), a.get('record'))
    filas = [x for x in d['traslados'] if any(not c.vacio(x.get(k)) for k in c.COLUMNAS['traslado'])]
    return c.tarjeta(pats['traslado'], 'traslado', filas, d.get('proveedor'))


def armar(d):
    tpl = open(PLANTILLA, encoding='utf-8').read()
    pats = c.patrones_tarjeta(tpl, 'tarjeta_confirmacion')
    p_inc = c.patron(tpl, 'items_incluye')
    h = re.sub(r'\s*<!-- UNA SOLA tarjeta:.*?-->', '', tpl, flags=re.S)
    h = re.sub(r'\s*<!-- PATRÓN por ítem.*?-->', '', h, flags=re.S)

    acomp = d.get('acompanantes')
    if isinstance(acomp, list):
        acomp = ', '.join(x.strip() for x in acomp if not c.vacio(x))
    for k, v in [('acompanantes', acomp), ('ubicacion', d.get('ubicacion')), ('codigo_reserva', d.get('codigo_reserva'))]:
        if c.vacio(v):
            h = c.quitar_campo(h, k)
        else:
            h = h.replace('{{' + k + '}}', c.e(v))

    h = h.replace('{{tarjeta_confirmacion}}', tarjeta(d, pats))

    inc = [x for x in d.get('incluye') or [] if not c.vacio(x)]
    if inc:
        h = h.replace('{{items_incluye}}', '\n      '.join(p_inc.replace('TEXTO', c.e(x)) for x in inc))
    else:
        h = c.quitar(h, r'\s*<h2 class="sec"[^>]*>Este voucher <span[^>]*>incluye</span></h2>\s*<span class="dash"[^>]*></span>\s*<div[^>]*>\s*\{\{items_incluye\}\}\s*</div>')

    if c.vacio(d.get('instrucciones')):
        h = c.quitar(h, r'\s*<h2 class="sec"[^>]*>Instrucciones <span[^>]*>de uso</span></h2>\s*<span class="dash"[^>]*></span>\s*<div[^>]*>\s*\{\{instrucciones\}\}\s*</div>')
    if c.vacio(d.get('condiciones')):
        h = c.quitar(h, r'\s*<div class="nota"[^>]*>\s*<span>\{\{condiciones\}\}</span>\s*</div>')

    v = d['vigencia']
    vig = c.rango(v['desde'], v['hasta']) if isinstance(v, dict) else c.fecha(v, 'coma')
    cod = str(d['codigo_voucher']).strip()
    valores = {'codigo_voucher': cod, 'codigo_documento': d.get('codigo_documento') or cod,
               'nombre_servicio': d['nombre_servicio'], 'nombre_viajero': d['nombre_viajero'], 'vigencia': vig,
               'instrucciones': d.get('instrucciones', ''), 'condiciones': d.get('condiciones', '')}
    for k, val in valores.items():
        h = h.replace('{{' + k + '}}', c.e(val))
    c.sin_marcadores(h)
    return c.renumerar(h)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    d = json.load(open(sys.argv[1], encoding='utf-8'))
    c.faltan(validar(d))
    c.preparar_fuentes()
    # Si la hoja 1 no alcanza, lo que no cabe (incluye, instrucciones, condiciones
    # o el final de una tarjeta larga) sigue en una hoja "Uso del voucher".
    h = flujo.fluir(armar(d), ASSETS, etiqueta_continuacion='Uso del voucher')
    c.terminar(h, sys.argv[2], ASSETS)


if __name__ == '__main__':
    main()
