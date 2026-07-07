import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../plugins/auth.js';
import { getUserByFirebaseUid } from '../auth/service.js';
import * as factoryService from './service.js';

export async function factoryRoutes(app: FastifyInstance) {
  const boss = app.boss;

  app.get('/factory-types', async () => factoryService.listFactoryTypes());
  app.get('/recipes', async () => factoryService.listRecipes());

  app.get('/factories/mine', { preHandler: authMiddleware }, async (request) => {
    const user = await getUserByFirebaseUid(request.authUser!.uid);
    if (!user) return [];
    return factoryService.getUserFactories(user.id);
  });

  app.get<{ Params: { id: string } }>('/factories/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const factory = await factoryService.getFactory(request.params.id);
    if (!factory) return reply.status(404).send({ error: 'Fabrika bulunamadı' });
    return factory;
  });

  app.post<{ Body: { regionId: number; factoryTypeId: number } }>(
    '/factories/build',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        const factory = await factoryService.buildFactory(
          user.id,
          request.body.regionId,
          request.body.factoryTypeId,
          boss,
        );
        return factory;
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { recipeId: number; quantity: number } }>(
    '/factories/:id/produce',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        const order = await factoryService.startProduction(
          user.id,
          request.params.id,
          request.body.recipeId,
          request.body.quantity ?? 1,
          boss,
        );
        return order;
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { salaryPerShift: number; maxWorkers: number } }>(
    '/factories/:id/jobs',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        return await factoryService.createJobPosting(
          user.id,
          request.params.id,
          request.body.salaryPerShift,
          request.body.maxWorkers,
        );
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );

  app.get('/jobs', async (request) => {
    const regionId = (request.query as { regionId?: string }).regionId;
    return factoryService.listJobPostings(regionId ? Number(regionId) : undefined);
  });

  app.post<{ Params: { id: string } }>(
    '/jobs/:id/apply',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        return await factoryService.applyForJob(user.id, request.params.id, boss);
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/factories/:id/work',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        return await factoryService.workShift(user.id, request.params.id);
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );
}
