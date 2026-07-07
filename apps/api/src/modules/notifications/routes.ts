import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../plugins/auth.js';
import { getUserByFirebaseUid } from '../auth/service.js';
import * as notifService from './service.js';

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: authMiddleware }, async (request) => {
    const user = await getUserByFirebaseUid(request.authUser!.uid);
    if (!user) return [];
    return notifService.getUserNotifications(user.id);
  });

  app.post<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: authMiddleware },
    async (request) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return { success: false };
      await notifService.markNotificationRead(user.id, request.params.id);
      return { success: true };
    },
  );

  app.get('/quests/daily', { preHandler: authMiddleware }, async (request) => {
    const user = await getUserByFirebaseUid(request.authUser!.uid);
    if (!user) return [];
    return notifService.getDailyQuests(user.id);
  });
}
