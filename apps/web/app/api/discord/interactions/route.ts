import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import type { APIInteraction, APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import { ApplicationCommandType, InteractionType, InteractionResponseType } from 'discord-api-types/v10';
import { env } from '@/lib/env';
import { verifyDiscordRequest } from '@/lib/discord/verify-signature';
import { dispatchCommand } from '@/lib/discord/commands';
import { handleVerifyButton, VERIFY_BUTTON_ID } from '@/lib/discord/verify-button';
import { DEFERRED_EPHEMERAL, ephemeral } from '@/lib/discord/types';

/**
 * Discord's Interactions Endpoint. Discord POSTs every slash command and
 * component click here (instead of us holding a persistent gateway
 * connection), so this route is what makes the bot work on serverless
 * hosting. Every request must be Ed25519-verified before it's parsed.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const rawBody = await req.text();

  if (
    !signature ||
    !timestamp ||
    !env.discordPublicKey ||
    !verifyDiscordRequest(env.discordPublicKey, signature, timestamp, rawBody)
  ) {
    return new NextResponse('Bad request signature', { status: 401 });
  }

  const interaction = JSON.parse(rawBody) as APIInteraction;

  if (interaction.type === InteractionType.Ping) {
    return NextResponse.json({ type: InteractionResponseType.Pong });
  }

  if (
    interaction.type === InteractionType.ApplicationCommand &&
    interaction.data.type === ApplicationCommandType.ChatInput
  ) {
    const result = await dispatchCommand(interaction as APIChatInputApplicationCommandInteraction);
    if (result.kind === 'immediate') return NextResponse.json(result.response);
    after(() => result.work().catch((e) => console.error('[interactions] command work failed:', e)));
    return NextResponse.json(DEFERRED_EPHEMERAL);
  }

  if (interaction.type === InteractionType.MessageComponent) {
    if (interaction.data.custom_id === VERIFY_BUTTON_ID) {
      const result = await handleVerifyButton(interaction);
      if (result.kind === 'immediate') return NextResponse.json(result.response);
      after(() => result.work().catch((e) => console.error('[interactions] button work failed:', e)));
      return NextResponse.json(DEFERRED_EPHEMERAL);
    }
  }

  return NextResponse.json(ephemeral('Unsupported interaction.'));
}
