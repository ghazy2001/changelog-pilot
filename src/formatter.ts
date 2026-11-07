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
  const sshMatch = normalised.match(
    /^git@([^:]+):(.+)$/,
  );
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
 * Format a single commit line with optional scope emphasis.
 */
function commitLine(
  commit: ParsedCommit,
  opts?: { bold?: boolean; repoUrl?: string | null },
): string {
  const subject = commit.subject ?? commit.header ?? '';
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
      const body = commit.breakingBody ?? commit.subject ?? commit.header ?? '';
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
}): string {
  const { version, groups, breaking, contributors } = opts;
  const lines: string[] = [];

  lines.push(`# 🚀 ${version}`);
  lines.push('');

  // Breaking changes
  if (breaking.length > 0) {
    lines.push('## ⚠️ Breaking Changes');
    lines.push('');
    for (const commit of breaking) {
      const body = commit.breakingBody ?? commit.subject ?? commit.header ?? '';
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
      lines.push(`- ${commitLine(commit, { bold: true })}`);
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
    lines.push('**Highlights**');
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
    lines.push(`📋 Full changelog: < ${url} >`);
  }

  return lines.join('\n').trimEnd() + '\n';
}

// -- Twitter ----------------------------------------------------------------

function formatTwitter(opts: {
  version: string;
  productName: string;
  highlights: string[];
  breaking: ParsedCommit[];
  url?: string;
}): string {
  const { version, productName, highlights, url } = opts;

  // Build tweet under 280 chars
  let tweet = `✨ ${productName} ${version} is here!\n\n`;

  const maxHighlights = Math.min(highlights.length, 3);
  for (let i = 0; i < maxHighlights; i++) {
    const bullet = `• ${highlights[i]}\n`;
    if (tweet.length + bullet.length > (url ? 250 : 278)) break;
    tweet += bullet;
  }

  if (url) {
    tweet += `\n${url}`;
  }

  // Final truncation safety
  if (tweet.length > 280) {
    tweet = tweet.slice(0, 277) + '...';
  }

  return tweet.trimEnd() + '\n';
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
