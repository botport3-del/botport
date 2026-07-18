import { SignJWT, jwtVerify } from 'jose';

const DEFAULT_TTL_SECONDS = 60 * 15; // 15 minutes

export interface VerifyTokenPayload {
  guildId: string; // Botport DB guild id
  discordUserId: string;
  username?: string;
}

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * Signs a short-lived token identifying who is verifying. Minted by the bot
 * (which knows the member from the button interaction) and validated by the
 * web verify flow. Both sides share the same secret so tokens interoperate.
 */
export async function signVerifyToken(
  secret: string,
  payload: VerifyTokenPayload,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key(secret));
}

export async function verifyVerifyToken(
  secret: string,
  token: string,
): Promise<VerifyTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret));
    return {
      guildId: String(payload.guildId),
      discordUserId: String(payload.discordUserId),
      username: payload.username ? String(payload.username) : undefined,
    };
  } catch {
    return null;
  }
}
