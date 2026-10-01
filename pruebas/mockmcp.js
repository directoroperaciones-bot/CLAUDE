(() => {
  const base = window.claude.use;
  window.__llamadas = [];
  const mcp = {
    listTools: async () => ({ servers: [{ server: 'Composio', authStatus: 'connected', tools: [] }], fileArgs: true }),
    callTool: async (server, tool, input) => {
      const c = input.tools[0].arguments.content;
      const texto = c.$file ? await c.$file.data.text() : atob(c);
      window.__llamadas.push({ server, tool, slug: input.tools[0].tool_slug, path: input.tools[0].arguments.path, largo: texto.length,
        pasajero: texto.includes('PasajeroDePrueba'), sw: texto.includes('serviceWorker') });
      return { content: [], payload: { data: { results: [{ response: { successful: true, data: {} } }] }, successful: true } };
    },
  };
  window.claude = { use: async n => n === 'mcp' ? mcp : n === 'downloads' ? { save: async () => {} } : base(n) };
})();
