# Changelog

## Unreleased

- Pending: plugin icon (`.claude-plugin/icon.png`). Not blocking for local or GitHub use.
- Session end on Ctrl+C and normal close verified (snapshot written in both cases).
- Fix: automatic routing. Workflow and agent descriptions and the `## Routing` section now say to call the matching skill or agent before Read, Grep, Bash or Edit. Tested in fresh sessions: 0/4 before, 4/4 on two passes after.
- Fix: full block kept under 3000 characters (test added). Limit now 3500 characters.
- Reviewer report: two sections (Correctness, Over-engineering), closed severities and tags, `net:` counts section 2 only.
- Finished task: the turn ends with AskUserQuestion offering next-step options, recommended first (all levels).
- Agent reports reach the user verbatim, without rewording.

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
