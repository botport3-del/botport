import { env } from '../env';

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Edits the deferred "thinking..." reply for an interaction.
 * The interaction token alone authorizes this — no bot token needed.
 */
export async function editOriginalResponse(
  interactionToken: string,
  body: { content?: string; embeds?: unknown[]; components?: unknown[] },
): Promise<void> {
  await fetch(
    `${DISCORD_API}/webhooks/${env.discordClientId}/${interactionToken}/messages/@original`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}
