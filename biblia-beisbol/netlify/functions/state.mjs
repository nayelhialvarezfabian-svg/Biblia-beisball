// netlify/functions/state.mjs
//
// Reemplazo de server.js para hosting estático tipo Netlify.
// Netlify no puede mantener un proceso encendido ni una conexión
// abierta (SSE) de forma indefinida en el plan gratuito, así que
// este endpoint responde a consultas puntuales (GET para leer,
// POST para escribir) y el navegador hace "sondeo" cada 1.5s
// (ver js/state.js -> _startPolling()) en vez de recibir empujes
// en vivo. El contrato (forma de los datos) es idéntico al de
// server.js, así que el resto de la app no necesita saber cuál
// de los dos está usando.
//
// Guarda el estado en Netlify Blobs (incluido gratis, sin
// configuración adicional, ver js/vendor o el README).

import { getStore } from "@netlify/blobs";

const STORE_NAME = "bbq-game";
const KEY = "current";

export default async (req) => {
  const store = getStore(STORE_NAME);

  if (req.method === "GET") {
    const data = await store.get(KEY, { type: "json" });
    return Response.json(data ?? null);
  }

  if (req.method === "POST") {
    let incoming;
    try {
      incoming = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const previous = await store.get(KEY, { type: "json" });
    const previousRev = (previous && previous.meta && previous.meta.serverRev) || 0;

    incoming.meta = incoming.meta || {};
    incoming.meta.serverRev = previousRev + 1;

    await store.setJSON(KEY, incoming);
    return Response.json(incoming);
  }

  return new Response("Método no permitido", { status: 405 });
};

export const config = {
  path: "/api/state"
};
