/**
 * Minimal Discord REST client abstraction.
 *
 * Kept tiny and injectable so backup/restore logic can be unit-tested against a
 * mock without a live Discord connection. The real implementation uses fetch
 * with a bot token; both the web app and the bot construct one via `createRest`.
 */
export interface DiscordRest {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  delete(path: string): Promise<void>;
}

const DISCORD_API = 'https://discord.com/api/v10';

export function createRest(botToken: string, apiBase: string = DISCORD_API): DiscordRest {
  const headers = {
    Authorization: `Bot ${botToken}`,
    'Content-Type': 'application/json',
  };

  async function handle<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Discord REST ${res.status} ${res.statusText}: ${text}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    async get<T>(path: string): Promise<T> {
      return handle<T>(await fetch(`${apiBase}${path}`, { headers }));
    },
    async post<T>(path: string, body: unknown): Promise<T> {
      return handle<T>(
        await fetch(`${apiBase}${path}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        }),
      );
    },
    async patch<T>(path: string, body: unknown): Promise<T> {
      return handle<T>(
        await fetch(`${apiBase}${path}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(body),
        }),
      );
    },
    async delete(path: string): Promise<void> {
      await handle<void>(await fetch(`${apiBase}${path}`, { method: 'DELETE', headers }));
    },
  };
}
