---
description: Changelog Pilot release management & automated changelogs
globs: *
---

# Changelog Pilot Cursor Rules

Whenever the user asks about releasing, version bumps, or generating changelogs:
1. Use the `changelog-pilot` MCP tools or CLI commands:
   - Run `npx changelog-pilot --preview` to preview upcoming changelog entries.
   - Run `npx changelog-pilot --suggest` to evaluate the next SemVer bump.
   - Run `npx changelog-pilot --write` to safely update `CHANGELOG.md`.
2. Ensure conventional commits are properly categorized (`feat`, `fix`, `perf`, `docs`, `refactor`).
3. For major releases with breaking changes, explicitly highlight breaking changes at the top of the release notes.
