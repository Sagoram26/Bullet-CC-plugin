---
name: verify-and-stop
description: >
  Prove that work meets its acceptance criteria, then stop. Use proactively
  before saying a task is done, fixed, or passing, and for validation-only requests.
---

# verify-and-stop

1. Turn the acceptance criteria into the smallest proof set that covers them.
2. Reuse a result only if it still matches the current repository state.
3. Run focused checks before wider gates.
4. Report each result as exactly one of: pass, fail, unavailable, blocked.
5. Do not edit product code unless the request includes fixes.
6. Stop as soon as the proof is complete. No polish, no cleanup, no unrelated tests.

Report: commands run, results, and unresolved risk only.
