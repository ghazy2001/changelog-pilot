import { describe, it, expect } from 'vitest';
import { bumpVersion } from '../src/version.js';

describe('bumpVersion with prerelease and build metadata', () => {
  it('correctly bumps patch version when version string contains a prerelease tag', () => {
    expect(bumpVersion('1.2.3-alpha.1', 'patch')).toBe('1.2.4');
  });

  it('correctly bumps patch version when version string contains build metadata', () => {
    expect(bumpVersion('1.2.3+2026', 'patch')).toBe('1.2.4');
  });
});
