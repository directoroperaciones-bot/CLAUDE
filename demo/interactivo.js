  // ================= versión interactiva (un solo archivo HTML) del itinerario =================
  // Mismos datos que el PDF, con el sistema de diseño de Caminos, pensada para el celular del
  // viajero: portada con cuenta regresiva, días desplegables, vuelos, hoteles con mapa, lista de
  // preparación que se puede marcar y la política general completa. Funciona sin conexión.
  // Este código vive dentro de la etiqueta de script de la app: las etiquetas de script del archivo
  // generado se arman por partes para que el navegador no las confunda con las de la app.
  const ABRE = '<' + 'script', CIERRE = '<' + '/script>';
  const icono = (n, cls = '') => (ICONOS[n] || '').replace('class="lucide', `aria-hidden="true" class="ic ${cls} lucide`);
  // La política general va copiada tal cual de la plantilla del itinerario (texto legal fijo).
  const POLITICA_HTML = (() => {
    const i = POL_IT.indexOf('<p style="margin:20px 0 0'), f = POL_IT.indexOf('<div class="footer">');
    return POL_IT.slice(i, f).trim();
  })();
  // Las fotos del banco se sirven solo dentro de esta página: para el archivo descargado se incrustan.
  function aDataUrl(url, max = 1600) {
    if (!url || url.startsWith('data:')) return Promise.resolve(url || '');
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        try {
          const k = Math.min(1, max / img.naturalWidth), cv = document.createElement('canvas');
          cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          res(cv.toDataURL('image/jpeg', 0.85));
        } catch (_) { res(''); }
      };
      img.onerror = () => res('');
      img.src = url;
    });
  }
  const CSS_INTERACTIVO = `
  :root { --coral:#F25061; --coral-hover:#D94454; --coral-suave:#FDE9EB; --amarillo:#F5B75F; --carbon:#1F2024; --texto:#3A3C42;
    --pizarra:#7E859A; --hueso:#F8F5F2; --hairline:#E2E0DD; --tabla:#EDEFF3; --blanco:#FFFFFF; color-scheme: light;
    --sombra:0 2px 8px rgba(31,32,36,.06); --sombra-hover:0 8px 24px rgba(31,32,36,.08); --sombra-foto:0 12px 32px rgba(31,32,36,.14);
    --ease:cubic-bezier(.22,.61,.36,1); --f:'Poppins',system-ui,-apple-system,'Segoe UI',sans-serif; }
  * { box-sizing:border-box; }
  [hidden] { display:none !important; }
  html { scroll-behavior:smooth; scroll-padding-top:72px; }
  body { margin:0; background:var(--hueso); color:var(--texto); font:400 16px/1.55 var(--f); -webkit-font-smoothing:antialiased; }
  h1,h2,h3 { color:var(--carbon); margin:0; text-wrap:balance; }
  a { color:var(--coral); text-underline-offset:3px; }
  a:hover { opacity:.78; }
  :focus-visible { outline:3px solid #F8919C; outline-offset:2px; }
  .ic { width:18px; height:18px; flex:0 0 auto; }
  .c { color:var(--coral); }
  .envoltura { max-width:980px; margin:0 auto; padding-inline:20px; }
  .eyebrow { font:600 13px/1.2 var(--f); letter-spacing:.16em; text-transform:uppercase; color:var(--pizarra); }
  .dash { display:block; width:48px; height:4px; background:var(--coral); border-radius:2px; margin-top:14px; }

  /* portada */
  .hero { position:relative; min-height:440px; display:flex; align-items:flex-end; color:var(--blanco); overflow:hidden; background:var(--coral); }
  .hero.con-foto { background:var(--carbon) center/cover no-repeat; }
  .hero.con-foto::after { content:""; position:absolute; inset:0; background:linear-gradient(to top, rgba(31,32,36,.78), rgba(31,32,36,.42) 38%, transparent 72%); }
  .hero .estrella { position:absolute; right:-90px; top:-90px; height:380px; opacity:.10; pointer-events:none; }
  .hero-top { position:absolute; top:28px; left:0; right:0; z-index:1; }
  .hero-top .envoltura { display:flex; justify-content:space-between; align-items:center; gap:12px; }
  .hero-top img { height:38px; display:block; }
  .capsula { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,.92); color:var(--carbon); border-radius:999px; padding:9px 16px; font:600 12px/1 var(--f); letter-spacing:.16em; text-transform:uppercase; }
  .hero-in { position:relative; z-index:1; width:100%; padding-block:120px 40px; }
  .hero .sub { font:600 13px/1.3 var(--f); letter-spacing:.16em; text-transform:uppercase; }
  .hero h1 { color:var(--blanco); font:700 clamp(34px,6vw,56px)/1.04 var(--f); letter-spacing:-.02em; margin-top:14px; }
  .hero-chips { display:flex; flex-wrap:wrap; gap:10px; margin-top:22px; }
  .chip-hero { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,.18); border-radius:999px; padding:10px 18px; font:600 15px/1 var(--f); }
  .chip-hero.claro { background:rgba(255,255,255,.92); color:var(--carbon); }
  .chip-hero.claro .ic { color:var(--coral); }

  /* navegación: blanca y plana */
  nav.secciones { position:sticky; top:0; z-index:5; background:var(--blanco); border-bottom:1px solid var(--hairline); }
  nav.secciones .envoltura { display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; padding-block:10px; }
  nav.secciones .envoltura::-webkit-scrollbar { display:none; }
  nav.secciones a { flex:0 0 auto; display:inline-flex; align-items:center; gap:7px; text-decoration:none; color:var(--texto); font:500 14px/1 var(--f); padding:10px 14px; border-radius:10px; transition:background .16s var(--ease), color .16s var(--ease); }
  nav.secciones a .ic { width:16px; height:16px; }
  nav.secciones a:hover { opacity:1; color:var(--coral); }
  nav.secciones a.activa { color:var(--coral); background:rgba(242,80,97,.06); }

  main { padding-block:8px 64px; }
  section.bloque { padding-top:48px; }
  .titulo-sec { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; flex-wrap:wrap; }
  h2.sec { font:700 30px/1.18 var(--f); letter-spacing:-.01em; }
  .papel { background:var(--blanco); border:1px solid var(--hairline); border-radius:20px; box-shadow:var(--sombra); }
  .datos { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:18px 24px; padding:24px; margin-top:22px; }
  .lbl { display:block; font:600 12px/1.3 var(--f); letter-spacing:.14em; text-transform:uppercase; color:var(--pizarra); margin-bottom:6px; }
  .val { font:600 17px/1.35 var(--f); color:var(--carbon); }
  .bienvenida { margin-top:24px; font-size:17px; line-height:1.65; max-width:68ch; }
  .frase { margin-top:24px; background:var(--coral-suave); border-radius:20px; padding:24px 28px; font:700 19px/1.45 var(--f); color:var(--carbon); }

  /* días */
  .boton { font:600 14px/1 var(--f); padding:11px 16px; border-radius:10px; border:1.5px solid var(--coral); background:var(--blanco); color:var(--coral); cursor:pointer; transition:background .16s var(--ease); }
  .boton:hover { background:rgba(242,80,97,.05); }
  .boton:active { transform:scale(.985); }
  .dias { display:grid; gap:14px; margin-top:22px; }
  details.dia { background:var(--blanco); border:1px solid var(--hairline); border-radius:20px; box-shadow:var(--sombra); transition:box-shadow .24s var(--ease); overflow:hidden; }
  details.dia:hover { box-shadow:var(--sombra-hover); }
  details.dia > summary { list-style:none; cursor:pointer; display:flex; align-items:center; gap:16px; padding:18px 22px; }
  details.dia > summary::-webkit-details-marker { display:none; }
  .dia-num { flex:0 0 auto; background:var(--coral); color:var(--blanco); border-radius:999px; padding:7px 13px; font:700 13px/1 var(--f); letter-spacing:.06em; text-transform:uppercase; }
  .dia-cab { flex:1; min-width:0; }
  .dia-fecha { font:600 12px/1.3 var(--f); letter-spacing:.1em; text-transform:uppercase; color:var(--pizarra); }
  .dia-titulo { font:700 19px/1.3 var(--f); color:var(--carbon); margin-top:3px; }
  .hoy { display:none; margin-left:8px; background:var(--amarillo); color:var(--carbon); border-radius:999px; padding:3px 9px; font:700 11px/1.4 var(--f); letter-spacing:.08em; text-transform:uppercase; vertical-align:middle; }
  details.dia.es-hoy .hoy { display:inline-block; }
  details.dia.es-hoy { border-color:var(--coral); }
  .flecha { color:var(--pizarra); transition:transform .24s var(--ease); }
  details.dia[open] .flecha { transform:rotate(180deg); }
  .dia-cuerpo { padding:0 22px 22px; display:grid; gap:16px; }
  .dia-cuerpo.con-foto { grid-template-columns:minmax(0,1fr) 280px; align-items:start; }
  .dia-texto { margin:0; line-height:1.65; }
  .tags { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
  .tag { display:inline-flex; align-items:center; gap:6px; background:var(--coral-suave); color:var(--carbon); border-radius:999px; padding:6px 12px; font:500 13px/1.2 var(--f); }
  .tag .ic { width:14px; height:14px; color:var(--coral); }
  .tag.hotel { background:var(--hueso); border:1px solid var(--hairline); color:var(--texto); }
  .foto { border-radius:18px; box-shadow:var(--sombra-foto); background:var(--hueso) center/cover no-repeat; aspect-ratio:3/2; width:100%; }

  /* vuelos */
  .grupo-vuelos + .grupo-vuelos { margin-top:28px; }
  h3.sub { font:700 20px/1.25 var(--f); margin-top:22px; }
  .vuelos { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; margin-top:14px; }
  .vuelo { padding:18px 20px; display:grid; gap:12px; }
  .vuelo-cab { display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:14px; color:var(--pizarra); }
  .vuelo-cod { font:700 15px/1 var(--f); color:var(--coral); letter-spacing:.04em; }
  .ruta { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:10px; }
  .ruta .ciudad { font:700 17px/1.25 var(--f); color:var(--carbon); }
  .ruta .hora { font:500 14px/1.3 var(--f); color:var(--texto); font-variant-numeric:tabular-nums; }
  .ruta .fin { text-align:right; }
  .ruta .ic { color:var(--coral); width:22px; height:22px; }

  /* hoteles */
  .hoteles { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:18px; margin-top:22px; }
  .hotel { overflow:hidden; display:flex; flex-direction:column; }
  .hotel .foto { border-radius:0; box-shadow:none; aspect-ratio:16/10; }
  .hotel-in { padding:18px 20px 20px; display:grid; gap:8px; }
  .hotel h3 { font:700 18px/1.3 var(--f); }
  .hotel .ciudad-h { font:600 12px/1.2 var(--f); letter-spacing:.14em; text-transform:uppercase; color:var(--pizarra); }
  .linea { display:flex; gap:8px; align-items:flex-start; font-size:14px; }
  .linea .ic { color:var(--coral); margin-top:2px; }

  /* incluye */
  .dos-col { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:22px; margin-top:22px; }
  .lista-inc { padding:22px 24px; }
  .lista-inc h3 { font:700 18px/1.3 var(--f); margin-bottom:14px; }
  .lista-inc ul { list-style:none; margin:0; padding:0; display:grid; gap:10px; }
  .lista-inc li { display:flex; gap:12px; align-items:flex-start; font-size:15px; color:var(--carbon); }
  .lista-inc .grupo-h { font:700 12px/1.3 var(--f); letter-spacing:.12em; text-transform:uppercase; color:var(--coral); margin-top:8px; }
  .bolita { width:24px; height:24px; border-radius:999px; background:var(--coral); color:var(--blanco); display:grid; place-items:center; flex:0 0 auto; }
  .bolita .ic { width:14px; height:14px; }
  .punto { width:8px; height:8px; border-radius:999px; background:var(--hairline); flex:0 0 auto; margin-top:8px; }

  /* lista de preparación */
  .progreso { display:flex; align-items:center; gap:14px; margin-top:18px; font:500 14px/1 var(--f); color:var(--pizarra); }
  .barra { flex:1; height:8px; background:var(--tabla); border-radius:999px; overflow:hidden; }
  .barra i { display:block; height:100%; width:0; background:var(--coral); border-radius:999px; transition:width .42s var(--ease); }
  .temas { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:18px; margin-top:18px; }
  .tema { padding:20px 22px; }
  .tema h3 { font:700 13px/1.3 var(--f); letter-spacing:.12em; text-transform:uppercase; color:var(--coral); margin-bottom:12px; }
  .tema label { display:flex; gap:12px; align-items:flex-start; padding:7px 0; cursor:pointer; font-size:15px; color:var(--carbon); }
  .tema input { appearance:none; width:22px; height:22px; flex:0 0 auto; margin:1px 0 0; border:1.5px solid var(--hairline); border-radius:7px; background:var(--blanco); display:grid; place-items:center; cursor:pointer; transition:background .16s var(--ease), border-color .16s var(--ease); }
  .tema input:checked { background:var(--coral); border-color:var(--coral); }
  .tema input:checked::after { content:""; width:6px; height:11px; border:solid var(--blanco); border-width:0 2.5px 2.5px 0; transform:rotate(45deg) translate(-1px,-1px); }
  .tema input:checked + span { color:var(--pizarra); text-decoration:line-through; text-decoration-color:var(--hairline); }
  .nota { margin-top:22px; background:var(--coral-suave); border-radius:20px; padding:18px 24px; color:var(--carbon); }

  /* mapa de ruta */
  .controles { display:flex; gap:8px; align-items:center; }
  .boton { display:inline-flex; align-items:center; gap:8px; }
  .boton .ic { width:16px; height:16px; }
  .boton-ic { width:42px; height:42px; display:grid; place-items:center; border-radius:10px; border:1px solid var(--hairline); background:var(--blanco); color:var(--carbon); cursor:pointer; }
  .boton-ic:hover { border-color:var(--coral); color:var(--coral); }
  .boton-ic:disabled { opacity:.45; cursor:default; }
  .ver-todo { background:rgba(255,255,255,.94); padding:9px 14px; font-size:13px; }
  .mapa { margin-top:22px; overflow:hidden; }
  .mapa-svg { position:relative; }
  .mapa-svg svg { display:block; width:100%; height:400px; background:#EEF2F4; }
  .mapa .pais, .mapa .tramo { vector-effect:non-scaling-stroke; }
  .ver-todo { position:absolute; right:12px; top:12px; }
  .mapa .mar { fill:#EEF2F4; }
  .mapa .pais { fill:#FBFAF8; stroke:#D9D5D0; stroke-width:.8; }
  .mapa .pais.visitado { fill:var(--coral-suave); stroke:#F3B9BF; }
  .mapa .tramo { fill:none; stroke:#D9D5D0; stroke-width:2.2; stroke-dasharray:2 8; stroke-linecap:round; transition:stroke .42s var(--ease); }
  .mapa .tramo.hecho { stroke:var(--coral); stroke-dasharray:none; }
  .mapa .parada { cursor:pointer; outline:none; }
  .mapa .parada .halo { fill:var(--coral); opacity:0; transition:opacity .24s var(--ease); }
  .mapa .parada .punto-p { fill:var(--blanco); stroke:var(--coral); stroke-width:2.2; transition:fill .24s var(--ease); }
  .mapa .parada .num { font:700 9px/1 var(--f); text-anchor:middle; fill:var(--coral); pointer-events:none; }
  .mapa .parada .etiqueta { font:600 12.5px/1 var(--f); fill:var(--carbon); paint-order:stroke; stroke:rgba(255,255,255,.92); stroke-width:4px; opacity:0; transition:opacity .24s var(--ease); pointer-events:none; }
  .mapa .parada.hecha .punto-p { fill:var(--coral); }
  .mapa .parada.hecha .num { fill:var(--blanco); }
  .mapa .parada.activa .halo { opacity:.18; }
  .mapa .parada.activa .etiqueta, .mapa .parada:hover .etiqueta, .mapa .parada:focus-visible .etiqueta, .mapa.pocas .parada .etiqueta { opacity:1; }
  .mapa.cerca .parada.vecina .etiqueta { opacity:.85; }
  .mapa .parada.activa { z-index:2; }
  .mapa .avion { opacity:0; transition:opacity .24s var(--ease); pointer-events:none; color:var(--coral); }
  .mapa .avion.volando { opacity:1; }
  .mapa .avion-fondo { fill:var(--blanco); stroke:var(--coral); stroke-width:1.5; }
  .parada-info { padding:18px 22px 20px; border-bottom:1px solid var(--hairline); }
  .parada-info h3 { font:700 22px/1.25 var(--f); margin-top:4px; }
  .parada-info p { margin:6px 0 0; font-size:15px; color:var(--texto); }
  .enlace-btn { display:inline-flex; align-items:center; gap:6px; margin-top:10px; border:0; background:none; padding:0; font:600 14px/1.3 var(--f); color:var(--coral); cursor:pointer; text-decoration:underline; text-underline-offset:3px; }
  .enlace-btn .ic { width:15px; height:15px; }
  .enlace-btn:hover { opacity:.78; }
  .fuente-mapa { margin:8px 2px 0; font-size:12px; color:var(--pizarra); }
  .chips-ruta { display:flex; gap:8px; overflow-x:auto; padding:14px 2px 4px; scrollbar-width:thin; }
  .chip-ruta { flex:0 0 auto; display:inline-flex; align-items:center; gap:8px; border:1px solid var(--hairline); background:var(--blanco); color:var(--carbon); border-radius:999px; padding:7px 14px 7px 7px; font:500 14px/1 var(--f); cursor:pointer; }
  .chip-ruta b { width:24px; height:24px; border-radius:999px; display:grid; place-items:center; background:var(--coral-suave); color:var(--coral); font:700 12px/1 var(--f); }
  .chip-ruta.activa { border-color:var(--coral); }
  .chip-ruta.activa b { background:var(--coral); color:var(--blanco); }

  /* política */
  details.politica { margin-top:22px; padding:0; }
  details.politica > summary { list-style:none; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:12px; padding:18px 22px; font:600 16px/1.3 var(--f); color:var(--carbon); }
  details.politica > summary::-webkit-details-marker { display:none; }
  details.politica[open] .flecha { transform:rotate(180deg); }
  .politica-in { padding:0 22px 22px; }
  .politica-in > p { margin:0 !important; font:400 14px/1.5 var(--f) !important; color:var(--pizarra) !important; }
  .pol-cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:10px 32px; margin-top:16px; }
  .pol-h { font:700 13px/1.3 var(--f); color:var(--coral); letter-spacing:.04em; text-transform:uppercase; margin:12px 0 6px; }
  .pol-p { font:400 13.5px/1.6 var(--f); color:var(--texto); margin:0 0 8px; text-align:justify; }

  /* pie */
  footer.pie-doc { margin-top:56px; background:var(--coral); color:var(--blanco); text-align:center; padding:28px 20px 24px; }
  .contacto { display:flex; flex-wrap:wrap; justify-content:center; gap:10px 22px; font:700 15px/1.3 var(--f); }
  .contacto a, .contacto span { color:var(--blanco); display:inline-flex; align-items:center; gap:8px; text-decoration:none; }
  .direccion { font:700 18px/1.3 var(--f); margin-top:12px; display:inline-flex; align-items:center; gap:8px; }
  .legal { font:400 12.5px/1.5 var(--f); margin-top:12px; opacity:.95; }
  .firma { max-width:980px; margin:0 auto; padding:22px 20px 0; display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; font-size:13px; color:var(--pizarra); }
  .firma b { color:var(--carbon); font-weight:600; }

  @media (max-width:640px) {
    .hero { min-height:400px; }
    .dia-cuerpo.con-foto { grid-template-columns:1fr; }
    .mapa-svg svg { height:280px; }
    .controles { width:100%; }
    .controles .boton { flex:1; justify-content:center; }
    details.dia > summary { padding:16px 16px; gap:12px; }
    .dia-cuerpo { padding:0 16px 18px; }
    h2.sec { font-size:26px; }
  }
  @media (prefers-reduced-motion:reduce) { *, html { transition:none !important; scroll-behavior:auto !important; } }
  @media print {
    nav.secciones, .boton, .boton-ic, .progreso, .chips-ruta, .enlace-btn { display:none !important; }
    body { background:var(--blanco); }
    details.dia, .papel { box-shadow:none; break-inside:avoid; }
  }`;
  // Comportamiento: cuenta regresiva, marca del día de hoy, abrir/cerrar días, lista marcable y
  // resaltado de la sección visible. Todo guarda solo en el navegador de quien abre el archivo.
  const JS_INTERACTIVO = `(() => {
    const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
    const cfg = JSON.parse(document.getElementById('datos-viaje').textContent);
    const dia = s => { const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const ini = dia(cfg.inicio), fin = dia(cfg.fin) || ini;
    const cuenta = $('#cuenta');
    if (ini && cuenta) {
      const d = Math.round((ini - hoy) / 864e5);
      const total = Math.round((fin - ini) / 864e5) + 1;
      const hoyN = Math.round((hoy - ini) / 864e5) + 1;
      cuenta.textContent = d > 1 ? 'Faltan ' + d + ' días' : d === 1 ? 'Sales mañana' : d === 0 ? 'Hoy empieza tu viaje' : hoy <= fin ? 'Día ' + hoyN + ' de ' + total : 'Gracias por viajar con nosotros';
      cuenta.parentElement.hidden = false;
    }
    const iso = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    const deHoy = $$('details.dia').find(x => x.dataset.fecha === iso);
    if (deHoy) { deHoy.classList.add('es-hoy'); deHoy.open = true; }
    const alternar = $('#alternar');
    if (alternar) {
      const pintar = () => { alternar.textContent = $$('details.dia').every(x => x.open) ? 'Cerrar todos' : 'Abrir todos'; };
      alternar.addEventListener('click', () => { const abrir = !$$('details.dia').every(x => x.open); $$('details.dia').forEach(x => { x.open = abrir; }); pintar(); });
      $$('details.dia').forEach(x => x.addEventListener('toggle', pintar));
      pintar();
    }
    window.addEventListener('beforeprint', () => $$('details').forEach(x => { x.open = true; }));
    const clave = 'caminos-lista-' + cfg.codigo;
    let marcados = {};
    try { marcados = JSON.parse(localStorage.getItem(clave) || '{}'); } catch (_) {}
    const checks = $$('.tema input');
    const progreso = () => {
      const n = checks.filter(c => c.checked).length;
      const t = $('#progreso-texto'), b = $('#progreso-barra');
      if (t) t.textContent = n + ' de ' + checks.length + ' listos';
      if (b) b.style.width = (checks.length ? 100 * n / checks.length : 0) + '%';
    };
    checks.forEach(c => {
      c.checked = !!marcados[c.id];
      c.addEventListener('change', () => { marcados[c.id] = c.checked; try { localStorage.setItem(clave, JSON.stringify(marcados)); } catch (_) {} progreso(); });
    });
    progreso();
    // Mapa de ruta: una parada activa; los tramos y paradas anteriores quedan en coral.
    const datosRuta = document.getElementById('datos-ruta');
    if (datosRuta) {
      const paradas = JSON.parse(datosRuta.textContent);
      const mapa = $('.mapa');
      if (paradas.length <= 8) mapa.classList.add('pocas');
      let actual = 0, timer = null;
      const quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      // Acercamiento suave: la vista se centra en la parada activa con sus vecinas cercanas y bastante margen.
      const svg = $('.mapa-svg svg'), W = +svg.dataset.w, H = +svg.dataset.h;
      const pts = JSON.parse(svg.dataset.pts), km = JSON.parse(svg.dataset.km);
      let vista = [0, 0, W, H], anim = null;
      // La vista lógica se ensancha o alarga para llenar el recuadro (en el celular el mapa es más alto),
      // y los puntos y nombres se escalan para medir lo mismo en pantalla con cualquier acercamiento.
      const pintarVista = v => {
        vista = v;
        const cw = svg.clientWidth || W, ch = svg.clientHeight || H, asp = cw / ch;
        let [x, y, w, h] = v;
        if (w / h > asp) { const nh = w / asp; y -= (nh - h) / 2; h = nh; } else { const nw = h * asp; x -= (nw - w) / 2; w = nw; }
        svg.setAttribute('viewBox', [x, y, w, h].map(n => Math.round(n * 100) / 100).join(' '));
        const z = W / v[2];
        $$('.mapa .escala-m').forEach(g => g.setAttribute('transform', 'scale(' + (w / cw) + ')'));
        mapa.classList.toggle('pocas', paradas.length <= 8 && z < 1.05);
        $('#ruta-todo').hidden = z < 1.05;
        mapa.classList.toggle('cerca', z >= 1.05);
      };
      const moverA = (dest, rapido) => {
        cancelAnimationFrame(anim);
        if (quieto || rapido) return pintarVista(dest);
        const ini = vista.slice(), t0 = performance.now();
        const paso = t => { const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3); pintarVista(ini.map((a, j) => a + (dest[j] - a) * e)); if (k < 1) anim = requestAnimationFrame(paso); };
        anim = requestAnimationFrame(paso);
      };
      const encuadre = i => {
        const grupo = [pts[i]];
        for (const j of [i - 2, i - 1, i + 1, i + 2]) { // vecinas a menos de 2.500 km, para ver la parada en su contexto
          if (j < 0 || j >= pts.length) continue;
          const dist = j < i ? km.slice(j, i).reduce((a, b) => a + b, 0) : km.slice(i, j).reduce((a, b) => a + b, 0);
          if (dist < 2500) grupo.push(pts[j]);
        }
        let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
        grupo.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
        let w = Math.max((x1 - x0) * 2.2, W / 8), h = Math.max((y1 - y0) * 2.2, H / 8);
        if (w / h > W / H) h = w * H / W; else w = h * W / H;
        if (w >= W) return [0, 0, W, H];
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        return [Math.min(Math.max(cx - w / 2, 0), W - w), Math.min(Math.max(cy - h / 2, 0), H - h), w, h];
      };
      $('#ruta-todo').addEventListener('click', () => { parar(); moverA([0, 0, W, H]); });
      window.addEventListener('resize', () => pintarVista(vista));
      pintarVista([0, 0, W, H]);
      // Avión: vuela por la curva del tramo hacia la parada siguiente, girando según la dirección,
      // y va pintando el tramo en coral detrás de él.
      const avion = $('.mapa .avion'), giro = $('.mapa .avion-giro');
      let vuelo = null;
      const volar = i => {
        const tramo = $('.mapa .tramo[data-i="' + i + '"]');
        if (!tramo || quieto || !tramo.getTotalLength) return;
        cancelAnimationFrame(vuelo);
        const largo = tramo.getTotalLength(), t0 = performance.now(), dur = 1300;
        // El trazo no se escala con el acercamiento (non-scaling-stroke), así que el guion se mide en píxeles de pantalla.
        const px = () => { const m = svg.getScreenCTM(); return m ? m.a : 1; };
        const revelar = e => { const l = largo * px(); tramo.style.strokeDasharray = l + ' ' + l; tramo.style.strokeDashoffset = l * (1 - e); };
        revelar(0);
        avion.classList.add('volando');
        const paso = t => {
          const k = Math.min(1, (t - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          const p = tramo.getPointAtLength(largo * e), q = tramo.getPointAtLength(Math.min(largo, largo * e + 1));
          const r = tramo.getPointAtLength(Math.max(0, largo * e - 1));
          const ang = Math.atan2(q.y - r.y, q.x - r.x) * 180 / Math.PI + 45; // el ícono apunta hacia arriba a la derecha
          avion.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
          giro.setAttribute('transform', 'rotate(' + ang + ')');
          revelar(e);
          if (k < 1) vuelo = requestAnimationFrame(paso);
          else { avion.classList.remove('volando'); tramo.style.strokeDasharray = ''; tramo.style.strokeDashoffset = ''; }
        };
        vuelo = requestAnimationFrame(paso);
      };
      // En tramos largos (p. ej. Bangkok → París) la cámara abre para ver el vuelo completo
      // y al aterrizar se acerca al destino.
      const unir = (a, b) => {
        const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]);
        let w = Math.max(a[0] + a[2], b[0] + b[2]) - x, h = Math.max(a[1] + a[3], b[1] + b[3]) - y;
        if (w / h > W / H) h = w * H / W; else w = h * W / H;
        if (w >= W) return [0, 0, W, H];
        const cx = x + (Math.max(a[0] + a[2], b[0] + b[2]) - x) / 2, cy = y + (Math.max(a[1] + a[3], b[1] + b[3]) - y) / 2;
        return [Math.min(Math.max(cx - w / 2, 0), W - w), Math.min(Math.max(cy - h / 2, 0), H - h), w, h];
      };
      let aterrizaje = null;
      const ir = (i, acercar = true) => {
        const anterior = actual;
        actual = Math.max(0, Math.min(paradas.length - 1, i));
        clearTimeout(aterrizaje);
        const largo = acercar && actual === anterior + 1 && !quieto && km[anterior] >= 2500;
        if (acercar && actual === anterior + 1) volar(actual);
        if (largo) {
          moverA(unir(encuadre(anterior), encuadre(actual)));
          aterrizaje = setTimeout(() => moverA(encuadre(actual)), 1350);
        } else if (acercar) moverA(encuadre(actual));
        $$('.mapa .parada').forEach(g => { const k = +g.dataset.i; g.classList.toggle('hecha', k <= actual); g.classList.toggle('activa', k === actual); g.classList.toggle('vecina', Math.abs(k - actual) === 1); });
        $$('.mapa .tramo').forEach(t => t.classList.toggle('hecho', +t.dataset.i <= actual));
        $$('.chip-ruta').forEach(c => c.classList.toggle('activa', +c.dataset.i === actual));
        const p = paradas[actual];
        $('#p-dias').textContent = 'Parada ' + (actual + 1) + ' de ' + paradas.length + ' · ' + p.dias;
        $('#p-nombre').textContent = p.nombre + (p.pais ? ', ' + p.pais : '');
        $('#p-titulos').textContent = p.titulos.filter(Boolean).join(' · ');
        $('#ruta-ant').disabled = actual === 0;
        $('#ruta-sig').disabled = actual === paradas.length - 1;
        const chip = $('.chip-ruta.activa');
        if (chip && chip.scrollIntoView) chip.scrollIntoView({ block: 'nearest', inline: 'center', behavior: quieto ? 'auto' : 'smooth' });
      };
      const parar = () => { clearTimeout(timer); timer = null; $('#ruta-play span').textContent = 'Recorrer la ruta'; };
      $('#ruta-play').addEventListener('click', () => {
        if (timer) return parar();
        if (actual >= paradas.length - 1) ir(0);
        $('#ruta-play span').textContent = 'Pausar';
        const siguiente = () => {
          if (actual >= paradas.length - 1) return parar();
          ir(actual + 1);
          timer = setTimeout(siguiente, quieto ? 2400 : km[actual - 1] >= 2500 ? 2600 : 1600); // los vuelos largos esperan al aterrizaje
        };
        timer = setTimeout(siguiente, 600);
      });
      $('#ruta-ant').addEventListener('click', () => { parar(); ir(actual - 1); });
      $('#ruta-sig').addEventListener('click', () => { parar(); ir(actual + 1); });
      $$('.mapa .parada').forEach(g => {
        g.addEventListener('click', () => { parar(); ir(+g.dataset.i); });
        g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); parar(); ir(+g.dataset.i); } });
      });
      $$('.chip-ruta').forEach(c => c.addEventListener('click', () => { parar(); ir(+c.dataset.i); }));
      $('#p-ver').addEventListener('click', () => {
        const ids = paradas[actual].ids;
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.open = true; });
        const primero = document.getElementById(ids[0]);
        if (primero) primero.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
      });
      $$('.ver-mapa').forEach(b => b.addEventListener('click', () => { parar(); ir(+b.dataset.parada); document.getElementById('ruta').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth' }); }));
      // Durante el viaje, el mapa arranca en la parada de hoy.
      // Al abrir se ve toda la ruta; durante el viaje, marcada hasta la parada de hoy.
      const hoyDia = $('details.dia.es-hoy');
      const deHoyParada = hoyDia ? paradas.findIndex(p => p.ids.includes(hoyDia.id)) : -1;
      ir(deHoyParada >= 0 ? deHoyParada : 0, false);
    }

    const enlaces = $$('nav.secciones a');
    if ('IntersectionObserver' in window && enlaces.length) {
      const io = new IntersectionObserver(es => es.forEach(en => {
        if (en.isIntersecting) enlaces.forEach(a => a.classList.toggle('activa', a.getAttribute('href') === '#' + en.target.id));
      }), { rootMargin: '-45% 0px -50% 0px' });
      $$('section.bloque').forEach(s => io.observe(s));
    }
  })();`;


  // ================= mapa de ruta: localizar cada día y dibujar el recorrido =================
  // Ciudades de GeoNames (CC BY 4.0) y contornos de Natural Earth, incrustados por build.py.
  const CIUDADES = "__CIUDADES__";
  const PAISES = "__PAISES__";
  const normal = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  // Nombres en español (y sitios que se ubican en su ciudad) que GeoNames trae en inglés o no trae.
  const EXONIMOS = {
    'roma': ['Rome', 'IT'], 'vaticano': ['Vatican City', 'VA'], 'ciudad del vaticano': ['Vatican City', 'VA'], 'londres': ['London', 'GB'],
    'venecia': ['Venice', 'IT'], 'florencia': ['Florence', 'IT'], 'napoles': ['Naples', 'IT'], 'milan': ['Milan', 'IT'], 'turin': ['Turin', 'IT'],
    'padua': ['Padova', 'IT'], 'asis': ['Assisi', 'IT'], 'genova': ['Genoa', 'IT'], 'lisboa': ['Lisbon', 'PT'], 'oporto': ['Porto', 'PT'],
    'atenas': ['Athens', 'GR'], 'jerusalen': ['Jerusalem', 'IL'], 'belen': ['Bethlehem', 'PS'], 'nazaret': ['Nazareth', 'IL'],
    'tiberiades': ['Tiberias', 'IL'], 'cafarnaum': ['Cafarnaúm', 'IL'], 'cana': ['Caná', 'IL'], 'varsovia': ['Warsaw', 'PL'], 'cracovia': ['Kraków', 'PL'],
    'praga': ['Prague', 'CZ'], 'viena': ['Vienna', 'AT'], 'munich': ['Munich', 'DE'], 'colonia': ['Cologne', 'DE'], 'ginebra': ['Geneva', 'CH'],
    'bruselas': ['Brussels', 'BE'], 'moscu': ['Moscow', 'RU'], 'estambul': ['Istanbul', 'TR'], 'el cairo': ['Cairo', 'EG'], 'cairo': ['Cairo', 'EG'],
    'pekin': ['Beijing', 'CN'], 'tokio': ['Tokyo', 'JP'], 'nueva york': ['New York City', 'US'], 'ciudad de mexico': ['Mexico City', 'MX'],
    'copenhague': ['Copenhagen', 'DK'], 'estocolmo': ['Stockholm', 'SE'], 'edimburgo': ['Edinburgh', 'GB'], 'burdeos': ['Bordeaux', 'FR'],
    'marsella': ['Marseille', 'FR'], 'niza': ['Nice', 'FR'], 'avinon': ['Avignon', 'FR'], 'estrasburgo': ['Strasbourg', 'FR'],
    'singapur': ['Singapore', 'SG'], 'seul': ['Seoul', 'KR'], 'nueva delhi': ['New Delhi', 'IN'], 'bombay': ['Mumbai', 'IN'], 'dubai': ['Dubai', 'AE'],
    'caravaca de la cruz': ['Caravaca', 'ES'], 'monserrate': ['Bogotá', 'CO'], 'las lajas': ['Ipiales', 'CO'], 'santuario de las lajas': ['Ipiales', 'CO'],
    'tayrona': ['Santa Marta', 'CO'], 'parque tayrona': ['Santa Marta', 'CO'], 'valle de cocora': ['Salento', 'CO'],
  };
  let indiceCiudades = null;
  // Sin más contexto, un nombre es la ciudad conocida: se descartan homónimas 25 veces más pequeñas
  // (Madrid es la de España). Con "Madrid, Cundinamarca" en el campo lugar se conservan todas.
  function candidatos(texto, calificado = false) {
    if (!indiceCiudades) {
      indiceCiudades = new Map();
      CIUDADES.forEach((c, i) => { const k = normal(c[0]); if (!indiceCiudades.has(k)) indiceCiudades.set(k, []); indiceCiudades.get(k).push(i); });
    }
    const k = normal(texto);
    const out = new Set(indiceCiudades.get(k) || []);
    const ex = EXONIMOS[k];
    if (ex) (indiceCiudades.get(normal(ex[0])) || []).filter(i => CIUDADES[i][1] === ex[1]).forEach(i => out.add(i));
    const lista = [...out].sort((a, b) => CIUDADES[b][2] - CIUDADES[a][2]).slice(0, 40);
    const mayor = lista.length ? CIUDADES[lista[0]][2] : 0;
    return calificado || !mayor ? lista : lista.filter(i => (CIUDADES[i][2] || 0) * 25 >= mayor);
  }
  // Palabras de acción que empiezan títulos de días y no son lugares ("Salida desde Bogotá").
  const NO_LUGAR = new Set(['salida', 'llegada', 'regreso', 'traslado', 'visita', 'noche', 'vuelo', 'encuentro', 'tour', 'misa', 'tarde', 'manana',
    'libre', 'dia', 'templos', 'mercado', 'paseo', 'recorrido', 'excursion', 'conexion', 'desayuno', 'almuerzo', 'cena', 'hotel']);
  // Lugares de un día, en orden: en cada tramo del título ("Sevilla — Córdoba — Madrid" son tres) el
  // nombre de ciudad más a la derecha y más largo; al final, el campo "lugar" si lo hay.
  function lugaresDelDia(x) {
    const out = [];
    const agregar = (t, calificado) => {
      const c = candidatos(t, calificado);
      if (c.length && !(out.length && normal(out.at(-1).texto) === normal(t))) out.push({ texto: t, candidatos: c });
      return c.length > 0;
    };
    for (const seg of String(x.titulo || '').split(/\s+[—–-]\s+|,|\s+y\s+|\//).map(t => t.trim()).filter(Boolean)) {
      const pal = seg.split(/\s+/);
      let hallado = false;
      for (let i = pal.length - 1; i >= 0 && !hallado; i--)
        for (let n = Math.min(4, pal.length - i); n >= 1 && !hallado; n--) {
          const grupo = pal.slice(i, i + n).join(' ').replace(/[.;:]+$/, '');
          if (/^[A-ZÁÉÍÓÚÑ]/.test(grupo) && normal(grupo).length >= 3 && !NO_LUGAR.has(normal(pal[i]))) hallado = agregar(grupo);
        }
    }
    if (!vacio(x.lugar)) { const [nombre, ...resto] = String(x.lugar).split(','); agregar(nombre.trim(), resto.length > 0); }
    return out;
  }
  const kmEntre = (a, b) => {
    const r = Math.PI / 180, [la1, lo1, la2, lo2] = [a[3] * r, a[4] * r, b[3] * r, b[4] * r];
    return 6371 * 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
  };
  // Nombres repetidos (Madrid, Córdoba, Granada…): se elige la combinación que deja la ruta más
  // corta, prefiriendo ciudades grandes cuando la distancia no decide.
  function paradasDe(d) {
    const dias = (d.dias || []).filter(x => !vacio(x.titulo) || !vacio(x.descripcion));
    // Los vuelos del mismo día se suman a la ruta (origen y destino, por hora de salida): muestran las
    // conexiones y ubican bien las ciudades de nombre repetido.
    const vuelos = [...(d.vuelos || []), ...(d.vuelos_internos || [])].filter(v => RE_ISO.test(v.fecha || ''));
    const iso = f => String(f || '').trim().replace(/-(\d)(?!\d)/g, '-0$1');
    const lugares = dias.flatMap((x, iDia) => {
      const propios = lugaresDelDia(x).map(l => ({ ...l, iDia }));
      const mismo = (a, b) => a.candidatos.some(c => b.candidatos.includes(c));
      const delDia = vuelos.filter(v => iso(v.fecha) === iso(x.fecha)).sort((a, b) => String(a.sale).localeCompare(String(b.sale)));
      for (const v of delDia) {
        const [o, dd] = [v.origen, v.destino].map(t => { const c = vacio(t) ? [] : candidatos(t); return c.length ? { texto: String(t).trim(), candidatos: c, iDia, vuelo: v.vuelo } : null; });
        const io = o ? propios.findIndex(p => mismo(p, o)) : -1, id = dd ? propios.findIndex(p => mismo(p, dd)) : -1;
        // Solo se agrega la punta del vuelo que el título no nombra, junto a la otra punta.
        if (o && dd && io < 0 && id < 0) propios.push(o, dd);
        else if (dd && id < 0) propios.splice(io + 1, 0, dd);
        else if (o && io < 0) propios.splice(Math.max(id, 0), 0, o);
      }
      return propios;
    });
    if (lugares.length < 2) return null;
    const castigo = i => 250 * (1 - Math.log10((CIUDADES[i][2] || 5000) + 10) / 7);
    let costo = lugares[0].candidatos.map(i => [castigo(i), [i]]);
    for (const l of lugares.slice(1)) {
      costo = l.candidatos.map(j => {
        let mejor = null;
        for (const [c, camino] of costo) {
          const t = c + kmEntre(CIUDADES[camino.at(-1)], CIUDADES[j]) + castigo(j);
          if (!mejor || t < mejor[0]) mejor = [t, [...camino, j]];
        }
        return mejor;
      });
    }
    const elegido = costo.reduce((a, b) => (b[0] < a[0] ? b : a))[1];
    const paradas = [];
    lugares.forEach((l, k) => {
      const c = elegido[k], ult = paradas.at(-1);
      if (ult && ult.ciudad === c) { if (!ult.dias.includes(l.iDia)) ult.dias.push(l.iDia); if (!l.vuelo) ult.soloVuelo = false; return; }
      paradas.push({ ciudad: c, nombre: l.texto, cc: CIUDADES[c][1], lat: CIUDADES[c][3], lon: CIUDADES[c][4], dias: [l.iDia], vuelo: l.vuelo || null, soloVuelo: !!l.vuelo });
    });
    return paradas.length >= 2 ? { paradas, dias } : null;
  }
  let nombrePais = cc => cc;
  try { const dn = new Intl.DisplayNames(['es'], { type: 'region' }); nombrePais = cc => { try { return dn.of(cc) || cc; } catch (_) { return cc; } }; } catch (_) {}
  // Dibuja el mapa como SVG fijo (proyección equirectangular centrada en la ruta).
  function mapaSvg(paradas) {
    let [lo0, lo1, la0, la1] = [Infinity, -Infinity, Infinity, -Infinity];
    paradas.forEach(p => { lo0 = Math.min(lo0, p.lon); lo1 = Math.max(lo1, p.lon); la0 = Math.min(la0, p.lat); la1 = Math.max(la1, p.lat); });
    const mLat = Math.max((la1 - la0) * 0.18, 1.2), mLon = Math.max((lo1 - lo0) * 0.12, 1.8);
    la0 -= mLat; la1 += mLat; lo0 -= mLon; lo1 += mLon;
    const k = Math.cos(((la0 + la1) / 2) * Math.PI / 180);
    const W = 1000;
    let ancho = (lo1 - lo0) * k, alto = la1 - la0;
    // Proporción entre 1,9:1 y 1,15:1 para que se lea bien en celular y en computador.
    if (ancho / alto > 1.9) { const extra = (ancho / 1.9 - alto) / 2; la0 -= extra; la1 += extra; alto = la1 - la0; }
    if (ancho / alto < 1.15) { const extra = (alto * 1.15 - ancho) / k / 2; lo0 -= extra; lo1 += extra; ancho = (lo1 - lo0) * k; }
    const esc2 = W / ancho, H = Math.round(alto * esc2);
    const X = lon => (lon - lo0) * k * esc2, Y = lat => (la1 - lat) * esc2;
    const r1 = n => Math.round(n * 100) / 100;
    // Países que tocan la vista (con margen), simplificados a ~1,5 px.
    const paths = [];
    const visitados = new Set();
    const dentro = (x, y, ring) => { let c = false; for (let i = 0, j = ring.length / 2 - 1; i < ring.length / 2; j = i++) { const xi = ring[2 * i] / 100, yi = ring[2 * i + 1] / 100, xj = ring[2 * j] / 100, yj = ring[2 * j + 1] / 100; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    for (const [nombre, anillos] of PAISES) {
      let d = '', toca = false, visitado = false;
      for (const ring of anillos) {
        let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
        for (let i = 0; i < ring.length; i += 2) { const lo = ring[i] / 100, la = ring[i + 1] / 100; bx0 = Math.min(bx0, lo); bx1 = Math.max(bx1, lo); by0 = Math.min(by0, la); by1 = Math.max(by1, la); }
        if (bx1 < lo0 - 5 || bx0 > lo1 + 5 || by1 < la0 - 5 || by0 > la1 + 5) continue;
        toca = true;
        let px = null, py = null, seg = '';
        for (let i = 0; i < ring.length; i += 2) {
          const x = X(ring[i] / 100), y = Y(ring[i + 1] / 100);
          if (px !== null && Math.abs(x - px) < 0.35 && Math.abs(y - py) < 0.35 && i < ring.length - 2) continue;
          seg += (seg ? 'L' : 'M') + r1(x) + ' ' + r1(y);
          px = x; py = y;
        }
        d += seg + 'Z';
        if (!visitado && paradas.some(p => dentro(p.lon, p.lat, ring))) visitado = true;
      }
      if (toca && d) { paths.push(`<path class="pais${visitado ? ' visitado' : ''}" d="${d}"><title>${esc(nombre)}</title></path>`); if (visitado) visitados.add(nombre); }
    }
    // Tramos como curvas suaves entre paradas consecutivas.
    const pts = paradas.map(p => [r1(X(p.lon)), r1(Y(p.lat))]);
    const tramos = pts.slice(1).map((b, i) => {
      const a = pts[i], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], largo = Math.hypot(dx, dy) || 1;
      const curva = Math.min(0.18 * largo, 80);
      const cx = r1(mx + (dy / largo) * curva), cy = r1(my - (dx / largo) * curva); // se curva siempre hacia el mismo lado
      return `<path class="tramo" data-i="${i + 1}" d="M${a[0]} ${a[1]}Q${cx} ${cy} ${b[0]} ${b[1]}"/>`;
    });
    const marcas = pts.map(([x, y], i) => `<g class="parada" data-i="${i}" tabindex="0" role="button" aria-label="${esc(paradas[i].nombre)}" transform="translate(${x} ${y})"><g class="escala-m">
      <circle r="12" class="halo"/><circle r="8.5" class="punto-p"/><text class="num" y="3.2">${i + 1}</text>
      <text class="etiqueta" x="13" y="-9">${esc(paradas[i].nombre)}</text></g></g>`);
    const avionIcono = (ICONOS.plane || '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    const avion = `<g class="avion" aria-hidden="true"><g class="escala-m"><circle r="13" class="avion-fondo"/><g class="avion-giro"><g transform="translate(-8.4 -8.4) scale(.7)" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${avionIcono}</g></g></g></g>`;
    return { svg: `<svg viewBox="0 0 ${W} ${H}" data-w="${W}" data-h="${H}" data-pts="${esc(JSON.stringify(pts))}" data-km="${esc(JSON.stringify(paradas.slice(1).map((p, i) => Math.round(kmEntre([0, 0, 0, paradas[i].lat, paradas[i].lon], [0, 0, 0, p.lat, p.lon])))))}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mapa de la ruta del viaje"><rect class="mar" width="${W}" height="${H}"/>${paths.join('')}${tramos.join('')}${marcas.join('')}${avion}</svg>`, visitados: [...visitados] };
  }

  async function htmlItinerario(d, { incrustar = false } = {}) {
    const foto = async (u, max) => (u ? (incrustar ? await aDataUrl(u, max) : u) : '');
    const portada = await foto(d.foto_portada, 1600);
    const titulo = String(d.titulo || '').split('\n').map(e).join('<br>');
    const secciones = [];
    const nav = [];
    const agregar = (id, nombre, ic, html) => { nav.push(`<a href="#${id}">${icono(ic)}${nombre}</a>`); secciones.push(`<section class="bloque" id="${id}">${html}</section>`); };

    // Resumen
    const datos = [['Grupo', d.grupo], ['Acompañamiento espiritual', d.acompanamiento], ['Pasajero', d.pasajero], ['Acomodación', d.acomodacion], ['Destino', d.destino]]
      .filter(([, v]) => !vacio(v)).map(([k, v]) => `<div><span class="lbl">${k}</span><span class="val">${e(v)}</span></div>`).join('');
    const bienvenida = vacio(d.bienvenida) ? '' : String(d.bienvenida).trim().split(/\n\s*\n/).filter(p => p.trim()).map(p => `<p class="bienvenida">${e(p)}</p>`).join('');
    agregar('viaje', 'Tu viaje', 'map', `<span class="eyebrow">Tu viaje</span><h2 class="sec" style="margin-top:8px;">Te damos la <span class="c">bienvenida</span></h2><span class="dash"></span>
      ${datos ? `<div class="papel datos">${datos}</div>` : ''}${bienvenida}${vacio(d.frase) ? '' : `<div class="frase">${e(d.frase)}</div>`}`);

    // Ruta en el mapa
    // El mapa solo va cuando el viaje tiene 3 destinos distintos o más: un ida y regreso
    // (Bogotá — Chiquinquirá) se entiende sin mapa y el recuadro ocuparía mucho espacio.
    const rutaTodos = paradasDe(d);
    const ruta = rutaTodos && new Set(rutaTodos.paradas.map(p => p.ciudad)).size >= 3 ? rutaTodos : null;
    const paradaDeDia = new Map();
    if (ruta) {
      ruta.paradas.forEach((p, i) => { if (!p.soloVuelo) p.dias.forEach(di => paradaDeDia.set(di, i)); }); // cada día apunta a la parada donde termina
      const { svg } = mapaSvg(ruta.paradas);
      const numDia = di => { const x = ruta.dias[di]; const num = x.dia || di + 1; return /^\d+$/.test(String(num)) ? d2(+num) : String(num); };
      const infoParadas = ruta.paradas.map(p => ({
        nombre: p.nombre, pais: nombrePais(p.cc),
        dias: p.dias.length === 1 ? 'Día ' + numDia(p.dias[0]) : 'Días ' + numDia(p.dias[0]) + ' a ' + numDia(p.dias.at(-1)),
        titulos: p.soloVuelo ? ['Conexión en el vuelo ' + (p.vuelo || '')] : p.dias.map(di => ruta.dias[di].titulo || ''), ids: p.dias.map(di => 'dia-' + di),
      }));
      const paises = new Set(ruta.paradas.map(p => p.cc)).size;
      agregar('ruta', 'Ruta', 'compass', `<div class="titulo-sec"><div><span class="eyebrow">${ruta.paradas.length} paradas${paises > 1 ? ' · ' + paises + ' países' : ''}</span><h2 class="sec" style="margin-top:8px;">Tu ruta <span class="c">en el mapa</span></h2><span class="dash"></span></div>
        <div class="controles"><button type="button" class="boton-ic" id="ruta-ant" aria-label="Parada anterior">${icono('chevron-left')}</button><button type="button" class="boton" id="ruta-play">${icono('play')}<span>Recorrer la ruta</span></button><button type="button" class="boton-ic" id="ruta-sig" aria-label="Parada siguiente">${icono('chevron-right')}</button></div></div>
        <div class="papel mapa"><div class="parada-info" aria-live="polite"><span class="eyebrow" id="p-dias"></span><h3 id="p-nombre"></h3><p id="p-titulos"></p><button type="button" class="enlace-btn" id="p-ver">Ver estos días</button></div>
          <div class="mapa-svg">${svg}<button type="button" class="boton ver-todo" id="ruta-todo" hidden>${icono('compass')}<span>Ver toda la ruta</span></button></div></div>
        <p class="fuente-mapa">Ubicaciones aproximadas por ciudad. Mapa: Natural Earth · Ciudades: GeoNames (CC BY 4.0).</p>
        <div class="chips-ruta" role="list">${ruta.paradas.map((p, i) => `<button type="button" role="listitem" class="chip-ruta" data-i="${i}"><b>${i + 1}</b>${esc(p.nombre)}</button>`).join('')}</div>
        ${ABRE} type="application/json" id="datos-ruta">${JSON.stringify(infoParadas).replace(/</g, '\\u003c')}${CIERRE}`);
    }

    // Día a día
    const dias = (d.dias || []).filter(x => !vacio(x.titulo) || !vacio(x.descripcion));
    const tarjetasDias = [];
    for (const [i, x] of dias.entries()) {
      const f = await foto(x.foto, 900);
      const tags = [...(x.comidas || []).filter(t => !vacio(t)).map(t => `<span class="tag">${icono('utensils')}${e(t)}</span>`),
        ...(x.etiquetas || []).filter(t => !vacio(t)).map(t => `<span class="tag">${e(t)}</span>`),
        ...(vacio(x.hotel) ? [] : [`<span class="tag hotel">${icono('bed-double')}${e(x.hotel)}</span>`])].join('');
      const num = x.dia || i + 1;
      const isoDia = RE_ISO.test(x.fecha || '') ? String(x.fecha).trim().replace(/-(\d)(?!\d)/g, '-0$1') : '';
      const enMapa = paradaDeDia.has(i) ? `<button type="button" class="enlace-btn ver-mapa" data-parada="${paradaDeDia.get(i)}">${icono('map-pin')}Ver en el mapa</button>` : '';
      tarjetasDias.push(`<details class="dia" id="dia-${i}" data-fecha="${isoDia}"${i === 0 ? ' open' : ''}>
        <summary><span class="dia-num">Día ${/^\d+$/.test(String(num)) ? d2(+num) : e(num)}</span>
          <span class="dia-cab"><span class="dia-fecha">${isoDia ? esc(String(fecha(isoDia, 'dia')).replace(/, \d{4}$/, '')) : ''}</span><span class="hoy">Hoy</span><span class="dia-titulo" style="display:block;">${e(x.titulo || '')}</span></span>
          ${icono('chevron-down', 'flecha')}</summary>
        <div class="dia-cuerpo${f ? ' con-foto' : ''}"><div><p class="dia-texto">${e(x.descripcion || '')}</p>${tags ? `<div class="tags">${tags}</div>` : ''}${enMapa}</div>
          ${f ? `<div class="foto" style="background-image:url('${f}')" role="img" aria-label="${esc(x.titulo || '')}"></div>` : ''}</div>
      </details>`);
    }
    agregar('dias', 'Día a día', 'route', `<div class="titulo-sec"><div><span class="eyebrow">${dias.length} ${dias.length === 1 ? 'día' : 'días'}</span><h2 class="sec" style="margin-top:8px;">Itinerario <span class="c">día a día</span></h2><span class="dash"></span></div>
      ${dias.length > 1 ? '<button type="button" class="boton" id="alternar">Abrir todos</button>' : ''}</div><div class="dias">${tarjetasDias.join('')}</div>`);

    // Vuelos
    const grupoVuelos = (lista, titulo) => {
      const vs = (lista || []).filter(v => !vacio(v.vuelo) || !vacio(v.origen));
      if (!vs.length) return '';
      return `<div class="grupo-vuelos"><h3 class="sub">${titulo}</h3><div class="vuelos">` + vs.map(v => `<div class="papel vuelo">
        <div class="vuelo-cab"><span class="vuelo-cod">${e(v.vuelo)}</span><span>${icono('calendar')} ${esc(fecha(v.fecha, 'coma') || '')}</span></div>
        <div class="ruta"><div><div class="ciudad">${e(v.origen)}</div><div class="hora">Sale ${e(v.sale)}</div></div>${icono('plane')}<div class="fin"><div class="ciudad">${e(v.destino)}</div><div class="hora">Llega ${e(v.llega)}</div></div></div>
      </div>`).join('') + '</div></div>';
    };
    const vuelosHtml = grupoVuelos(d.vuelos, 'Vuelos confirmados') + grupoVuelos(d.vuelos_internos, 'Vuelos internos');
    if (vuelosHtml) agregar('vuelos', 'Vuelos', 'plane', `<span class="eyebrow">Tus vuelos</span><h2 class="sec" style="margin-top:8px;">Vuelos <span class="c">del viaje</span></h2><span class="dash"></span>${vuelosHtml}`);

    // Hoteles
    const hs = (d.hoteles || []).filter(h => !vacio(h.nombre));
    if (hs.length) {
      const tarjetas = [];
      for (const h of hs) {
        const f = await foto(h.foto, 900);
        const mapa = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([h.nombre, h.direccion, h.ciudad].filter(Boolean).join(', '));
        tarjetas.push(`<div class="papel hotel">${f ? `<div class="foto" style="background-image:url('${f}')" role="img" aria-label="${esc(h.nombre)}"></div>` : ''}
          <div class="hotel-in">${vacio(h.ciudad) ? '' : `<span class="ciudad-h">${e(h.ciudad)}</span>`}<h3>${e(h.nombre)}</h3>
            ${vacio(h.direccion) ? '' : `<div class="linea">${icono('map-pin')}<span>${e(h.direccion)}</span></div>`}
            ${vacio(h.telefono) ? '' : `<div class="linea">${icono('phone')}<a href="tel:${esc(String(h.telefono).replace(/[^\d+]/g, ''))}">${e(h.telefono)}</a></div>`}
            <div class="linea">${icono('external-link')}<a href="${esc(mapa)}" target="_blank" rel="noopener">Ver en el mapa</a></div></div></div>`);
      }
      agregar('hoteles', 'Hoteles', 'bed-double', `<span class="eyebrow">Dónde te alojas</span><h2 class="sec" style="margin-top:8px;">Hoteles <span class="c">confirmados</span></h2><span class="dash"></span><div class="hoteles">${tarjetas.join('')}</div>`);
    }

    // Qué incluye
    const lista = (items, check) => (items || []).flatMap(it => (it && typeof it === 'object')
      ? [`<li class="grupo-h">${e(it.grupo)}</li>`, ...(it.items || []).filter(z => !vacio(z)).map(z => `<li>${check ? `<span class="bolita">${icono('check')}</span>` : '<span class="punto"></span>'}<span>${e(z)}</span></li>`)]
      : vacio(it) ? [] : [`<li>${check ? `<span class="bolita">${icono('check')}</span>` : '<span class="punto"></span>'}<span>${e(it)}</span></li>`]).join('');
    const inc = lista(d.incluye, true), noinc = lista(d.no_incluye, false);
    if (inc || noinc) agregar('incluye', 'Qué incluye', 'list-checks', `<span class="eyebrow">Tu plan</span><h2 class="sec" style="margin-top:8px;">Qué <span class="c">incluye</span></h2><span class="dash"></span>
      <div class="dos-col">${inc ? `<div class="papel lista-inc"><h3>El precio incluye</h3><ul>${inc}</ul></div>` : ''}${noinc ? `<div class="papel lista-inc"><h3>El precio no incluye</h3><ul>${noinc}</ul></div>` : ''}</div>`);

    // Antes de viajar: lista marcable
    const temas = (d.recomendaciones || []).filter(r => !vacio(r.tema) && (r.items || []).some(z => !vacio(z)));
    let n = 0;
    const temasHtml = temas.map(r => `<div class="papel tema"><h3>${e(r.tema)}</h3>` + r.items.filter(z => !vacio(z)).map(z => { n++; return `<label><input type="checkbox" id="r${n}"><span>${e(z)}</span></label>`; }).join('') + '</div>').join('');
    if (temasHtml || !vacio(d.nota)) agregar('preparacion', 'Antes de viajar', 'sun', `<span class="eyebrow">Tu lista para el viaje</span><h2 class="sec" style="margin-top:8px;">Antes de <span class="c">viajar</span></h2><span class="dash"></span>
      ${temasHtml ? `<div class="progreso"><div class="barra"><i id="progreso-barra"></i></div><span id="progreso-texto"></span></div><div class="temas">${temasHtml}</div>` : ''}
      ${vacio(d.nota) ? '' : `<div class="nota">${e(d.nota)}</div>`}`);

    // Política general (texto legal fijo, copiado de la plantilla)
    agregar('condiciones', 'Condiciones', 'file-text', `<span class="eyebrow">Condiciones y políticas</span><h2 class="sec" style="margin-top:8px;">Información <span class="c">adicional</span></h2><span class="dash"></span>
      <details class="papel politica"><summary>Política general de Agencia Caminos ${icono('chevron-down', 'flecha')}</summary><div class="politica-in">${POLITICA_HTML}</div></details>`);

    const codigo = String(d.codigo || '').trim();
    const cfg = JSON.stringify({ codigo, inicio: d.fecha_inicio, fin: d.fecha_fin || d.fecha_inicio }).replace(/</g, '\\u003c');
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(String(d.titulo || 'Itinerario').replace(/\s*\n\s*/g, ' '))} · Caminos</title>
<style>${FUENTES}${CSS_INTERACTIVO}</style>
</head>
<body>
<header class="hero${portada ? ' con-foto' : ''}"${portada ? ` style="background-image:url('${portada}')"` : ''}>
  ${portada ? '' : `<img class="estrella" src="${RECURSOS['../assets/brand/estrella-crema.svg']}" alt="">`}
  <div class="hero-top"><div class="envoltura"><img src="${RECURSOS['../assets/logos/caminos-logo-white.svg']}" alt="Caminos"><span class="capsula">Itinerario de viaje</span></div></div>
  <div class="hero-in"><div class="envoltura">
    ${vacio(d.subtitulo) ? '' : `<span class="sub">${e(d.subtitulo)}</span>`}
    <h1>${titulo}</h1>
    <div class="hero-chips"><span class="chip-hero">${icono('calendar')}${esc(rangoHero(d.fecha_inicio, d.fecha_fin || d.fecha_inicio))}</span><span class="chip-hero claro" hidden>${icono('clock')}<span id="cuenta"></span></span></div>
  </div></div>
</header>
<nav class="secciones" aria-label="Secciones del itinerario"><div class="envoltura">${nav.join('')}</div></nav>
<main><div class="envoltura">${secciones.join('\n')}</div></main>
<div class="firma"><span><b>Caminos</b> — Para ir más lejos</span><span>${esc(codigoDocumento(codigo, 'CAM-ITI'))}</span></div>
<footer class="pie-doc">
  <div class="contacto"><a href="https://www.agenciacaminos.com.co" target="_blank" rel="noopener">${icono('globe')}www.agenciacaminos.com.co</a><span>${icono('instagram')}@agenciacaminos</span><span>${icono('facebook')}@Caminos Turismo Religioso</span></div>
  <div class="direccion">${icono('map-pin')}Calle 79 # 16a-20 Oficina 507, Bogotá, Colombia.</div>
  <div class="legal">La explotación y el abuso sexual de menores de edad son sancionados con pena privativa de la libertad,<br>LEY 679 DE 2001 y la LEY 1336 DE 2009</div>
</footer>
${ABRE} type="application/json" id="datos-viaje">${cfg}${CIERRE}
${ABRE}>${JS_INTERACTIVO}${CIERRE}
</body>
</html>`;
  }
