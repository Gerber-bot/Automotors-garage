import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { startShutdownControl } from '../../apps/backend/src/infrastructure/process/shutdown-control.ts';

const root = mkdtempSync(join(tmpdir(), 'automotors-shutdown-'));
mkdirSync(join(root, '.run'));
const file = join(root, '.run/backend.control.json');
const manifestFile = join(root, '.run/backend.process.json');
const manifest = {
  pid: process.pid, createdUtcTicks: '638665000000000000', root, role: 'backend',
  marker: join(root, 'apps/backend/src/main.ts'), executable: process.execPath,
};
writeFileSync(manifestFile, JSON.stringify(manifest));
let invoked = false;
let dispose;
try {
  dispose = await startShutdownControl(file, async () => { invoked = true; });
  const { pid, port, token, createdUtcTicks } = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(pid, process.pid);
  assert.equal(createdUtcTicks, manifest.createdUtcTicks);
  const url = `http://127.0.0.1:${port}/shutdown`;
  assert.equal((await fetch(url, { method: 'POST', headers: { authorization: 'Bearer wrong' } })).status, 403);
  assert.equal(invoked, false);
  writeFileSync(manifestFile, JSON.stringify({ ...manifest, createdUtcTicks: '638665000000000001' }));
  assert.equal((await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}` } })).status, 403);
  assert.equal(invoked, false);
  writeFileSync(manifestFile, JSON.stringify(manifest));
  assert.equal((await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}` } })).status, 202);
  await delay(50);
  assert.equal(invoked, true);
  console.log('PASS: authenticated loopback shutdown');
} finally {
  await dispose?.();
  rmSync(root, { recursive: true, force: true });
}
