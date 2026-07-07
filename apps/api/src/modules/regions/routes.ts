import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../plugins/auth.js';
import * as regionService from './service.js';
import { setResidence } from '../auth/service.js';
import { getUserByFirebaseUid } from '../auth/service.js';

export async function regionRoutes(app: FastifyInstance) {
  app.get('/regions', async () => {
    return regionService.listRegions();
  });

  app.get<{ Params: { id: string } }>('/regions/:id', async (request, reply) => {
    const region = await regionService.getRegion(Number(request.params.id));
    if (!region) return reply.status(404).send({ error: 'Bölge bulunamadı' });
    return region;
  });

  app.post<{ Params: { id: string } }>(
    '/regions/:id/residence',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });

      const regionId = Number(request.params.id);
      const region = await regionService.getRegion(regionId);
      if (!region) return reply.status(404).send({ error: 'Bölge bulunamadı' });

      const updated = await setResidence(user.id, regionId);
      return { residenceRegionId: updated.residenceRegionId };
    },
  );
}
