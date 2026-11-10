---
name: commit
description: >
  Write a Conventional Commits message compressed to intent. Use when the user
  asks for a commit message, "commit message", or before committing staged changes.
---

# commit

Output the message as a code block. Do not run `git commit`, stage, or amend.

## Subject

- `<type>(<scope>): <imperative summary>`; scope optional.
- Types: feat, fix, refactor, perf, docs, test, chore, build, ci, style, revert.
- Imperative: "add", "fix", "remove". Not "added", "adds".
- 50 characters when possible, 72 hard cap. No trailing period.
- Match project capitalization after the colon.

## Body

- Skip when the subject is self-explanatory.
- Include only: the non-obvious why, breaking changes, migration notes, linked issues.
- Required for: breaking changes, security fixes, data migrations, reverts.
- Wrap at 72. Bullets `-`. Refs at end: `Closes #42`.

## Never

- "This commit does X", "I", "we", "now", "currently". The diff says what.
- Restating the file name when scope already names it.
- Emoji unless the project requires it.
- AI attribution in the message body. The system attribution line (`Co-Authored-By`) is the exception and is always added when the user's environment requires it.

## Example

```
feat(api): add GET /users/:id/profile

Mobile client needs profile data without the full user payload
to reduce LTE bandwidth on cold-launch screens.

Closes #128
```
