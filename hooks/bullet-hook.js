#!/usr/bin/env node
// bullet — one hook script for four events. Usage:
//   node bullet-hook.js session   SessionStart    (copy default level into new sessions)
//   node bullet-hook.js prompt    UserPromptSubmit (commands + per-turn reminder)
//   node bullet-hook.js subagent  SubagentStart   (inject level into non-bullet agents)
//   node bullet-hook.js end       SessionEnd      (factual snapshot in OS temp dir)
//
// State (under CLAUDE_CONFIG_DIR or ~/.claude):
//   .bullet/default.json          { mode }          default level for new sessions
//   .bullet/session-<id>.json     { mode, turns }   per session; mode "off" allowed
// Rules are read from ../skills/bullet/SKILL.md (sections Common, Level, Routing).
// Every path ends with exit 0 and never throws to the host.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

// Tunable: full rules are re-sent every N user prompts.
const REFRESH_EVERY = 8;
// Tunable: session state files older than this are purged at SessionStart.
const PURGE_AFTER_DAYS = 30;
// Tunable: how long to wait for stdin before giving up (Windows stdin can stall, see ponytail #443).
const STDIN_WAIT_MS = 1000;

const LEVELS = ['lite', 'full', 'ultra'];
const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const STATE_DIR = path.join(CONFIG_DIR, '.bullet');
const DEFAULT_PATH = path.join(STATE_DIR, 'default.json');
const SKILL_PATH = path.join(__dirname, '..', 'skills', 'bullet', 'SKILL.md');

const FALLBACK_RULES =
  'Bullet: answer first, fragments, Next: line, fix root cause, delete before add. ' +
  'Never cut code, commands, paths, errors, negations. Reply in the user language.';

// ---------- rules, read from SKILL.md ----------

function sectionBody(md, heading) {
  const re = new RegExp('^## ' + heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'm');
  const m = re.exec(md);
  if (!m) return null;
  const rest = md.slice(m.index + m[0].length);
  const next = rest.search(/^## /m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function collapse(text) {
  return text.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

let cachedRules = null;
function rulesFor(mode) {
  if (!cachedRules) {
    cachedRules = {};
    try {
      const md = fs.readFileSync(SKILL_PATH, 'utf8');
      cachedRules.common = sectionBody(md, 'Common');
      cachedRules.routing = sectionBody(md, 'Routing');
      for (const l of LEVELS) cachedRules[l] = sectionBody(md, 'Level: ' + l);
    } catch (e) { /* missing skill: use fallback */ }
  }
  const { common, routing } = cachedRules;
  const level = cachedRules[mode];
  if (!common || !level || !routing) return FALLBACK_RULES;
  return collapse(common) + ' ' + collapse(level) + ' ' + collapse(routing);
}

function fullBlock(mode) {
  return `BULLET MODE ACTIVE (${mode}). ${rulesFor(mode)}`;
}

function reminder(mode) {
  return `BULLET MODE ACTIVE (${mode}). Apply bullet ${mode} rules.`;
}

// ---------- state ----------

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

function writeJson(p, obj) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj));
}

function removeFile(p) {
  try { fs.unlinkSync(p); } catch (e) { /* already gone */ }
}

function safeSid(sid) {
  return typeof sid === 'string' && SESSION_ID_RE.test(sid) ? sid : null;
}

function sessionPath(sid) {
  return path.join(STATE_DIR, 'session-' + sid + '.json');
}

function validMode(m) {
  return LEVELS.includes(m) || m === 'off';
}

// Returns { mode, turns, persisted } for a session. mode: a level, or null (off).
function resolveSession(sid) {
  const def = readJson(DEFAULT_PATH);
  const defMode = def && LEVELS.includes(def.mode) ? def.mode : null;
  if (!sid) {
    return { mode: defMode, turns: def ? Number(def.turns) || 0 : 0, persisted: false };
  }
  const s = readJson(sessionPath(sid));
  if (s && validMode(s.mode)) {
    return { mode: s.mode === 'off' ? null : s.mode, turns: Number(s.turns) || 0, persisted: true };
  }
  // New session: inherit the default level once, then it is its own.
  if (defMode) writeJson(sessionPath(sid), { mode: defMode, turns: 0 });
  return { mode: defMode, turns: 0, persisted: true };
}

function bumpTurns(sid, state) {
  if (!state.mode) return 0;
  const turns = state.turns + 1;
  if (sid) writeJson(sessionPath(sid), { mode: state.mode, turns });
  else writeJson(DEFAULT_PATH, { mode: state.mode, turns });
  return turns;
}

// ---------- io ----------

function readStdin(onDone) {
  let input = '';
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    let payload = {};
    try { payload = JSON.parse(input.replace(/^﻿/, '')) || {}; } catch (e) { /* none */ }
    try { onDone(payload); } catch (e) { /* never surface */ }
    try { process.stdin.pause(); } catch (e) { /* ignore */ }
  };
  const timer = setTimeout(finish, STDIN_WAIT_MS);
  timer.unref();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { input += c; });
  process.stdin.on('end', finish);
  process.stdin.on('error', finish);
}

function emit(eventName, text) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: eventName, additionalContext: text },
  }));
}

// ---------- prompt parsing ----------

// Returns { kind: 'level'|'bare'|'status'|'off', level? } or null for a normal turn.
function parsePrompt(prompt) {
  const text = String(prompt || '').trim();
  if (/^(stop bullet|normal mode)[.!]?$/i.test(text)) return { kind: 'off' };
  const m = text.match(/^\/bullet(?::bullet)?(?:\s+(\S+))?\s*$/i);
  if (!m) return null;
  const arg = (m[1] || '').toLowerCase();
  if (arg === 'status') return { kind: 'status' };
  if (arg === 'off') return { kind: 'off' };
  if (LEVELS.includes(arg)) return { kind: 'level', level: arg };
  return { kind: 'bare' };
}

function onPrompt(sid, prompt) {
  const cmd = parsePrompt(prompt);

  if (cmd && cmd.kind === 'off') {
    const state = resolveSession(sid);
    if (sid) writeJson(sessionPath(sid), { mode: 'off', turns: 0 });
    removeFile(DEFAULT_PATH);
    if (state.mode) emit('UserPromptSubmit', 'Bullet mode off. Confirm in one line, then normal style.');
    return;
  }

  if (cmd && cmd.kind === 'status') {
    const state = resolveSession(sid);
    emit('UserPromptSubmit', state.mode
      ? `Bullet mode: ${state.mode}. Report this status only; change nothing.`
      : 'Bullet mode: off. Report this status only; change nothing.');
    return;
  }

  if (cmd && (cmd.kind === 'level' || cmd.kind === 'bare')) {
    let level = cmd.level;
    if (!level) {
      const def = readJson(DEFAULT_PATH);
      level = def && LEVELS.includes(def.mode) ? def.mode : 'full';
    }
    if (sid) writeJson(sessionPath(sid), { mode: level, turns: 0 });
    writeJson(DEFAULT_PATH, { mode: level });
    emit('UserPromptSubmit', fullBlock(level));
    return;
  }

  const state = resolveSession(sid);
  if (!state.mode) return;
  const turns = bumpTurns(sid, state);
  emit('UserPromptSubmit', turns % REFRESH_EVERY === 0 ? fullBlock(state.mode) : reminder(state.mode));
}

// ---------- SessionStart / SubagentStart ----------

function purgeOldSessions() {
  const cutoff = Date.now() - PURGE_AFTER_DAYS * 86400000;
  let names = [];
  try { names = fs.readdirSync(STATE_DIR); } catch (e) { return; }
  for (const n of names) {
    if (!/^session-[A-Za-z0-9_-]{1,128}\.json$/.test(n)) continue;
    const p = path.join(STATE_DIR, n);
    try { if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p); } catch (e) { /* skip */ }
  }
}

function onSessionStart(sid) {
  purgeOldSessions();
  // Copy the default only into a session that has no state yet.
  // compact and resume keep the same session id, so an existing level must survive.
  const state = resolveSession(sid);
  if (state.mode) emit('SessionStart', fullBlock(state.mode));
}

function onSubagent(sid, agentType) {
  const t = String(agentType || '');
  // Our own agents declare "Ultra voice" in their body; do not inject a second voice.
  if (t.startsWith('bullet:') || t.startsWith('bullet-')) return;
  const state = resolveSession(sid);
  if (state.mode) emit('SubagentStart', fullBlock(state.mode));
}

// ---------- SessionEnd snapshot ----------

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{16,}/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
  /(password|passwd|pwd|token|secret|api[_-]?key)\s*[=:]\s*\S+/gi,
];

function redact(s) {
  let out = String(s);
  for (const re of SECRET_PATTERNS) out = out.replace(re, '[redacted]');
  return out;
}

function gitInfo(cwd) {
  const opts = { cwd, timeout: 3000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], opts).trim();
    const status = execFileSync('git', ['status', '--short'], opts).trim();
    return { branch, status };
  } catch (e) {
    return null;
  }
}

function lastHumanPrompts(transcriptPath, n) {
  let lines = [];
  try { lines = fs.readFileSync(transcriptPath, 'utf8').split('\n'); } catch (e) { return []; }
  const out = [];
  for (let i = lines.length - 1; i >= 0 && out.length < n; i--) {
    if (!lines[i]) continue;
    let rec;
    try { rec = JSON.parse(lines[i]); } catch (e) { continue; }
    if (rec.type !== 'user' || !rec.message || typeof rec.message.content !== 'string') continue;
    // Keep only what the human typed: machine messages (task notifications, subagent hand-backs) carry a non-human origin or start with a tag.
    if (rec.origin && rec.origin.kind !== 'human') continue;
    if (!rec.origin && rec.message.content.trimStart().startsWith('<')) continue;
    out.unshift(rec.message.content.slice(0, 300));
  }
  return out;
}

function onEnd(sid, payload) {
  const state = resolveSession(sid);
  if (!state.mode || !sid) return;
  const cwd = typeof payload.cwd === 'string' ? payload.cwd : process.cwd();
  const git = gitInfo(cwd);
  const prompts = typeof payload.transcript_path === 'string'
    ? lastHumanPrompts(payload.transcript_path, 5) : [];
  const lines = [
    `# Bullet snapshot ${sid}`,
    '',
    'Factual snapshot written at session end. No summary was written by the model.',
    '',
    `- Mode: ${state.mode}`,
    `- Directory: ${cwd}`,
    `- Branch: ${git ? git.branch : 'unavailable'}`,
    '',
    '## git status --short',
    '```',
    git && git.status ? redact(git.status) : '(clean or unavailable)',
    '```',
    '',
    '## Last user prompts (300 chars each, secrets masked)',
    ...prompts.map((p, i) => `${i + 1}. ${redact(p)}`),
    '',
    `Transcript: ${typeof payload.transcript_path === 'string' ? payload.transcript_path : 'unavailable'}`,
    '',
  ];
  const outPath = path.join(os.tmpdir(), 'bullet-snapshot-' + sid + '.md');
  fs.writeFileSync(outPath, lines.join('\n'));
}

// ---------- main ----------

function main() {
  const event = process.argv[2];
  if (!['session', 'prompt', 'subagent', 'end'].includes(event)) return;

  readStdin((payload) => {
    const sid = safeSid(payload.session_id);
    if (event === 'session') return onSessionStart(sid);
    if (event === 'prompt') return onPrompt(sid, payload.prompt);
    if (event === 'subagent') return onSubagent(sid, payload.agent_type);
    if (event === 'end') return onEnd(sid, payload);
  });
}

try {
  main();
} catch (e) {
  // Silent: a hook failure must never surface in the session.
}
