// Simulación mínima de claude.use('db') y claude.use('assets') para probar el banco fuera de claude.ai.
(() => {
  const store = new Map([['destino__san-andres', { alto: 325, ancho: 489, asset: '892d193a68ad8c261f40b38eabe6cf20', ciudad: '', clave: 'destino:san-andres', documento: 'Cotización CA2922', fecha: '2026-09-25', nombre: 'San Andrés', tipo: 'destino' }]]);
  const subs = [];
  const snap = () => ({ docs: [...store].map(([id, v]) => ({ id, exists: true, data: () => v })) });
  const emit = () => subs.forEach(cb => cb(snap()));
  window.__store = store; window.__subidas = [];
  const db = {
    collection: () => ({ onSnapshot: cb => { subs.push(cb); setTimeout(() => cb(snap())); return () => {}; } }),
    doc: path => ({ set: async v => { store.set(path.split('/')[1], v); emit(); }, delete: async () => { store.delete(path.split('/')[1]); emit(); } }),
  };
  const assets = { upload: async (b, o) => { const id = 'a'.repeat(24) + String(window.__subidas.length).padStart(8, '0'); window.__subidas.push([id, b.size, o.type]); return { id, url: '/_blob/' + id }; }, delete: async () => {} };
  window.claude = { use: async n => (n === 'db' ? db : n === 'assets' ? assets : null) };
})();
