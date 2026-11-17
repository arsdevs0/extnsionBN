const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const { once } = require("node:events");
const WebSocket = require("ws");

const origin = `chrome-extension://${"a".repeat(32)}`;
const background=fs.readFileSync(path.join(__dirname,"background.js"),"utf8");
assert.match(background,/logs:STATE\.logs\.filter\(\(entry\)=>!\/\^Prompt \\d\+:/,"mobile status redacts prompt-preview log entries");
async function waitForPort(child) {
  let output = "";
  let timeoutId;
  return Promise.race([
    new Promise((resolve, reject) => {
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
        const match = output.match(/listening on port (\d+)/i);
        if (match) { clearTimeout(timeoutId); resolve(Number(match[1])); }
      });
      child.once("error", reject);
      child.once("exit", (code) => reject(new Error(`Remote bridge exited (${code}): ${output}`)));
    }),
    new Promise((_, reject) => { timeoutId=setTimeout(() => reject(new Error("Timed out waiting for local remote bridge")),5000); })
  ]);
}

(async () => {
  const child = spawn(process.execPath, [path.join(__dirname, "server.js")], {
    cwd: __dirname,
    env: { ...process.env, FLIPO_REMOTE_PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  let bridge;
  let phone;
  try {
    const port = await waitForPort(child);
    const base = `http://127.0.0.1:${port}`;
    const health = await fetch(`${base}/health`).then((response) => response.json());
    assert.equal(health.ok, true);

    const denied = await fetch(`${base}/api/pair`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: "f".repeat(64) }) });
    assert.equal(denied.status, 403, "pairing endpoint rejects non-extension origins");

    const token = require("node:crypto").randomBytes(32).toString("hex");
    const pairedResponse = await fetch(`${base}/api/pair`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const paired = await pairedResponse.json();
    assert.equal(pairedResponse.status, 200);
    assert.match(paired.qr, /^data:image\/png;base64,/);
    assert.match(paired.controlUrl, new RegExp(`^http:\\/\\/\\d{1,3}(?:\\.\\d{1,3}){3}:${port}\\/control$`));
    const page = await fetch(paired.controlUrl).then((response) => response.text());
    assert.match(page, /Start generation/);
    assert.match(page, /Full prompt settings/);
    assert.match(page, /Reference images/);
    assert.match(page, /Upload preset JSON/);
    assert.match(page, /Includes prompts, workflow, generation settings/);
    assert.match(page, /function uid\(\)/,"the plain-HTTP phone page must not require secure-context randomUUID support");
    assert.match(background,/fullSettings:\{mode:s\.bb_creation_mode/);
    assert.doesNotMatch(page, new RegExp(token), "the bearer token remains in the QR fragment, not the HTML response");

    bridge = new WebSocket(`ws://127.0.0.1:${port}/bridge?token=${token}`);
    await once(bridge, "open");
    phone = new WebSocket(`ws://127.0.0.1:${port}/phone?token=${token}`);
    await once(phone, "open");
    const firstState = await once(phone, "message");
    assert.equal(JSON.parse(String(firstState[0])).type, "state");

    const settingsRequest=once(bridge,"message");
    phone.send(JSON.stringify({command:"save-config",requestId:"cfg-1",config:{mode:"subject-flow",targetPrompt:"An ordinary home snapshot"}}));
    const routedSettings=JSON.parse(String((await settingsRequest)[0]));
    assert.equal(routedSettings.command,"save-config");
    assert.equal(routedSettings.requestId,"cfg-1");
    assert.equal(typeof routedSettings.clientId,"string");
    const settingsResponse=once(phone,"message");
    bridge.send(JSON.stringify({type:"config",clientId:routedSettings.clientId,requestId:"cfg-1",config:{mode:"subject-flow",targetPrompt:"An ordinary home snapshot"}}));
    assert.equal(JSON.parse(String((await settingsResponse)[0])).config.mode,"subject-flow");

    const commandPromise = once(bridge, "message");
    phone.send(JSON.stringify({ type: "start" }));
    const command = JSON.parse(String((await commandPromise)[0]));
    assert.equal(command.type,"command");
    assert.equal(command.command,"start");
    assert.equal(command.index,undefined);
    assert.equal(typeof command.clientId,"string");

    const updatePromise = once(phone, "message");
    bridge.send(JSON.stringify({ type: "state", state: { running: true, status: "Working", progress: 27, queue: [{ index: 1, status: "generating", description:"private prompt text" }], logs: [] } }));
    const update = JSON.parse(String((await updatePromise)[0]));
    assert.equal(update.state.progress, 27);
    assert.equal(update.state.queue[0].status, "generating");
    assert.equal(update.state.queue[0].description,undefined,"the server never forwards prompt previews");
    console.log("PASS: LAN pairing QR, origin-gated pairing, bearer-token WebSockets, mobile command relay and status updates");
  } finally {
    bridge?.close();
    phone?.close();
    child.kill();
    if (stderr) process.stderr.write(stderr);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
