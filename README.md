# bullet

One mode for how Claude writes, how it structures work for an ADHD reader, and how it writes code. One level controls all three.

Levels: `lite`, `full` (default), `ultra`.

## Install

Local marketplace. Add the folder, then enable the plugin:

```
/plugin marketplace add <path-to>/bullet
/plugin install bullet@bullet
```

## Use

- `/bullet:bullet lite|full|ultra`: set the level for this session and as the default for new sessions.
- `/bullet:bullet` alone: re-apply the default (`full` if none).
- `/bullet:bullet status`: show the level.
- `/bullet:bullet off`, or the whole prompt `stop bullet` or `normal mode`: turn it off.

The rules persist across turns through hooks. Subagents receive the level, except the bullet agents, which always run in ultra voice.

## What is inside

- Skills: `bullet`, `commit`, `review`, `audit`, `help`, `stats`, `handoff` (manual only), `surgical-patch`, `investigate-first`, `verify-and-stop`, `safe-refactor`.
- Agents: `investigator` (read-only locator), `reviewer` (diff reviewer).
- Hooks: session start, prompt, subagent start, session end. Session end writes a factual snapshot to the OS temporary directory when bullet is active. It contains no summary.

## Tests

```
node hooks/bullet-hook.selftest.js
```

16 cases, run in a temporary config directory. They do not touch `~/.claude`.

## Origin and licence

bullet merges three projects: caveman (Apache-2.0), i-have-adhd (MIT), and ponytail (MIT). It also adapts handoff from mattpocock-skills (MIT). See `NOTICE` for attributions and `LICENSE` for the Apache-2.0 text.

This project is not affiliated with or endorsed by the authors of those projects. "Caveman" is a trademark of Julius Brussee.
