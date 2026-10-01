(() => {
  const base = window.claude.use;
  window.__llamadas = [];
  const sample = Object.assign(async () => ({ text: '' }), {
    limits: async () => window.__sinImagenes ? { maxPromptBytes: 65536 } : ({ maxPromptBytes: 65536, images: { maxCount: 5, maxInputBytes: 20e6, mediaTypes: ['image/jpeg', 'image/png'] } }),
    json: async (prompt, op = {}) => { window.__llamadas.push({ prompt, tier: op.modelTier, imagenes: (op.images || []).map(b => [b.type, b.size]) }); return window.__respuesta || {}; },
  });
  window.claude = { use: async n => n === 'sample' ? sample : base(n) };
})();
