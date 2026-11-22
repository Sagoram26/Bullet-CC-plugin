# Bullet dev journal

Source of truth for development decisions. One dated entry per step or ruling, with its reason.
Newest state first, then history, then backlog.

## Resume here

1. Read this file to the end of "Open items".
2. Clone: `git clone https://github.com/Sagoram26/Bullet-CC-plugin`, then set `user.name Sagoram26` and the noreply email in the clone (never the real name).
3. Install for dev: in `~/.claude/settings.json`, add marketplace `bullet` with source `directory` pointing at the plugin folder, and set `bullet@bullet: true`. Keep `caveman`, `ponytail`, `i-have-adhd` at `false`.
4. Check: `node hooks/bullet-hook.selftest.js` must print `20 passed, 0 failed`.
5. Behaviour checks: headless runs with `claude -p` in fresh sessions (1 run per case, as in History). `AskUserQuestion` is not available headless: test it interactively.

## Current state (2026-11-22)

- `main` at `796a039` (PR #1 merged): v0.1.x plus the 2026-11-11/12 rework plus the review fixes. Branch `dev/sync-2026-11-22` (at `44f0fde`) is kept but fully merged.
- Tests: `node hooks/bullet-hook.selftest.js` (20 cases, temp dir, writes nothing under `~/.claude`).
- Local install: `~/.claude/plugins-local/bullet/` (marketplace `bullet`, type `directory`). It is not a git checkout: copy changes into this repo by hand, then push. On 2026-11-22 it matched `main` exactly (`JOURNAL.md` apart).
- `caveman`, `i-have-adhd`, `ponytail` must stay `false` in `~/.claude/settings.json`, else hooks double up. Rollback: set them back to `true` and `bullet@bullet` to `false`.
- Rules live in `skills/bullet/SKILL.md` (`## Common`, `## Voice`, `## Shape`, `## Code`, `## Level:`, `## Routing`, `## Reminder` for the per-turn directive). The hook reads them at run time: editing the SKILL is enough.

### Open items

- Doubled hooks, confirmed 2026-11-22: `caveman`, `ponytail`, `i-have-adhd` are `true` again in `~/.claude/settings.json` next to `bullet`; sessions and subagents get all three injections. `settings.json.bak` (2026-11-15) still has them `false`. Likely cause: the `/plugin` menu and `/reload-plugins` on 2026-11-16 (first caveman and ponytail injection 2026-11-16 09:46 UTC). Inference, no stated reason. Fix: set the three back to `false`. Awaiting user decision.
- Stale copy in the separate config backup repo: `~/config-CC/claude/plugins-local/bullet/` (branch `pc-bureau`, `bd12a58`) holds the pre-review-fix version, and its `claude/settings.json` has all four plugins `true`. Restoring on another PC reproduces both problems. Refresh that copy from `main` and set the three to `false` there.
- A global config audit on 2026-11-21 spotted the `true`/`false` contradiction but was interrupted; no fix, no ruling.
- Ultra voice still answers mostly in sentences (headless runs). Not solved.
- No bullet badge in the status line.
- `/bullet off` clears the global default: a later `/bullet` gives `full`, not the last level (validated choice, revisit if annoying).
- Not tested: VS Code, desktop app, interactive `AskUserQuestion` at end of task (headless `claude -p` lacks the tool, falls back to text).
- Plugin icon pending (PNG to be provided).

## History

### 2026-11-22 — Resume audit
- Goal (user): resume bullet work later with nothing missing.
- PR #1 merged into `main` as `796a039` at the user's request.
- Transcripts after the last memory note scanned (2026-11-12 to 2026-11-22): no unrecorded code change; missing items were the doubled-hook cause, the stale config-CC copy, the interrupted audit, two unchosen options and one idea. All added above.
- Local install `LICENSE` aligned with the repo (it only had an extra leading blank line).

### 2026-11-22 — Sync to GitHub and review fixes
- Local rework pushed on `dev/sync-2026-11-22` so work can continue from the repo. `main` untouched.
- Independent `bullet:reviewer` pass on `main..dev`: 5 risks, 2 nits, 1 question, about -30 lines of cuts. User ruling: fix everything.
- Question ruling: keep a length fallback in stats (unmarked text over 1500 characters counts as full) so pre-marker transcripts stay correct. Why: old full blocks were about 2900+ characters; the new reminder is about 585.
- Reminder text moved from the hook into `## Reminder` in `SKILL.md`. Fallback block no longer carries the marker. Turn counter removed (nothing read it after the 8-turn refresh went). Closer rule: finished task, AskUserQuestion; open work, `Next:`.
- Selftest 20/20. Ultra block 9139 characters, reminder 553 to 585.

### 2026-11-12 — Rework on the caveman / i-have-adhd mechanism
- Request: "caveman content with the i-have-adhd answer architecture", conditioning on every turn like those two plugins.
- `## Voice` (caveman rules with Bad/Good) and `## Shape` (i-have-adhd rules, "When to break the rules", pre-send check) shared by all levels; `## Code` shared.
- `## Level:` varies only voice compression and line cap. "Explain" lifts the cap, with headers.
- Full ruleset injected as raw markdown at SessionStart (incl. after compact) and on level change only. The 8-turn refresh is removed (reverses the 2026-11-10 ruling: copying the two plugins' mechanism wins). Per-turn reminder about 530 characters.
- Ultra carries the ultracave rules. Ultra block 9464 characters (test limit 10000).
- Headless: "explain" 26 lines with headers; other answers 5, 9, 6 lines.
- Options offered and not chosen (keep as alternatives): one complete ruleset file per level, as caveman does; test live before porting ultracave.
- Finding: caveman is on by default and injects a full SKILL per level; i-have-adhd only injects when `~/.claude/.i-have-adhd-always` exists, else via `/i-have-adhd`.

### 2026-11-11 — "Ultra stays verbose"
- Injection present in 7/7 CLI sessions, default level ultra: not a hook failure. Answers up to 7113 characters.
- Fix: line cap per level in the first sentence of each `## Level:` (lite 12, full 8, ultra 5 lines outside code); per-turn reminder repeats it. Exception narrowed later to "in detail", "full", review, audit (then widened again on 2026-11-12 to "explain").

### 2026-11-10 — v0.1.x rulings
- Stats include subagent transcripts (`<session>/subagents/*.jsonl`); injection cost labelled as estimate (characters / 4). Measured re-read cost: about 0.68 % of cache reads over 125 turns, accepted.
- `/compact` validated: `SessionStart:compact` re-injects the block. `SessionEnd` validated on Ctrl+C (snapshot `%TEMP%/bullet-snapshot-<id>.md`).
- Routing: first test 0/4 skills called. Descriptions of `surgical-patch`, `investigate-first`, `verify-and-stop`, `investigator` made imperative ("invoke FIRST, before any Read") with French triggers. Retest 4/4 twice. `bullet:reviewer` routing OK.
- Reviewer format: two sections (Correctness, Over-engineering), closed severities and tags, `net:` on section 2 only.
- Agent reports relayed verbatim (weak wording failed, strong wording passed headless).
- End-of-task dialog: AskUserQuestion only at the end of a task, options for next step, recommended first, all levels. Splitting the ruleset into several files rejected: it is injected as one block, so splitting does not cut cost.
- Skills in English, answers in the user's language.
- `bullet:audit` tried read-only on a real repository: four cuts verified by grep, none applied (test only).

## Backlog

- CI badge in README.
- Install test from GitHub in a clean profile: `/plugin marketplace add Sagoram26/Bullet-CC-plugin`.
- Real A/B cost measurement (bullet on/off, same tasks).
- Idea, not measured (2026-11-12): `/i-have-adhd` delivers its full SKILL (about 7.3k) as command output inside the conversation. That position may weigh more than hook `additionalContext`. Worth an A/B on the ultra voice problem.

### V2 (design only, paused 2026-11-10, no spec, no code)
- Add criterion: a workflow exists only if it adds a guarantee or format Claude Code lacks by default.
- Kept: `merge`, `fix`, `ship`, `feature`, `test`, `design`, `compare`, `decide`, `triage`. Dropped for now: `docs`, `release`, `hotfix`, `postmortem`, `estimate`. Naming `bullet:verb-object`.
- `merge`: trigger "merge" / "fusionne". Before: `bullet:reviewer` on the diff, tests (detected, else asked), clean tree. Blocking finding stops and asks. Local `--no-ff` merge of current branch into its parent. Ask before any push. Trivial conflict resolved, else `git merge --abort` and ask.
- Router: a skill, not an agent. Fixed keywords first (declared in each workflow), then routing table and judgement. Ambiguous: one question with options, nothing runs before the answer. Announces one line (workflow and reason), then runs.
- Agents: no tester agent. Scoped write agent for fixes. Haiku for read, Sonnet for write.
- Rights: `investigator` read-only, no Bash; `reviewer` read + read-only git; write agent Edit/Write on a file list given by the workflow, no Bash, out-of-list refused and reported.
- To decide: reuse or wrap `brainstorming`, `grill-me`, `interview` from other plugins.
