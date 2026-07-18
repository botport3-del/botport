/** Centralised, typed access to web environment variables. */
export const env = {
  get appBaseUrl(): string {
    return process.env.APP_BASE_URL || 'http://localhost:3000';
  },
  get discordClientId(): string {
    return process.env.DISCORD_CLIENT_ID || '';
  },
  get discordClientSecret(): string {
    return process.env.DISCORD_CLIENT_SECRET || '';
  },
  get authSecret(): string {
    return process.env.AUTH_SECRET || 'insecure-dev-secret-change-me';
  },
  get turnstileSiteKey(): string {
    return process.env.TURNSTILE_SITE_KEY || '';
  },
  get turnstileSecretKey(): string {
    return process.env.TURNSTILE_SECRET_KEY || '';
  },
  /**
   * When no Discord OAuth credentials are configured we enable a local-only
   * "dev login" so the dashboard can be exercised without a Discord app.
   * Never active in production.
   */
  get devLoginEnabled(): boolean {
    return process.env.NODE_ENV !== 'production' && !process.env.DISCORD_CLIENT_ID;
  },
};
