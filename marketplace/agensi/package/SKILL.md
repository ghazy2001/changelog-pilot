---
name: changelog-pilot
description: AI-powered changelog generation, release notes, semantic versioning, and announcement drafting from git history.
---

# Changelog Pilot — AI Release & Changelog Skill

You have access to the `changelog-pilot` MCP server and CLI to manage project releases, semantic versioning, and changelogs.

## When to Use This Skill
- When the user asks to prepare a release, bump versions, or create release notes.
- When generating or updating `CHANGELOG.md` following Keep a Changelog or GitHub standards.
- When drafting launch announcements for Slack, Discord, Twitter/X, or Email newsletters.
- When analyzing git commits to find breaking changes or categorize features and fixes.

## Available MCP Tools

1. `analyze_commits`
   - Parameters: `{ cwd?: string, from?: string, to?: string }`
   - Parses commits, categorizes by type (`feat`, `fix`, `perf`, etc.), and identifies breaking changes.

2. `suggest_version`
   - Parameters: `{ cwd?: string, from?: string, current_version?: string }`
   - Determines the next SemVer version (`major`, `minor`, `patch`) and provides a clear explanation.

3. `generate_changelog`
   - Parameters: `{ cwd?: string, from?: string, to?: string, version?: string, format?: "keepachangelog" | "github" | "simple" }`
   - Returns standard formatted markdown.

4. `update_changelog_file`
   - Parameters: `{ cwd?: string, from?: string, to?: string, version?: string, format?: string, file_path?: string }`
   - Directly prepends the new release section into `CHANGELOG.md`, preserving past history.

5. `generate_release_notes`
   - Parameters: `{ cwd?: string, from?: string, to?: string, version?: string }`
   - Generates user-facing release notes highlighting major impact areas.

6. `draft_announcement`
   - Parameters: `{ platform: "slack" | "discord" | "twitter" | "email", product_name: string, url?: string, ... }`
   - Creates platform-tailored announcement copy.
