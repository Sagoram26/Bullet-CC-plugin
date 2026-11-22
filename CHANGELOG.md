# Changelog

## Unreleased

- Pending: plugin icon (`.claude-plugin/icon.png`). Not blocking for local or GitHub use.
- Session end on Ctrl+C and normal close verified (snapshot written in both cases).
- Fix: automatic routing. Workflow and agent descriptions and the `## Routing` section now say to call the matching skill or agent before Read, Grep, Bash or Edit. Tested in fresh sessions: 0/4 before, 4/4 on two passes after.
- Fix: full block kept under 3000 characters (test added). Limit now 3500 characters.
- Reviewer report: two sections (Correctness, Over-engineering), closed severities and tags, `net:` counts section 2 only.
- Finished task: the turn ends with AskUserQuestion offering next-step options, recommended first (all levels).
- Agent reports reach the user verbatim, without rewording.
- Rework: style conditioning now uses the same mechanism as caveman and i-have-adhd. The ruleset is injected as markdown (headings and Bad/Good pairs kept, no longer flattened into one paragraph). Shared sections `## Voice` (caveman voice rules) and `## Shape` (i-have-adhd response structure) apply at every level. `## Level:` sections now vary only the voice compression and a line cap; "explain" lifts the cap, with headers. Full ruleset limit raised to 10000 characters (about 7.8k).
- Change: the full ruleset is sent at SessionStart (including after compact) and on a level change only. The 8-turn refresh is removed. Every turn gets a directive of about 530 characters instead: the level voice line, "answer only what was asked", first line first, `Next:`. `bullet-stats` tells full from reminder by the `BULLET RULESET` marker, not by length.
- Ultra: `## Level: ultra` now carries the ultracave rules (fragments, one word, each fact once, conjunctions, tool runs, its own pre-send check, Bad/Good pairs). `## Voice` gains the caveman "When to break the voice" cases and pre-send check; the duplicate prose-exception line in `## Common` is removed. Ultra ruleset: 9464 characters.
- Review fixes: the per-turn reminder text now lives in a `## Reminder` section of `SKILL.md` (no longer hardcoded). The fallback block, used when `SKILL.md` is missing, no longer carries the `BULLET RULESET` marker. `bullet-stats` counts unmarked injections over 1500 characters as full, so older transcripts stay correct. Closers made consistent: finished task ends with AskUserQuestion, open work with `Next:`. Session state keeps `{ mode }` only (unused turn counter removed). Duplicate rules removed: voice and ultra pre-send checks folded into the Shape pre-send check, ultra tool-run rule, Shape destructive-action case. Ultra ruleset: 9139 characters. Selftest: size checked at every level, fallback test, stats tested on real hook output (20 cases).

## 0.1.0

First release. One mode for voice, ADHD-friendly structure, and lazy code.

- Levels `lite`, `full` (default), `ultra`, set with `/bullet:bullet <level>`.
- State per session, default level for new sessions, `/bullet off` clears the default.
- Rules read from `skills/bullet/SKILL.md` at run time. Full block re-sent every 8 turns.
- Routing to workflows (`surgical-patch`, `investigate-first`, `safe-refactor`, `verify-and-stop`) and agents (`investigator`, `reviewer`).
- Skills: `commit`, `review`, `audit`, `help`, `stats`, `handoff` (manual only).
- Session end writes a factual snapshot to the OS temporary directory when bullet is active.
- `stats` measures real token usage and injection cost from the session transcript.
- Selftest: 17 cases, run in a temporary config directory.

Sources and licences: see `NOTICE`.
