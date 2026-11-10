---
name: audit
description: >
  Whole-repo audit for over-engineering, ranked by biggest cut. Use for "audit
  this codebase", "find bloat", "what can I delete from this repo". With
  "--debt": list every `bullet:` shortcut comment as a ledger.
---

# audit

One-shot report. Changes nothing.

## Audit (default)

Scan the whole tree, not a diff. Hunt: dependencies the stdlib or platform
already ships; single-implementation interfaces; factories with one product;
wrappers that only delegate; files exporting one thing; dead flags and config;
hand-rolled stdlib.

Output one line per finding, ranked by size of the cut:
`<tag> <what to cut>. <replacement>. [path]`
Tags: `delete`, `stdlib`, `native`, `yagni`, `shrink`.
End with `net: -<N> lines, -<M> deps possible.`
Nothing to cut: `Lean already. Ship.`
Scope is over-engineering only. Route correctness, security, and performance to a normal review.

## Debt (`--debt`)

Grep for comment markers, skipping `node_modules`, `.git`, and build output:
`grep -rnE --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build '(#|//) ?bullet:' .`

One row per marker, grouped by file:
`<file>:<line>, <what was simplified>. ceiling: <limit>. upgrade: <trigger>.`

Any marker with no upgrade trigger gets tag `no-trigger`; those rot silently.
End with `<N> markers, <M> with no trigger.`
Nothing found: `No bullet: debt. Clean ledger.`
To persist the ledger, ask first, then write `BULLET-DEBT.md`.
