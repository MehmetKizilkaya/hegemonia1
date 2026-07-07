import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../plugins/auth.js';
import * as authService from './service.js';
import { getUserByFirebaseUid } from './service.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/sync', { preHandler: authMiddleware }, async (request) => {
    const { uid, email } = request.authUser!;
    const { user, wallet } = await authService.syncUser(uid, email);
    return { user: authService.formatUser(user), wallet: authService.formatWallet(wallet) };
  });

  app.get('/auth/me', { preHandler: authMiddleware }, async (request) => {
    const user = await getUserByFirebaseUid(request.authUser!.uid);
    if (!user) return { error: 'Kullanıcı bulunamadı' };

    const { db } = await import('../../db/index.js');
    const { wallets } = await import('../../db/schema/index.js');
    const { eq } = await import('drizzle-orm');
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id));

    return {
      user: authService.formatUser(user),
      wallet: wallet ? authService.formatWallet(wallet) : null,
    };
  });
}
