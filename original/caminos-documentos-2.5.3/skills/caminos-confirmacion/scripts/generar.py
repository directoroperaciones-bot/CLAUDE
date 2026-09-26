#!/usr/bin/env python3
"""Motor de la confirmación de reserva de Caminos.

Uso:
    python3 generar.py datos.json Confirmacion-CAM-2026-2790.pdf

Claude solo arma datos.json (ver datos-ejemplo.json). Este programa llena la
plantilla oficial, arma las tarjetas de confirmación (una línea por vuelo, hotel
o traslado), pasa a la hoja 2 las tarjetas que no quepan en la 1, quita los
bloques vacíos, verifica la información adicional y genera el PDF.

Códigos de salida:
    0  PDF generado
    2  faltan datos obligatorios (se listan; hay que pedírselos al asesor)
    3  el contenido no cabe (se indica la hoja y cuánto sobra)
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

PLANTILLA = os.path.join(SKILL, 'template', 'confirmacion.html')
ASSETS = os.path.join(SKILL, 'assets')

def tarjetas(d, pats):
    out = []
    for t in d.get('aereo') or []:
        tray = [x for x in t.get('trayectos') or [] if any(not c.vacio(x.get(k)) for k in c.COLUMNAS['aereo'])]
        if tray:
            out.append(c.tarjeta(pats['aereo'], 'aereo', tray, t.get('aerolinea', ''), t.get('tiquete'), t.get('record')))
    hoteles = [x for x in d.get('hoteles') or [] if not c.vacio(x.get('hotel'))]
    if hoteles:
        out.append(c.tarjeta(pats['hotel'], 'hotel', hoteles))
    grupos = {}
    for x in d.get('traslados') or []:
        if any(not c.vacio(x.get(k)) for k in c.COLUMNAS['traslado']):
            grupos.setdefault((x.get('operador') or '').strip(), []).append(x)
    for operador, filas in grupos.items():
        out.append(c.tarjeta(pats['traslado'], 'traslado', filas, operador))
    return out


def validar(d):
    falta = []
    for k, nombre in [('codigo_reserva', 'código de reserva'), ('titulo_viaje', 'título del viaje'),
                      ('nombre_viajero', 'nombre del titular'), ('destino', 'destino'),
                      ('fecha_salida', 'fecha de ida'), ('fecha_regreso', 'fecha de regreso'),
                      ('estado_pago', 'estado de pago')]:
        if c.vacio(d.get(k)):
            falta.append(nombre)
    for k, nombre in [('asesor', 'nombre del asesor'), ('asesor_correo', 'correo del asesor'),
                      ('asesor_telefono', 'teléfono del asesor')]:
        if c.vacio(d.get(k)):
            falta.append(nombre)
    for t in d.get('aereo') or []:
        if t.get('trayectos') and c.vacio(t.get('record')):
            falta.append(f'récord del tiquete de {t.get("aerolinea") or "la aerolínea"}')
    return falta


def base(d):
    """Plantilla con todo lo fijo resuelto; deja {{tarjetas_*}} para repartir."""
    tpl = open(PLANTILLA, encoding='utf-8').read()
    p_serv, p_pago = c.patron(tpl, 'items_servicios_confirmados'), c.patron(tpl, 'filas_pago')
    h = re.sub(r'\s*<!-- PATRÓN por (?:servicio|ítem|fila).*?-->', '', tpl, flags=re.S)
    h = re.sub(r'\s*<!-- Las tarjetas de confirmación que no quepan.*?-->', '', h, flags=re.S)

    for k in ['destino', 'pasajeros', 'estado_pago']:
        if c.vacio(d.get(k)):
            h = c.quitar_campo(h, k)
    if c.vacio(d.get('parrafo_confirmacion')):
        h = h.replace(' {{parrafo_confirmacion}}', '')

    serv = [x for x in d.get('servicios_confirmados') or [] if not c.vacio(x)]
    if serv:
        h = h.replace('{{items_servicios_confirmados}}', '\n    '.join(p_serv.replace('TEXTO', c.e(x)) for x in serv))
    else:
        h = c.quitar(h, r'\s*<h2 class="sec"[^>]*>Servicios <span[^>]*>confirmados</span></h2>\s*<span class="dash"[^>]*></span>\s*<div[^>]*>\s*\{\{items_servicios_confirmados\}\}\s*</div>')

    pagos = [x for x in d.get('pagos') or [] if not c.vacio(x.get('concepto')) or not c.vacio(x.get('valor'))]
    if pagos:
        h = h.replace('{{filas_pago}}', '\n      '.join(
            p_pago.replace('CONCEPTO', c.e(x.get('concepto', ''))).replace('$VALOR', c.e(x.get('valor', ''))).replace('ESTADO', c.e(x.get('estado', ''))) for x in pagos))
    else:
        h = c.quitar(h, r'\s*<h3 class="sub">Información <span[^>]*>de pago</span></h3>\s*<span class="dash"[^>]*></span>\s*<table.*?\{\{filas_pago\}\}.*?</table>')

    if c.vacio(d.get('nota_importante')):
        h = c.quitar(h, r'\s*<div class="nota"[^>]*>\s*<span>\{\{nota_importante\}\}</span>\s*</div>')

    ases = {'asesor': d.get('asesor'), 'asesor_correo': d.get('asesor_correo'), 'asesor_telefono': d.get('asesor_telefono')}
    if all(c.vacio(v) for v in ases.values()):
        h = c.quitar(h, r'\s*<h3 class="sub">¿Tienes <span[^>]*>dudas\?</span></h3>\s*<span class="dash"[^>]*></span>\s*<div[^>]*>.*?\{\{asesor_telefono\}\}</span></div>\s*</div>')
    else:
        for k, v in ases.items():
            if c.vacio(v):
                h = c.quitar_campo(h, k)
            else:
                h = h.replace('{{' + k + '}}', c.e(v))

    doc = d.get('codigo_documento') or c.codigo_documento(d['codigo_reserva'], 'CAM-CONF')
    valores = {
        'codigo_reserva': d['codigo_reserva'], 'codigo_documento': doc, 'titulo_viaje': d['titulo_viaje'],
        'nombre_viajero': d['nombre_viajero'], 'parrafo_confirmacion': d.get('parrafo_confirmacion', ''),
        'destino': d.get('destino', ''), 'pasajeros': d.get('pasajeros', ''), 'estado_pago': d.get('estado_pago', ''),
        'fecha_salida': c.fecha(d['fecha_salida'], 'coma', cero=True),
        'fecha_regreso': c.fecha(d['fecha_regreso'], 'coma', cero=True),
        'nota_importante': d.get('nota_importante', ''),
    }
    for k, v in valores.items():
        h = h.replace('{{' + k + '}}', c.e(v))
    return h, tpl


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    d = json.load(open(sys.argv[1], encoding='utf-8'))
    c.faltan(validar(d))
    c.preparar_fuentes()
    h0, tpl = base(d)
    cards = tarjetas(d, c.patrones_tarjeta(tpl, 'tarjetas_confirmacion'))

    if not cards:
        h0 = c.quitar(h0, r'\s*<!-- ======== CONFIRMACIONES DE SERVICIOS ======== -->.*?\{\{tarjetas_confirmacion\}\}')
        h0 = h0.replace('\n  {{tarjetas_continuacion}}', '')

    # Todas las tarjetas van primero en la hoja 1; el repartidor pasa a la hoja
    # siguiente lo que no quepa (partiendo tarjetas largas y repitiendo su
    # encabezado) y, si todo cabe en menos hojas, lo sube.
    h = (h0.replace('{{tarjetas_confirmacion}}', '\n\n    '.join(cards))
           .replace('\n  {{tarjetas_continuacion}}', ''))
    c.sin_marcadores(h)
    h = flujo.fluir(h, ASSETS, juntar=True)
    c.terminar(h, sys.argv[2], ASSETS)


if __name__ == '__main__':
    main()
