import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Local development only. Caller owns the actual cleanup and must close the HTTP app/database. */
export async function startShutdownControl(
  controlFile: string,
  shutdown: () => Promise<void>,
  manifestFile = controlFile.replace(/\.control\.json$/, '.process.json'),
): Promise<() => Promise<void>> {
  if (manifestFile === controlFile) throw new Error('Shutdown control needs a process manifest');
  const root = realpathSync(join(dirname(controlFile), '..'));
  const role = controlFile.endsWith('/frontend.control.json') || controlFile.endsWith('\\frontend.control.json') ? 'frontend' : 'backend';
  const marker = join(root, role === 'backend' ? 'apps/backend/src/main.ts' : 'apps/frontend/dev-server.mjs');
  type Manifest = { pid: number; createdUtcTicks: string; root: string; role: string; marker: string; executable: string };
  const matchesManifest = (candidate: Manifest): boolean => candidate.pid === process.pid &&
    candidate.role === role && typeof candidate.createdUtcTicks === 'string' && /^\d{10,20}$/.test(candidate.createdUtcTicks) &&
    candidate.root.toLowerCase() === root.toLowerCase() &&
    candidate.marker.toLowerCase() === marker.toLowerCase() &&
    candidate.executable.toLowerCase() === process.execPath.toLowerCase();
  let identity: Manifest | undefined;
  // Launcher writes the manifest immediately after spawning the process.
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const candidate = JSON.parse(readFileSync(manifestFile, 'utf8').replace(/^\uFEFF/, '')) as Manifest;
      if (matchesManifest(candidate)) { identity = candidate; break; }
    } catch { /* Launcher may not have written the manifest yet. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!identity) throw new Error('Managed shutdown requires a matching per-install process manifest');
  const createdUtcTicks = identity.createdUtcTicks;
  const token = randomBytes(32).toString('hex');
  let stopping = false;
  const server: Server = createServer((request, response) => {
    let validIdentity = false;
    try {
      const current = JSON.parse(readFileSync(manifestFile, 'utf8').replace(/^\uFEFF/, '')) as Manifest;
      validIdentity = matchesManifest(current) && current.createdUtcTicks === createdUtcTicks;
    } catch { /* Fail closed when the manifest is missing or malformed. */ }
    if (!validIdentity || request.method !== 'POST' || request.url !== '/shutdown' || request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(403).end();
      return;
    }
    if (stopping) {
      response.writeHead(409).end();
      return;
    }
    stopping = true;
    response.writeHead(202).end();
    // Wait for the response to flush before closing the caller's servers.
    response.once('finish', () => {
      void shutdown().catch((error: unknown) => {
        console.error('Shutdown failed:', error);
        stopping = false;
      });
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Shutdown control did not bind a loopback TCP port');
  }
  const temporaryFile = `${controlFile}.${process.pid}.tmp`;
  try {
    writeFileSync(temporaryFile, JSON.stringify({ pid: process.pid, createdUtcTicks, root, role, port: address.port, token }), { mode: 0o600, flag: 'wx' });
    renameSync(temporaryFile, controlFile);
  } catch (error) {
    try { unlinkSync(temporaryFile); } catch { /* File may not exist. */ }
    server.close();
    throw error;
  }
  return async () => {
    try { unlinkSync(controlFile); } catch { /* May have been removed. */ }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
}
