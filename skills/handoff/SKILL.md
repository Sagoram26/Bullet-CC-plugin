---
name: handoff
description: >
  Write a handoff document so a fresh agent or session can continue the work.
  Manual only: run when the user types /bullet:handoff or asks for a handoff.
disable-model-invocation: true
argument-hint: "What will the next session focus on?"
---

# handoff

Write the document, then tell the user its path so they can start a fresh session with just that path.

## Location

Save to the OS temporary directory (`%TEMP%` on Windows, `$TMPDIR` or `/tmp` elsewhere), never the workspace. The file is `bullet-handoff-<short-date>.md`.

## Sections

- **Goal**: what we are trying to accomplish.
- **Current Progress**: what is done.
- **What Worked**: approaches that succeeded.
- **What Didn't Work**: approaches that failed, so they are not repeated.
- **Next Steps**: concrete action items, first one first.
- **Suggested Skills**: which skills the next agent should call.

## Rules

- Do not duplicate what specs, plans, ADRs, issues, commits, or diffs already hold. Reference them by path or URL.
- Redact API keys, passwords, and personal data.
- If the user gave an argument, tailor the document to that next focus.
- If a session-end snapshot exists for this session in the OS temporary directory (`bullet-snapshot-<id>.md`), reference it by path. It is factual only; this handoff is the summary.
