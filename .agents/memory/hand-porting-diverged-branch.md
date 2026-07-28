---
name: Porting a diverged feature branch by hand
description: How to bring in a feature branch's changes when main has diverged with an incompatible structural migration (e.g. Next.js 15 async params/searchParams).
---

When a feature branch was cut before a structural migration landed on main (e.g. the Next.js 15
`params`/`searchParams` becoming `Promise<...>` and requiring `await`), a real `git merge` or
cherry-pick produces huge, noisy conflicts and risks silently reverting the migration.

**Why:** `git merge`/cherry-pick operate on line-level diffs, not intent. If the migration touched
the same function signatures the feature branch also touched, the tool cannot tell "this line
changed because of the migration" from "this line changed because of the feature" — you end up
manually resolving every hunk anyway, with much more noise, and a higher chance of quietly
reverting the migration in a file the feature branch also modified.

**How to apply:** Read each commit on the feature branch in full (`git show <sha>`) to understand
*intent*, not diff text. Then hand-apply the equivalent logic edits to the current file versions,
explicitly preserving whatever main-line migration pattern is already present (e.g. keep
`{ params }: { params: Promise<{...}> }` and the `await params` line untouched, and layer the
feature's changes around it). This is slower per-file but avoids reintroducing regressions the
merge tool can't see.
