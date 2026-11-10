# Changelog

## Unreleased

- Pending: plugin icon (`.claude-plugin/icon.png`). Not blocking for local or GitHub use.
- Pending: manual check of session end on Ctrl+C. Normal close is verified.

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
