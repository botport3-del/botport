/**
 * Environment access for the bot worker.
 * Values are read lazily so the process can start (e.g. for tests) without a token.
 */
export const env = {
  get botToken(): string | undefined {
    return process.env.DISCORD_BOT_TOKEN || undefined;
  },
  get clientId(): string | undefined {
    return process.env.DISCORD_CLIENT_ID || undefined;
  },
  get devGuildIds(): string[] {
    return (process.env.DISCORD_DEV_GUILD_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  },
  get appBaseUrl(): string {
    return process.env.APP_BASE_URL || 'http://localhost:3000';
  },
};
