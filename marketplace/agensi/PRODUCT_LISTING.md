# Agensi.io Marketplace Product Listing: Changelog Pilot

## 1. Product Overview
* **Product Title**: Changelog Pilot — AI Release Notes, SemVer Bumper & Automated Changelogs
* **Short Tagline**: Automate git changelog generation, SemVer recommendations, CHANGELOG.md file updates, and omnichannel release announcements across Claude Code, Cursor, and terminal.
* **Suggested Price**: $10.00
* **Categories**: Developer Tooling, Release Automation, Git Workflows, Documentation
* **Compatible Agents**: Claude Code, Cursor, Antigravity, Windsurf, GitHub Copilot, Cline, Roo Code

---

## 2. Product Description (For Agensi.io Listing Page)

### Why Changelog Pilot?
Writing changelogs, figuring out whether a release should be a minor or patch bump, tracking breaking changes across dozens of commits, and writing Slack/Discord announcements is tedious manual work that every engineering team avoids.

**Changelog Pilot** automates the entire release lifecycle inside your favorite coding agent or terminal:

1. **Smart Conventional Commits Parser**: Automatically classifies commits (`feat`, `fix`, `perf`, `docs`, `refactor`, `breaking changes`) with intelligent heuristic inference for non-conventional commits.
2. **Deterministic SemVer Recommendations**: Analyzes changes to determine the exact next version bump (`major`, `minor`, `patch`) per SemVer specification, taking into account `0.x` pre-release rules.
3. **Multi-Format Changelog Generation**: Generates standard Keep a Changelog (keepachangelog.com) or emoji-rich GitHub Release formats.
4. **Automatic PR & Issue Linking**: Converts references like `(#123)` directly into clickable repository pull request and issue links.
5. **In-Place CHANGELOG.md Updater**: Safely prepends new releases to your `CHANGELOG.md` file while preserving historical releases.
6. **Omnichannel Launch Announcements**: Instantly formats release copy tailored for Slack (mrkdwn), Discord (embeds), Twitter/X (<280 chars), and Email newsletters.
7. **Direct Terminal CLI**: Run `npx changelog-pilot --preview` or `--write` anytime with zero agent configuration required.

---

## 3. What’s Included in this Package (.zip)
* `SKILL.md` — Universal Agent Skill specification ready to drop into `.agent/skills/` or `.cursor/skills/`.
* `cursor-rules.md` — Optimized system prompt and MDC rule file for Cursor Composer & Agent mode.
* `mcp-config.template.json` — Pre-configured MCP server JSON for Claude Desktop, Claude Code, and Cursor.
* `SETUP_GUIDE.md` — Step-by-step setup guide and command reference.

---

## 4. Creator Profile & Support
* **Created by**: Mahmoud Ghazy ([@ghazy2001](https://github.com/ghazy2001))
* **GitHub Repository**: https://github.com/ghazy2001/changelog-pilot
* **License**: MIT
