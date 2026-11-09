import { getGitLog } from './git.js';
import { parseCommit, type ParsedCommit } from './parser.js';

export interface VersionSuggestion {
  current: string;
  suggested: string;
  version: string; // alias for suggested
  bump: 'major' | 'minor' | 'patch';
  reason: string;
  breaking: string[];
  features: string[];
  fixes: string[];
}

/**
 * Strip a leading 'v' or 'V' prefix from a version string.
 */
function stripLeadingV(version: string): string {
  return version.replace(/^v/i, '');
}

/**
 * Parse a semver string into its three numeric components.
 * Returns [major, minor, patch]. Defaults to [0, 0, 0] on invalid input.
 */
function parseSemver(version: string): [number, number, number] {
  const clean = stripLeadingV(version).split('+')[0].split('-')[0];
  const parts = clean.split('.').map(Number);
  const major = Number.isFinite(parts[0]) ? parts[0] : 0;
  const minor = Number.isFinite(parts[1]) ? parts[1] : 0;
  const patch = Number.isFinite(parts[2]) ? parts[2] : 0;
  return [major, minor, patch];
}

/**
 * Bump a semver string by the given level.
 *
 * Rules:
 *  - major: increment major, reset minor & patch
 *  - minor: increment minor, reset patch
 *  - patch: increment patch
 */
export function bumpVersion(
  version: string,
  bump: 'major' | 'minor' | 'patch',
): string {
  const [major, minor, patch] = parseSemver(version);

  switch (bump) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Analyse a set of commits and suggest the next semantic version.
 * Can be called with:
 * - `{ commits: ParsedCommit[], currentVersion?: string }`
 * - `(commits: ParsedCommit[], currentVersion?: string)`
 * - `(cwd: string, from?: string, currentVersion?: string)`
 */
export function suggestVersion(
  arg1: { commits: ParsedCommit[]; currentVersion?: string } | ParsedCommit[] | string,
  arg2?: string,
  arg3?: string,
): VersionSuggestion {
  let commits: ParsedCommit[];
  let currentVersion = '0.0.0';

  if (Array.isArray(arg1)) {
    commits = arg1;
    if (typeof arg2 === 'string') currentVersion = arg2;
  } else if (typeof arg1 === 'string') {
    // Called as suggestVersion(cwd, from, currentVersion)
    const cwd = arg1;
    const from = arg2;
    if (typeof arg3 === 'string') currentVersion = arg3;
    const raw = getGitLog({ cwd, from, to: 'HEAD' });
    commits = raw.map(parseCommit);
  } else if (arg1 && typeof arg1 === 'object') {
    commits = arg1.commits;
    currentVersion = arg1.currentVersion ?? '0.0.0';
  } else {
    commits = [];
  }

  const clean = stripLeadingV(currentVersion);
  const [major] = parseSemver(clean);

  const breaking: string[] = [];
  const features: string[] = [];
  const fixes: string[] = [];

  for (const commit of commits) {
    if (commit.isBreaking || commit.breaking) {
      const label =
        commit.breakingNote ?? commit.breakingBody ?? commit.subject ?? commit.header ?? 'breaking change';
      breaking.push(label);
    }

    if (commit.type === 'feat') {
      features.push(commit.subject ?? commit.header ?? 'new feature');
    } else if (commit.type === 'fix') {
      fixes.push(commit.subject ?? commit.header ?? 'bug fix');
    }
  }

  let bump: 'major' | 'minor' | 'patch';
  let reason: string;

  if (breaking.length > 0) {
    if (major === 0) {
      // Pre-1.0: breaking changes bump minor, not major
      bump = 'minor';
      reason = `${breaking.length} breaking change(s) detected — bumping minor (pre-1.0)`;
    } else {
      bump = 'major';
      reason = `${breaking.length} breaking change(s) detected — bumping major`;
    }
  } else if (features.length > 0) {
    bump = 'minor';
    reason = `${features.length} new feature(s) detected — bumping minor`;
  } else if (fixes.length > 0) {
    bump = 'patch';
    reason = `${fixes.length} bug fix(es) detected — bumping patch`;
  } else {
    bump = 'patch';
    reason = 'No features or fixes detected — defaulting to patch bump';
  }

  const suggested = bumpVersion(clean, bump);

  return {
    current: clean,
    suggested,
    version: suggested,
    bump,
    reason,
    breaking,
    features,
    fixes,
  };
}