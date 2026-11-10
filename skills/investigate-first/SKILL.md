---
name: investigate-first
description: >
  Diagnose an ambiguous failure before editing. Use proactively for unknown
  causes, intermittent failures, flaky tests, performance regressions, or any
  "why does this sometimes fail" question.
---

# investigate-first

No product code edits until one credible mechanism explains the evidence.

1. Separate observed symptom from inferred cause.
2. Trace inputs, state transitions, ownership boundaries, and failure output.
3. Rank hypotheses by evidence and by how cheap they are to falsify.
4. Test the top hypothesis with the cheapest check.
5. Stop when the evidence names the cause or the exact blocker.

Report the cause and its proof. Make no fix unless the task authorizes implementation.
