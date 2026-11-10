---
name: surgical-patch
description: >
  Fix a bug or small behavior change at the narrowest responsible layer. Use
  proactively whenever the user reports a bug, a failing test, or wrong behavior
  with a known symptom.
---

# surgical-patch

1. Reproduce the failure first when cheap. Otherwise capture the strongest evidence available.
2. Trace the symptom to the mechanism that causes it.
3. Grep every caller of the function you will change.
4. Change the narrowest layer that owns the wrong behavior. Root cause, not symptom.
5. Preserve unrelated behavior and the user's uncommitted changes.
6. Do not clean up, rename, or abstract outside the fix.
7. Add only regression proof relevant to this bug.
8. Run the focused proof and the nearest affected gate. Stop when the failure is fixed and the proof passes.
