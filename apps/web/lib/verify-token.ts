import {
  signVerifyToken as coreSign,
  verifyVerifyToken as coreVerify,
  type VerifyTokenPayload,
} from 'core';
import { env } from './env';

export type { VerifyTokenPayload };

/** Signs a short-lived verify token using the shared auth secret. */
export function signVerifyToken(payload: VerifyTokenPayload): Promise<string> {
  return coreSign(env.authSecret, payload);
}

export function verifyVerifyToken(token: string): Promise<VerifyTokenPayload | null> {
  return coreVerify(env.authSecret, token);
}
