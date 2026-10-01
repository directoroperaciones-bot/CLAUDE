// Base compartida entre páginas: el almacén vive en Node (window.__dbOp) y Node reparte los cambios.
(() => {
  const subs = {};
  window.__entregar = (col, docs) => (subs[col] || []).forEach(cb => cb({ docs: docs.map(([id, v]) => ({ id, exists: true, data: () => v })) }));
  const db = {
    collection: col => ({ onSnapshot: cb => { (subs[col] ||= []).push(cb); window.__dbOp('sub', col); return () => {}; } }),
    doc: path => ({ set: async v => window.__dbOp('set', path, v), delete: async () => window.__dbOp('del', path) }),
  };
  window.claude = { use: async n => (n === 'db' ? db : null) };
})();
