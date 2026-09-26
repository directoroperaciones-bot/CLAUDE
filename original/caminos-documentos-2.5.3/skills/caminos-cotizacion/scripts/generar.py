#!/usr/bin/env python3
"""Motor de la cotización de Caminos.

Uso:
    python3 generar.py datos.json Cotizacion-CA3311.pdf

Claude solo arma datos.json (ver datos-ejemplo.json). Este programa llena la
plantilla oficial, quita los bloques vacíos, revisa que nada se salga de la hoja
y genera el PDF. El diseño nunca lo toca la IA.

Códigos de salida:
    0  PDF generado
    2  faltan datos obligatorios (se listan; hay que pedírselos al asesor)
    3  el contenido no cabe en una hoja (se indica cuál y cuánto sobra)
    4  la página de información adicional no coincide con la oficial (no se genera)
    5  falta consultar el banco de fotos (se indican las claves)
"""
import json
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(AQUI)
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(SKILL)), 'motor'))
import comun as c  # noqa: E402
import flujo  # noqa: E402
from comun import e, vacio, patron  # noqa: E402

PLANTILLA = os.path.join(SKILL, 'template', 'cotizacion.html')
ASSETS = os.path.join(SKILL, 'assets')


def quitar_comentarios_patron(tpl):
    return re.sub(r'\s*<!-- PATRÓN.*?-->', '', tpl, flags=re.S)


def normalizar_fechas(d):
    for k in ('fecha_llegada', 'fecha_salida'):
        d[k] = c.fecha(d.get(k), 'coma')
    d['vigencia'] = c.fecha(d.get('vigencia'), 'de')
    for s in d.get('itinerario') or []:
        s['fecha'] = c.fecha(s.get('fecha'), 'dia')
    return d


def validar(d):
    falta = []
    for k, nombre in [('codigo_cotizacion', 'código de cotización'), ('titulo_destino', 'título del viaje'),
                      ('fecha_llegada', 'fecha de llegada'), ('fecha_salida', 'fecha de salida'),
                      ('vigencia', 'vigencia'), ('condiciones_pago', 'condiciones de pago')]:
        if vacio(d.get(k)):
            falta.append(nombre)
    if vacio(d.get('incluye')):
        falta.append('qué incluye el precio')
    ases = d.get('asesor') or {}
    for k, nombre in [('nombre', 'nombre del asesor'), ('correo', 'correo del asesor'), ('telefono', 'teléfono del asesor')]:
        if vacio(ases.get(k)):
            falta.append(nombre)
    tar = [t for t in d.get('tarifas') or [] if not vacio(t.get('valor'))]
    if not tar:
        falta.append('al menos una tarifa con su valor')
    return falta


def armar(d):
    tpl = open(PLANTILLA, encoding='utf-8').read()
    p_inc, p_noinc = patron(tpl, 'items_incluye'), patron(tpl, 'items_no_incluye')
    p_tar, p_iti = patron(tpl, 'filas_tarifas'), patron(tpl, 'filas_itinerario')
    h = quitar_comentarios_patron(tpl)

    # Campos del bloque de datos: si vienen vacíos se quita el <div> completo.
    for k in ['destino', 'fecha_llegada', 'fecha_salida', 'noches', 'pasajeros', 'acomodacion']:
        if vacio(d.get(k)):
            h = re.sub(r'\s*<div style="[^"]*"><span class="meta-label">[^<]*</span><span class="meta-value">\{\{' + k + r'\}\}</span></div>', '', h)

    if vacio(d.get('parrafo_intro')):
        h = re.sub(r'\s*<p style="[^"]*">\{\{parrafo_intro\}\}</p>', '', h)

    h = h.replace('{{items_incluye}}', '\n      '.join(p_inc.replace('TEXTO', e(i)) for i in d['incluye'] if not vacio(i)))

    noinc = [i for i in d.get('no_incluye') or [] if not vacio(i)]
    if noinc:
        h = h.replace('{{items_no_incluye}}', '\n      '.join(p_noinc.replace('TEXTO', e(i)) for i in noinc))
    else:
        h = re.sub(r'\s*<h2 class="sec"[^>]*>El precio <span[^>]*>no incluye</span></h2>\s*<span class="dash"[^>]*></span>\s*<div[^>]*>\s*\{\{items_no_incluye\}\}\s*</div>', '', h)

    filas = []
    for t in d['tarifas']:
        if vacio(t.get('valor')):
            continue
        filas.append(p_tar.replace('HOTEL', e(t.get('hotel', ''))).replace('ACOMODACIÓN', e(t.get('acomodacion', ''))).replace('$VALOR', e(t['valor'])))
    h = h.replace('{{filas_tarifas}}', '\n      '.join(filas))

    iti = [s for s in d.get('itinerario') or [] if any(not vacio(s.get(k)) for k in ('servicio', 'fecha', 'detalle'))]
    if iti:
        h = h.replace('{{filas_itinerario}}', '\n      '.join(
            p_iti.replace('SERVICIO', e(s.get('servicio', ''))).replace('FECHA', e(s.get('fecha', ''))).replace('DETALLE', e(s.get('detalle', ''))) for s in iti))
    else:
        h = re.sub(r'\s*<h2 class="sec"[^>]*>Itinerario <span[^>]*>de servicios</span></h2>\s*<span class="dash"[^>]*></span>\s*<table[^>]*>.*?\{\{filas_itinerario\}\}.*?</table>', '', h, flags=re.S)

    parrafos = [p for p in re.split(r'\n\s*\n', str(d['condiciones_pago']).strip()) if p.strip()]
    cond = parrafos[0] if len(parrafos) == 1 else ''.join(f'<p style="margin:0 0 10px;">{e(p)}</p>' for p in parrafos)
    h = h.replace('{{condiciones_pago}}', e(cond) if len(parrafos) == 1 else cond)

    asesor = d.get('asesor') or {}
    if len(str(asesor.get('correo') or '').strip()) > 28:
        # Correo largo: más ancho para su columna, para que no se parta en dos renglones.
        h = h.replace('<div style="width:25%;padding-right:14px;"><span class="meta-label">Vigencia', '<div style="width:24%;padding-right:14px;"><span class="meta-label">Vigencia', 1)
        h = h.replace('<div style="width:22%;padding-right:14px;"><span class="meta-label">Tu asesor', '<div style="width:18%;padding-right:14px;"><span class="meta-label">Tu asesor', 1)
        h = h.replace('<div style="width:33%;padding-right:14px;"><span class="meta-label">Correo', '<div style="width:38%;padding-right:14px;"><span class="meta-label">Correo', 1)
    for k in ['nombre', 'correo', 'telefono']:
        if vacio(asesor.get(k)):
            h = re.sub(r'\s*<div style="[^"]*"><span class="meta-label">[^<]*</span><span class="meta-value"[^>]*>\{\{asesor_' + k + r'\}\}</span></div>', '', h)
        else:
            h = h.replace('{{asesor_' + k + '}}', e(asesor[k]))

    codigo = str(d['codigo_cotizacion']).strip()
    doc = d.get('codigo_documento') or ('CAM-COT-' + re.sub(r'^[A-Za-z]+', '', codigo) if re.search(r'\d', codigo) else codigo)
    valores = {'codigo_cotizacion': codigo, 'codigo_documento': doc}
    for k in ['titulo_destino', 'parrafo_intro', 'destino', 'fecha_llegada', 'fecha_salida', 'noches', 'pasajeros', 'acomodacion', 'vigencia']:
        valores[k] = d.get(k) or ''
    for k, v in valores.items():
        h = h.replace('{{' + k + '}}', e(v))
    h = h.replace('{{total_paginas}}', str(h.count('<section class="page"')))

    # ---- fotos ----
    if d.get('_foto_portada') and d.get('estilo_foto') == 'cuerpo':
        # Alternativa (estilo_foto = 'cuerpo'): la portada queda coral y la foto va
        # como bloque en el cuerpo. El estándar aprobado es la foto en el encabezado.
        lugar = e(d.get('destino') or '')
        foto = ('<div style="position:relative;margin-top:26px;height:230px;border-radius:18px;overflow:hidden;'
                'box-shadow:0 12px 32px rgba(31,32,36,.14);' + c.css_foto(d['_foto_portada']) + '">'
                + (f'<span style="position:absolute;left:24px;bottom:22px;display:inline-flex;align-items:center;'
                   f'background:rgba(255,255,255,.92);border-radius:999px;padding:9px 18px;font:600 13px/1 \'Poppins\',sans-serif;'
                   f'letter-spacing:0.14em;text-transform:uppercase;color:#1F2024;">{lugar}</span>' if lugar else '')
                + '</div>')
        marca = '<h2 class="sec" style="margin-top:26px;font-size:36px;">El precio <span style="color:#F25061;">incluye</span></h2>'
        h = h.replace(marca, foto + '\n\n    ' + marca, 1)
    elif d.get('_foto_portada'):
        hero = re.search(r'<div style="position:relative;height:420px;overflow:hidden;background:#F25061;">.*?\n  </div>\n', h, re.S).group(0)
        h = h.replace(hero, c.portada_con_foto(hero, d['_foto_portada'], 420), 1)
    con_foto, vistos = [], set()
    for t in d.get('tarifas') or []:
        nombre = (t.get('hotel') or '').strip()
        if t.get('_foto') and nombre and nombre not in vistos and not vacio(t.get('valor')):
            vistos.add(nombre)
            valores = [x.get('valor') for x in d['tarifas'] if (x.get('hotel') or '').strip() == nombre and not vacio(x.get('valor'))]
            precio = e(valores[0]) if len(valores) == 1 else 'desde ' + e(min(valores, key=lambda v: int(re.sub(r'\D', '', v) or 0)))
            con_foto.append((t['_foto'], e(nombre), f'<span style="font-weight:600;color:#F25061;">{precio}</span> por persona'))
    if con_foto:
        bloque = ('<h2 class="sec" style="margin-top:26px;font-size:36px;">Tus opciones <span style="color:#F25061;">de hotel</span></h2>\n'
                  '  <span class="dash" style="margin-top:14px;"></span>\n'
                  '  <div style="display:flex;flex-wrap:wrap;margin-top:22px;">' + ''.join(c.tarjetas_foto(con_foto)) + '</div>\n\n  ')
        marca = '<h2 class="sec" style="margin-top:26px;font-size:36px;">Tarifas <span'
        h = h.replace(marca, bloque + marca, 1)

    c.sin_marcadores(h)
    return h


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    d = normalizar_fechas(json.load(open(sys.argv[1], encoding='utf-8')))
    c.faltan(validar(d))
    base = os.path.dirname(os.path.abspath(sys.argv[1]))
    carpeta = os.path.join(base, 'fotos-procesadas')
    ruta = lambda r: r if not r or os.path.isabs(r) else os.path.join(base, r)
    destino = d.get('destino') or re.split(r',', str(d.get('titulo_destino') or ''))[0]
    # Banco de fotos: si falta alguna foto, primero hay que consultarlo (el motor da las claves).
    faltan_fotos = [] if d.get('foto_portada') else [c.clave_destino(destino)]
    faltan_fotos += [c.clave_hotel(t.get('hotel'), destino) for t in d.get('tarifas') or [] if not t.get('foto')]
    c.exigir_banco(d, faltan_fotos)
    del_banco = lambda r: bool(re.fullmatch(r'[0-9a-f]{32}\.\w+', os.path.basename(str(r or ''))))
    d['_foto_portada'] = c.preparar_foto(ruta(d.get('foto_portada')), carpeta, 'portada', 'portada')
    if not del_banco(d.get('foto_portada')):
        c.para_guardar(c.clave_destino(destino), 'destino', destino, '', d.get('foto_portada'), d['_foto_portada'])
    for t in d.get('tarifas') or []:
        t['_foto'] = c.preparar_foto(ruta(t.get('foto')), carpeta, 'hotel-' + (t.get('hotel') or 'x'), 'una tarjeta de hotel')
        if not del_banco(t.get('foto')) and not any(g['clave'] == c.clave_hotel(t.get('hotel'), destino) for g in c.GUARDAR):
            c.para_guardar(c.clave_hotel(t.get('hotel'), destino), 'hotel', t.get('hotel'), destino, t.get('foto'), t['_foto'])
    c.preparar_fuentes()
    # En la cotización el contenido termina al menos 28 px antes del pie, para que respire.
    h = flujo.fluir(armar(d), ASSETS, pegar_nota=True, limite=1156)
    c.terminar(h, sys.argv[2], ASSETS)


if __name__ == '__main__':
    main()
