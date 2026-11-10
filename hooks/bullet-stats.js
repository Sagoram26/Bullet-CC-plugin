#!/usr/bin/env node
// bullet-stats — measure real token usage and bullet injection cost from a
// Claude Code session transcript (.jsonl). Read-only. Prints one report.
//
// Usage:
//   node bullet-stats.js                  newest transcript under <config>/projects
//   node bullet-stats.js <transcript.jsonl>
//
// Token figures come from assistant `message.usage`, deduplicated by message id.
// Injection figures come from `attachment` records of type hook_success whose
// content starts with "BULLET MODE ACTIVE". Tokens are estimated as chars / 4.

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const PROJECTS_DIR = path.join(CONFIG_DIR, 'projects');
const INJECTION_PREFIX = 'BULLET MODE ACTIVE';
const FULL_THRESHOLD_CHARS = 300;

function newestTranscript(root) {
  let best = null;
  let dirs = [];
  try { dirs = fs.readdirSync(root); } catch (e) { return null; }
  for (const d of dirs) {
    const dir = path.join(root, d);
    let files = [];
    try { files = fs.readdirSync(dir); } catch (e) { continue; }
    for (const f of files) {
      if (!f.endsWith('.jsonl')) continue;
      const p = path.join(dir, f);
      let m;
      try { m = fs.statSync(p).mtimeMs; } catch (e) { continue; }
      if (!best || m > best.mtime) best = { path: p, mtime: m };
    }
  }
  return best ? best.path : null;
}

// Pure function: takes the transcript text, returns the figures. Exported for tests.
function measure(text) {
  const seen = new Set();
  const usage = { turns: 0, input: 0, cacheCreate: 0, cacheRead: 0, output: 0 };
  const inj = { count: 0, chars: 0, full: 0, reminder: 0 };
  // Ordered events: an injection stays in history, so it is re-read by every
  // assistant turn that comes after it. Re-read cost = tokens x later turns.
  const events = [];

  for (const line of text.split('\n')) {
    if (!line) continue;
    let rec;
    try { rec = JSON.parse(line); } catch (e) { continue; }

    if (rec.type === 'assistant' && rec.message && rec.message.usage) {
      const key = rec.message.id || rec.uuid;
      if (key && !seen.has(key)) {
        seen.add(key);
        const u = rec.message.usage;
        usage.turns += 1;
        usage.input += u.input_tokens || 0;
        usage.cacheCreate += u.cache_creation_input_tokens || 0;
        usage.cacheRead += u.cache_read_input_tokens || 0;
        usage.output += u.output_tokens || 0;
        events.push({ kind: 'turn' });
      }
    }

    // Hook output arrives as hook_success (string content, SessionStart) or
    // hook_additional_context (array of strings, UserPromptSubmit).
    const a = rec.attachment;
    if (a && (a.type === 'hook_success' || a.type === 'hook_additional_context')) {
      const text = Array.isArray(a.content) ? a.content.join('\n') : a.content;
      if (typeof text === 'string' && text.startsWith(INJECTION_PREFIX)) {
        inj.count += 1;
        inj.chars += text.length;
        if (text.length > FULL_THRESHOLD_CHARS) inj.full += 1; else inj.reminder += 1;
        events.push({ kind: 'inj', tokens: Math.round(text.length / 4) });
      }
    }
  }

  // Walk backwards: each injection costs its tokens once per turn after it.
  let turnsAfter = 0;
  let rereadTokens = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].kind === 'turn') turnsAfter += 1;
    else rereadTokens += events[i].tokens * turnsAfter;
  }

  return { usage, inj, injTokens: Math.round(inj.chars / 4), rereadTokens };
}

function report(result, label) {
  const { usage: u, inj, injTokens, rereadTokens } = result;
  const lines = [
    `bullet stats — ${label}`,
    '',
    `Assistant turns (deduplicated): ${u.turns}`,
    `  input tokens (fresh):     ${u.input}`,
    `  cache creation tokens:    ${u.cacheCreate}`,
    `  cache read tokens:        ${u.cacheRead}`,
    `  output tokens:            ${u.output}`,
    '',
    `Bullet injections: ${inj.count} (${inj.full} full, ${inj.reminder} reminder)`,
    `  injected characters:      ${inj.chars}`,
    `  injected tokens (≈ /4):   ${injTokens}`,
    `  re-read cost (≈ tokens x later turns): ${rereadTokens}`,
  ];
  const totalInput = u.input + u.cacheCreate + u.cacheRead;
  if (totalInput > 0) {
    lines.push('', `Re-read cost share of input: ${(100 * rereadTokens / totalInput).toFixed(2)} % (approximate)`);
  }
  if (inj.count === 0) {
    lines.push('', 'No bullet injection in this transcript. Is bullet enabled?');
  }
  return lines.join('\n');
}

function main() {
  const target = process.argv[2] || newestTranscript(PROJECTS_DIR);
  if (!target || !fs.existsSync(target)) {
    process.stdout.write('No transcript found. Pass a .jsonl path.\n');
    return;
  }
  const text = fs.readFileSync(target, 'utf8');
  process.stdout.write(report(measure(text), path.basename(target)) + '\n');
}

module.exports = { measure, report };

if (require.main === module) {
  try { main(); } catch (e) { process.stdout.write('bullet stats failed: ' + e.message + '\n'); }
}
