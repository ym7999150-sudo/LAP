/**
 * LabVerse 3D desktop shell.
 * Starts the bundled Next.js standalone server on a free localhost port using an embedded
 * PGlite database stored in the user's data folder, then opens it in a window. Works offline.
 */
const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const http = require("node:http");

let server = null;
let win = null;

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

function waitForServer(url, timeoutMs = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - started > timeoutMs) reject(new Error("server did not start"));
          else setTimeout(tick, 300);
        });
    };
    tick();
  });
}

function sessionSecret(dataDir) {
  const file = path.join(dataDir, "session-secret");
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    const s = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(file, s, { mode: 0o600 });
    return s;
  }
}

async function start() {
  const serverDir = app.isPackaged ? path.join(process.resourcesPath, "server") : path.join(__dirname, "..", ".next", "standalone");
  const dataDir = path.join(app.getPath("userData"), "labverse-data");
  fs.mkdirSync(dataDir, { recursive: true });
  const port = await freePort();

  server = spawn(process.execPath, [path.join(serverDir, "server.js")], {
    cwd: serverDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "localhost",
      LABVERSE_DESKTOP: "1",
      LABVERSE_ALLOW_PGLITE: "1",
      PGLITE_DIR: path.join(dataDir, "db"),
      LABVERSE_MIGRATIONS_DIR: path.join(serverDir, "drizzle"),
      SESSION_SECRET: sessionSecret(dataDir),
      DATABASE_URL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const log = fs.createWriteStream(path.join(dataDir, "server.log"), { flags: "a" });
  server.stdout.pipe(log);
  server.stderr.pipe(log);
  server.on("exit", (code) => {
    if (code && !app.isQuitting) dialog.showErrorBox("LabVerse 3D", `The local server stopped (code ${code}). See ${path.join(dataDir, "server.log")}`);
  });

  const url = `http://localhost:${port}`;
  await waitForServer(`${url}/api/health`);

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0a0d11",
    title: "LabVerse 3D",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  // Links to external sites (credits, PubChem) open in the system browser.
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (!target.startsWith(url)) shell.openExternal(target);
    return { action: "deny" };
  });
  await win.loadURL(url);
}

app.whenReady().then(() =>
  start().catch((e) => {
    dialog.showErrorBox("LabVerse 3D", String(e && e.message ? e.message : e));
    app.quit();
  }),
);

app.on("before-quit", () => {
  app.isQuitting = true;
  if (server && !server.killed) server.kill();
});
app.on("window-all-closed", () => app.quit());
