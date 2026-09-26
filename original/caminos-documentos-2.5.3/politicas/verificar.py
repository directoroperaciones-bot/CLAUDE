#!/usr/bin/env python3
"""Candado de la página "Información adicional" de Caminos.

Todo lo que va debajo del título "Información adicional" es la política general
de Agencia Caminos: texto legal, igual en todos los documentos y que no se
modifica en ninguna circunstancia. La copia oficial está en
informacion-adicional.html, junto a este archivo.

Uso:
    python3 verificar.py DOCUMENTO.html

Sale con código 0 si el documento trae la página oficial sin cambios, y con
código 4 si falta o si alguien la modificó. En ese caso NO se genera el PDF.
"""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
OFICIAL = os.path.join(AQUI, 'informacion-adicional.html')


def oficial():
    return open(OFICIAL, encoding='utf-8').read().strip()


def verificar(html):
    """Devuelve None si está bien, o el motivo del problema."""
    texto = oficial()
    veces = html.count(texto)
    if veces == 1:
        return None
    if veces > 1:
        return 'la página de información adicional aparece repetida'
    if 'Información <span style="color:#F25061;">adicional</span>' in html:
        return 'la página de información adicional fue modificada'
    return 'falta la página de información adicional'


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    motivo = verificar(open(sys.argv[1], encoding='utf-8').read())
    if motivo:
        print(f'BLOQUEADO: {motivo}. Esa página es texto legal fijo y no se puede cambiar. '
              'Usa la plantilla original del skill sin tocar esa sección.')
        sys.exit(4)
    print('Información adicional: intacta.')


if __name__ == '__main__':
    main()
