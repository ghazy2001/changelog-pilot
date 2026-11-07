import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ParsedCommit, CommitGroup } from './parser.js';

export type ChangelogFormat = 'keepachangelog' | 'github' | 'simple';
export type AnnouncementPlatform = 'slack' | 'discord' | 'twitter' | 'email';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map conventional-commit type strings to Keep a Changelog section headings.
 */
const TYPE_TO_SECTION: Record<string, string> = {
  feat: 'Added',
  fix: 'Fixed',
  refactor: 'Changed',
  perf: 'Changed',
  style: 'Changed',
  revert: 'Removed',
  docs: 'Changed',
  build: 'Changed',
  ci: 'Changed',
  chore: 'Changed',
  test: 'Changed',
  deprecate: 'Deprecated',
  security: 'Security',
};

/** Emoji prefixes used in GitHub Release style. */
const TYPE_EMOJI: Record<string, string> = {
  feat: '✨ Features',
  fix: '🐛 Bug Fixes',
  refactor: '♻️ Refactors',
  perf: '⚡ Performance',
  docs: '📝 Documentation',
  style: '🎨 Style',
  build: '📦 Build',
  ci: '🔧 CI',
  chore: '🧹 Chores',
  test: '✅ Tests',
  revert: '⏪ Reverts',
};

/**
 * Normalise a git remote URL to an HTTPS base URL (no trailing slash).
 * Handles `git@github.com:owner/repo.git` and similar SSH formats.
 */
function normaliseRepoUrl(url: string): string {
  let normalised = url.trim().replace(/\/+$/, '').replace(/\.git$/, '');

  // SSH → HTTPS
  const sshMatch = normalised.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    normalised = `https://${sshMatch[1]}/${sshMatch[2]}`;
  }

  return normalised;
}

/**
 * Format a commit hash as an optional clickable link.
 */
function commitRef(
  commit: ParsedCommit,
  repoUrl?: string | null,
): string {
  const short = (commit.hash ?? '').slice(0, 7);
  if (!short) return '';
  if (repoUrl) {
    const base = normaliseRepoUrl(repoUrl);
    return ` ([${short}](${base}/commit/${commit.hash}))`;
  }
  return ` (${short})`;
}

/**
 * Auto-link PR and issue numbers e.g. #123 to GitHub PR/issue URLs.
 */
function linkIssues(text: string, repoUrl?: string | null): string {
  if (!repoUrl) return text;
  const base = normaliseRepoUrl(repoUrl);
  return text.replace(/(?<!\[)#(\d+)(?!\])/g, `[#$1](${base}/pull/$1)`);
}

/**
 * Format a single commit line with optional scope emphasis and links.
 */
function commitLine(
  commit: ParsedCommit,
  opts?: { bold?: boolean; repoUrl?: string | null },
): string {
  let subject = commit.subject ?? commit.header ?? '';
  if (opts?.repoUrl) {
    subject = linkIssues(subject, opts.repoUrl);
  }
  const scope = commit.scope;
  const ref = commitRef(commit, opts?.repoUrl);

  if (scope) {
    const scopeStr = opts?.bold ? `**${scope}:** ` : `${scope}: `;
    return `${scopeStr}${subject}${ref}`;
  }
  return `${subject}${ref}`;
}

// ---------------------------------------------------------------------------
// Keep a Changelog
// ---------------------------------------------------------------------------

/**
 * Format groups into the Keep a Changelog specification.
 * @see https://keepachangelog.com
 */
export function formatKeepAChangelog(opts: {
  version: string;
  date: string;
  groups: CommitGroup[];
  breaking: ParsedCommit[];
  repoUrl?: string | null;
}): string {
  const { version, date, groups, breaking, repoUrl } = opts;
  const lines: string[] = [];

  lines.push(`## [${version}] - ${date}`);
  lines.push('');

  // Breaking changes section first
  if (breaking.length > 0) {
    lines.push('### ⚠ BREAKING CHANGES');
    lines.push('');
    for (const commit of breaking) {
      let body = commit.breakingBody ?? commit.subject ?? commit.header ?? '';
      if (repoUrl) body = linkIssues(body, repoUrl);
      lines.push(`- ${body}${commitRef(commit, repoUrl)}`);
    }
    lines.push('');
  }

  // Bucket commits by Keep a Changelog section
  const sectionOrder = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];
  const sections = new Map<string, string[]>();

  for (const group of groups) {
    const sectionName = TYPE_TO_SECTION[group.type] ?? 'Changed';
    if (!sections.has(sectionName)) {
      sections.set(sectionName, []);
    }
    const bucket = sections.get(sectionName)!;
    for (const commit of group.commits) {
      bucket.push(`- ${commitLine(commit, { repoUrl })}`);
    }
  }

  for (const section of sectionOrder) {
    const items = sections.get(section);
    if (!items || items.length === 0) continue;
    lines.push(`### ${section}`);
    lines.push('');
    lines.push(...items);
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

// ---------------------------------------------------------------------------
// GitHub Release
// ---------------------------------------------------------------------------

/**
 * Format groups for a GitHub Release (emoji-rich, contributor mentions).
 */
export function formatGitHubRelease(opts: {
  version: string;
  groups: CommitGroup[];
  breaking: ParsedCommit[];
  contributors?: string[];
  repoUrl?: string | null;
}): string {
  const { version, groups, breaking, contributors, repoUrl } = opts;
  const lines: string[] = [];

  lines.push(`# 🚀 ${version}`);
  lines.push('');

  // Breaking changes
  if (breaking.length > 0) {
    lines.push('## ⚠️ Breaking Changes');
    lines.push('');
    for (const commit of breaking) {
      let body = commit.breakingBody ?? commit.subject ?? commit.header ?? '';
      if (repoUrl) body = linkIssues(body, repoUrl);
      lines.push(`- ${body}`);
    }
    lines.push('');
  }

  // Grouped by type with emojis
  for (const group of groups) {
    if (group.commits.length === 0) continue;
    const heading = TYPE_EMOJI[group.type] ?? `📌 ${group.label}`;
    lines.push(`## ${heading}`);
    lines.push('');
    for (const commit of group.commits) {
      lines.push(`- ${commitLine(commit, { bold: true, repoUrl })}`);
    }
    lines.push('');
  }

  // Contributors
  if (contributors && contributors.length > 0) {
    lines.push('## 👥 Contributors');
    lines.push('');
    lines.push(contributors.map((c) => `@${c.replace(/^@/, '')}`).join(', '));
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

// ---------------------------------------------------------------------------
// Simple
// ---------------------------------------------------------------------------

/**
 * Minimal, clean changelog format.
 */
export function formatSimple(opts: {
  version: string;
  date: string;
  groups: CommitGroup[];
}): string {
  const { version, date, groups } = opts;
  const lines: string[] = [];

  lines.push(`# ${version} (${date})`);
  lines.push('');

  for (const group of groups) {
    if (group.commits.length === 0) continue;
    lines.push(`### ${group.label}`);
    lines.push('');
    for (const commit of group.commits) {
      const subject = commit.subject ?? commit.header ?? '';
      lines.push(`- ${subject}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

/**
 * Format a release announcement tailored to a specific platform.
 */
export function formatAnnouncement(opts: {
  platform: AnnouncementPlatform;
  version: string;
  productName: string;
  highlights: string[];
  breaking: ParsedCommit[];
  url?: string;
}): string {
  switch (opts.platform) {
    case 'slack':
      return formatSlack(opts);
    case 'discord':
      return formatDiscord(opts);
    case 'twitter':
      return formatTwitter(opts);
    case 'email':
      return formatEmail(opts);
  }
}

// -- Slack ------------------------------------------------------------------

function formatSlack(opts: {
  version: string;
  productName: string;
  highlights: string[];
  breaking: ParsedCommit[];
  url?: string;
}): string {
  const { version, productName, highlights, breaking, url } = opts;
  const lines: string[] = [];

  lines.push(`🚀 *${productName} ${version} is out!*`);
  lines.push('');

  if (highlights.length > 0) {
    lines.push('*Highlights:*');
    for (const h of highlights) {
      lines.push(`  • ${h}`);
    }
    lines.push('');
  }

  if (breaking.length > 0) {
    lines.push('⚠️ *Breaking Changes:*');
    for (const commit of breaking) {
      const body = commit.breakingBody ?? commit.subject ?? commit.header ?? '';
      lines.push(`  • ${body}`);
    }
    lines.push('');
  }

  if (url) {
    lines.push(`📋 Full changelog: ${url}`);
  }

  return lines.join('\n').trimEnd() + '\n';
}

// -- Discord ----------------------------------------------------------------

function formatDiscord(opts: {
  version: string;
  productName: string;
  highlights: string[];
  breaking: ParsedCommit[];
  url?: string;
}): string {
  const { version, productName, highlights, breaking, url } = opts;
  const lines: string[] = [];

  lines.push(`# 🚀 ${productName} ${version}`);
  lines.push('');

  if (highlights.length > 0) {
    lines.push('### Highlights');
    for (const h of highlights) {
      lines.push(`- ${h}`);
    }
    lines.push('');
  }

  if (breaking.length > 0) {
    lines.push('> ⚠️ **Breaking Changes**');
    for (const commit of breaking) {
      const body = commit.breakingBody ?? commit.subject ?? commit.header ?? '';
      lines.push(`> - ${body}`);
    }
    lines.push('');
  }

  if (url) {
    lines.push(`[Full Changelog](<${url}>)`);
  }

  return lines.join('\n').trimEnd() + '\n';
}

// -- Twitter / X ------------------------------------------------------------

function formatTwitter(opts: {
  version: string;
  productName: string;
  highlights: string[];
  url?: string;
}): string {
  const { version, productName, highlights, url } = opts;
  const lines: string[] = [];

  lines.push(`🚀 ${productName} ${version} is live!`);
  lines.push('');

  const topHighlights = highlights.slice(0, 3);
  for (const h of topHighlights) {
    lines.push(`✨ ${h}`);
  }

  if (url) {
    lines.push('');
    lines.push(url);
  }

  let result = lines.join('\n');
  if (result.length > 280) {
    const withoutUrl = lines.slice(0, -2).join('\n');
    result = withoutUrl.length <= 280 ? withoutUrl : withoutUrl.slice(0, 277) + '...';
  }

  return result;
}

// -- Email ------------------------------------------------------------------

function formatEmail(opts: {
  version: string;
  productName: string;
  highlights: string[];
  breaking: ParsedCommit[];
  url?: string;
}): string {
  const { version, productName, highlights, breaking, url } = opts;
  const lines: string[] = [];

  lines.push(`Subject: ${productName} ${version} Released`);
  lines.push('');
  lines.push(`Hi there,`);
  lines.push('');
  lines.push(
    `We're excited to announce **${productName} ${version}**! Here's what's new:`,
  );
  lines.push('');

  if (highlights.length > 0) {
    lines.push('## Highlights');
    lines.push('');
    for (const h of highlights) {
      lines.push(`- ${h}`);
    }
    lines.push('');
  }

  if (breaking.length > 0) {
    lines.push('## ⚠️ Breaking Changes');
    lines.push('');
    for (const commit of breaking) {
      const body = commit.breakingBody ?? commit.subject ?? commit.header ?? '';
      lines.push(`- ${body}`);
    }
    lines.push('');
    lines.push(
      'Please review the breaking changes above before upgrading.',
    );
    lines.push('');
  }

  if (url) {
    lines.push(`Full changelog: ${url}`);
    lines.push('');
  }

  lines.push('Happy coding!');
  lines.push(`The ${productName} Team`);

  return lines.join('\n').trimEnd() + '\n';
}

// ---------------------------------------------------------------------------
// File Updater
// ---------------------------------------------------------------------------

/**
 * Prepend or create a changelog entry in the project's CHANGELOG.md file.
 */
export function updateChangelogFile(opts: {
  cwd?: string;
  changelogContent: string;
  filePath?: string;
}): { filePath: string; isNew: boolean } {
  const cwd = opts.cwd ? resolve(opts.cwd) : process.cwd();
  const targetPath = resolve(cwd, opts.filePath ?? 'CHANGELOG.md');

  const header = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';

  if (!existsSync(targetPath)) {
    const full = `${header}${opts.changelogContent.trim()}\n`;
    writeFileSync(targetPath, full, 'utf-8');
    return { filePath: targetPath, isNew: true };
  }

  const existing = readFileSync(targetPath, 'utf-8');
  let updated: string;

  // Check if existing file has standard header
  if (existing.startsWith('# Changelog')) {
    const firstSectionIdx = existing.indexOf('\n## ');
    if (firstSectionIdx !== -1) {
      const top = existing.slice(0, firstSectionIdx + 1);
      const rest = existing.slice(firstSectionIdx + 1);
      updated = `${top}${opts.changelogContent.trim()}\n\n${rest}`;
    } else {
      updated = `${existing.trimEnd()}\n\n${opts.changelogContent.trim()}\n`;
    }
  } else {
    updated = `${opts.changelogContent.trim()}\n\n${existing}`;
  }

  writeFileSync(targetPath, updated, 'utf-8');
  return { filePath: targetPath, isNew: false };
}
