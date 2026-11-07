#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  getGitLog,
  getLatestTag,
  getRepoRemoteUrl,
} from './git.js';
import type { RawCommit } from './git.js';
import { parseCommit, groupCommits, getBreakingChanges } from './parser.js';
import type { ParsedCommit, CommitGroup } from './parser.js';
import { suggestVersion } from './version.js';
import type { VersionSuggestion } from './version.js';
import {
  formatKeepAChangelog,
  formatGitHubRelease,
  formatSimple,
  formatAnnouncement,
  updateChangelogFile,
} from './formatter.js';
import type { ChangelogFormat, AnnouncementPlatform } from './formatter.js';

// ---------------------------------------------------------------------------
// CLI Mode (if run directly in terminal with arguments)
// ---------------------------------------------------------------------------

const cliArgs = process.argv.slice(2);

if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
  console.log(`
🚀 Changelog Pilot — AI-Powered Git Changelog, Release Notes & SemVer MCP Server

Usage:
  npx changelog-pilot                  Run as Model Context Protocol (MCP) server (stdio)
  npx changelog-pilot --preview        Print changelog preview for current repo
  npx changelog-pilot --suggest        Suggest next semantic version
  npx changelog-pilot --write          Generate & update CHANGELOG.md file
  npx changelog-pilot --version        Display changelog-pilot version
`);
  process.exit(0);
}

if (cliArgs.includes('--version') || cliArgs.includes('-v')) {
  console.log('changelog-pilot v1.0.0');
  process.exit(0);
}

if (cliArgs.includes('--suggest')) {
  const cwd = process.cwd();
  const raw = getGitLog({ cwd, to: 'HEAD' });
  const parsed = raw.map(parseCommit);
  const suggestion = suggestVersion({ commits: parsed });
  console.log(`Current:   ${suggestion.current}`);
  console.log(`Suggested: ${suggestion.suggested} (${suggestion.bump})`);
  console.log(`Reason:    ${suggestion.reason}`);
  process.exit(0);
}

if (cliArgs.includes('--preview')) {
  const cwd = process.cwd();
  const from = getLatestTag(cwd) ?? undefined;
  let raw = getGitLog({ cwd, from, to: 'HEAD' });
  if (raw.length === 0 && from) {
    console.log(`ℹ️ No new commits since tag ${from}. Showing latest commits preview:`);
    raw = getGitLog({ cwd, to: 'HEAD', maxCount: 15 });
  }
  const parsed = raw.map(parseCommit);
  const groups = groupCommits(parsed);
  const breaking = getBreakingChanges(parsed);
  const ver = suggestVersion({ commits: parsed, currentVersion: from ?? '0.0.0' }).version;
  const repoUrl = getRepoRemoteUrl(cwd);
  const md = formatKeepAChangelog({
    version: ver,
    date: new Date().toISOString().slice(0, 10),
    groups,
    breaking,
    repoUrl,
  });
  console.log(md);
  process.exit(0);
}

if (cliArgs.includes('--write')) {
  const cwd = process.cwd();
  const from = getLatestTag(cwd) ?? undefined;
  const raw = getGitLog({ cwd, from, to: 'HEAD' });
  if (raw.length === 0 && from) {
    console.log(`ℹ️ No new commits since tag ${from}. Nothing to update.`);
    process.exit(0);
  }
  const parsed = raw.map(parseCommit);
  const groups = groupCommits(parsed);
  const breaking = getBreakingChanges(parsed);
  const ver = suggestVersion({ commits: parsed, currentVersion: from ?? '0.0.0' }).version;
  const repoUrl = getRepoRemoteUrl(cwd);
  const md = formatKeepAChangelog({
    version: ver,
    date: new Date().toISOString().slice(0, 10),
    groups,
    breaking,
    repoUrl,
  });
  const res = updateChangelogFile({ cwd, changelogContent: md });
  console.log(`✅ Successfully updated ${res.filePath} (${res.isNew ? 'New' : 'Prepended'})`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// MCP Server Initialization
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'changelog-pilot', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'analyze_commits',
      description:
        'Analyze git commits between two refs. Parses conventional commits, categorizes changes, and identifies breaking changes.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          cwd: { type: 'string', description: 'Working directory of the git repository.' },
          from: { type: 'string', description: 'Start ref (defaults to latest tag).' },
          to: { type: 'string', description: 'End ref (defaults to HEAD).' },
        },
      },
    },
    {
      name: 'generate_changelog',
      description:
        'Generate a formatted changelog entry from git commits. Supports Keep a Changelog, GitHub Release, and simple formats.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          cwd: { type: 'string', description: 'Working directory of the git repository.' },
          from: { type: 'string', description: 'Start ref (defaults to latest tag).' },
          to: { type: 'string', description: 'End ref (defaults to HEAD).' },
          version: {
            type: 'string',
            description: 'Version string for the changelog entry. Auto-suggested if not provided.',
          },
          format: {
            type: 'string',
            enum: ['keepachangelog', 'github', 'simple'],
            description: 'Output format (default: keepachangelog).',
          },
        },
      },
    },
    {
      name: 'update_changelog_file',
      description:
        'Write or prepend a formatted changelog entry into CHANGELOG.md, preserving existing version history.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          cwd: { type: 'string', description: 'Working directory of the git repository.' },
          from: { type: 'string', description: 'Start ref (defaults to latest tag).' },
          to: { type: 'string', description: 'End ref (defaults to HEAD).' },
          version: {
            type: 'string',
            description: 'Version string for the changelog entry. Auto-suggested if not provided.',
          },
          format: {
            type: 'string',
            enum: ['keepachangelog', 'github', 'simple'],
            description: 'Output format (default: keepachangelog).',
          },
          file_path: {
            type: 'string',
            description: 'Target changelog file path (default: CHANGELOG.md).',
          },
        },
      },
    },
    {
      name: 'suggest_version',
      description:
        'Analyze commits and suggest the next semantic version based on conventional commit types and breaking changes.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          cwd: { type: 'string', description: 'Working directory of the git repository.' },
          from: { type: 'string', description: 'Start ref (defaults to latest tag).' },
          current_version: {
            type: 'string',
            description: 'Current version (defaults to latest tag or 0.0.0).',
          },
        },
      },
    },
    {
      name: 'generate_release_notes',
      description:
        'Generate user-facing release notes highlighting the most important changes, grouped by impact.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          cwd: { type: 'string', description: 'Working directory of the git repository.' },
          from: { type: 'string', description: 'Start ref (defaults to latest tag).' },
          to: { type: 'string', description: 'End ref (defaults to HEAD).' },
          version: {
            type: 'string',
            description: 'Version string for the release notes. Auto-suggested if not provided.',
          },
        },
      },
    },
    {
      name: 'draft_announcement',
      description:
        'Draft a release announcement for Slack, Discord, Twitter/X, or email from git commits.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          cwd: { type: 'string', description: 'Working directory of the git repository.' },
          from: { type: 'string', description: 'Start ref (defaults to latest tag).' },
          to: { type: 'string', description: 'End ref (defaults to HEAD).' },
          platform: {
            type: 'string',
            enum: ['slack', 'discord', 'twitter', 'email'],
            description: 'Target platform for the announcement.',
          },
          product_name: { type: 'string', description: 'Name of the product.' },
          version: {
            type: 'string',
            description: 'Version string. Auto-suggested if not provided.',
          },
          url: { type: 'string', description: 'Release URL to include in the announcement.' },
        },
        required: ['platform', 'product_name'],
      },
    },
  ],
}));

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function handleAnalyzeCommits(args: Record<string, unknown>) {
  const cwd = (args.cwd as string) || process.cwd();
  const from = (args.from as string) || (getLatestTag(cwd) ?? undefined);
  const to = (args.to as string) || 'HEAD';

  const rawCommits = getGitLog({ cwd, from, to });
  const parsed: ParsedCommit[] = rawCommits.map(parseCommit);
  const groups: CommitGroup[] = groupCommits(parsed);
  const breakingChanges = getBreakingChanges(parsed);

  const contributors = [
    ...new Set(rawCommits.map((c: RawCommit) => c.author)),
  ].sort();

  const featuresCount = parsed.filter((c) => c.type === 'feat').length;
  const fixesCount = parsed.filter((c) => c.type === 'fix').length;

  const summary = {
    total: parsed.length,
    breaking: breakingChanges.length,
    features: featuresCount,
    fixes: fixesCount,
    other: parsed.length - featuresCount - fixesCount,
    contributors,
    range: from ? `${from}..${to}` : to,
  };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ summary, groups, breakingChanges }, null, 2),
      },
    ],
  };
}

async function handleGenerateChangelog(args: Record<string, unknown>) {
  const cwd = (args.cwd as string) || process.cwd();
  const from = (args.from as string) || (getLatestTag(cwd) ?? undefined);
  const to = (args.to as string) || 'HEAD';
  const format = ((args.format as string) || 'keepachangelog') as ChangelogFormat;

  const rawCommits = getGitLog({ cwd, from, to });
  const parsed: ParsedCommit[] = rawCommits.map(parseCommit);
  const groups: CommitGroup[] = groupCommits(parsed);
  const breakingChanges = getBreakingChanges(parsed);
  const repoUrl = getRepoRemoteUrl(cwd);
  const contributors = [
    ...new Set(rawCommits.map((c: RawCommit) => c.author)),
  ].sort();
  const date = new Date().toISOString().slice(0, 10);

  const version =
    (args.version as string) ||
    suggestVersion({ commits: parsed, currentVersion: from ?? '0.0.0' }).version;

  let markdown: string;
  switch (format) {
    case 'github':
      markdown = formatGitHubRelease({
        version,
        groups,
        breaking: breakingChanges,
        contributors,
        repoUrl,
      });
      break;
    case 'simple':
      markdown = formatSimple({
        version,
        date,
        groups,
      });
      break;
    case 'keepachangelog':
    default:
      markdown = formatKeepAChangelog({
        version,
        date,
        groups,
        breaking: breakingChanges,
        repoUrl,
      });
      break;
  }

  return {
    content: [{ type: 'text' as const, text: markdown }],
  };
}

async function handleUpdateChangelogFile(args: Record<string, unknown>) {
  const cwd = (args.cwd as string) || process.cwd();
  const from = (args.from as string) || (getLatestTag(cwd) ?? undefined);
  const to = (args.to as string) || 'HEAD';
  const format = ((args.format as string) || 'keepachangelog') as ChangelogFormat;
  const filePath = (args.file_path as string) || 'CHANGELOG.md';

  const rawCommits = getGitLog({ cwd, from, to });
  const parsed: ParsedCommit[] = rawCommits.map(parseCommit);
  const groups: CommitGroup[] = groupCommits(parsed);
  const breakingChanges = getBreakingChanges(parsed);
  const repoUrl = getRepoRemoteUrl(cwd);
  const contributors = [
    ...new Set(rawCommits.map((c: RawCommit) => c.author)),
  ].sort();
  const date = new Date().toISOString().slice(0, 10);

  const version =
    (args.version as string) ||
    suggestVersion({ commits: parsed, currentVersion: from ?? '0.0.0' }).version;

  let markdown: string;
  switch (format) {
    case 'github':
      markdown = formatGitHubRelease({
        version,
        groups,
        breaking: breakingChanges,
        contributors,
        repoUrl,
      });
      break;
    case 'simple':
      markdown = formatSimple({
        version,
        date,
        groups,
      });
      break;
    case 'keepachangelog':
    default:
      markdown = formatKeepAChangelog({
        version,
        date,
        groups,
        breaking: breakingChanges,
        repoUrl,
      });
      break;
  }

  const result = updateChangelogFile({
    cwd,
    changelogContent: markdown,
    filePath,
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: `✅ Successfully ${result.isNew ? 'created' : 'updated'} ${result.filePath} for version ${version}`,
      },
    ],
  };
}

async function handleSuggestVersion(args: Record<string, unknown>) {
  const cwd = (args.cwd as string) || process.cwd();
  const from = (args.from as string) || (getLatestTag(cwd) ?? undefined);
  const currentVersion = (args.current_version as string) || from || undefined;

  const rawCommits = getGitLog({ cwd, from, to: 'HEAD' });
  const parsed: ParsedCommit[] = rawCommits.map(parseCommit);

  const suggestion: VersionSuggestion = suggestVersion({
    commits: parsed,
    currentVersion,
  });

  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(suggestion, null, 2) },
    ],
  };
}

async function handleGenerateReleaseNotes(args: Record<string, unknown>) {
  const cwd = (args.cwd as string) || process.cwd();
  const from = (args.from as string) || (getLatestTag(cwd) ?? undefined);
  const to = (args.to as string) || 'HEAD';

  const rawCommits = getGitLog({ cwd, from, to });
  const parsed: ParsedCommit[] = rawCommits.map(parseCommit);
  const breakingChanges = getBreakingChanges(parsed);

  const version =
    (args.version as string) ||
    suggestVersion({ commits: parsed, currentVersion: from ?? '0.0.0' }).version;

  const lines: string[] = [];
  lines.push(`# What's New in ${version}`, '');

  // Breaking Changes
  if (breakingChanges.length > 0) {
    lines.push('## ⚠️ Breaking Changes', '');
    for (const bc of breakingChanges) {
      lines.push(`- ${bc.breakingNote ?? bc.subject}`);
    }
    lines.push('');
  }

  // New Features
  const features = parsed.filter((c) => c.type === 'feat');
  if (features.length > 0) {
    lines.push('## ✨ New Features', '');
    for (const f of features) {
      const scope = f.scope ? `**${f.scope}:** ` : '';
      lines.push(`- ${scope}${f.subject}`);
    }
    lines.push('');
  }

  // Bug Fixes
  const fixes = parsed.filter((c) => c.type === 'fix');
  if (fixes.length > 0) {
    lines.push('## 🐛 Bug Fixes', '');
    for (const f of fixes) {
      const scope = f.scope ? `**${f.scope}:** ` : '';
      lines.push(`- ${scope}${f.subject}`);
    }
    lines.push('');
  }

  // Performance
  const perf = parsed.filter((c) => c.type === 'perf');
  if (perf.length > 0) {
    lines.push('## ⚡ Performance', '');
    for (const p of perf) {
      const scope = p.scope ? `**${p.scope}:** ` : '';
      lines.push(`- ${scope}${p.subject}`);
    }
    lines.push('');
  }

  // Stats footer
  const contributors = [
    ...new Set(rawCommits.map((c: RawCommit) => c.author)),
  ];
  lines.push('---', '');
  lines.push(
    `📊 **${parsed.length}** commits from **${contributors.length}** contributor${contributors.length !== 1 ? 's' : ''}`,
  );

  return {
    content: [{ type: 'text' as const, text: lines.join('\n') }],
  };
}

async function handleDraftAnnouncement(args: Record<string, unknown>) {
  const cwd = (args.cwd as string) || process.cwd();
  const from = (args.from as string) || (getLatestTag(cwd) ?? undefined);
  const to = (args.to as string) || 'HEAD';
  const platform = args.platform as AnnouncementPlatform;
  const productName = args.product_name as string;
  const url = (args.url as string) || undefined;

  const rawCommits = getGitLog({ cwd, from, to });
  const parsed: ParsedCommit[] = rawCommits.map(parseCommit);
  const breakingChanges = getBreakingChanges(parsed);

  const version =
    (args.version as string) ||
    suggestVersion({ commits: parsed, currentVersion: from ?? '0.0.0' }).version;

  const features = parsed.filter((c) => c.type === 'feat');
  const fixes = parsed
    .filter((c) => c.type === 'fix')
    .slice(0, 3);
  const highlights = [
    ...features.map((f) => (f.scope ? `${f.scope}: ${f.subject}` : f.subject)),
    ...fixes.map((fx) => (fx.scope ? `${fx.scope}: ${fx.subject}` : fx.subject)),
  ];

  const announcement = formatAnnouncement({
    platform,
    version,
    productName,
    highlights,
    breaking: breakingChanges,
    url,
  });

  return {
    content: [{ type: 'text' as const, text: announcement }],
  };
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'analyze_commits':
        return await handleAnalyzeCommits(args);
      case 'generate_changelog':
        return await handleGenerateChangelog(args);
      case 'update_changelog_file':
        return await handleUpdateChangelogFile(args);
      case 'suggest_version':
        return await handleSuggestVersion(args);
      case 'generate_release_notes':
        return await handleGenerateReleaseNotes(args);
      case 'draft_announcement':
        return await handleDraftAnnouncement(args);
      default:
        return {
          content: [
            { type: 'text' as const, text: `Unknown tool: ${name}` },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text' as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('changelog-pilot MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
