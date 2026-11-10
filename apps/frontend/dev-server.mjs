import { createServer } from 'node:http';
import { parse } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import next from 'next';
import { startShutdownControl } from '../backend/src/infrastructure/process/shutdown-control.ts';

const dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(dir, '../..');
const hostname = process.env.HOST || '127.0.0.1';
const port = Number(process.env.FRONTEND_PORT || 3000);
if (process.env.NODE_ENV === 'production' || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Managed frontend requires development mode and a valid port');
}

// Pass the server to Next so its dev request handler installs the WebSocket HMR upgrade handler.
const upgradedSockets = new Set();
let handle;
const server = createServer((request, response) => {
  Promise.resolve(handle(request, response, parse(request.url, true))).catch((error) => {
    console.error('Frontend request failed:', error);
    if (!response.headersSent) response.writeHead(500);
    response.end();
  });
});
server.on('upgrade', (_request, socket) => {
  upgradedSockets.add(socket);
  socket.once('close', () => upgradedSockets.delete(socket));
});

const app = next({ dev: true, dir, hostname, port, httpServer: server });
const managed = process.env.AUTOMOTORS_MANAGED_START === 'true';
let disposeControl;
let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  // Stop accepting new requests; send a WebSocket close frame to HMR clients.
  const closing = new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  for (const socket of upgradedSockets) socket.end(Buffer.from([0x88, 0x00]));
  // An HMR peer may never acknowledge the close frame. Bound only our own
  // upgraded sockets; HTTP server.close() does not retire them automatically.
  const upgradeDeadline = setTimeout(() => {
    for (const socket of upgradedSockets) socket.destroy();
  }, 2000);
  upgradeDeadline.unref();
  try {
    await closing;
    await app.close();
  } finally { clearTimeout(upgradeDeadline); }
  await disposeControl?.();
  // Next's development watchers may keep the event loop alive after close().
  process.exit(0);
};

process.on('SIGINT', () => { void shutdown().catch((error) => console.error('Frontend shutdown failed:', error)); });
process.on('SIGTERM', () => { void shutdown().catch((error) => console.error('Frontend shutdown failed:', error)); });

try {
  await app.prepare();
  handle = app.getRequestHandler();
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(port, hostname, resolveListen);
  });
  if (managed) {
    disposeControl = await startShutdownControl(join(root, '.run/frontend.control.json'), shutdown);
  } else {
    console.log('Managed shutdown control disabled: launch through the Windows controller for verified stop.');
  }
  console.log(`Managed frontend listening on http://${hostname}:${port}`);
} catch (error) {
  console.error('Managed frontend startup failed:', error);
  if (server.listening) await new Promise((resolveClose) => server.close(resolveClose));
  await app.close();
  process.exit(1);
}
