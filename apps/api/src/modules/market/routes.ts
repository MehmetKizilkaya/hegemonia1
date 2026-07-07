import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../plugins/auth.js';
import { getUserByFirebaseUid } from '../auth/service.js';
import * as marketService from './service.js';

export async function marketRoutes(app: FastifyInstance) {
  app.get('/market/listings', async (request) => {
    const q = request.query as { regionId?: string; itemId?: string };
    return marketService.listListings(
      q.regionId ? Number(q.regionId) : undefined,
      q.itemId ? Number(q.itemId) : undefined,
    );
  });

  app.get<{ Params: { itemId: string } }>('/market/price/:itemId', async (request) => {
    return marketService.getMarketPrice(Number(request.params.itemId));
  });

  app.get('/market/inventory', { preHandler: authMiddleware }, async (request) => {
    const user = await getUserByFirebaseUid(request.authUser!.uid);
    if (!user) return [];
    return marketService.getUserInventory(user.id);
  });

  app.post<{ Body: { regionId: number; itemId: number; quantity: number; pricePerUnit: number } }>(
    '/market/listings',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        return await marketService.createListing(
          user.id,
          request.body.regionId,
          request.body.itemId,
          request.body.quantity,
          request.body.pricePerUnit,
        );
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { quantity: number } }>(
    '/market/listings/:id/buy',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        return await marketService.buyListing(user.id, request.params.id, request.body.quantity);
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );

  app.post<{ Body: { factoryId: string; itemId: number; quantity: number } }>(
    '/market/withdraw',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        await marketService.withdrawFromFactory(
          user.id,
          request.body.factoryId,
          request.body.itemId,
          request.body.quantity,
        );
        return { success: true };
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );
}
