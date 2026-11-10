---
name: safe-refactor
description: >
  Restructure code without changing behavior. Use proactively for extraction,
  consolidation, moving ownership, or cleanup where behavior must stay the same.
---

# safe-refactor

1. Define the behavior boundary and get a passing proof before any structural edit.
2. Keep feature changes out of the refactor.
3. Move one ownership boundary at a time.
4. Preserve public interfaces, failure behavior, ordering, and compatibility unless the task scopes otherwise.
5. Keep every intermediate state buildable and testable.
6. Add no dependency or configuration without a correctness need.
7. Run the same proof after the change. Stop when behavior matches and the requested structure exists.
