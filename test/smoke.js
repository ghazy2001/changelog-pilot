import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { getGitLog, getLatestTag } from '../dist/git.js';
import { parseCommit, groupCommits, getBreakingChanges } from '../dist/parser.js';
import { suggestVersion } from '../dist/version.js';
import {
  formatKeepAChangelog,
  formatGitHubRelease,
  formatSimple,
  formatAnnouncement,
  updateChangelogFile,
} from '../dist/formatter.js';

console.log('🧪 Starting Changelog Pilot Smoke Test...\n');

// 1. Test Git operations
console.log('1. Testing Git operations...');
const targetRepo = existsSync('d:/twenty-crm') ? 'd:/twenty-crm' : process.cwd();
const commits = getGitLog({ cwd: targetRepo, to: 'HEAD' });
console.log(`   Fetched ${commits.length} commits from ${targetRepo}`);

if (commits.length === 0) {
  console.error('❌ Failed to fetch commits');
  process.exit(1);
}
console.log(`   Sample commit: [${commits[0].shortHash}] ${commits[0].subject}`);

// 2. Test Parser
console.log('\n2. Testing Parser & Issue Linker...');
const sampleCommits = commits.slice(0, 20);
const parsed = sampleCommits.map(parseCommit);
console.log(`   Parsed ${parsed.length} commits.`);

const sampleParsed = parsed[0];
console.log(`   Parsed commit: type=${sampleParsed.type}, scope=${sampleParsed.scope}, subject="${sampleParsed.subject}"`);

const groups = groupCommits(parsed);
console.log(`   Grouped into ${groups.length} categories: ${groups.map(g => `${g.emoji} ${g.label} (${g.commits.length})`).join(', ')}`);

const breaking = getBreakingChanges(parsed);
console.log(`   Breaking changes detected: ${breaking.length}`);

// 3. Test Version Suggestion
console.log('\n3. Testing SemVer Suggestion...');
const suggestion = suggestVersion({ commits: parsed, currentVersion: '1.2.3' });
console.log(`   Current: ${suggestion.current}`);
console.log(`   Bump: ${suggestion.bump}`);
console.log(`   Suggested: ${suggestion.suggested}`);
console.log(`   Reason: ${suggestion.reason}`);

// 4. Test Formatters
console.log('\n4. Testing Formatters...');

const keepAChangelog = formatKeepAChangelog({
  version: suggestion.suggested,
  date: new Date().toISOString().slice(0, 10),
  groups,
  breaking,
  repoUrl: 'https://github.com/ghazy2001/changelog-pilot',
});
console.log('   Keep a Changelog generated (chars:', keepAChangelog.length, ')');

const githubRelease = formatGitHubRelease({
  version: suggestion.suggested,
  groups,
  breaking,
  contributors: ['ghazy2001', 'felix', 'charles'],
  repoUrl: 'https://github.com/ghazy2001/changelog-pilot',
});
console.log('   GitHub Release generated (chars:', githubRelease.length, ')');

const simple = formatSimple({
  version: suggestion.suggested,
  date: new Date().toISOString().slice(0, 10),
  groups,
});
console.log('   Simple format generated (chars:', simple.length, ')');

const slack = formatAnnouncement({
  platform: 'slack',
  version: suggestion.suggested,
  productName: 'Changelog Pilot',
  highlights: parsed.slice(0, 3).map(p => p.subject),
  breaking,
  url: 'https://github.com/ghazy2001/changelog-pilot/releases',
});
console.log('   Slack announcement generated (chars:', slack.length, ')');

// 5. Test File Updater
console.log('\n5. Testing updateChangelogFile...');
const tempChangelog = resolve(process.cwd(), 'test-temp-CHANGELOG.md');
const updateRes = updateChangelogFile({
  cwd: process.cwd(),
  changelogContent: keepAChangelog,
  filePath: 'test-temp-CHANGELOG.md',
});
console.log(`   Changelog created: ${updateRes.filePath} (isNew=${updateRes.isNew})`);

// Clean up temp test file
if (existsSync(tempChangelog)) {
  unlinkSync(tempChangelog);
  console.log('   Cleaned up test temp file.');
}

console.log('\n✅ ALL SMOKE TESTS PASSED SUCCESSFULLY! 🎉\n');
