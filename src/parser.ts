import type { RawCommit } from './git.js';

export type CommitType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'style'
  | 'refactor'
  | 'perf'
  | 'test'
  | 'build'
  | 'ci'
  | 'chore'
  | 'revert'
  | 'other';

export interface ParsedCommit {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  type: CommitType;
  scope: string | null;
  subject: string;
  body: string;
  isBreaking: boolean;
  breakingNote: string | null;
  raw: string; // original subject line
  header?: string;
  breaking?: boolean;
  breakingBody?: string | null;
  description?: string;
  message?: string;
}

export interface CommitGroup {
  type: CommitType;
  label: string;
  emoji: string;
  commits: ParsedCommit[];
}

/** Human-readable labels and emojis for each conventional commit type. */
export const TYPE_META: Record<CommitType, { label: string; emoji: string }> = {
  feat: { label: 'Features', emoji: '✨' },
  fix: { label: 'Bug Fixes', emoji: '🐛' },
  docs: { label: 'Documentation', emoji: '📚' },
  style: { label: 'Styles', emoji: '💄' },
  refactor: { label: 'Code Refactoring', emoji: '♻️' },
  perf: { label: 'Performance Improvements', emoji: '⚡' },
  test: { label: 'Tests', emoji: '✅' },
  build: { label: 'Build System', emoji: '📦' },
  ci: { label: 'Continuous Integration', emoji: '🔧' },
  chore: { label: 'Chores', emoji: '🏠' },
  revert: { label: 'Reverts', emoji: '⏪' },
  other: { label: 'Other Changes', emoji: '📝' },
};

/** Display order used when rendering grouped changelogs. */
const DISPLAY_ORDER: CommitType[] = [
  'feat',
  'fix',
  'perf',
  'refactor',
  'docs',
  'style',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
  'other',
];

/**
 * Regex that matches the Conventional Commits specification.
 *
 * Groups: type, scope (optional), breaking (`!` suffix, optional), subject
 */
const CONVENTIONAL_RE =
  /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?\s*:\s*(?<subject>.+)$/;

/** Patterns checked against the **lowercased** subject for type inference. */
const KEYWORD_RULES: ReadonlyArray<{
  keywords: readonly string[];
  type: CommitType;
}> = [
  { keywords: ['fix', 'bugfix', 'hotfix'], type: 'fix' },
  { keywords: ['feat', 'add ', 'implement'], type: 'feat' },
  { keywords: ['docs', 'readme', 'documentation'], type: 'docs' },
  { keywords: ['test', 'spec'], type: 'test' },
  { keywords: ['refactor'], type: 'refactor' },
  { keywords: ['ci', 'pipeline', 'workflow'], type: 'ci' },
  { keywords: ['revert'], type: 'revert' },
  { keywords: ['perf', 'optimi'], type: 'perf' },
];

const BREAKING_BODY_RE = /^BREAKING[ -]CHANGE:\s*(?<note>.+)/m;

/**
 * Determine whether a commit type string is one of the known
 * `CommitType` values.
 */
function isKnownType(value: string): value is CommitType {
  return value in TYPE_META;
}

/**
 * Try to infer a commit type from free-form text by scanning for well-known
 * keywords.  Returns `'other'` when no keyword matches.
 */
function inferTypeFromSubject(subject: string): CommitType {
  const lower = subject.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.type;
    }
  }
  return 'other';
}

/**
 * Extract a breaking-change note from the commit body or footer, if present.
 */
function extractBreakingNote(body: string): string | null {
  const match = BREAKING_BODY_RE.exec(body);
  return match?.groups?.note?.trim() ?? null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a single {@link RawCommit} into a fully typed {@link ParsedCommit}.
 *
 * Conventional commits are parsed via regex; non-conventional subjects are
 * classified heuristically by keyword matching.
 */
export function parseCommit(raw: RawCommit): ParsedCommit {
  const match = CONVENTIONAL_RE.exec(raw.subject);

  let type: CommitType;
  let scope: string | null = null;
  let subject: string;
  let isBreaking = false;

  if (match?.groups) {
    const rawType = match.groups.type.toLowerCase();
    type = isKnownType(rawType) ? rawType : inferTypeFromSubject(raw.subject);
    scope = match.groups.scope?.trim() || null;
    subject = match.groups.subject.trim();
    isBreaking = match.groups.breaking === '!';
  } else {
    type = inferTypeFromSubject(raw.subject);
    subject = raw.subject;
  }

  // Also check for BREAKING CHANGE / BREAKING-CHANGE in body/footer
  const bodyBreakingNote = extractBreakingNote(raw.body);
  if (bodyBreakingNote) {
    isBreaking = true;
  }

  const breakingNote = isBreaking
    ? bodyBreakingNote ?? subject
    : null;

  return {
    hash: raw.hash,
    shortHash: raw.shortHash,
    author: raw.author,
    date: raw.date,
    type,
    scope,
    subject,
    body: raw.body,
    isBreaking,
    breakingNote,
    raw: raw.subject,
    header: raw.subject,
    breaking: isBreaking,
    breakingBody: breakingNote,
    description: subject,
    message: subject,
  };
}

/**
 * Group an array of {@link ParsedCommit}s by their type, in the canonical
 * display order.  Groups with zero commits are omitted.
 */
export function groupCommits(commits: ParsedCommit[]): CommitGroup[] {
  const buckets = new Map<CommitType, ParsedCommit[]>();

  for (const commit of commits) {
    const existing = buckets.get(commit.type);
    if (existing) {
      existing.push(commit);
    } else {
      buckets.set(commit.type, [commit]);
    }
  }

  const groups: CommitGroup[] = [];

  for (const commitType of DISPLAY_ORDER) {
    const items = buckets.get(commitType);
    if (items && items.length > 0) {
      const meta = TYPE_META[commitType];
      groups.push({
        type: commitType,
        label: meta.label,
        emoji: meta.emoji,
        commits: items,
      });
    }
  }

  return groups;
}

/**
 * Extract only the breaking-change commits from a list.
 */
export function getBreakingChanges(commits: ParsedCommit[]): ParsedCommit[] {
  return commits.filter((c) => c.isBreaking);
}
