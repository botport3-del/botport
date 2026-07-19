import type { APIInteractionResponse } from 'discord-api-types/v10';
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10';

/** An interaction handler either replies right away, or defers and finishes the reply later. */
export type CommandResult =
  | { kind: 'immediate'; response: APIInteractionResponse }
  | { kind: 'deferred'; work: () => Promise<void> };

export function ephemeral(content: string): APIInteractionResponse {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content, flags: MessageFlags.Ephemeral },
  };
}

export const DEFERRED_EPHEMERAL: APIInteractionResponse = {
  type: InteractionResponseType.DeferredChannelMessageWithSource,
  data: { flags: MessageFlags.Ephemeral },
};
