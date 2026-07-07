import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../plugins/auth.js';
import { getUserByFirebaseUid } from '../auth/service.js';
import * as warService from './service.js';

export async function warRoutes(app: FastifyInstance) {
  app.get('/wars', async () => warService.listActiveWars());

  app.get<{ Params: { id: string } }>('/wars/:id', async (request, reply) => {
    const war = await warService.getWar(request.params.id);
    if (!war) return reply.status(404).send({ error: 'Savaş bulunamadı' });
    return war;
  });

  app.post<{ Params: { id: string }; Body: { energySpent: number } }>(
    '/wars/:id/attack',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        return await warService.attack(request.params.id, user.id, request.body.energySpent ?? 5);
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { energySpent: number } }>(
    '/wars/:id/defend',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        return await warService.defend(request.params.id, user.id, request.body.energySpent ?? 5);
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );
}
