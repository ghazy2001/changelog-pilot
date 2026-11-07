# 🚀 Changelog Pilot

[![npm version](https://img.shields.io/npm/v/changelog-pilot.svg?style=flat-square)](https://www.npmjs.com/package/changelog-pilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green.svg?style=flat-square)](https://modelcontextprotocol.io/)

> **AI-Powered Git Changelog, Release Notes & Semantic Versioning MCP Server**  
> Supercharge your coding agents (Antigravity, Cursor, Claude Code, Agensi) with intelligent git history analysis, automated release management, and cross-platform release announcements.

---

## ✨ Features

- 🔍 **Smart Conventional Commits Parsing**: Automatically classifies commits (`feat`, `fix`, `perf`, `docs`, `refactor`, `breaking changes`, etc.) with intelligent fallback inference for free-form commits.
- 🏷️ **Automated SemVer Recommendation**: Analyzes changes to determine the exact next version bump (`major`, `minor`, `patch`) per SemVer specification, taking into account `0.x` pre-release rules.
- 📝 **Multi-Format Changelog Generation**:
  - **Keep a Changelog**: Standardized markdown adhering to [keepachangelog.com](https://keepachangelog.com).
  - **GitHub Release**: Rich markdown with badges, emojis, and contributor shoutouts.
  - **Simple**: Clean, minimal markdown for fast digests.
- 📢 **Omnichannel Release Announcements**: Generates tailored copy for:
  - 💬 **Slack** (mrkdwn formatted)
  - 🎮 **Discord** (markdown + embeds styling)
  - 🐦 **Twitter / X** (concise < 280 chars)
  - ✉️ **Email / Newsletter** (formatted newsletter layout)
- 🔌 **Universal Model Context Protocol (MCP)**: Native integration across Claude Desktop, Cursor, Antigravity IDE, Windsurf, Zed, and Agensi.

---

## 📦 Installation & Quickstart

### Run via npx (No install needed)

```bash
npx changelog-pilot
```

### Install globally

```bash
npm install -g changelog-pilot
```

---

## ⚙️ MCP Configuration

### 1. Claude Desktop (`claude_desktop_config.json`)

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

### 2. Antigravity IDE / Cursor / Agensi (`mcp.json` / settings)

```json
{
  "mcpServers": {
    "changelog-pilot": {
      "command": "node",
      "args": ["D:/changelog-pilot/dist/index.js"]
    }
  }
}
```

---

## 🛠️ Available MCP Tools

| Tool | Description | Key Parameters |
| :--- | :--- | :--- |
| `analyze_commits` | Parses & categorizes commits between two git refs, detecting breaking changes. | `cwd`, `from`, `to` |
| `suggest_version` | Determines next SemVer version (`major`/`minor`/`patch`) with explanations. | `cwd`, `from`, `current_version` |
| `generate_changelog` | Outputs full changelog in `keepachangelog`, `github`, or `simple` format. | `cwd`, `from`, `to`, `version`, `format` |
| `generate_release_notes` | Produces user-facing release notes highlighting major changes & impact. | `cwd`, `from`, `to`, `version` |
| `draft_announcement` | Creates tailored announcement copy for Slack, Discord, Twitter/X, or Email. | `cwd`, `from`, `to`, `platform`, `product_name`, `url` |

---

## 💡 Example Prompt for Agents

> *"Use `changelog-pilot` to analyze our git commits since the last tag, recommend the next version, and draft a GitHub Release note with a Slack announcement."*

---

## 🧑‍💻 Contributing & Development

```bash
# Clone the repository
git clone https://github.com/ghazy2001/changelog-pilot.git
cd changelog-pilot

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start local server
npm start
```

---

## 📄 License

MIT © [Mahmoud Ghazy](https://github.com/ghazy2001)
