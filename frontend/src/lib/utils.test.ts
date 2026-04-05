import { describe, expect, it } from 'vitest';

import { bboxToString, formatSizeMb, generateId } from './utils';

describe('utils helpers', () => {
  it('formats values under one MB as KB', () => {
    expect(formatSizeMb(0.5)).toBe('512 KB');
  });

  it('formats values at or above one MB as MB', () => {
    expect(formatSizeMb(1.25)).toBe('1.3 MB');
  });

  it('formats bbox values to four decimal places', () => {
    expect(bboxToString([10, 20.12345, -30.9, 40])).toBe('10.0000, 20.1234, -30.9000, 40.0000');
  });

  it('generates non-empty unique identifiers', () => {
    const first = generateId();
    const second = generateId();

    expect(first).not.toHaveLength(0);
    expect(second).not.toHaveLength(0);
    expect(first).not.toBe(second);
  });
});
