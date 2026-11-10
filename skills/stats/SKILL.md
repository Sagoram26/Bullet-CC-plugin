---
name: stats
description: >
  Measure real token usage of a session and the cost of bullet's injections,
  from the session transcript. Use for "bullet stats", "what does bullet cost",
  "how many tokens do the reminders take".
---

# stats

Read-only. Change no mode, write no files.

## Run

Run the measurement script. With no argument it reads the newest transcript under the Claude config `projects` folder, which is the current session while it is open:

```
node "${CLAUDE_PLUGIN_ROOT}/hooks/bullet-stats.js"
```

With a path, it reads that transcript:

```
node "${CLAUDE_PLUGIN_ROOT}/hooks/bullet-stats.js" <transcript.jsonl>
```

Show the printed report as it is. Do not round or reinterpret the numbers.

## What the numbers mean

- Token figures come from each assistant turn's `usage`, counted once per message id.
- Injection figures come from the hook output that bullet wrote into the transcript.
- Tokens are estimated as characters / 4.
- Re-read cost is the real cost: an injection stays in history, so every later turn re-reads it. Re-read cost = injected tokens x later turns.
- The share is approximate. It is re-read cost divided by all input tokens.

## Limits

- No transcript found: the report says so. Pass the path explicitly.
- Without a bullet injection in the transcript, the report says so and asks whether bullet is enabled.
- Do not compare these numbers to ponytail's published benchmarks. They measure different things.
