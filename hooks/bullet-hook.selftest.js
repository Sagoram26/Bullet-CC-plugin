#!/usr/bin/env node
// Self-test for bullet-hook.js. Runs the hook as a child process against a
// temporary CLAUDE_CONFIG_DIR and temporary TMPDIR. Never touches ~/.claude.
// Usage: node hooks/bullet-hook.selftest.js

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.join(__dirname, 'bullet-hook.js');
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'bullet-selftest-'));
const CFG = path.join(ROOT, 'config');
const TMP = path.join(ROOT, 'tmp');
fs.mkdirSync(CFG, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });
const STATE = path.join(CFG, '.bullet');

let passed = 0;
const failures = [];

function run(event, payload, cfgDir = CFG) {
  const r = spawnSync(process.execPath, [HOOK, event], {
    input: JSON.stringify(payload),
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfgDir, TMPDIR: TMP, TEMP: TMP, TMP: TMP },
    encoding: 'utf8',
    timeout: 15000,
  });
  return r;
}

// Returns additionalContext string, or null when the hook printed nothing.
function ctx(r) {
  if (!r.stdout) return null;
  const j = JSON.parse(r.stdout);
  return j.hookSpecificOutput.additionalContext;
}

function prompt(sid, text) {
  return ctx(run('prompt', { session_id: sid, prompt: text }));
}

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('ok   ' + name);
  } catch (e) {
    failures.push(name + ': ' + e.message);
    console.log('FAIL ' + name + ' -> ' + e.message);
  }
}

function resetState() {
  fs.rmSync(STATE, { recursive: true, force: true });
}

// ---- command parsing ----

test('/bullet ultra sets level and prints full rules', () => {
  resetState();
  const c = prompt('s1', '/bullet ultra');
  assert.ok(c && c.startsWith('BULLET MODE ACTIVE (ultra).'), 'got: ' + c);
  assert.ok(c.includes('bullet:surgical-patch'), 'routing missing');
});

test('/bullet:bullet ultra is accepted', () => {
  resetState();
  const c = prompt('s1', '/bullet:bullet ultra');
  assert.ok(c && c.includes('(ultra)'), 'got: ' + c);
});

test('/bullet off turns session off and clears default', () => {
  resetState();
  prompt('s1', '/bullet ultra');
  const c = prompt('s1', '/bullet off');
  assert.ok(c && c.startsWith('Bullet mode off.'), 'got: ' + c);
  assert.ok(!fs.existsSync(path.join(STATE, 'default.json')), 'default not cleared');
  assert.strictEqual(prompt('s1', 'hello'), null, 'still injecting after off');
});

test('/bullet status reports level without change', () => {
  resetState();
  prompt('s1', '/bullet lite');
  const c = prompt('s1', '/bullet status');
  assert.ok(c && c.includes('Bullet mode: lite'), 'got: ' + c);
  assert.ok(prompt('s1', 'x').includes('(lite)'), 'status changed mode');
});

test('exact "stop bullet" stops, but "normal mode" inside a sentence does not', () => {
  resetState();
  prompt('s1', '/bullet full');
  assert.ok(prompt('s1', 'what is normal mode in React?').includes('(full)'), 'sentence stopped bullet');
  const c = prompt('s1', 'stop bullet');
  assert.ok(c && c.startsWith('Bullet mode off.'), 'got: ' + c);
});

// ---- isolation and defaults ----

test('two sessions keep separate levels', () => {
  resetState();
  prompt('s1', '/bullet ultra');
  prompt('s2', '/bullet lite');
  assert.ok(prompt('s1', 'x').includes('(ultra)'), 's1 changed');
  assert.ok(prompt('s2', 'x').includes('(lite)'), 's2 changed');
});

test('new session inherits default; existing session keeps its level', () => {
  resetState();
  prompt('s1', '/bullet ultra');
  const start2 = ctx(run('session', { session_id: 's2', source: 'startup' }));
  assert.ok(start2 && start2.includes('(ultra)'), 'new session did not inherit: ' + start2);
  prompt('s2', '/bullet lite');
  const compact1 = ctx(run('session', { session_id: 's1', source: 'compact' }));
  assert.ok(compact1 && compact1.includes('(ultra)'), 'compact overwrote s1: ' + compact1);
});

test('invalid session id does not write outside state dir', () => {
  resetState();
  run('prompt', { session_id: '../evil', prompt: '/bullet ultra' });
  assert.ok(!fs.existsSync(path.join(CFG, 'evil.json')), 'wrote outside state dir');
  assert.ok(!fs.existsSync(path.join(STATE, 'session-..')), 'traversal file created');
  assert.ok(fs.existsSync(path.join(STATE, 'default.json')), 'default not written on fallback');
});

// ---- per-turn behaviour ----

test('reminder on normal turns, full rules on the 8th', () => {
  resetState();
  prompt('s1', '/bullet ultra');
  for (let i = 1; i <= 7; i++) {
    const c = prompt('s1', 'turn ' + i);
    assert.ok(c.length < 300, 'reminder too long: ' + c.length);
    assert.ok(!c.includes('bullet:surgical-patch'), 'full block too early at ' + i);
  }
  const c8 = prompt('s1', 'turn 8');
  assert.ok(c8.includes('bullet:surgical-patch'), '8th turn did not refresh');
});

test('full block stays under 3000 characters', () => {
  resetState();
  const c = prompt('s1', '/bullet full');
  assert.ok(c.length < 3000, 'full block is ' + c.length + ' chars');
});

// ---- subagents ----

test('subagent gets rules; bullet agents do not', () => {
  resetState();
  prompt('s1', '/bullet full');
  assert.strictEqual(ctx(run('subagent', { session_id: 's1', agent_type: 'bullet:investigator' })), null);
  assert.strictEqual(ctx(run('subagent', { session_id: 's1', agent_type: 'bullet-reviewer' })), null);
  const c = ctx(run('subagent', { session_id: 's1', agent_type: 'general-purpose' }));
  assert.ok(c && c.includes('(full)'), 'general subagent missing rules');
});

// ---- resilience ----

test('write failure exits 0 with no stack trace', () => {
  const badCfg = path.join(ROOT, 'not-a-dir');
  fs.writeFileSync(badCfg, 'file, not dir');
  const r = run('prompt', { session_id: 's1', prompt: '/bullet ultra' }, badCfg);
  assert.strictEqual(r.status, 0, 'exit ' + r.status + ' stderr: ' + r.stderr);
  assert.ok(!/at .*\.js:\d+/.test(r.stderr || ''), 'stack trace on stderr');
});

test('empty stdin does not crash', () => {
  const r = spawnSync(process.execPath, [HOOK, 'prompt'], {
    input: '', env: { ...process.env, CLAUDE_CONFIG_DIR: CFG }, encoding: 'utf8', timeout: 15000,
  });
  assert.strictEqual(r.status, 0);
});

// ---- purge ----

test('SessionStart purges session files older than 30 days', () => {
  resetState();
  prompt('old', '/bullet full');
  const p = path.join(STATE, 'session-old.json');
  const past = (Date.now() - 40 * 86400000) / 1000;
  fs.utimesSync(p, past, past);
  run('session', { session_id: 'fresh', source: 'startup' });
  assert.ok(!fs.existsSync(p), 'old session not purged');
});

// ---- snapshot ----

test('SessionEnd snapshot masks secrets and holds no summary', () => {
  resetState();
  prompt('s1', '/bullet full');
  const transcript = path.join(ROOT, 'transcript.jsonl');
  const lines = [
    { type: 'user', message: { role: 'user', content: 'deploy with sk-abcdefghijklmnop1234567890 please' } },
    { type: 'assistant', message: { role: 'assistant', content: 'ok' } },
    { type: 'user', message: { role: 'user', content: 'password=hunter2hunter2' } },
    { type: 'user', origin: { kind: 'task-notification' }, message: { role: 'user', content: 'MACHINE-MSG-SHOULD-BE-EXCLUDED' } },
    { type: 'user', message: { role: 'user', content: '<task-notification>UNTAGGED-MACHINE</task-notification>' } },
  ];
  fs.writeFileSync(transcript, lines.map((l) => JSON.stringify(l)).join('\n'));
  run('end', { session_id: 's1', transcript_path: transcript, cwd: ROOT });
  const snap = path.join(TMP, 'bullet-snapshot-s1.md');
  assert.ok(fs.existsSync(snap), 'no snapshot written');
  const text = fs.readFileSync(snap, 'utf8');
  assert.ok(!text.includes('abcdefghijklmnop1234567890'), 'api key leaked');
  assert.ok(!text.includes('hunter2hunter2'), 'password leaked');
  assert.ok(text.includes('[redacted]'), 'nothing redacted');
  assert.ok(!text.includes('MACHINE-MSG-SHOULD-BE-EXCLUDED'), 'non-human origin included');
  assert.ok(!text.includes('UNTAGGED-MACHINE'), 'tagged machine message included');
});

test('SessionEnd writes nothing when bullet is off', () => {
  resetState();
  const transcript = path.join(ROOT, 'empty.jsonl');
  fs.writeFileSync(transcript, '');
  run('end', { session_id: 's9', transcript_path: transcript, cwd: ROOT });
  assert.ok(!fs.existsSync(path.join(TMP, 'bullet-snapshot-s9.md')), 'snapshot written while off');
});

// ---- stats ----

test('bullet-stats counts usage once per message and bullet injections only', () => {
  const { measure } = require('./bullet-stats.js');
  const lines = [
    { type: 'assistant', message: { id: 'm1', usage: { input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 5 } } },
    { type: 'assistant', message: { id: 'm1', usage: { input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 5 } } },
    { type: 'assistant', message: { id: 'm2', usage: { input_tokens: 4, cache_creation_input_tokens: 0, cache_read_input_tokens: 2000, output_tokens: 7 } } },
    { type: 'attachment', attachment: { type: 'hook_success', content: 'BULLET MODE ACTIVE (ultra). Apply bullet ultra rules.' } },
    { type: 'attachment', attachment: { type: 'hook_success', content: 'BULLET MODE ACTIVE (full). ' + 'x'.repeat(400) } },
    { type: 'attachment', attachment: { type: 'hook_additional_context', content: ['BULLET MODE ACTIVE (ultra). Apply bullet ultra rules.'] } },
    { type: 'attachment', attachment: { type: 'hook_success', content: 'CAVEMAN MODE ACTIVE — not ours' } },
  ].map((l) => JSON.stringify(l)).join('\n');
  const r = measure(lines);
  assert.strictEqual(r.usage.turns, 2, 'usage not deduplicated');
  assert.strictEqual(r.usage.input, 14);
  assert.strictEqual(r.usage.cacheRead, 3000);
  assert.strictEqual(r.usage.output, 12);
  assert.strictEqual(r.inj.count, 3, 'injection count wrong');
  assert.strictEqual(r.inj.full, 1);
  assert.strictEqual(r.inj.reminder, 2);
  // Injections sit after m1 (before m2 in file order): both injections are re-read by turn m2 only.
  // Order in fixture: m1, m1 (dup), m2, inj, inj, caveman, inj. After m2: 3 injections, each re-read 0 turns after.
  // Expected re-read: 0 (no turn follows the injections).
  assert.strictEqual(r.rereadTokens, 0, 'reread counted without later turns');
});

// ---- done ----

fs.rmSync(ROOT, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
