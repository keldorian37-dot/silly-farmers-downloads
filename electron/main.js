// Silly Farmers — Electron desktop client.
//
// Same model as play.py: a single window locked to the ONE server you run and moderate.
// The difference is the engine — Electron bundles Chromium, so WebGL runs at full Chrome
// speed instead of the slow system-WebKit that pywebview uses on macOS.
//
// OPERATOR SETUP: set SERVER_URL below to your permanent server address before shipping a
// build. For your own testing, override it without editing this file:
//     SILLY_FARMERS_SERVER=http://localhost:8123 npm start

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// ┌────────────────────────────────────────────────────────────────────────────┐
// │  SET THIS to the one server everyone connects to (a permanent domain / named │
// │  tunnel). Override per-run with the SILLY_FARMERS_SERVER env var.            │
// └────────────────────────────────────────────────────────────────────────────┘
const SERVER_URL = (process.env.SILLY_FARMERS_SERVER || 'https://silly-farmers.onrender.com/play').trim();

// A friendly "can't reach the farm" screen with a Retry button (mirrors play.py), shown
// if the server is down so players never see a raw Chromium error page.
function offlineHtml(url) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { margin:0; height:100vh; display:flex; align-items:center; justify-content:center;
      font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
      background:linear-gradient(160deg,#bfe3a0,#86c06b 55%,#6aa9d6); color:#3b2f23; }
    .card { width:min(460px,90vw); background:#fffdf6; border:1px solid #e3d6bc; border-radius:18px;
      padding:30px 28px; text-align:center; box-shadow:0 18px 50px rgba(40,30,10,.28); }
    h1 { margin:0 0 6px; font-size:1.4rem; } p { color:#6a5a3e; line-height:1.5; }
    button { margin-top:14px; font:inherit; font-weight:700; cursor:pointer; border:none;
      border-radius:11px; padding:12px 22px; background:#f6cf6b; box-shadow:0 4px 0 #d8a93f; }
    button:hover { background:#f8d985; } .small { font-size:.82rem; color:#a89878; margin-top:10px; }
  </style></head><body><div class="card">
    <h1>🚜 Can't reach the farm</h1>
    <p>The server isn't responding right now. It may be starting up or briefly down —
       give it a moment and try again.</p>
    <button onclick="location.href='${url}'">↻ Try again</button>
    <p class="small">${url}</p>
  </div></body></html>`;
}

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    title: 'Silly Farmers',
    backgroundColor: '#86c06b',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,           // clean app feel; menu still reachable via Alt
    webPreferences: {
      contextIsolation: true,        // it's a normal web app talking WebSocket — no Node access needed
      nodeIntegration: false,
    },
  });

  win.loadURL(SERVER_URL);

  // server unreachable → show the friendly retry screen instead of a raw error
  win.webContents.on('did-fail-load', (_e, code, _desc, _url, isMainFrame) => {
    if (isMainFrame && code !== -3) {  // -3 = aborted (e.g. a redirect); ignore
      const html = offlineHtml(SERVER_URL);
      win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    }
  });

  // open any external link (if the game ever spawns one) in the real browser, not in-app
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);
// localStorage/cookies (login + "Remember me") persist in the app's userData dir by default.

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
