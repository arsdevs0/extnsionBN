// LAN-only bridge for pairing a phone controller with Guc guy.
const http = require("node:http");
const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const QRCode = require("qrcode");
const { WebSocketServer } = require("ws");

const PORT = process.env.FLIPO_REMOTE_PORT === undefined ? 32189 : Number(process.env.FLIPO_REMOTE_PORT);
const EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/;
const TOKEN_FILE = path.join(__dirname, ".pairing_token");

let pairingToken = "";
try {
  if (fs.existsSync(TOKEN_FILE)) {
    pairingToken = fs.readFileSync(TOKEN_FILE, "utf-8").trim();
  }
} catch {}

let extensionSocket = null;
let latestState = { connected: false, running: false, status: "Ready", progress: 0, queue: [], logs: [] };
const phoneSockets = new Set();

function localAddresses() {
  const found = [];
  for (const [name,list] of Object.entries(os.networkInterfaces())) {
    if (/virtual|vmware|vbox|hyper-v|vEthernet|default switch|wsl|docker|vpn|tailscale|zerotier/i.test(name)) continue;
    for (const item of list || []) {
      if (item.family === "IPv4" && !item.internal && !item.address.startsWith("169.254.")) found.push(item.address);
    }
  }
  return [...new Set(found)];
}

function sendJson(res, status, value, origin = "") {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin" };
  if (EXTENSION_ORIGIN.test(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Allow-Private-Network"] = "true";
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(value));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 256_000) { reject(new Error("Request too large")); req.destroy(); }
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function broadcastState() {
  const payload = JSON.stringify({ type: "state", state: latestState });
  for (const socket of phoneSockets) if (socket.readyState === 1) socket.send(payload);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const origin = String(req.headers.origin || "");
  if (req.method === "OPTIONS") {
    if (!EXTENSION_ORIGIN.test(origin)) return sendJson(res, 403, { error: "Extension origin required." });
    res.writeHead(204, {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Private-Network": "true",
      "Access-Control-Max-Age": "600",
      Vary: "Origin"
    });
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/control") {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob: 'self' http: https:; connect-src ws: wss: http:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
    });
    return fs.createReadStream(path.join(__dirname, "remote-control.html")).pipe(res);
  }
  if (req.method === "GET" && url.pathname === "/health") return sendJson(res, 200, { ok: true, addresses: localAddresses(), bridgeConnected: Boolean(extensionSocket?.readyState === 1), phoneCount: phoneSockets.size });

  if (url.pathname.startsWith("/api/")) {
    if (!EXTENSION_ORIGIN.test(origin)) return sendJson(res, 403, { error: "This endpoint is only available to the paired Guc guy extension." });
    if (req.method === "POST" && url.pathname === "/api/pair") {
      try {
        const body = await readJson(req);
        if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) return sendJson(res, 400, { error: "Invalid pairing token." }, origin);
        pairingToken = body.token;
        try { fs.writeFileSync(TOKEN_FILE, pairingToken, "utf-8"); } catch {}
        const address = localAddresses()[0];
        if (!address) return sendJson(res, 503, { error: "No active Wi-Fi/LAN IPv4 address was found." }, origin);
        const controlUrl = `http://${address}:${server.address().port}/control#${pairingToken}`;
        const qr = await QRCode.toDataURL(controlUrl, { errorCorrectionLevel: "M", margin: 2, width: 280, color: { dark: "#101114", light: "#ffffff" } });
        latestState = { ...latestState, connected: Boolean(extensionSocket?.readyState === 1) };
        return sendJson(res, 200, { ok: true, address, controlUrl: `http://${address}:${server.address().port}/control`, qr }, origin);
      } catch (error) { return sendJson(res, 400, { error: error.message || "Pairing failed." }, origin); }
    }
    if (req.method === "GET" && url.pathname === "/api/state") {
      if (url.searchParams.get("token") !== pairingToken || !pairingToken) return sendJson(res, 403, { error: "Pair the phone again from Guc guy." }, origin);
      return sendJson(res, 200, { ...latestState, connected: Boolean(extensionSocket?.readyState === 1) }, origin);
    }
    return sendJson(res, 404, { error: "Unknown endpoint." }, origin);
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

const sockets = new WebSocketServer({ noServer: true, maxPayload: 128 * 1024 * 1024 });
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const role = url.pathname === "/bridge" ? "bridge" : url.pathname === "/phone" ? "phone" : "";
  const token = url.searchParams.get("token") || "";
  if (!role || !token) return socket.destroy();

  if (role === "bridge") {
    // Chrome extension connects from localhost - accept valid 64-char hex token and adopt it
    if (/^[a-f0-9]{64}$/.test(token)) {
      pairingToken = token;
      try { fs.writeFileSync(TOKEN_FILE, pairingToken, "utf-8"); } catch {}
    } else {
      return socket.destroy();
    }
  } else if (role === "phone") {
    if (!pairingToken) {
      try { pairingToken = fs.readFileSync(TOKEN_FILE, "utf-8").trim(); } catch {}
    }
    if (!pairingToken || token !== pairingToken) {
      console.log(`[Phone Bridge] Rejected phone connection: token mismatch.`);
      return socket.destroy();
    }
  }

  sockets.handleUpgrade(req, socket, head, (ws) => {
    ws.role = role;
    sockets.emit("connection", ws, req);
  });
});

sockets.on("connection", (ws) => {
  if (ws.role === "bridge") {
    if (extensionSocket?.readyState === 1) extensionSocket.close(4001, "Replaced by a newer Guc guy bridge");
    extensionSocket = ws;
    latestState.connected = true;
    console.log("[Phone Bridge] Guc guy Extension connected successfully!");
    broadcastState();
  } else {
    ws.clientId = crypto.randomUUID();
    phoneSockets.add(ws);
    console.log("[Phone Bridge] Phone client connected! (Total phones: " + phoneSockets.size + ")");
    ws.send(JSON.stringify({ type: "state", state: { ...latestState, connected: Boolean(extensionSocket?.readyState === 1) } }));
  }

  ws.on("message", (raw) => {
    let message;
    try { message = JSON.parse(String(raw)); } catch { return; }
    if (ws.role === "bridge") {
      if (message.type === "state" && message.state && typeof message.state === "object") {
        latestState = {
          connected: true,
          running: Boolean(message.state.running),
          status: String(message.state.status || "Ready").slice(0, 200),
          progress: Math.max(0, Math.min(100, Number(message.state.progress) || 0)),
          queue: Array.isArray(message.state.queue) ? message.state.queue.slice(0, 20).map((item) => ({ index: item.index, status: String(item.status || "queued"), error: String(item.error || "").slice(0, 250), hasPreview: Boolean(item.hasPreview) })) : [],
          logs: Array.isArray(message.state.logs) ? message.state.logs.slice(-20).map((item) => ({ text: String(item.text || "").slice(0, 300), time: item.time })) : []
        };
        broadcastState();
      } else if (["result","config","reference","preview","preset"].includes(message.type)) {
        const destination = [...phoneSockets].find((phone) => phone.clientId === message.clientId);
        if (destination?.readyState === 1) destination.send(JSON.stringify(message));
      }
    } else if (ws.role === "phone") {
      const command = String(message.command || message.type || "");
      const allowed = new Set(["state","start","stop","retry","config","save-config","set-reference","remove-reference","get-reference","get-preview","save-preset","load-preset","delete-preset","export-preset","import-preset"]);
      if (!allowed.has(command)) return ws.send(JSON.stringify({ type: "error", error: "That control is not supported." }));
      if (extensionSocket?.readyState !== 1) return ws.send(JSON.stringify({ type: "error", error: "Guc guy is offline. Open Chrome and reconnect the extension." }));
      extensionSocket.send(JSON.stringify({ ...message, type: "command", command, clientId: ws.clientId }));
    }
  });

  ws.on("close", () => {
    if (ws.role === "phone") {
      phoneSockets.delete(ws);
      console.log("[Phone Bridge] Phone client disconnected. (Remaining phones: " + phoneSockets.size + ")");
    }
    if (ws.role === "bridge" && extensionSocket === ws) {
      extensionSocket = null;
      latestState.connected = false;
      console.log("[Phone Bridge] Guc guy Extension disconnected.");
      broadcastState();
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  const addresses = localAddresses();
  const port = server.address().port;
  console.log(`Guc guy phone bridge listening on port ${port}.`);
  console.log(addresses.length ? `Same-Wi-Fi phone URL: http://${addresses[0]}:${port}/control` : "Connect this PC to Wi-Fi to pair a phone.");
  console.log("Local network only. Keep this window/process running while using phone control.");
});
