import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyFirebaseToken } from './firebase.js';

export interface AuthUser {
  uid: string;
  email: string;
  userId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Yetkilendirme gerekli' });
  }

  try {
    const token = header.slice(7);
    request.authUser = await verifyFirebaseToken(token);
  } catch {
    return reply.status(401).send({ error: 'Geçersiz token' });
  }
}

export async function optionalAuth(request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return;

  try {
    const token = header.slice(7);
    request.authUser = await verifyFirebaseToken(token);
  } catch {
    // ignore
  }
}
