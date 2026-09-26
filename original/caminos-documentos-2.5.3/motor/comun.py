"""Piezas comunes de los motores de documentos de Caminos.

Cada skill trae su scripts/generar.py, que usa este módulo para lo que es igual
en todos los documentos: escribir fechas en español, llenar patrones de la
plantilla, generar el PDF con wkhtmltopdf, medir si el contenido cabe en cada
hoja y verificar que la información adicional esté intacta.
"""
import datetime
import html as _html
import os
import re
import shutil
import subprocess
import sys
import tempfile

PLUGIN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTES = os.path.join(PLUGIN, 'fuentes')
sys.path.insert(0, os.path.join(PLUGIN, 'politicas'))
from verificar import verificar as verificar_politicas  # noqa: E402

ALTO_PAGINA = 1373       # alto de una hoja Letter en el lienzo de wkhtmltopdf
LIMITE_CONTENIDO = 1178  # px: el pie empieza en 1.184; se dejan 6 px de margen

MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
         'septiembre', 'octubre', 'noviembre', 'diciembre']
MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']


# ---------- textos ----------

def vacio(v):
    return v is None or (isinstance(v, str) and not v.strip()) or (isinstance(v, (list, dict)) and not v)


def e(s):
    """Escapa el texto y convierte **así** en negrita con el estilo de la marca."""
    t = _html.escape(str(s if s is not None else '').strip(), quote=False)
    return re.sub(r'\*\*(.+?)\*\*', r'<strong style="font-weight:600;color:#1F2024">\1</strong>', t)


def fecha(v, estilo, cero=False):
    """Escribe en español una fecha AAAA-MM-DD. Si no viene así, la devuelve igual.

    estilo 'coma'  → 8 de mayo, 2026
           'de'    → 20 de abril de 2026
           'dia'   → Viernes 8 de mayo, 2026
           'corta' → 08 may 2026 (tablas compactas)
    cero=True pone el día con dos dígitos (04 de septiembre, 2026).
    """
    m = re.fullmatch(r'\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*', str(v or ''))
    if not m:
        return v
    f = datetime.date(int(m[1]), int(m[2]), int(m[3]))
    dia = f'{f.day:02d}' if cero or estilo == 'corta' else str(f.day)
    if estilo == 'corta':
        return f'{dia} {MES_CORTO[f.month - 1]} {f.year}'
    base = f'{dia} de {MESES[f.month - 1]}'
    if estilo == 'de':
        return f'{base} de {f.year}'
    if estilo == 'dia':
        return f'{DIAS[f.weekday()]} {base}, {f.year}'
    return f'{base}, {f.year}'


def rango(desde, hasta):
    """Dos fechas AAAA-MM-DD → '14 al 17 de marzo, 2026' (o con mes/año en cada lado si cambian)."""
    m1 = re.fullmatch(r'\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*', str(desde or ''))
    m2 = re.fullmatch(r'\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*', str(hasta or ''))
    if not (m1 and m2):
        return f'{desde} al {hasta}'
    a = datetime.date(int(m1[1]), int(m1[2]), int(m1[3]))
    b = datetime.date(int(m2[1]), int(m2[2]), int(m2[3]))
    if a.year != b.year:
        return f'{a.day} de {MESES[a.month - 1]} de {a.year} al {b.day} de {MESES[b.month - 1]} de {b.year}'
    if a.month != b.month:
        return f'{a.day} de {MESES[a.month - 1]} al {b.day} de {MESES[b.month - 1]}, {b.year}'
    return f'{a.day} al {b.day} de {MESES[b.month - 1]}, {b.year}'


def codigo_documento(codigo, prefijo):
    """CAM-2026-2790 → CAM-CONF-2790 · CA3311 → CAM-COT-3311."""
    grupos = re.findall(r'\d+', str(codigo))
    return f'{prefijo}-{grupos[-1]}' if grupos else str(codigo)


# ---------- plantilla ----------

def patron(tpl, marcador):
    """HTML de ejemplo comentado justo debajo de un marcador {{...}}."""
    m = re.search(re.escape('{{' + marcador + '}}') + r'\s*<!--[^\n]*\n\s*(.*?)\n\s*-->', tpl, re.S)
    if not m:
        sys.exit(f'La plantilla no tiene el patrón de {marcador}')
    return m.group(1).strip()


def quitar(h, regex):
    """Quita un bloque de la plantilla. Falla si no lo encuentra, para no dejar nada suelto."""
    nuevo, n = re.subn(regex, '', h, count=1, flags=re.S)
    if n != 1:
        sys.exit(f'No encontré en la plantilla el bloque a omitir: {regex[:60]}…')
    return nuevo


def quitar_campo(h, marcador):
    """Quita el <div> de un campo de datos (etiqueta + valor) cuyo valor es {{marcador}}."""
    return quitar(h, r'\s*<div style="[^"]*"><span class="(?:meta-label|l)">[^<]*</span><span class="(?:meta-value|v)"[^>]*>\{\{' + marcador + r'\}\}</span></div>')


def secciones(h):
    """Posiciones (inicio, fin) de cada <section class="page"> del documento."""
    return [(m.start(), h.index('</section>', m.start()) + len('</section>'))
            for m in re.finditer(r'<section class="page"', h)]


def subir_a_hoja_anterior(h, n):
    """Mueve el contenido de la hoja n (desde 1) al final de la hoja n-1 y borra la hoja n.

    El contenido es lo que va entre el encabezado (línea coral) y el pie.
    """
    sec = secciones(h)
    a0, a1 = sec[n - 2]
    b0, b1 = sec[n - 1]
    ant, hoja = h[a0:a1], h[b0:b1]
    ini = hoja.index('<div class="rule"></div>') + len('<div class="rule"></div>')
    contenido = hoja[ini:hoja.index('<div class="footer">')].rstrip()
    pie = ant.index('<div class="footer">')
    cierre = ant.rindex('</div>', 0, pie)
    ant = ant[:cierre] + contenido.replace('\n', '\n  ') + '\n  ' + ant[cierre:]
    comentario = h.rfind('<!-- ==========', a1, b0)
    corte = comentario if comentario != -1 else b0
    return h[:a0] + ant + h[a1:corte].rstrip() + '\n\n' + h[b1:].lstrip('\n')


def hoja_continuacion(h, etiqueta, contenido):
    """Inserta una hoja nueva antes de la de información adicional, copiando su
    encabezado, pie y franja (el patrón de hoja interior de la plantilla)."""
    sec = secciones(h)
    p0, p1 = sec[-1]
    pol = h[p0:p1]
    ini = pol.index('<div class="rule"></div>') + len('<div class="rule"></div>')
    fin = pol.index('<div class="footer">')
    hoja = pol[:ini] + '\n' + contenido.rstrip() + '\n\n  ' + pol[fin:]
    hoja = re.sub(r'(<span class="eyebrow">)[^<]*(</span>)', lambda m: m.group(1) + etiqueta + m.group(2), hoja, count=1)
    comentario = h.rfind('<!-- ==========', 0, p0)
    corte = comentario if comentario != -1 and h[comentario:p0].count('<section') == 0 else p0
    return h[:corte] + hoja + '\n\n' + h[corte:]


def renumerar(h):
    """Reescribe 'N de TOTAL' en cada pie según las hojas que realmente quedaron."""
    total = h.count('<section class="page"')
    cuenta = iter(range(1, total + 1))
    return re.sub(r'(<span class="footer-code">[^<]*· )\d+ de \d+', lambda m: f'{m.group(1)}{next(cuenta)} de {total}', h)


def sin_marcadores(h):
    sobra = re.findall(r'\{\{[a-z_]+\}\}', h)
    if sobra:
        sys.exit('Quedaron marcadores sin llenar: ' + ', '.join(sorted(set(sobra))))


# ---------- tarjetas de confirmación (una línea por vuelo, hotel o traslado) ----------

COLUMNAS = {
    'aereo': ['vuelo', 'fecha', 'ruta', 'sale', 'llega'],
    'hotel': ['hotel', 'entrada', 'salida', 'acomodacion', 'confirmacion'],
    'traslado': ['trayecto', 'fecha', 'hora', 'confirmacion'],
}
FECHAS = {'fecha', 'entrada', 'salida'}


def patrones_tarjeta(tpl, marcador):
    """Patrones de tarjeta AÉREO / HOTEL / TRASLADO comentados bajo {{marcador}}."""
    bloque = re.search(r'\{\{' + marcador + r'\}\}\s*<!--(.*?)-->', tpl, re.S).group(1)
    out = {}
    for clave, etiqueta, sig in [('aereo', 'AÉREO', 'HOTEL'), ('hotel', 'HOTEL', 'TRASLADO'), ('traslado', 'TRASLADO', None)]:
        fin = r'\n\s*' + sig if sig else r'$'
        m = re.search(etiqueta + r'[^\n]*\n(.*?)' + fin, bloque, re.S)
        out[clave] = m.group(1).rstrip()
    return out


def tarjeta(pat, tipo, filas, proveedor=None, tiquete=None, record=None, titulo_hotel=None):
    """Arma una tarjeta a partir del patrón de la plantilla, quitando columnas sin datos."""
    cols = COLUMNAS[tipo]
    ths = re.findall(r'<th(?:\s[^>]*)?>.*?</th>', pat)
    fila_pat = re.search(r'<tr><td.*?</tr>', pat).group(0)
    tds = re.findall(r'(<td[^>]*>).*?</td>', fila_pat)
    usar = [i for i, k in enumerate(cols) if any(not vacio(f.get(k)) for f in filas)]

    def celda(i, f):
        v = f.get(cols[i])
        if cols[i] in FECHAS:
            v = fecha(v, 'corta')
        return tds[i] + e(v) + '</td>'

    thead = '<thead><tr>' + ''.join(ths[i] for i in usar) + '</tr></thead>'
    cuerpo = '\n          '.join('<tr>' + ''.join(celda(i, f) for i in usar) + '</tr>' for f in filas)
    h = re.sub(r'<thead>.*?</thead>', thead, pat, flags=re.S)
    h = re.sub(r'<tbody>.*?</tbody>', '<tbody>\n          ' + cuerpo + '\n        </tbody>', h, flags=re.S)

    if tipo == 'aereo':
        partes = []
        if not vacio(tiquete):
            partes.append(f'Tiquete <b>{e(tiquete)}</b>')
        if not vacio(record):
            partes.append(f'Récord <b>{e(record)}</b>')
        if partes:
            h = re.sub(r'<span class="conf-cod">.*?</span>\n', '<span class="conf-cod">' + ' &nbsp;·&nbsp; '.join(partes) + '</span>\n', h, flags=re.S)
        else:
            h = re.sub(r'\s*<span class="conf-cod">.*?</span>', '', h, flags=re.S)
        h = h.replace('AEROLÍNEA', e(proveedor))
    elif tipo == 'traslado':
        h = h.replace('OPERADOR', e(proveedor))
    elif tipo == 'hotel' and not vacio(titulo_hotel):
        h = h.replace('<span class="conf-prov">Alojamiento</span>', '<span class="conf-prov">' + e(titulo_hotel) + '</span>')
    return h


# ---------- PDF ----------

def preparar_fuentes():
    try:
        out = subprocess.run(['fc-list'], capture_output=True, text=True).stdout
    except FileNotFoundError:
        return
    if 'Poppins' in out or not os.path.isdir(FUENTES):
        return
    destino = os.path.expanduser('~/.fonts')
    os.makedirs(destino, exist_ok=True)
    for f in os.listdir(FUENTES):
        if f.endswith('.ttf'):
            shutil.copy(os.path.join(FUENTES, f), destino)
    subprocess.run(['fc-cache', '-f'], capture_output=True)


def render(h, pdf, carpeta, assets):
    os.makedirs(os.path.join(carpeta, 'doc'), exist_ok=True)
    enlace = os.path.join(carpeta, 'assets')
    if not os.path.exists(enlace):
        os.symlink(assets, enlace)
    ruta = os.path.join(carpeta, 'doc', 'documento.html')
    open(ruta, 'w', encoding='utf-8').write(h)
    if os.path.exists(pdf):
        os.remove(pdf)
    subprocess.run(['wkhtmltopdf', '-s', 'Letter', '-T', '0', '-B', '0', '-L', '0', '-R', '0',
                    '--enable-local-file-access', '--quiet', ruta, pdf], capture_output=True)
    if not os.path.exists(pdf):
        sys.exit('wkhtmltopdf no generó el PDF')


def medir(h, carpeta, assets):
    """Renderiza sin pie ni franja y devuelve, por hoja, la fila más baja con contenido."""
    from PIL import Image
    oculto = h.replace('</style>', '.footer,.banda{display:none!important}</style>', 1)
    pdf = os.path.join(carpeta, 'medida.pdf')
    render(oculto, pdf, carpeta, assets)
    for f in os.listdir(carpeta):
        if f.startswith('pag'):
            os.remove(os.path.join(carpeta, f))
    subprocess.run(['pdftoppm', '-r', '125', '-gray', pdf, os.path.join(carpeta, 'pag')], check=True)
    fondos = []
    for f in sorted(x for x in os.listdir(carpeta) if x.startswith('pag')):
        im = Image.open(os.path.join(carpeta, f)).convert('L')
        esc = ALTO_PAGINA / im.height
        px = im.load()
        w, alto = im.size
        fondo = 0
        for y in range(alto - 1, -1, -1):
            if any(px[x, y] < 235 for x in range(int(w * .05), int(w * .95), 2)):
                fondo = y
                break
        fondos.append(round(fondo * esc))
    return fondos


def desbordes(fondos):
    """Hojas (numeradas desde 1) que se pasan del límite. La última es la de políticas."""
    return [(i, y - LIMITE_CONTENIDO) for i, y in enumerate(fondos[:-1], 1) if y > LIMITE_CONTENIDO]


def terminar(h, salida, assets, fondos=None):
    """Verifica la información adicional, revisa que todo quepa y genera el PDF final."""
    motivo = verificar_politicas(h)
    if motivo:
        print(f'BLOQUEADO: {motivo}. La información adicional es texto legal fijo y no se modifica.')
        sys.exit(4)
    with tempfile.TemporaryDirectory() as tmp:
        if fondos is None:
            fondos = medir(h, tmp, assets)
        malos = desbordes(fondos)
        if malos:
            i, px = malos[0]
            print(f'NO CABE: la hoja {i} se pasa {px} px del límite. Condensa los datos y vuelve a generar.')
            sys.exit(3)
        render(h, os.path.abspath(salida), tmp, assets)
    libres = ', '.join(f'hoja {i}: {LIMITE_CONTENIDO - y} px libres' for i, y in enumerate(fondos[:-1], 1))
    print(f'PDF generado: {salida} ({len(fondos)} hojas; {libres})')
    imprimir_avisos()
    imprimir_guardar(os.path.splitext(os.path.basename(salida))[0].replace('-', ' '))


def faltan(lista):
    if lista:
        print('FALTAN DATOS OBLIGATORIOS: ' + '; '.join(lista))
        sys.exit(2)


# ---------- fotos ----------

PROTECCION = os.path.join(PLUGIN, 'motor', 'proteccion.png')  # degradado de protección del sistema de diseño
ANCHO_FOTO = 1600      # px: suficiente para una portada a lo ancho de la hoja
ANCHO_MINIMO = 1200    # px: por debajo se ve borrosa en la portada
AVISOS = []


def preparar_foto(ruta, carpeta, nombre, uso='portada'):
    """Convierte la foto a JPG, la reduce a un tamaño razonable y devuelve su ruta.
    Si es muy pequeña para el uso, deja un aviso para el asesor."""
    from PIL import Image, ImageOps
    if not ruta:
        return None
    if not os.path.exists(ruta):
        sys.exit(f'No encuentro la foto: {ruta}')
    try:
        im = Image.open(ruta)
    except Exception:
        sys.exit(f'No pude abrir la foto {os.path.basename(ruta)}. Si es HEIC, pídela en JPG o PNG.')
    im = ImageOps.exif_transpose(im).convert('RGB')
    minimo = ANCHO_MINIMO if uso == 'portada' else 600
    if im.width < minimo:
        aviso = (f'la foto {os.path.basename(ruta)} es pequeña ({im.width} px de ancho) y puede verse borrosa en {uso}; lo ideal es de al menos {minimo} px')
        if aviso not in AVISOS:
            AVISOS.append(aviso)
    if im.width > ANCHO_FOTO:
        im = im.resize((ANCHO_FOTO, round(im.height * ANCHO_FOTO / im.width)), Image.LANCZOS)
    os.makedirs(carpeta, exist_ok=True)
    salida = os.path.join(carpeta, re.sub(r'[^a-z0-9]+', '-', nombre.lower()).strip('-') + '.jpg')
    im.save(salida, quality=85, optimize=True)
    return os.path.abspath(salida)


def css_foto(ruta):
    """Fondo CSS que cubre el recuadro con la foto (wkhtmltopdf no soporta object-fit)."""
    return f"background-image:url('file://{ruta}');background-size:cover;background-position:center;"


def tarjetas_foto(items):
    """Tarjetas de foto del sistema de diseño (radio 18, sombra de fotografía), tres por fila.
    items: lista de (ruta_foto, título, subtítulo_html)."""
    out = []
    for k, (ruta, titulo, sub) in enumerate(items):
        margen = '0' if k % 3 == 2 else '2.75%'
        out.append(
            f'<div style="width:31.5%;margin-right:{margen};margin-bottom:22px;">'
            f'<div style="height:190px;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(31,32,36,.14);{css_foto(ruta)}"></div>'
            f'<div style="margin-top:14px;font:600 17px/1.3 \'Poppins\',sans-serif;color:#1F2024;">{titulo}</div>'
            f'<div style="margin-top:4px;font:400 14px/1.4 \'Poppins\',sans-serif;color:#7E859A;">{sub}</div></div>')
    return out


def portada_con_foto(hero_html, ruta, alto):
    """Cambia el fondo coral de una portada por la foto con el degradado de protección.
    La estrella de marca no va sobre la foto."""
    h = re.sub(r'<img src="\.\./assets/brand/estrella-crema\.svg"[^>]*>',
               f'<div style="position:absolute;left:0;top:0;right:0;bottom:0;{css_foto(ruta)}"></div>\n'
               f'    <img src="file://{PROTECCION}" style="position:absolute;left:0;bottom:0;width:100%;height:{alto}px;">',
               hero_html, count=1)
    return h.replace('background:#F25061;', 'background:#1F2024;', 1)


def imprimir_avisos():
    for a in AVISOS:
        print('AVISO: ' + a)


# ---------- banco de fotos ----------

BANCO_URL = 'https://claude.ai/artifact/WPzKkP7MwdKBaGrrGVpZ1Y'


def slug(texto):
    import unicodedata
    t = unicodedata.normalize('NFD', str(texto or '')).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')


def clave_destino(destino):
    return 'destino:' + slug(destino) if slug(destino) else None


def clave_hotel(hotel, ciudad):
    # "Hotel Calypso" y "Calypso" son el mismo hotel: la palabra inicial no cuenta.
    h = re.sub(r'^(hotel|hostal|hosteria|hostel)-', '', slug(hotel))
    if not h:
        return None
    return 'hotel:' + h + ('--' + slug(ciudad) if slug(ciudad) else '')


def exigir_banco(d, faltantes):
    """Si al documento le faltan fotos y todavía no se consultó el banco, detiene el motor
    y dice exactamente qué claves consultar. faltantes: lista de claves sin foto."""
    faltantes = [k for k in dict.fromkeys(faltantes) if k]
    if faltantes and not d.get('banco_consultado'):
        import json as _json
        print('CONSULTA EL BANCO DE FOTOS antes de generar. Claves: ' + _json.dumps(faltantes, ensure_ascii=False))
        print('Consulta: ArtifactData action "query", url ' + BANCO_URL + ', collection "fotos", '
              'query {"where": [["clave", "in", ' + _json.dumps(faltantes, ensure_ascii=False) + ']]}. '
              'Descarga cada foto encontrada con Artifact action "read" y path = asset, ponla en datos.json '
              'y agrega "banco_consultado": true. Si no hay ninguna, agrega solo "banco_consultado": true.')
        sys.exit(5)


GUARDAR = []


def para_guardar(clave, tipo, nombre, ciudad, ruta_original, ruta_procesada):
    """Anota una foto que el asesor ubicó, para guardarla en el banco después de generar."""
    if not (clave and ruta_original and ruta_procesada):
        return
    from PIL import Image
    w, h = Image.open(ruta_procesada).size
    GUARDAR.append({'clave': clave, 'tipo': tipo, 'nombre': nombre, 'ciudad': ciudad or '',
                    'archivo': ruta_procesada, 'ancho': w, 'alto': h})


def imprimir_guardar(documento):
    if not GUARDAR:
        return
    import json as _json
    print('GUARDA EN EL BANCO estas fotos (documento "' + documento + '"; no reemplaces una foto existente de igual o mayor ancho):')
    for g in GUARDAR:
        print('  ' + _json.dumps(g, ensure_ascii=False))
