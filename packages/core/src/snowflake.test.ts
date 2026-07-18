import { describe, it, expect } from 'vitest';
import { snowflakeToDate, snowflakeAgeDays } from './snowflake';

describe('snowflake', () => {
  it('decodes creation time from a snowflake', () => {
    // Discord's own example: snowflake 175928847299117063 -> 2016-04-30
    const d = snowflakeToDate('175928847299117063');
    expect(d.getUTCFullYear()).toBe(2016);
    expect(d.getUTCMonth()).toBe(3); // April (0-indexed)
  });

  it('computes account age in days', () => {
    const created = snowflakeToDate('175928847299117063').getTime();
    const now = new Date(created + 10 * 24 * 60 * 60 * 1000); // +10 days
    expect(snowflakeAgeDays('175928847299117063', now)).toBe(10);
  });
});
