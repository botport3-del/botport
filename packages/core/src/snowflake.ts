/** Discord epoch (2015-01-01T00:00:00Z) in milliseconds. */
export const DISCORD_EPOCH = 1420070400000;

/** Returns the account/creation date encoded in a Discord snowflake ID. */
export function snowflakeToDate(id: string): Date {
  const ms = Number(BigInt(id) >> 22n) + DISCORD_EPOCH;
  return new Date(ms);
}

/** Age in whole days of the account/entity represented by a snowflake ID. */
export function snowflakeAgeDays(id: string, now: Date = new Date()): number {
  const created = snowflakeToDate(id).getTime();
  return Math.floor((now.getTime() - created) / (1000 * 60 * 60 * 24));
}
