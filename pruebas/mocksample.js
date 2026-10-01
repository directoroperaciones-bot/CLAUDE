(() => {
  const base = window.claude.use;
  window.__prompt = '';
  const sample = { json: async (prompt) => { window.__prompt = prompt; return {
    codigo_reserva: '', titulo_viaje: '', nombre_viajero: 'Laura Pineda', destino: '', estado_pago: 'Abono recibido',
    aereo: [{ aerolinea: 'Avianca', tiquete: '134-2298110457', record: 'HX7LQP', trayectos: [{ vuelo: 'AV 8574', fecha: '2026-05-08', ruta: 'BOG — ADZ', sale: '06:15', llega: '08:25' }] }],
    hoteles: [], traslados: [], servicios_confirmados: [], pagos: [], nota_importante: '' }; } };
  window.claude = { use: async n => n === 'sample' ? sample : base(n) };
})();
