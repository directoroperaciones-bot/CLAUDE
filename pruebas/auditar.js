// Auditoría de saltos de hoja: abre cada documento guardado y mide cada hoja.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [S, pagina, etiqueta] = process.argv.slice(2);
  const dir = S + '/todosdocs/documentos';
  const docs = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => [f.replace('.json', ''), JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'))]);
  const store = new Proxy({ documentos: new Map(docs) }, { get: (t, k) => (t[k] ||= new Map()) });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
  await p.exposeFunction('__dbOp', async (op, a) => { if (op === 'sub') setTimeout(() => p.evaluate(([c, d]) => window.__entregar(c, d), [a, [...store[a]]]).catch(() => {}), 50); });
  await p.goto('file://' + S + '/' + pagina); await p.waitForTimeout(1500);
  fs.mkdirSync(`${S}/audit-${etiqueta}`, { recursive: true });
  const resumen = [];
  for (const [id] of docs) {
    await p.click('[data-ir="documentos"]'); await p.waitForTimeout(300);
    const cod = id.split('__')[1];
    const btn = p.locator('#tabla-todos tr').filter({ has: p.locator('td.cod') }).filter({ hasText: new RegExp('^\\s*' + cod.replace(/-/g, '.') + '\\s', 'i') }).locator('[data-abrir]');
    if (!(await btn.count())) { console.log('no encontrado', id); continue; }
    await btn.first().click();
    await p.waitForFunction(() => !document.querySelector('#paso-3').hidden && /tamaño carta/.test(document.querySelector('#prev-meta').textContent), null, { timeout: 60000 });
    await p.waitForTimeout(600);
    const med = await p.evaluate(() => {
      const fd = document.querySelector('#doc-frame').contentDocument;
      return [...fd.querySelectorAll('section.page')].map(pg => {
        const top = pg.getBoundingClientRect().top;
        const pol = !!pg.querySelector('.pol-cols');
        const pie = pg.querySelector('.footer, .pie, .firma'); 
        const hijos = [...pg.querySelectorAll('*')].filter(x => x.children.length === 0 && x.getBoundingClientRect().height > 0 && !x.closest('.footer') && !x.closest('.banda'));
        const fondo = Math.max(0, ...hijos.map(x => x.getBoundingClientRect().bottom - top).filter(v => v < 1300));
        const piePos = pie ? pie.getBoundingClientRect().top - top : null;
        return { pol, fondo: Math.round(fondo), pie: piePos && Math.round(piePos) };
      });
    });
    const n = med.length;
    const pags = p.frameLocator('#doc-frame').locator('section.page');
    for (let i = 0; i < n; i++) await pags.nth(i).screenshot({ path: `${S}/audit-${etiqueta}/${id}-${i + 1}.png`, scale: 'css' });
    resumen.push({ id, hojas: n, med });
    console.log(id.padEnd(30), n, 'hojas |', med.map((m, i) => `${i + 1}:${m.pol ? 'pol' : m.fondo}`).join(' '));
  }
  fs.writeFileSync(`${S}/audit-${etiqueta}.json`, JSON.stringify(resumen, null, 1));
  await b.close();
})();
