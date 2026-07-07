import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { wars, warDamageLogs, users, regions } from '../../db/schema/index.js';
import { calculateWarDamage, MAX_ENERGY } from '@hegemonia/shared';
import { emitWarUpdate } from '../../shared/notify.js';

export async function listActiveWars() {
  const activeWars = await db
    .select({
      war: wars,
      region: regions,
    })
    .from(wars)
    .innerJoin(regions, eq(wars.defenderRegionId, regions.id))
    .where(eq(wars.status, 'active'));

  return activeWars.map((w) => ({
    ...w.war,
    startedAt: w.war.startedAt.toISOString(),
    endsAt: w.war.endsAt.toISOString(),
    defenderRegion: {
      id: w.region.id,
      name: w.region.name,
      slug: w.region.slug,
      defensePoints: w.region.defensePoints,
    },
  }));
}

export async function getWar(id: string) {
  const [result] = await db
    .select({ war: wars, region: regions })
    .from(wars)
    .innerJoin(regions, eq(wars.defenderRegionId, regions.id))
    .where(eq(wars.id, id));

  if (!result) return null;

  return {
    ...result.war,
    defenderRegion: result.region,
  };
}

export async function attack(warId: string, userId: string, energySpent: number) {
  const [war] = await db.select().from(wars).where(eq(wars.id, warId));
  if (!war || war.status !== 'active') throw new Error('Savaş aktif değil');

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error('Kullanıcı bulunamadı');

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const freeAttack = !user.lastWarAttackAt || user.lastWarAttackAt < hourAgo;

  let actualEnergy = energySpent;
  if (freeAttack) {
    actualEnergy = 0;
  } else {
    if (user.energy < energySpent) throw new Error('Yetersiz enerji');
    await db.update(users).set({ energy: user.energy - energySpent }).where(eq(users.id, userId));
  }

  const damage = calculateWarDamage(user.level, Math.max(1, energySpent));

  const { incrementQuestProgress } = await import('../notifications/service.js');
  await incrementQuestProgress(userId, 'war_damage', damage);

  await db
    .update(wars)
    .set({ attackerDamage: war.attackerDamage + damage })
    .where(eq(wars.id, warId));

  await db.insert(warDamageLogs).values({
    warId,
    userId,
    side: 'attacker',
    damage,
    energySpent: actualEnergy,
  });

  await db.update(users).set({ lastWarAttackAt: now }).where(eq(users.id, userId));

  const updated = await getWar(warId);
  emitWarUpdate(warId, updated);

  return { damage, energySpent: actualEnergy, freeAttack };
}

export async function defend(warId: string, userId: string, energySpent: number) {
  const [war] = await db.select().from(wars).where(eq(wars.id, warId));
  if (!war || war.status !== 'active') throw new Error('Savaş aktif değil');

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.energy < energySpent) throw new Error('Yetersiz enerji');

  await db.update(users).set({ energy: user.energy - energySpent }).where(eq(users.id, userId));

  const damage = calculateWarDamage(user.level, energySpent);

  await db
    .update(wars)
    .set({ defenderDamage: war.defenderDamage + damage })
    .where(eq(wars.id, warId));

  await db.insert(warDamageLogs).values({
    warId,
    userId,
    side: 'defender',
    damage,
    energySpent,
  });

  const updated = await getWar(warId);
  emitWarUpdate(warId, updated);

  return { damage, energySpent };
}

export async function resolveWar(warId: string) {
  const [war] = await db.select().from(wars).where(eq(wars.id, warId));
  if (!war || war.status !== 'active') return;

  const attackerWon = war.attackerDamage > war.defenderDamage;

  await db
    .update(wars)
    .set({ status: attackerWon ? 'won_attacker' : 'won_defender' })
    .where(eq(wars.id, warId));

  if (attackerWon) {
    await db
      .update(regions)
      .set({ defensePoints: 500 })
      .where(eq(regions.id, war.defenderRegionId));
  }

  emitWarUpdate(warId, await getWar(warId));
}
