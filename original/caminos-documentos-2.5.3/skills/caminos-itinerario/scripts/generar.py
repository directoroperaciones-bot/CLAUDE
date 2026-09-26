#!/usr/bin/env python3
"""Motor del itinerario de viaje de Caminos.

Uso:
    python3 generar.py datos.json Itinerario-CA2790.pdf
    python3 generar.py --compacto datos.json Itinerario-CA9001.pdf   (itinerario corto)

Claude solo arma datos.json (ver datos-ejemplo.json y datos-ejemplo-corto.json).
Este programa arma los bloques con el diseño oficial, los reparte entre hojas
(un día nunca se parte; listas, hoteles y recomendaciones sí), mide el PDF real
y, si alguna hoja se pasa, vuelve a repartir con más margen. Luego verifica la
información adicional y genera el PDF.

Códigos de salida:
    0  PDF generado
    2  faltan datos obligatorios (se listan; hay que pedírselos al asesor)
    3  no se logró repartir sin que algo toque el pie (muy raro; revisar datos)
    4  la información adicional no coincide con la oficial (no se genera)
    5  falta consultar el banco de fotos (se indican las claves)
"""
import datetime
import json
import os
import re
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(AQUI)
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(SKILL)), 'motor'))
sys.path.insert(0, AQUI)
import comun as c  # noqa: E402
import empaquetador as emp  # noqa: E402

ASSETS = os.path.join(SKILL, 'assets')


def iso(v):
    m = re.fullmatch(r'\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*', str(v or ''))
    return datetime.date(int(m[1]), int(m[2]), int(m[3])) if m else None


def rango_hero(a, b):
    """04 al 26 de septiembre de 2026 (con mes o año a cada lado si cambian)."""
    x, y = iso(a), iso(b)
    if not (x and y):
        return f'{a} al {b}'
    if x == y:
        return f'{x.day:02d} de {c.MESES[x.month - 1]} de {x.year}'
    if x.year != y.year:
        return f'{x.day:02d} de {c.MESES[x.month - 1]} de {x.year} al {y.day:02d} de {c.MESES[y.month - 1]} de {y.year}'
    if x.month != y.month:
        return f'{x.day:02d} de {c.MESES[x.month - 1]} al {y.day:02d} de {c.MESES[y.month - 1]} de {y.year}'
    return f'{x.day:02d} al {y.day:02d} de {c.MESES[y.month - 1]} de {y.year}'


def fecha_dia(v):
    f = iso(v)
    return f'{f.day:02d} de {c.MESES[f.month - 1]}' if f else c.e(v)


def fecha_vuelo(v):
    f = iso(v)
    return f'{f.day:02d}/{f.month:02d}/{f.year}' if f else c.e(v)


def validar(d):
    falta = []
    for k, nombre in [('codigo', 'código del itinerario'), ('titulo', 'título del viaje'),
                      ('fecha_inicio', 'fecha de inicio'), ('fecha_fin', 'fecha de fin'),
                      ('pasajero', 'pasajero')]:
        if c.vacio(d.get(k)):
            falta.append(nombre)
    dias = [x for x in d.get('dias') or [] if not c.vacio(x.get('titulo')) or not c.vacio(x.get('descripcion'))]
    if not dias:
        falta.append('al menos un día del recorrido')
    return falta


def bloques(d):
    out = []
    campos = [(k, c.e(d.get(v))) for k, v in [('Grupo', 'grupo'), ('Acompañamiento espiritual', 'acompanamiento'),
                                               ('Pasajero', 'pasajero'), ('Acomodación', 'acomodacion')]
              if not c.vacio(d.get(v))]
    out.append(emp.b_datos(campos))
    if d.get('_foto_portada') and d.get('estilo_foto') == 'cuerpo':
        out.append(emp.b_foto_destino(d['_foto_portada'], c.e(d.get('destino') or '')))

    if not c.vacio(d.get('bienvenida')):
        parrafos = [p for p in re.split(r'\n\s*\n', str(d['bienvenida']).strip()) if p.strip()]
        out.append(emp.b_bienvenida('<br><br>'.join(c.e(p) for p in parrafos)))
    if not c.vacio(d.get('frase')):
        out.append(emp.b_frase(c.e(d['frase'])))

    for clave, titulo in [('vuelos', 'confirmados'), ('vuelos_internos', 'internos')]:
        filas = [(c.e(v.get('vuelo')), fecha_vuelo(v.get('fecha')), c.e(v.get('origen')), c.e(v.get('destino')),
                  c.e(v.get('sale')), c.e(v.get('llega')))
                 for v in d.get(clave) or [] if not c.vacio(v.get('vuelo')) or not c.vacio(v.get('origen'))]
        if filas:
            out.append(emp.b_vuelos(titulo, filas))

    out.append(emp.b_titulo_dias())
    dias = [x for x in d['dias'] if not c.vacio(x.get('titulo')) or not c.vacio(x.get('descripcion'))]
    for n, x in enumerate(dias, 1):
        tags = [(c.e(t), False) for t in (x.get('comidas') or []) + (x.get('etiquetas') or []) if not c.vacio(t)]
        if not c.vacio(x.get('hotel')):
            tags.append((c.e(x['hotel']), True))
        num = x.get('dia') or n
        out.append(emp.b_dia(f'{int(num):02d}' if str(num).isdigit() else c.e(num), fecha_dia(x.get('fecha')),
                             c.e(x.get('titulo', '')), c.e(x.get('descripcion', '')), tags or None,
                             x.get('_foto')))

    def lista(items):
        r = []
        for it in items:
            if isinstance(it, dict) and not c.vacio(it.get('grupo')):
                r.append(('g', c.e(it['grupo'])))
                r.extend(c.e(z) for z in it.get('items') or [] if not c.vacio(z))
            elif isinstance(it, str) and not c.vacio(it):
                r.append(c.e(it))
        return r

    inc = lista(d.get('incluye') or [])
    if inc:
        out.append(emp.b_lista('El precio', 'incluye', inc))
    noinc = lista(d.get('no_incluye') or [])
    if noinc:
        out.append(emp.b_lista('El precio', 'no incluye', noinc, check=False))

    hoteles = [(c.e(h.get('nombre')), c.e(h.get('ciudad')), c.e(h.get('direccion')), c.e(h.get('telefono')))
               for h in d.get('hoteles') or [] if not c.vacio(h.get('nombre'))]
    fotos_h = [(h['_foto'], c.e(h.get('nombre')), c.e(h.get('ciudad') or ''))
               for h in d.get('hoteles') or [] if h.get('_foto') and not c.vacio(h.get('nombre'))]
    if fotos_h:
        out.append(emp.b_fotos_hoteles(fotos_h))
    if hoteles:
        out.append(emp.b_hoteles(hoteles))

    recom = [(c.e(r.get('tema')), [c.e(z) for z in r.get('items') or [] if not c.vacio(z)])
             for r in d.get('recomendaciones') or [] if not c.vacio(r.get('tema'))]
    recom = [r for r in recom if r[1]]
    if recom:
        out.append(emp.b_recom(recom))
    if not c.vacio(d.get('nota')):
        out.append(emp.b_nota(c.e(d['nota'])))
    return out


def armar(d, alto_p1, alto_cont):
    emp.ALTO_P1, emp.ALTO_CONT = alto_p1, alto_cont
    titulo = '<br>'.join(c.e(t) for t in str(d['titulo']).split('\n'))
    heroe = emp.hero(c.e(d.get('subtitulo', '')), titulo, rango_hero(d['fecha_inicio'], d['fecha_fin']),
                     d.get('_foto_portada') if d.get('estilo_foto') != 'cuerpo' else None)
    codigo = str(d['codigo']).strip()
    doc = d.get('codigo_documento') or c.codigo_documento(codigo, 'CAM-ITI')
    h, total = emp.documento(heroe, bloques(d), 'Itinerario ' + codigo, doc)
    c.sin_marcadores(h)
    return h


def main():
    compacto = '--compacto' in sys.argv
    if compacto:
        sys.argv.remove('--compacto')
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    d = json.load(open(sys.argv[1], encoding='utf-8'))
    c.faltan(validar(d))
    base = os.path.dirname(os.path.abspath(sys.argv[1]))
    carpeta = os.path.join(base, 'fotos-procesadas')
    ruta = lambda r: r if not r or os.path.isabs(r) else os.path.join(base, r)
    destino = d.get('destino') or ''
    if not destino and not d.get('foto_portada') and not d.get('banco_consultado'):
        c.faltan(['destino (ciudad o país principal del viaje; con él se busca la foto de portada en el banco)'])
    # Banco de fotos: si falta alguna foto, primero hay que consultarlo (el motor da las claves).
    faltan_fotos = [] if d.get('foto_portada') or not destino else [c.clave_destino(destino)]
    faltan_fotos += [c.clave_hotel(x.get('nombre'), x.get('ciudad')) for x in d.get('hoteles') or [] if not x.get('foto')]
    c.exigir_banco(d, faltan_fotos)
    del_banco = lambda r: bool(re.fullmatch(r'[0-9a-f]{32}\.\w+', os.path.basename(str(r or ''))))
    d['_foto_portada'] = c.preparar_foto(ruta(d.get('foto_portada')), carpeta, 'portada', 'portada')
    if destino and not del_banco(d.get('foto_portada')):
        c.para_guardar(c.clave_destino(destino), 'destino', destino, '', d.get('foto_portada'), d['_foto_portada'])
    for n, x in enumerate(d.get('dias') or [], 1):
        x['_foto'] = c.preparar_foto(ruta(x.get('foto')), carpeta, f'dia-{n}', f'el día {n}')
    for x in d.get('hoteles') or []:
        x['_foto'] = c.preparar_foto(ruta(x.get('foto')), carpeta, 'hotel-' + (x.get('nombre') or 'x'), 'una tarjeta de hotel')
        if not del_banco(x.get('foto')):
            c.para_guardar(c.clave_hotel(x.get('nombre'), x.get('ciudad')), 'hotel', x.get('nombre'), x.get('ciudad'), x.get('foto'), x['_foto'])
    c.preparar_fuentes()
    p1, pc = emp.ALTO_P1, emp.ALTO_CONT
    with tempfile.TemporaryDirectory() as tmp:
        for _ in range(8):
            h = armar(d, p1, pc)
            fondos = c.medir(h, tmp, ASSETS)
            malos = c.desbordes(fondos)
            if not malos:
                break
            # La estimación se quedó corta en alguna hoja: más margen y volver a repartir.
            for i, px in malos:
                if i == 1:
                    p1 -= px + 12
                else:
                    pc -= px + 12
        if compacto and not c.desbordes(fondos):
            # Itinerario corto: las alturas estimadas son conservadoras. Se prueba con más
            # espacio por hoja y solo se acepta si la medición real no toca el pie y
            # el documento queda con menos hojas.
            for extra in (40, 80, 120, 160):
                h2 = armar(d, p1 + extra, pc + extra)
                f2 = c.medir(h2, tmp, ASSETS)
                if not c.desbordes(f2) and len(f2) < len(fondos):
                    h, fondos = h2, f2
                    break
    c.terminar(h, sys.argv[2], ASSETS, fondos)


if __name__ == '__main__':
    main()
