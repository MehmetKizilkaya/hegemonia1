import type PgBoss from 'pg-boss';
import * as factoryService from '../modules/factories/service.js';
import * as politicsService from '../modules/politics/service.js';
import * as warService from '../modules/wars/service.js';
import { regenEnergy } from '../modules/notifications/service.js';
import { eq, and, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, marketListings } from '../db/schema/index.js';

export async function registerJobWorkers(boss: PgBoss) {
  await boss.createQueue('production.complete');
  await boss.createQueue('factory.complete');
  await boss.createQueue('salary.pay');
  await boss.createQueue('energy.regen');
  await boss.createQueue('election.close');
  await boss.createQueue('war.tick');
  await boss.createQueue('market.expire');

  await boss.work('production.complete', async (jobs) => {
    for (const job of jobs) {
      const { orderId } = job.data as { orderId: string };
      await factoryService.completeProduction(orderId);
    }
  });

  await boss.work('factory.complete', async (jobs) => {
    for (const job of jobs) {
      const { factoryId } = job.data as { factoryId: string };
      await factoryService.completeFactoryBuild(factoryId);
    }
  });

  await boss.work('salary.pay', async (jobs) => {
    for (const job of jobs) {
      const { employmentId } = job.data as { employmentId: string };
      await factoryService.paySalary(employmentId, boss);
    }
  });

  await boss.work('energy.regen', async (jobs) => {
    for (const job of jobs) {
      const { userId } = job.data as { userId: string };
      await regenEnergy(userId);
    }
  });

  await boss.work('election.close', async (jobs) => {
    for (const job of jobs) {
      const data = job.data as { proposalId?: string; electionId?: string };
      if (data.proposalId) {
        await politicsService.closeLawProposal(data.proposalId, boss);
      }
      if (data.electionId) {
        await politicsService.closeElection(data.electionId);
      }
    }
  });

  await boss.work('war.tick', async (jobs) => {
    for (const job of jobs) {
      const { warId } = job.data as { warId: string };
      await warService.resolveWar(warId);
    }
  });

  await boss.work('market.expire', async () => {
    const now = new Date();
    await db
      .update(marketListings)
      .set({ status: 'expired' })
      .where(and(eq(marketListings.status, 'active'), lt(marketListings.expiresAt, now)));
  });

  // Schedule energy regen for all users periodically
  const allUsers = await db.select({ id: users.id }).from(users);
  for (const user of allUsers) {
    await boss.send(
      'energy.regen',
      { userId: user.id },
      { startAfter: new Date(Date.now() + 4 * 60 * 60 * 1000) },
    );
  }
}
