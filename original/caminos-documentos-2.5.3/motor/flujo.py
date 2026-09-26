"""Reparto del contenido entre hojas con medición exacta.

Lo usan la cotización y la confirmación. Toma el documento ya lleno, lo divide
en bloques (párrafos, tablas, listas, tarjetas de confirmación), mide la altura
exacta de cada bloque con el mismo programa que genera el PDF y, si algo no
cabe en una hoja, lo pasa a la siguiente o abre una hoja de continuación con el
encabezado de hoja interior de la plantilla.

Reglas:
- Las tablas y listas largas se parten entre hojas; las tablas y tarjetas
  repiten su encabezado en la hoja siguiente.
- Un título nunca queda solo al final de una hoja: si no cabe al menos su primer
  elemento, pasa entero.
- Una nota "pegada" a una tabla (la de precios en la cotización) viaja con la
  última fila de esa tabla.
- Nunca bloquea: si hace falta, el documento tiene más hojas.
"""
import os
import re
import subprocess
import tempfile

import comun as c

VOID = {'img', 'br', 'hr', 'meta', 'input', 'link'}
TAG = re.compile(r'<!--.*?-->|<(/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(/?)>', re.S)


# ---------- lectura de bloques ----------

def nivel_superior(html):
    """Divide un fragmento en sus elementos de primer nivel (se descartan comentarios)."""
    out, depth, start = [], 0, None
    for m in TAG.finditer(html):
        if m.group(0).startswith('<!--'):
            continue
        cierre, nombre, auto = m.group(1), m.group(2).lower(), m.group(3)
        if cierre:
            depth -= 1
            if depth == 0:
                out.append(html[start:m.end()])
        elif auto or nombre in VOID:
            if depth == 0:
                out.append(m.group(0))
        else:
            if depth == 0:
                start = m.start()
            depth += 1
    return out


def etiqueta(el):
    return re.match(r'<([a-zA-Z0-9]+)', el).group(1).lower()


def interior(el):
    """Contenido de un elemento, sin su etiqueta de apertura y de cierre."""
    a = el.index('>') + 1
    b = el.rindex('</')
    return el[:a], el[a:b], el[b:]


def parrafos(div):
    """Cuántos párrafos tiene un div si todo su contenido son párrafos <p>; si no, 0."""
    _, cuerpo, _ = interior(div)
    hijos = nivel_superior(cuerpo)
    resto = re.sub(r'<!--.*?-->', '', cuerpo, flags=re.S)
    for hj in hijos:
        resto = resto.replace(hj, '', 1)
    if hijos and all(etiqueta(x) == 'p' for x in hijos) and not resto.strip():
        return len(hijos)
    return 0


def es_titulo(el):
    return etiqueta(el) in ('h2', 'h3')


def es_guion(el):
    return etiqueta(el) == 'span' and 'class="dash"' in el[:60]


def seg_tabla(titulo, tabla):
    abre, cuerpo, cierre = interior(tabla)
    thead = re.search(r'<thead>.*?</thead>', cuerpo, re.S).group(0)
    tbody = re.search(r'<tbody>(.*?)</tbody>', cuerpo, re.S).group(1)
    filas = re.findall(r'<tr\b.*?</tr>', tbody, re.S)
    ab = abre + thead + '<tbody>'
    return {'tipo': 'div', 'titulo': titulo, 'abre': ab, 'cont_abre': ab, 'items': filas,
            'cierra': '</tbody>' + cierre, 'cont': False}


def seg_lista(titulo, div):
    abre, cuerpo, cierre = interior(div)
    return {'tipo': 'div', 'titulo': titulo, 'abre': abre, 'cont_abre': abre,
            'items': nivel_superior(cuerpo), 'cierra': cierre, 'cont': False}


def seg_tarjeta(card):
    abre, cuerpo, cierre = interior(card)
    head = re.search(r'<div class="conf-head">.*?</div>\s*(?=<table)', cuerpo, re.S).group(0)
    tabla = re.search(r'<table\b.*?</table>', cuerpo, re.S).group(0)
    t = seg_tabla('', tabla)
    ab = abre + head + t['abre']
    return {'tipo': 'div', 'titulo': '', 'abre': ab, 'cont_abre': ab, 'items': t['items'],
            'cierra': t['cierra'] + cierre, 'cont': False}


def bloques(fragmento, pegar_nota=False):
    """Agrupa los elementos: título + guion + lo que sigue forman un bloque."""
    els = nivel_superior(fragmento)
    segs, i = [], 0
    while i < len(els):
        el = els[i]
        if es_titulo(el):
            titulo = el
            j = i + 1
            if j < len(els) and es_guion(els[j]):
                titulo += '\n    ' + els[j]
                j += 1
            sig = els[j] if j < len(els) else None
            if sig is not None and etiqueta(sig) == 'div' and 'class="conf-card"' in sig[:40]:
                t = seg_tarjeta(sig)
                t['titulo'] = titulo
                segs.append(t)
                i = j + 1
            elif sig is not None and etiqueta(sig) == 'table':
                segs.append(seg_tabla(titulo, sig))
                i = j + 1
            elif sig is not None and etiqueta(sig) == 'div' and 'flex-wrap:wrap' in sig[:200] and 'meta-label' not in sig:
                segs.append(seg_lista(titulo, sig))
                i = j + 1
            elif sig is not None and etiqueta(sig) == 'div' and parrafos(sig) >= 2:
                # Texto de varios párrafos (condiciones): se parte por párrafos.
                segs.append(seg_lista(titulo, sig))
                i = j + 1
            else:
                # Título seguido de un bloque que no se parte (texto, tira, datos):
                # el siguiente elemento también va pegado si no es otro título.
                partes = [titulo]
                if sig is not None and not es_titulo(sig):
                    partes.append(sig)
                    j += 1
                segs.append({'tipo': 'atom', 'html': '\n    '.join(partes)})
                i = j
            continue
        if etiqueta(el) == 'div' and 'class="conf-card"' in el[:40]:
            segs.append(seg_tarjeta(el))
        else:
            # La nota de precios y el recuadro de vigencia y asesor viajan con los
            # últimos elementos del bloque anterior: nunca quedan solos en una hoja.
            pegado = pegar_nota and segs and segs[-1]['tipo'] == 'div' and (
                'class="nota"' in el[:40] or 'meta-label">Vigencia' in el)
            segs.append({'tipo': 'atom', 'html': el, 'pegado': bool(pegado)})
        i += 1
    return segs


# ---------- escritura ----------

def marcar(el, m):
    return re.sub(r'^<([a-zA-Z0-9]+)', lambda x: f'<{x.group(1)} data-m="{m}"', el, count=1)


def html_seg(s, pref=None):
    if s['tipo'] == 'atom':
        return f'<div data-m="{pref}">{s["html"]}</div>' if pref else s['html']
    items = [marcar(it, f'{pref}-{k}') if pref else it for k, it in enumerate(s['items'])]
    cab = '' if s['cont'] else s['titulo']
    ab = s['cont_abre'] if s['cont'] else s['abre']
    return (cab + '\n    ' if cab else '') + ab + '\n      '.join([''] + items) + '\n    ' + s['cierra']


def html_hoja(h, k, medir=False):
    cuerpo = '\n\n    '.join(html_seg(s, f'p{k}s{i}' if medir else None) for i, s in enumerate(h['segs']))
    sec = h['pre'] + '\n    ' + cuerpo + '\n' + h['post']
    return marcar(sec, f'S{k}') if medir else sec


JS = ('<script>window.onload=function(){var r=[],e=document.querySelectorAll("[data-m]");'
      'for(var i=0;i<e.length;i++){var b=e[i].getBoundingClientRect();'
      'r.push(e[i].getAttribute("data-m")+":"+Math.round(b.top)+":"+Math.round(b.bottom));}'
      'console.log("ALTURAS "+r.join("|"));};</script>')


def armar(cabeza, hojas, cola, medir=False):
    if medir:
        # Al medir, el programa de PDF calcula con ancho cero si no se le fija el de la hoja.
        cabeza = cabeza.replace('</style>', 'html,body{width:1061px!important}</style>', 1)
    return cabeza + '\n\n'.join(html_hoja(h, k, medir) for k, h in enumerate(hojas)) + '\n\n' + (
        cola.replace('</body>', JS + '</body>') if medir else cola)


def medir_alturas(html, assets):
    """Fondo de cada marca, relativo al inicio de su hoja."""
    with tempfile.TemporaryDirectory() as tmp:
        os.makedirs(os.path.join(tmp, 'doc'))
        os.symlink(assets, os.path.join(tmp, 'assets'))
        ruta = os.path.join(tmp, 'doc', 'm.html')
        open(ruta, 'w', encoding='utf-8').write(html)
        r = subprocess.run(['wkhtmltopdf', '-s', 'Letter', '-T', '0', '-B', '0', '-L', '0', '-R', '0',
                            '--enable-local-file-access', '--debug-javascript', ruta,
                            os.path.join(tmp, 'm.pdf')], capture_output=True, text=True)
    m = re.search(r'ALTURAS (\S*)', r.stdout + r.stderr)
    if not m:
        raise RuntimeError('No se pudo medir el documento')
    pos = {}
    for par in m.group(1).split('|'):
        if par:
            k, top, bot = par.rsplit(':', 2)
            pos[k] = (int(top), int(bot))
    fondos = {}
    for k, (top, bot) in pos.items():
        if k.startswith('S'):
            continue
        hoja = int(re.match(r'p(\d+)', k).group(1))
        fondos[k] = bot - pos[f'S{hoja}'][0]
    return fondos


# ---------- reparto ----------

def unidades(h, k):
    """Unidades medibles de una hoja, en orden: (clave, índice de bloque, índice de ítem o None)."""
    out = []
    for i, s in enumerate(h['segs']):
        if s['tipo'] == 'atom':
            out.append((f'p{k}s{i}', i, None))
        else:
            out.extend((f'p{k}s{i}-{j}', i, j) for j in range(len(s['items'])))
    return out


def partir(s, j):
    """Divide un bloque divisible en el ítem j: (lo que se queda, lo que pasa)."""
    a = dict(s, items=s['items'][:j])
    b = dict(s, items=s['items'][j:], cont=True)
    return a, b


# La medición exacta cuenta cajas completas (incluidos fondos claros y rellenos),
# no solo la tinta: el pie empieza en 1.184 px y se deja un margen de 6 px.
LIMITE_CAJAS = c.LIMITE_CONTENIDO


def repartir(cabeza, hojas, cola, interior_pre, interior_post, assets, limite=None, max_vueltas=60):
    """Mueve contenido hacia adelante hasta que ninguna hoja pase del límite."""
    limite = limite or LIMITE_CAJAS
    for _ in range(max_vueltas):
        fondos = medir_alturas(armar(cabeza, hojas, cola, medir=True), assets)
        malo = None
        for k, h in enumerate(hojas):
            for clave, i, j in unidades(h, k):
                if fondos.get(clave, 0) > limite:
                    malo = (k, i, j)
                    break
            if malo:
                break
        if not malo:
            return hojas
        k, i, j = malo
        segs = hojas[k]['segs']
        s = segs[i]
        if s['tipo'] == 'div' and j:
            n = len(s['items'])
            if n < 4:
                j = 0                      # tabla o lista corta: pasa completa
            else:
                j = min(max(j, 2), n - 2)  # al menos 2 filas a cada lado
                if fondos.get(f'p{k}s{i}-{j - 1}', 0) > limite:
                    j = 0
        if s['tipo'] == 'div' and j:
            queda, pasa = partir(s, j)
            quedan, mueven = segs[:i] + [queda], [pasa] + segs[i + 1:]
        elif s['tipo'] == 'atom' and s.get('pegado') and i > 0 and segs[i - 1]['tipo'] == 'div':
            prev = segs[i - 1]
            if len(prev['items']) >= 4:
                queda, pasa = partir(prev, len(prev['items']) - 2)
                quedan, mueven = segs[:i - 1] + [queda], [pasa] + segs[i:]
            else:
                quedan, mueven = segs[:i - 1], segs[i - 1:]
        else:
            quedan, mueven = segs[:i], segs[i:]
        if not quedan:
            # Un solo bloque más alto que la hoja: si es divisible, se parte en el primer ítem.
            if s['tipo'] == 'div' and len(s['items']) > 1:
                queda, pasa = partir(s, 1)
                quedan, mueven = [queda], [pasa] + segs[1:]
            else:
                return hojas
        hojas[k]['segs'] = quedan
        if k + 1 < len(hojas):
            hojas[k + 1]['segs'] = mueven + hojas[k + 1]['segs']
        else:
            hojas.append({'pre': interior_pre, 'post': interior_post, 'segs': mueven})
    return hojas


def subir(cabeza, hojas, cola, assets, limite=None, max_intentos=20):
    """Repaso final: si la primera parte de una hoja cabe al final de la anterior, la sube.
    Solo mueve bloques completos y solo acepta el cambio si la medición confirma que cabe."""
    import copy
    limite = limite or LIMITE_CAJAS
    k, intentos = 0, 0
    while k < len(hojas) - 1 and intentos < max_intentos:
        if not hojas[k + 1]['segs']:
            k += 1
            continue
        prueba = copy.deepcopy(hojas)
        s = prueba[k + 1]['segs'].pop(0)
        ult = prueba[k]['segs'][-1] if prueba[k]['segs'] else None
        if s['tipo'] == 'div' and s.get('cont') and ult and ult['tipo'] == 'div' and ult['cierra'] == s['cierra'] and ult['abre'] == s['abre']:
            ult['items'] = ult['items'] + s['items']          # continuación del mismo bloque: se vuelve a unir
        else:
            prueba[k]['segs'].append(s)
        intentos += 1
        fondos = medir_alturas(armar(cabeza, prueba, cola, medir=True), assets)
        if any(fondos.get(cl, 0) > limite for cl, _, _ in unidades(prueba[k], k)):
            k += 1
            continue
        hojas = prueba
    return hojas


def contar_hojas(hojas):
    return len([h for h in hojas if h['segs']])


# ---------- documento completo ----------

def dividir_documento(h, pegar_nota=False):
    """Separa el documento en: cabeza, hojas de contenido (con sus bloques), cola
    (la hoja de información adicional y el cierre) y el marco de hoja interior."""
    secs = c.secciones(h)
    cabeza = h[:secs[0][0]]
    cola = h[secs[-1][0]:]
    hojas, interior_pre, interior_post = [], None, None
    for a, b in secs[:-1]:
        sec = h[a:b]
        abre, cuerpo, cierre = interior(sec)
        els = nivel_superior(cuerpo)
        pie = next(n for n, e in enumerate(els) if 'class="footer"' in e[:40])
        post = '\n  '.join(els[pie:])
        if any('class="rule"' in e[:40] for e in els):
            r = next(n for n, e in enumerate(els) if 'class="rule"' in e[:40])
            pre = abre + '\n  ' + '\n  '.join(els[:r + 1])
            frag = '\n'.join(els[r + 1:pie])
            post_full = '\n\n  ' + post + '\n' + cierre
            hojas.append({'pre': pre, 'post': post_full, 'segs': bloques(frag, pegar_nota)})
            if interior_pre is None:
                interior_pre, interior_post = pre, post_full
        else:
            env = els[pie - 1]
            eab, ecu, ecie = interior(env)
            pre = abre + '\n  ' + '\n  '.join(els[:pie - 1]) + '\n  ' + eab
            post_full = '  ' + ecie + '\n\n  ' + post + '\n' + cierre
            hojas.append({'pre': pre, 'post': post_full, 'segs': bloques(ecu, pegar_nota)})
    # Tras cada hoja va un salto de línea; la cola arranca en la hoja de políticas.
    return cabeza, hojas, cola, interior_pre, interior_post


def marco_desde_politicas(cola, etiqueta_hoja):
    """Marco de hoja interior copiado de la hoja de información adicional (encabezado,
    línea coral, pie y franja), con otro nombre de sección. Para documentos cuya
    plantilla no trae una hoja interior propia, como el voucher."""
    pol = cola[:cola.index('</section>') + len('</section>')]
    r = pol.index('<div class="rule"></div>') + len('<div class="rule"></div>')
    f = pol.index('<div class="footer">')
    pre = re.sub(r'(<span class="eyebrow">)[^<]*(</span>)', lambda m: m.group(1) + etiqueta_hoja + m.group(2), pol[:r], count=1)
    return pre, '\n\n  ' + pol[f:]


def fluir(h, assets, pegar_nota=False, juntar=False, etiqueta_continuacion=None, limite=None):
    """Reparte el documento sin pasar del límite y renumera. Si juntar=True, prueba
    también subir todo a una sola secuencia y se queda con la opción de menos hojas."""
    cabeza, hojas, cola, ipre, ipost = dividir_documento(h, pegar_nota)
    if ipre is None:
        ipre, ipost = marco_desde_politicas(cola, etiqueta_continuacion or 'Continuación')
    import copy
    base = subir(cabeza, repartir(cabeza, copy.deepcopy(hojas), cola, ipre, ipost, assets, limite), cola, assets, limite)
    mejor = base
    if juntar and len(hojas) > 1:
        uno = copy.deepcopy(hojas[:1])
        for x in hojas[1:]:
            uno[0]['segs'] += copy.deepcopy(x['segs'])
        alt = subir(cabeza, repartir(cabeza, uno, cola, ipre, ipost, assets, limite), cola, assets, limite)
        if contar_hojas(alt) < contar_hojas(base):
            mejor = alt
    mejor = [x for x in mejor if x['segs']] or mejor[:1]
    return c.renumerar(armar(cabeza, mejor, cola))
