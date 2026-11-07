# Changelog Pilot — Setup Guide

Thank you for getting **Changelog Pilot**! Follow these quick steps to enable automated changelogs, SemVer management, and release announcements in your coding agent (Claude Code, Cursor, Copilot, Antigravity).

---

## Step 1: Configure Your Agent

### For Claude Code / Claude Desktop:
Add the configuration from `mcp-config.template.json` to your `claude_desktop_config.json` or `.mcp.json`:
```json
{
  "mcpServers": {
    "changelog-pilot": {
      "command": "npx",
      "args": ["-y", "changelog-pilot"]
    }
  }
}
```

### For Cursor:
1. Copy `cursor-rules.md` into your project at `.cursor/rules/changelog-pilot.mdc`.
2. Reference `@changelog-pilot` or ask Cursor Composer:
   > *"Analyze our commits since the last tag, recommend the next version, and update CHANGELOG.md."*

---

## Step 2: Instant Terminal CLI (No Config Needed)

You can also run Changelog Pilot directly from any terminal:
```bash
# Preview upcoming changelog
npx changelog-pilot --preview

# Check recommended SemVer bump
npx changelog-pilot --suggest

# Safely prepend new release to CHANGELOG.md
npx changelog-pilot --write
```

---

## Step 3: Available Tools in Your Agent
- `analyze_commits` — Full commit analysis with breaking changes detection.
- `suggest_version` — SemVer calculation with explanatory reasoning.
- `generate_changelog` — Keep a Changelog or GitHub style markdown.
- `update_changelog_file` — Prepend new version directly to `CHANGELOG.md`.
- `generate_release_notes` — User-facing release notes.
- `draft_announcement` — Tailored announcements for Slack, Discord, Twitter/X, and Email.

---

## Support & Open Source Repository
- **GitHub**: https://github.com/ghazy2001/changelog-pilot
- **Author**: Mahmoud Ghazy (@ghazy2001)
