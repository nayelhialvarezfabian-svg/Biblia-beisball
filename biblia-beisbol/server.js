/* ============================================================
   server.js — Servidor del Concurso Bíblico de Béisbol
   Sirve los archivos de la app y mantiene sincronizados en
   tiempo real a todos los dispositivos conectados (Pantalla
   Pública, Juez, Administrador) en la misma red, usando:

     - Server-Sent Events (SSE)  → servidor envía cambios a todos
     - HTTP POST                → cada dispositivo envía sus cambios

   Sin dependencias externas: solo módulos nativos de Node.js.
   Ejecutar con:  node server.js
   ============================================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const STATE_FILE = path.join(DATA_DIR, "server-state.json");
const PORT = process.env.PORT || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml"
};

/* ---------- estado en memoria + respaldo en disco ---------- */
let serverState = loadState();
let serverRev = (serverState && serverState.meta && serverState.meta.serverRev) || 0;
const sseClients = new Set();

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch (e) { console.error("No se pudo leer el respaldo de estado:", e.message); }
  return null;
}

function persistState() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(serverState));
  } catch (e) { console.error("No se pudo guardar el respaldo de estado:", e.message); }
}

function broadcast() {
  const payload = `event: state\ndata: ${JSON.stringify(serverState)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch (e) { /* el cliente se desconectó */ }
  }
}

/* ---------- servidor HTTP ---------- */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  // --- API: Server-Sent Events (canal de sincronización en vivo) ---
  if (pathname === "/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    res.write("retry: 2000\n\n");
    res.write(`event: state\ndata: ${serverState ? JSON.stringify(serverState) : "null"}\n\n`);
    sseClients.add(res);

    const heartbeat = setInterval(() => {
      try { res.write(": ping\n\n"); } catch (e) { /* ignorar */ }
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
    return;
  }

  // --- API: recibir un nuevo estado desde cualquier dispositivo ---
  if (pathname === "/api/state" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; if (body.length > 8_000_000) req.destroy(); });
    req.on("end", () => {
      try {
        const incoming = JSON.parse(body);
        serverRev += 1;
        incoming.meta = incoming.meta || {};
        incoming.meta.serverRev = serverRev;
        serverState = incoming;
        persistState();
        broadcast();
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(serverState));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "JSON inválido" }));
      }
    });
    return;
  }

  // --- API: estado actual (consulta simple, sin SSE) ---
  if (pathname === "/api/state" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(serverState));
    return;
  }

  // --- archivos estáticos (html, css, js) ---
  let filePath = pathname === "/" ? "/index.html" : pathname;
  filePath = path.normalize(path.join(ROOT, filePath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("Prohibido"); return; }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 — Archivo no encontrado: " + pathname);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  const ips = [];
  const ifaces = os.networkInterfaces();
  Object.values(ifaces).forEach((list) => {
    (list || []).forEach((iface) => {
      if (iface.family === "IPv4" && !iface.internal) ips.push(iface.address);
    });
  });

  console.log("\n=== Concurso Bíblico de Béisbol — Servidor iniciado ===\n");
  console.log(`En esta misma computadora:  http://localhost:${PORT}/index.html\n`);
  if (ips.length) {
    console.log("Desde OTROS dispositivos en la MISMA RED WIFI, abre:");
    ips.forEach((ip) => console.log(`  → http://${ip}:${PORT}/index.html`));
  } else {
    console.log("No se detectó una red WiFi/Ethernet activa. Conecta este equipo a la red");
    console.log("del evento y reinicia el servidor para ver la dirección a compartir.");
  }
  console.log("\nDeja esta ventana abierta mientras dure el evento.");
  console.log("Para detener el servidor: Ctrl + C\n");
});
