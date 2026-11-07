import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const FIELD_SEP = '---CLP_SEP---';
const COMMIT_END = '---CLP_END---';
const MAX_BUFFER = 50 * 1024 * 1024; // 50 MB

export interface RawCommit {
  hash: string;
  shortHash: string;
  author: string;
  date: string; // ISO 8601
  subject: string;
  body: string;
}

/**
 * Retrieve git log entries between two refs.
 *
 * When `from` is omitted, the last `maxCount` (default: 50) commits up to `to` are returned.
 * When `to` is omitted it defaults to `HEAD`.
 */
export function getGitLog(
  optsOrCwd?: string | { cwd?: string; from?: string; to?: string; maxCount?: number },
  fromArg?: string,
  toArg?: string,
): RawCommit[] {
  let cwd: string;
  let from: string | undefined;
  let to: string;
  let maxCount: number | undefined;

  if (typeof optsOrCwd === 'string' || fromArg !== undefined || toArg !== undefined) {
    cwd = optsOrCwd ? resolve(optsOrCwd as string) : process.cwd();
    from = fromArg;
    to = toArg ?? 'HEAD';
  } else if (optsOrCwd && typeof optsOrCwd === 'object') {
    cwd = optsOrCwd.cwd ? resolve(optsOrCwd.cwd) : process.cwd();
    from = optsOrCwd.from;
    to = optsOrCwd.to ?? 'HEAD';
    maxCount = optsOrCwd.maxCount;
  } else {
    cwd = process.cwd();
    from = undefined;
    to = 'HEAD';
  }

  const range = from ? `${from}..${to}` : to;
  // If no start tag specified, limit to maxCount (default 50) to prevent buffer overflows on giant repos
  const limit = maxCount ? `-n ${maxCount}` : (!from ? '-n 50' : '');

  // %H  - full hash
  // %h  - abbreviated hash
  // %an - author name
  // %aI - author date (strict ISO 8601)
  // %s  - subject
  // %b  - body
  const format = [
    `%H${FIELD_SEP}%h${FIELD_SEP}%an${FIELD_SEP}%aI${FIELD_SEP}%s${FIELD_SEP}%b${COMMIT_END}`,
  ].join('');

  try {
    const raw = execSync(`git log --format="${format}" ${limit} ${range}`, {
      cwd,
      maxBuffer: MAX_BUFFER,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (!raw.trim()) {
      return [];
    }

    const entries = raw.split(COMMIT_END).filter((e) => e.trim().length > 0);

    return entries.map((entry) => {
      const fields = entry.trim().split(FIELD_SEP);
      return {
        hash: fields[0]?.trim() ?? '',
        shortHash: fields[1]?.trim() ?? '',
        author: fields[2]?.trim() ?? '',
        date: fields[3]?.trim() ?? '',
        subject: fields[4]?.trim() ?? '',
        body: fields[5]?.trim() ?? '',
      };
    });
  } catch {
    return [];
  }
}

/**
 * Return the latest semver tag in the repo, or `null` when none exists.
 *
 * Tags are sorted by version (`-v:refname`) so the first entry is the latest.
 */
export function getLatestTag(cwd?: string): string | null {
  const resolved = cwd ? resolve(cwd) : process.cwd();

  try {
    const output = execSync(
      'git tag --sort=-v:refname --list "v*"',
      {
        cwd: resolved,
        maxBuffer: MAX_BUFFER,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    ).trim();

    if (!output) {
      // Fall back to any tag if no v-prefixed tags exist
      const allTags = execSync(
        'git tag --sort=-v:refname',
        {
          cwd: resolved,
          maxBuffer: MAX_BUFFER,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      ).trim();

      if (!allTags) {
        return null;
      }

      return allTags.split('\n')[0]?.trim() ?? null;
    }

    return output.split('\n')[0]?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Return the name of the currently checked-out branch.
 */
export function getCurrentBranch(cwd?: string): string {
  const resolved = cwd ? resolve(cwd) : process.cwd();

  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: resolved,
      maxBuffer: MAX_BUFFER,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Return the remote `origin` URL, or `null` when unavailable.
 */
export function getRepoRemoteUrl(cwd?: string): string | null {
  const resolved = cwd ? resolve(cwd) : process.cwd();

  try {
    const url = execSync('git remote get-url origin', {
      cwd: resolved,
      maxBuffer: MAX_BUFFER,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    return url || null;
  } catch {
    return null;
  }
}

/**
 * Normalise a git remote URL to a plain HTTPS URL without the `.git` suffix.
 *
 * Handles both SSH (`git@host:owner/repo.git`) and HTTPS
 * (`https://host/owner/repo.git`) remotes.
 */
export function normalizeRepoUrl(url: string): string {
  let normalized = url.trim();

  // SSH → HTTPS   git@github.com:owner/repo.git
  const sshMatch = normalized.match(
    /^git@(?<host>[^:]+):(?<path>.+?)(?:\.git)?$/,
  );
  if (sshMatch?.groups) {
    return `https://${sshMatch.groups.host}/${sshMatch.groups.path}`;
  }

  // ssh://git@host/owner/repo.git
  const sshProtoMatch = normalized.match(
    /^ssh:\/\/git@(?<host>[^/]+)\/(?<path>.+?)(?:\.git)?$/,
  );
  if (sshProtoMatch?.groups) {
    return `https://${sshProtoMatch.groups.host}/${sshProtoMatch.groups.path}`;
  }

  // Strip trailing .git from HTTPS URLs
  normalized = normalized.replace(/\.git$/, '');

  // Ensure https:// prefix
  if (!normalized.startsWith('https://') && !normalized.startsWith('http://')) {
    normalized = `https://${normalized}`;
  }

  // Strip trailing slash
  normalized = normalized.replace(/\/+$/, '');

  return normalized;
}
