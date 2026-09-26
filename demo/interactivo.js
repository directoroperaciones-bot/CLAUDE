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
    details.dia > summary { padding:16px 16px; gap:12px; }
    .dia-cuerpo { padding:0 16px 18px; }
    h2.sec { font-size:26px; }
  }
  @media (prefers-reduced-motion:reduce) { *, html { transition:none !important; scroll-behavior:auto !important; } }
  @media print {
    nav.secciones, .boton, .progreso { display:none !important; }
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
    const enlaces = $$('nav.secciones a');
    if ('IntersectionObserver' in window && enlaces.length) {
      const io = new IntersectionObserver(es => es.forEach(en => {
        if (en.isIntersecting) enlaces.forEach(a => a.classList.toggle('activa', a.getAttribute('href') === '#' + en.target.id));
      }), { rootMargin: '-45% 0px -50% 0px' });
      $$('section.bloque').forEach(s => io.observe(s));
    }
  })();`;

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
      tarjetasDias.push(`<details class="dia" data-fecha="${isoDia}"${i === 0 ? ' open' : ''}>
        <summary><span class="dia-num">Día ${/^\d+$/.test(String(num)) ? d2(+num) : e(num)}</span>
          <span class="dia-cab"><span class="dia-fecha">${isoDia ? esc(String(fecha(isoDia, 'dia')).replace(/, \d{4}$/, '')) : ''}</span><span class="hoy">Hoy</span><span class="dia-titulo" style="display:block;">${e(x.titulo || '')}</span></span>
          ${icono('chevron-down', 'flecha')}</summary>
        <div class="dia-cuerpo${f ? ' con-foto' : ''}"><div><p class="dia-texto">${e(x.descripcion || '')}</p>${tags ? `<div class="tags">${tags}</div>` : ''}</div>
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
