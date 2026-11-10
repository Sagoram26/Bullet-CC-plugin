---
name: help
description: >
  Quick reference for bullet levels, commands, workflows, skills, and agents.
  Use for "bullet help", "what can bullet do", "/bullet help".
---

# help

Display only. Change nothing.

## Levels

- `lite`: short sentences, build what is asked, name the leaner alternative.
- `full` (default): fragments, structure with `Next:`, the code ladder.
- `ultra`: fragments only, delete before add, challenge the requirement.

## Commands

- `/bullet lite|full|ultra`: set the level for this session and as the default for new sessions.
- `/bullet status`: show the level.
- `/bullet off`, or the whole prompt "stop bullet" / "normal mode": off for this session and clears the default.

## Workflows (automatic, also invocable)

- `surgical-patch`: fix a bug at the responsible layer, with regression proof.
- `investigate-first`: diagnose unknown causes before editing.
- `verify-and-stop`: prove acceptance criteria, then stop.
- `safe-refactor`: restructure without behavior change.

## Skills

- `commit`: Conventional Commits message.
- `review`: correctness review, then over-engineering cuts.
- `audit`: repo-wide over-engineering audit; `--debt` for the shortcut ledger.
- `stats`: measured token usage and bullet injection cost, from the session transcript.
- `handoff`: manual only (`/bullet:handoff`). Writes a handoff document to the OS temporary directory.

## Agents (automatic)

- `investigator`: read-only code locator.
- `reviewer`: diff reviewer.

## Session end

When a session with bullet active ends, a factual snapshot is written to the OS temporary directory as `bullet-snapshot-<id>.md`: directory, branch, `git status`, last five prompts, secrets masked. No summary. Not written on Ctrl+C if the host skips SessionEnd.
