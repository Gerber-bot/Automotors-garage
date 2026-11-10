import { it } from 'node:test';
import * as assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

type Reply = { id: number; ok: boolean; error?: string; total?: number; valid?: number };

function peer(dataDir: string) {
  const child = fork(fileURLToPath(new URL('./fixtures/pglite-owner-process.mjs', import.meta.url)), [], {
    execArgv: ['--experimental-strip-types'], stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let next = 0;
  let diagnostics = '';
  const pending = new Map<number, { resolve: (reply: Reply) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  let markReady: () => void;
  const ready = new Promise<void>((resolveReady) => { markReady = resolveReady; });
  const exited = new Promise<void>((resolveExit) => child.once('exit', () => {
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error(`Fixture exited: ${diagnostics}`)); }
    pending.clear();
    resolveExit();
  }));
  child.stdout?.on('data', (data) => { diagnostics = (diagnostics + String(data)).slice(-10000); });
  child.stderr?.on('data', (data) => { diagnostics = (diagnostics + String(data)).slice(-10000); });
  child.on('message', (message) => {
    const reply = message as Reply & { ready?: boolean };
    if (reply.ready) { markReady(); return; }
    const entry = pending.get(reply.id);
    if (entry) { clearTimeout(entry.timer); pending.delete(reply.id); entry.resolve(reply); }
  });
  const command = (action: string) => new Promise<Reply>((resolveReply, reject) => {
    const id = ++next;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Fixture timeout (${action}): ${diagnostics}`)); }, 45000);
    pending.set(id, { resolve: resolveReply, reject, timer });
    child.send({ id, action, dataDir });
  });
  return { child, ready, command, async stop() {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const deadline = setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill(); }, 5000);
    try { await command('exit'); await exited; }
    finally { clearTimeout(deadline); }
  } };
}

it('refuses a directory with an unattended claim instead of guessing that it is stale', async () => {
  const dataDir = resolve('.data', `leftover-claim-${randomUUID()}`);
  const { mkdirSync, writeFileSync, readFileSync, unlinkSync, readdirSync } = await import('node:fs');
  mkdirSync(dataDir, { recursive: true });
  const claim = resolve(dataDir, '.automotors.lock');
  writeFileSync(claim, JSON.stringify({ pid: 999999, token: 'unattended-test-claim' }));
  const { DatabaseFactory } = await import('../src/index.ts');
  await assert.rejects(DatabaseFactory.createInMemoryTestDb(dataDir), /already claimed or requires manual review/);
  assert.equal(readFileSync(claim, 'utf8'), JSON.stringify({ pid: 999999, token: 'unattended-test-claim' }));
  assert.deepEqual(readdirSync(dataDir), ['.automotors.lock']);
  unlinkSync(claim);
  const db = await DatabaseFactory.createInMemoryTestDb(dataDir);
  await db.$client.close();
});

it('excludes independent simultaneous PGlite openers, preserves writes and reopens after close', { timeout: 150000 }, async () => {
  const dataDir = resolve('.data', `process-exclusion-${randomUUID()}`);
  assert.equal(existsSync(dataDir), false, 'Must never reuse an existing directory');
  const peers = [peer(dataDir), peer(dataDir)];
  try {
    await Promise.all(peers.map((p) => p.ready));
    const opened = await Promise.all(peers.map((p) => p.command('open')));
    const winners = opened.flatMap((reply, index) => reply.ok ? [index] : []);
    assert.equal(winners.length, 1, `Expected one owner, got ${JSON.stringify(opened)}`);
    const owner = peers[winners[0]!]!;
    const other = peers[1 - winners[0]!]!;
    assert.match(opened[1 - winners[0]!]!.error || '', /DATA_PROTECTION|lock|active|in use/i);
    assert.equal((await owner.command('write')).ok, true);
    const denied = await other.command('open');
    assert.equal(denied.ok, false, 'Independent peer must remain excluded while the owner is live');
    assert.match(denied.error || '', /DATA_PROTECTION|lock|active|in use/i);
    assert.deepEqual(await owner.command('verify'), { id: 3, ok: true, total: 100, valid: 100 });
    assert.equal((await owner.command('close')).ok, true);
    await owner.stop();
    assert.equal((await other.command('open')).ok, true, 'Clean close must permit independent recovery');
    const persisted = await other.command('verify');
    assert.equal(persisted.total, 100);
    assert.equal(persisted.valid, 100);
    assert.equal((await other.command('close')).ok, true);
    console.log(`Disposable concurrency evidence retained at ${dataDir}`);
  } finally {
    await Promise.allSettled(peers.map((p) => p.stop()));
    // Keep the disposable database as evidence; never delete existing directories.
  }
});
