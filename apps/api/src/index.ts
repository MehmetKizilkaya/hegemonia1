import './load-env.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { Server as SocketServer } from 'socket.io';
import PgBoss from 'pg-boss';
import { env, getCorsOrigins } from './config/env.js';
import { initFirebase } from './plugins/firebase.js';
import { setSocketServer } from './shared/notify.js';
import { registerJobWorkers } from './jobs/index.js';
import { authRoutes } from './modules/auth/routes.js';
import { regionRoutes } from './modules/regions/routes.js';
import { factoryRoutes } from './modules/factories/routes.js';
import { marketRoutes } from './modules/market/routes.js';
import { politicsRoutes } from './modules/politics/routes.js';
import { warRoutes } from './modules/wars/routes.js';
import { notificationRoutes } from './modules/notifications/routes.js';
import { verifyFirebaseToken } from './plugins/firebase.js';

declare module 'fastify' {
  interface FastifyInstance {
    boss: PgBoss;
  }
}

async function main() {
  initFirebase();

  const app = Fastify({ logger: true });

  const corsOrigins = getCorsOrigins();
  await app.register(cors, { origin: corsOrigins, credentials: true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  const boss = new PgBoss(env.DATABASE_URL);
  await boss.start();
  app.decorate('boss', boss);
  await registerJobWorkers(boss);

  await app.register(authRoutes);
  await app.register(regionRoutes);
  await app.register(factoryRoutes);
  await app.register(marketRoutes);
  await app.register(politicsRoutes);
  await app.register(warRoutes);
  await app.register(notificationRoutes);

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await app.listen({ port: env.PORT, host: '0.0.0.0' });

  const io = new SocketServer(app.server, {
    cors: { origin: corsOrigins },
  });

  setSocketServer(io);

  io.on('connection', async (socket) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (token) {
      try {
        const { uid } = await verifyFirebaseToken(token);
        const { getUserByFirebaseUid } = await import('./modules/auth/service.js');
        const user = await getUserByFirebaseUid(uid);
        if (user) {
          socket.join(`user:${user.id}`);
        }
      } catch {
        // unauthenticated socket
      }
    }

    socket.on('join:war', (warId: string) => {
      socket.join(`war:${warId}`);
    });
  });

  console.log(`Hegemonia API running on http://localhost:${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
