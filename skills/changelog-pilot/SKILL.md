---
name: changelog-pilot
description: AI-powered changelog generation, release notes, semantic versioning, and announcement drafting from git history.
---

# Changelog Pilot Skill

Use this skill whenever you need to:
1. Analyze git commit history and parse conventional commits.
2. Recommend the next semantic version (`major`, `minor`, `patch`) according to SemVer rules.
3. Generate standard changelog files (`CHANGELOG.md`) following Keep a Changelog or GitHub Release specs.
4. Prepare user-facing release notes highlighting major features, fixes, and breaking changes.
5. Draft launch/release announcements tailored for Slack, Discord, Twitter/X, or Email newsletters.

## Workflow

1. **Analyze History**:
   - Inspect git tags and commit history using `analyze_commits` or `getGitLog`.
   - Identify whether breaking changes (`!`, `BREAKING CHANGE:`) or new features (`feat:`) are present.

2. **Determine Next Version**:
   - Use `suggest_version` to compute the next valid SemVer bump.

3. **Format Output**:
   - Generate `CHANGELOG.md` updates with `generate_changelog`.
   - Prepare GitHub Release markdown with `generate_release_notes`.
   - Draft cross-platform release announcements with `draft_announcement`.
