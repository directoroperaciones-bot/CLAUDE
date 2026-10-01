(() => {
  const subs = {};
  window.__entregar = (col, docs) => (subs[col] || []).forEach(cb => cb({ docs: docs.map(([id, v]) => ({ id, exists: true, data: () => v })) }));
  const db = { collection: col => ({ onSnapshot: cb => { (subs[col] ||= []).push(cb); window.__dbOp('sub', col); return () => {}; } }), doc: path => ({ set: async v => window.__dbOp('set', path, v), delete: async () => window.__dbOp('del', path) }) };
  window.__llamadas = [];
  const mcp = {
    listTools: async () => ({ servers: [{ name: 'Composio' }], fileArgs: true }),
    callTool: async (srv, tool, input) => {
      const t = input.tools[0], c = t.arguments.content;
      const fallo = (window.__fallos || []).shift();
      const tam = c && c.$file ? c.$file.data.size : (c || '').length;
      window.__llamadas.push({ tool: t.tool_slug, path: t.arguments.path, sha: t.arguments.sha || null, tam, tipo: c && c.$file ? c.$file.type : 'base64' });
      if (c && c.$file) window.__ultimo = await c.$file.data.text(); else window.__ultimo = c;
      if (fallo) throw fallo;
      return { payload: { data: { results: [{ response: { successful: true, data: {} } }] } } };
    },
  };
  const downloads = { save: async () => {} };
  window.claude = { use: async n => (n === 'db' ? db : n === 'mcp' ? mcp : n === 'downloads' ? downloads : null) };
})();
