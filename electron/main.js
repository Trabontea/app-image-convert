/**
 * Electron entry point: runs the existing Express app inside the desktop app.
 * The server listens on a random free port on 127.0.0.1 (never exposed to the network),
 * and a BrowserWindow loads the same UI the browser version uses from public/.
 */
import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import expressApp from '../src/app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('node:http').Server | undefined} */
let server;
/** @type {BrowserWindow | undefined} */
let win;

/**
 * Starts the Express app on a random free localhost port.
 * @returns {Promise<number>} The port it is listening on.
 */
function startServer() {
  return new Promise((resolve, reject) => {
    server = expressApp.listen(0, '127.0.0.1', () => resolve(server.address().port));
    server.on('error', reject);
  });
}

/**
 * Opens the main window pointed at the local server.
 * @param {number} port
 */
function createWindow(port) {
  win = new BrowserWindow({
    width: 900,
    height: 820,
    minWidth: 480,
    minHeight: 500,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'apple-touch-icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  // Links that would open a new window go to the system browser instead.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Surface page problems in the terminal, since a broken window otherwise just looks blank.
  win.webContents.on('did-fail-load', (_e, code, desc, url) =>
    console.error(`Failed to load ${url}: ${desc} (${code})`));
  win.webContents.on('render-process-gone', (_e, details) =>
    console.error('Renderer process gone:', details.reason));
  win.webContents.on('console-message', (e) => {
    if (e.level === 'error' || e.level === 'warning') console.error(`[page] ${e.message}`);
  });

  win.loadURL(`http://127.0.0.1:${port}`).catch((err) => console.error(err.message));
}

// Log crashing helper processes (GPU, utility) so problems show up in the terminal.
app.on('child-process-gone', (_e, details) =>
  console.error(`Child process gone: ${details.type} (${details.reason}, exit ${details.exitCode})`));

// Only one copy of the app at a time; a second launch focuses the existing window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(async () => {
    const port = await startServer();
    console.log(`Image → WebP desktop server on http://127.0.0.1:${port}`);
    createWindow(port);
  });

  app.on('window-all-closed', () => {
    server?.close();
    app.quit();
  });
}
