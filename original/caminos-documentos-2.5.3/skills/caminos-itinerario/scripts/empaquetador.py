#!/usr/bin/env python3
"""
EMPAQUETADOR — Itinerario de Caminos (lo usa scripts/generar.py)

Constructores de bloque con su altura estimada, y el repartidor que los apila en
páginas partiendo los bloques divisibles (listas, tabla de hoteles,
recomendaciones). Un día nunca se parte.

No se llama directamente: generar.py lo usa y además mide el PDF real para
corregir las estimaciones.
"""
import sys, re, math, os, shutil, subprocess

# Todo lo que necesita viene de la plantilla que viaja con el skill:
# el pie con la franja y la página de información adicional.
AQUI = os.path.dirname(os.path.abspath(__file__))
_TPL = open(os.path.join(os.path.dirname(AQUI), 'template', 'itinerario.html'), encoding='utf-8').read()
_PIE = re.search(r'<!-- PIE_Y_FRANJA[^\n]*\n(.*?)\n-->', _TPL, re.S).group(1)
_i = _TPL.index('<!-- ========== PÁGINA — INFORMACIÓN ADICIONAL')
_POL = _TPL[_i:_TPL.index('</section>', _i) + len('</section>')]

def pie(codigo_doc, pagina):
    return _PIE.replace('CÓDIGO_DOCUMENTO', codigo_doc).replace('N de TOTAL', pagina)

def pagina_politicas(codigo, codigo_doc, pagina):
    # CÓDIGO_DOCUMENTO se reemplaza antes que CÓDIGO: uno contiene al otro
    return (_POL.replace('CÓDIGO_DOCUMENTO', codigo_doc)
                .replace('N de TOTAL', pagina).replace('CÓDIGO', codigo))

B = os.path.dirname(AQUI)   # carpeta del skill
ALTO_P1   = 1170   # página 1: alto útil (el hero va dentro) — con margen de seguridad
ALTO_CONT = 985    # páginas siguientes: alto útil (1184 - 150 de encabezado - holgura)
ALTO_HERO = 400

CHECK = ('<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#FFFFFF" '
         'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>')

# ---------------- constructores de bloque: devuelven (html, alto, etiqueta) ----------------
def b_datos(campos):
    ds = ''.join(
        '<div style="width:50%%;margin-bottom:18px;padding-right:20px;"><span class="meta-label">%s</span>'
        '<span class="meta-value">%s</span></div>' % (k, v) for k, v in campos)
    h = ('<div style="display:flex;flex-wrap:wrap;padding-bottom:18px;border-bottom:1px solid #E2E0DD;">%s</div>' % ds)
    return (h, 36 + math.ceil(len(campos) / 2) * 66, 'Tu viaje')

def b_foto_destino(foto, lugar=''):
    """Foto del destino en el cuerpo, debajo de los datos del viaje (estándar de Caminos)."""
    import comun
    cap = ('<span style="position:absolute;left:24px;bottom:22px;display:inline-flex;align-items:center;'
           'background:rgba(255,255,255,.92);border-radius:999px;padding:9px 18px;font:600 13px/1 \'Poppins\',sans-serif;'
           'letter-spacing:0.14em;text-transform:uppercase;color:#1F2024;">%s</span>' % lugar) if lugar else ''
    h = ('<div class="blq-sep" style="position:relative;height:230px;border-radius:18px;overflow:hidden;'
         'box-shadow:0 12px 32px rgba(31,32,36,.14);%s">%s</div>' % (comun.css_foto(foto), cap))
    return (h, 230 + 30, 'Tu viaje')

def b_bienvenida(texto):
    lineas = sum(math.ceil(len(p) / 108) for p in texto.split('<br><br>'))
    h = ('<div class="blq-sep">\n  <h2 class="blq">Te damos la <span style="color:#F25061;">bienvenida</span></h2>\n'
         '  <span class="dash" style="margin-top:14px;"></span>\n'
         '  <div style="margin-top:18px;font:400 17px/1.6 \'Poppins\',sans-serif;color:#3A3C42;">%s</div>\n</div>' % texto)
    return (h, 82 + lineas * 27 + (texto.count('<br><br>') * 27), 'Tu viaje')

def b_frase(t):
    h = ('<div class="blq-sep" style="padding:24px 30px;background:#FDE9EB;border-radius:26px;">'
         '<p style="margin:0;font:700 19px/1.45 \'Poppins\',sans-serif;color:#1F2024;">%s</p></div>' % t)
    return (h, 110, 'Tu viaje')

def b_vuelos(titulo, filas):
    fs = ''.join(
        '<tr><td style="padding:13px 16px;font:600 16px/1.45 \'Poppins\',sans-serif;color:#F25061">%s</td>'
        '<td style="padding:13px 16px">%s</td>'
        '<td style="padding:13px 16px;font:600 16px/1.45 \'Poppins\',sans-serif;color:#1F2024">%s</td>'
        '<td style="padding:13px 16px;font:600 16px/1.45 \'Poppins\',sans-serif;color:#1F2024">%s</td>'
        '<td style="padding:13px 16px">%s</td><td style="padding:13px 16px">%s</td></tr>' % f for f in filas)
    h = ('<div class="blq-sep">\n  <h2 class="blq">Vuelos <span style="color:#F25061;">%s</span></h2>\n'
         '  <span class="dash" style="margin-top:14px;"></span>\n'
         '  <table style="margin-top:18px;">\n    <thead><tr><th style="width:110px;">Vuelo</th>'
         '<th style="width:150px;">Fecha</th><th>Origen</th><th>Destino</th>'
         '<th style="width:100px;">Sale</th><th style="width:150px;">Llega</th></tr></thead>\n'
         '    <tbody>%s</tbody>\n  </table>\n</div>' % (titulo, fs))
    return (h, 122 + len(filas) * 48, 'Vuelos')

def b_titulo_dias(primero=False):
    mt = '0' if primero else '30px'
    return ('<h2 class="blq" style="margin-top:%s;margin-bottom:22px;">Itinerario '
            '<span style="color:#F25061;">día a día</span></h2>' % mt,
            56 if primero else 82, 'Itinerario día a día')

def b_dia(num, fecha, titulo, texto, tags=None, foto=None):
    if foto:
        return b_dia_foto(num, fecha, titulo, texto, tags, foto)
    h = ('<div class="dia">\n  <div class="dia-head"><span class="dia-pill">Día %s</span>'
         '<span class="dia-fecha">%s</span></div>\n  <h3 class="dia-titulo">%s</h3>\n'
         '  <p class="dia-texto">%s</p>\n' % (num, fecha, titulo, texto))
    if tags:
        h += '  <div class="dia-tags">' + ''.join(
            '<span class="tag%s">%s</span>' % ((' tag-hotel' if t[1] else '', t[0]) if isinstance(t, tuple)
                                               else (' tag-hotel' if t.startswith('Hotel') else '', t))
            for t in tags) + '</div>\n'
    h += '</div>'
    alto = 37 + math.ceil(len(titulo)/56)*29 + math.ceil(len(texto)/104)*24
    if tags: alto += 10 + math.ceil(len(tags)/4)*32
    return (h, alto + 18, 'Itinerario día a día')

def b_dia_foto(num, fecha, titulo, texto, tags, foto):
    """Día con foto a la derecha (radio 18 y sombra de fotografía del sistema de diseño)."""
    import comun
    izq = ('<div class="dia-head"><span class="dia-pill">Día %s</span><span class="dia-fecha">%s</span></div>\n'
           '    <h3 class="dia-titulo">%s</h3>\n    <p class="dia-texto">%s</p>\n' % (num, fecha, titulo, texto))
    if tags:
        izq += '    <div class="dia-tags">' + ''.join(
            '<span class="tag%s">%s</span>' % ((' tag-hotel' if t[1] else '', t[0]) if isinstance(t, tuple)
                                               else (' tag-hotel' if t.startswith('Hotel') else '', t))
            for t in tags) + '</div>\n'
    h = ('<div class="dia">\n  <div style="display:flex;align-items:flex-start;">\n'
         '   <div style="flex:1;padding-right:28px;">\n    %s   </div>\n'
         '   <div style="width:300px;height:200px;flex:0 0 auto;border-radius:18px;overflow:hidden;'
         'box-shadow:0 12px 32px rgba(31,32,36,.14);%s"></div>\n  </div>\n</div>' % (izq, comun.css_foto(foto)))
    # El texto va en una columna más angosta (unos 70 caracteres por línea).
    alto = 37 + math.ceil(len(titulo)/40)*29 + math.ceil(len(texto)/70)*24
    if tags: alto += 10 + math.ceil(len(tags)/3)*32
    return (h, max(alto, 205) + 18, 'Itinerario día a día')

def b_fotos_hoteles(items):
    """Tarjetas de foto de los hoteles, tres por fila. Divisible por filas de tarjetas."""
    import comun
    tarjetas = comun.tarjetas_foto(items)
    filas = [''.join(tarjetas[i:i+3]) for i in range(0, len(tarjetas), 3)]
    def alto(k, con_cab):
        return (100 if con_cab else 36) + 22 + k * 290
    def wrap(a, b, con_cab):
        cab = _cab('Tus', 'hoteles') if con_cab else ''
        return ('<div class="blq-sep">\n%s  <div style="display:flex;flex-wrap:wrap;margin-top:22px;">%s</div>\n</div>'
                % (cab, ''.join(filas[a:b])))
    return {'div': True, 'n': len(filas), 'alto': alto, 'wrap': wrap,
            'min': 1, 'et': 'Alojamiento'}

def _li(t, check):
    if check:
        return '<div class="li2"><span class="bolita">%s</span><span class="txt">%s</span></div>' % (CHECK, t)
    return '<div class="li2"><span class="punto"></span><span class="txt" style="color:#3A3C42">%s</span></div>' % t

def _cab(titulo_a, titulo_b):
    return ('  <h2 class="blq">%s <span style="color:#F25061;">%s</span></h2>\n'
            '  <span class="dash" style="margin-top:14px;"></span>\n' % (titulo_a, titulo_b))

def b_lista(titulo_a, titulo_b, items, check=True):
    """Bloque DIVISIBLE: puede repartirse entre páginas conservando el título."""
    elems = []
    for it in items:
        if isinstance(it, tuple):
            elems.append(('<div class="grupo-h">%s</div>' % it[1], 0.75))
        else:
            elems.append((_li(it, check), 0.5))
    def alto(k, con_cab):
        filas = sum(e[1] for e in elems[:k]) if k else 0
        return (100 if con_cab else 36) + math.ceil(filas) * 39
    def wrap(a, b, con_cab):
        cab = _cab(titulo_a, titulo_b) if con_cab else ''
        cuerpo = ''.join(e[0] for e in elems[a:b])
        return '<div class="blq-sep">\n%s  <div class="lista2">%s</div>\n</div>' % (cab, cuerpo)
    return {'div': True, 'n': len(elems), 'alto': alto, 'wrap': wrap,
            'min': 4, 'et': 'Qué incluye tu viaje',
            'cab': [isinstance(it, tuple) for it in items]}   # subtítulos de grupo

def b_hoteles(filas):
    """Bloque DIVISIBLE: la tabla puede partirse repitiendo el encabezado."""
    fs = ['<tr><td style="padding:13px 16px;font:600 16px/1.4 \'Poppins\',sans-serif;color:#1F2024">%s</td>'
          '<td style="padding:13px 16px">%s</td><td style="padding:13px 16px;font-size:15px">%s</td>'
          '<td style="padding:13px 16px;font-size:15px">%s</td></tr>' % f for f in filas]
    THEAD = ('    <thead><tr><th>Hotel</th><th style="width:170px;">Ciudad</th>'
             '<th style="width:330px;">Dirección</th><th style="width:180px;">Teléfono</th></tr></thead>\n')
    def alto(k, con_cab):
        return (100 if con_cab else 36) + 22 + k * 62
    def wrap(a, b, con_cab):
        cab = _cab('Hoteles', 'confirmados') if con_cab else ''
        return ('<div class="blq-sep">\n%s  <table style="margin-top:18px;">\n%s    <tbody>%s</tbody>\n  </table>\n</div>'
                % (cab, THEAD, ''.join(fs[a:b])))
    return {'div': True, 'n': len(fs), 'alto': alto, 'wrap': wrap,
            'min': 2, 'et': 'Alojamiento'}

def b_recom(grupos):
    """Bloque DIVISIBLE por temas. Cada tema es un bloque compacto; dos por fila."""
    gs, altos = [], []
    ANCHO_COL = 430   # px útiles por columna
    for t, items in grupos:
        lineas = sum(math.ceil(len(x) / 62) for x in items)   # ~62 caracteres por línea
        gs.append('<div class="rec-grupo"><p class="rec-h">%s</p>%s</div>'
                  % (t, ''.join('<div class="rec-item"><span class="punto"></span>'
                                '<span class="t">%s</span></div>' % x for x in items)))
        altos.append(29 + lineas * 20 + len(items) * 6 + 20)
    def alto(k, con_cab):
        # dos grupos por fila: la altura de cada fila es la del grupo más alto
        filas = [altos[x:x+2] for x in range(0, k, 2)]
        return (100 if con_cab else 36) + 18 + sum(max(f) for f in filas)
    def wrap(a, b, con_cab):
        cab = _cab('Recomendaciones', 'del viaje') if con_cab else ''
        return ('<div class="blq-sep">\n%s  <div class="rec-grid">%s</div>\n</div>'
                % (cab, ''.join(gs[a:b])))
    return {'div': True, 'n': len(gs), 'alto': alto, 'wrap': wrap,
            'min': 2, 'et': 'Antes de viajar'}

def b_nota(t):
    h = ('<div class="nota" style="margin-top:20px;padding:20px 28px;">'
         '<span style="font-size:15px;">%s</span></div>' % t)
    return (h, 40 + math.ceil(len(t) / 110) * 24, None)

# ---------------- empaquetador ----------------
def empaquetar(hero_html, bloques):
    """Reparte bloques en páginas. Los bloques marcados 'div' pueden partirse."""
    paginas, actual, usado, etiqueta = [], [], ALTO_HERO + 34, None
    primera = True

    def cerrar():
        nonlocal actual, usado, etiqueta, primera
        paginas.append((actual, etiqueta, primera))
        actual, usado, etiqueta, primera = [], 0, None, False

    cola = list(bloques)
    while cola:
        b = cola.pop(0)
        limite = ALTO_P1 if primera else ALTO_CONT

        if isinstance(b, dict) and b.get('div'):
            con_cab = not b.get('_parcial')
            libre = limite - usado
            # cuántos elementos caben
            k = 0
            while k < b['n'] and b['alto'](k + 1, con_cab) <= libre:
                k += 1
            # un subtítulo de grupo nunca queda solo al final de la hoja
            cab = b.get('cab')
            while cab and 0 < k < b['n'] and cab[k - 1]:
                k -= 1
            if k >= b['min'] or (k == b['n'] and k > 0):
                if etiqueta is None: etiqueta = b['et']
                actual.append(b['wrap'](0, k, con_cab))
                usado += b['alto'](k, con_cab)
                if k < b['n']:
                    resto = dict(b); resto['_parcial'] = True
                    resto['n'] = b['n'] - k
                    if cab:
                        resto['cab'] = cab[k:]
                    _w, _a = b['wrap'], b['alto']
                    resto['wrap'] = lambda x, y, c, _w=_w, _k=k: _w(_k + x, _k + y, c)
                    resto['alto'] = _a
                    cola.insert(0, resto)
                    cerrar()
                continue
            else:
                if actual: cerrar(); cola.insert(0, b); continue
                # página vacía y aun así no cabe: forzar
                actual.append(b['wrap'](0, b['n'], con_cab)); usado += b['alto'](b['n'], con_cab)
                if etiqueta is None: etiqueta = b['et']
                continue

        html, alto, et = b
        # Un título de sección nunca queda solo al final de la hoja: si no cabe
        # también el bloque que sigue (el primer día), pasa con él.
        if html.lstrip().startswith('<h2 class="blq"') and cola and actual:
            sig = cola[0]
            alto_sig = sig['alto'](1, True) if isinstance(sig, dict) else sig[1]
            if usado + alto + alto_sig > limite:
                cerrar()
                limite = ALTO_CONT
        if usado + alto > limite and actual:
            cerrar()
        if etiqueta is None and et: etiqueta = et
        actual.append(html); usado += alto

    if actual: paginas.append((actual, etiqueta, primera))
    return paginas

def render_paginas(paginas, hero_html, codigo, codigo_doc, total):
    out, n = [], 0
    for bloques, etiqueta, es_primera in paginas:
        n += 1
        cuerpo = '\n'.join(bloques)
        # el primer bloque del contenedor no necesita margen superior
        cuerpo = re.sub(r'^(<div) class="blq-sep"', r'\1', cuerpo)
        p = pie(codigo_doc, '%d de %d' % (n, total))
        if es_primera:
            s = ('<section class="page">\n%s\n  <div class="cont cont-top">\n%s\n  </div>\n\n%s\n</section>'
                 % (hero_html, cuerpo, p))
        else:
            s = ('<section class="page" style="padding-top:57px;">\n  <div class="cont">\n'
                 '    <div class="hdr">\n      <img src="../assets/logos/caminos-logo-coral.svg" alt="Caminos">\n'
                 '      <span class="hdr-sep"></span>\n      <span class="eyebrow">%s</span>\n'
                 '      <span class="eyebrow" style="margin-left:auto;font-weight:400;">%s</span>\n    </div>\n'
                 '    <div class="rule"></div>\n    <div style="margin-top:28px;">\n%s\n    </div>\n  </div>\n\n%s\n</section>'
                 % (etiqueta or 'Itinerario', codigo, cuerpo, p))
        out.append(s)
    return out

def hero(subtitulo, titulo, fechas, foto=None):
    h = _hero(subtitulo, titulo, fechas)
    if foto:
        import comun
        h = comun.portada_con_foto(h, foto, ALTO_HERO)
    return h

def _hero(subtitulo, titulo, fechas):
    return ('<div style="position:relative;height:400px;overflow:hidden;background:#F25061;">\n'
     '  <img src="../assets/brand/estrella-crema.svg" style="position:absolute;right:-117px;top:-104px;height:416px;opacity:.10;">\n'
     '  <div style="position:absolute;top:42px;left:68px;right:68px;display:flex;align-items:center;justify-content:space-between;">\n'
     '    <img src="../assets/logos/caminos-logo-white.svg" alt="Caminos" style="height:46px;">\n'
     '    <span style="display:inline-flex;align-items:center;background:rgba(255,255,255,.92);border-radius:999px;padding:11px 23px;font:600 14px/1 \'Poppins\',sans-serif;letter-spacing:0.16em;text-transform:uppercase;color:#1F2024;">Itinerario de viaje</span>\n'
     '  </div>\n  <div style="position:absolute;left:68px;right:68px;bottom:38px;">\n'
     '    <span style="font:600 14px/1.3 \'Poppins\',sans-serif;letter-spacing:0.16em;text-transform:uppercase;color:#FFFFFF;">%s</span>\n'
     '    <h1 style="margin:16px 0 0;font:700 48px/1.06 \'Poppins\',sans-serif;letter-spacing:-0.02em;color:#FFFFFF;">%s</h1>\n'
     '    <span style="display:inline-flex;align-items:center;margin-top:18px;background:rgba(255,255,255,.18);border-radius:999px;padding:10px 22px;font:700 17px/1 \'Poppins\',sans-serif;color:#FFFFFF;">%s</span>\n'
     '  </div>\n</div>' % (subtitulo, titulo, fechas))

def documento(hero_html, bloques, codigo, codigo_doc):
    pags = empaquetar(hero_html, bloques)
    total = len(pags) + 1  # + página de políticas
    cuerpo = '\n\n'.join(render_paginas(pags, hero_html, codigo, codigo_doc, total))
    pol = pagina_politicas(codigo, codigo_doc, '%d de %d' % (total, total))
    tpl = open(f'{B}/template/itinerario.html').read()
    css = tpl[tpl.index('<style>'):tpl.index('</style>') + len('</style>')]
    return ('<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n%s\n</head>\n<body>\n\n%s\n\n%s\n\n</body>\n</html>\n'
            % (css, cuerpo, pol)), total

def render(nombre, html, total):
    O = '/tmp/%s' % nombre
    shutil.rmtree(O, ignore_errors=True); os.makedirs(f'{O}/rendered')
    shutil.copytree(f'{B}/assets', f'{O}/assets')
    open(f'{O}/rendered/doc.html', 'w').write(html)
    subprocess.run(['wkhtmltopdf','-s','Letter','-T','0','-B','0','-L','0','-R','0',
        '--enable-local-file-access','--quiet','doc.html','out.pdf'],
        cwd=f'{O}/rendered', capture_output=True)
    from pdf2image import convert_from_path
    pgs = convert_from_path(f'{O}/rendered/out.pdf', dpi=80)
    for i, im in enumerate(pgs): im.save(f'{O}/p{i+1:02d}.png')
    sob = re.findall(r'\{\{[a-z_]+\}\}', html)
    print('%-8s → %d páginas (calculado %d)%s' % (
        nombre, len(pgs), total, '  ⚠ marcadores: %s' % set(sob) if sob else ''))
    return pgs
