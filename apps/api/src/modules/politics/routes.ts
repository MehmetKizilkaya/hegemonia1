import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../plugins/auth.js';
import { getUserByFirebaseUid } from '../auth/service.js';
import * as politicsService from './service.js';

export async function politicsRoutes(app: FastifyInstance) {
  const boss = app.boss;

  app.get('/parties', async () => politicsService.listParties());

  app.post<{ Body: { name: string } }>(
    '/parties',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        return await politicsService.createParty(user.id, request.body.name);
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/parties/:id/join',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        await politicsService.joinParty(user.id, request.params.id);
        return { success: true };
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );

  app.get('/elections', async () => politicsService.listElections());

  app.post<{ Body: { electionId: string; partyId: string } }>(
    '/elections/vote',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        await politicsService.castVote(user.id, request.body.electionId, request.body.partyId);
        return { success: true };
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );

  app.get('/laws', async (request) => {
    const regionId = (request.query as { regionId?: string }).regionId;
    return politicsService.listLawProposals(regionId ? Number(regionId) : undefined);
  });

  app.post<{ Body: { regionId?: number; type: string; payload: Record<string, unknown> } }>(
    '/laws',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        return await politicsService.createLawProposal(
          user.id,
          request.body.regionId ?? null,
          request.body.type,
          request.body.payload,
          boss,
        );
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { vote: string } }>(
    '/laws/:id/vote',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = await getUserByFirebaseUid(request.authUser!.uid);
      if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      try {
        await politicsService.voteOnLaw(user.id, request.params.id, request.body.vote);
        return { success: true };
      } catch (e) {
        return reply.status(400).send({ error: (e as Error).message });
      }
    },
  );
}
