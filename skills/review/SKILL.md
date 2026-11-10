---
name: review
description: >
  Compressed code review in two sections: correctness findings, then
  over-engineering cuts. Use for "review this PR", "review the diff", "what can
  we delete", "is this over-engineered". Proactively before merging a diff.
---

# review

Review only. Do not apply fixes.

Output two sections, in this order. Keep them apart.

## 1. Correctness

One line per finding: `<file>:L<line>: <severity>: <problem>. <fix>.` (or `L<line>:` for one file).

Severity:
- `🔴 bug:` broken behavior, will cause an incident.
- `🟡 risk:` works but fragile (race, missing null check, swallowed error).
- `🔵 nit:` style, naming, micro-optim. Author may ignore.
- `❓ q:` genuine question, not a suggestion.

Security findings and architecture disagreements: a full prose paragraph with the reasoning, then terse again.

## 2. Over-engineering

One line per finding, tagged:
- `delete:` dead code, unused flexibility. Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library ships. Name the function.
- `native:` dependency or code the platform already does. Name the feature.
- `yagni:` abstraction with one implementation, or a layer with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.

End this section with `net: -<N> lines possible.` If nothing to cut, write `Lean already.`

## Rules

- Exact line numbers and symbols in backticks.
- Concrete fix. Never "consider refactoring".
- Drop "I noticed", "might want to", "great work", and hedges. Use `q:` when unsure.
- The `net:` line counts section 2 only.
- A single smoke test or `assert` check is minimum, not bloat. Never tag it `delete`.

## Example

- `L42: 🔴 bug: user can be null after .find(). Add guard before .email.`
- `L12-38: stdlib: 27-line validator class. "@" in email, one line; the confirmation mail does the real validation.`
- `L4: native: moment.js for one format call. Intl.DateTimeFormat, 0 deps.`
