import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  factories,
  factoryTypes,
  factoryInventories,
  items,
  recipes,
  recipeInputs,
  productionOrders,
  jobPostings,
  employments,
  regions,
  regionBonuses,
  users,
} from '../../db/schema/index.js';
import { debitWallet, getWalletByUserId } from '../../shared/wallet.js';
import { applyRegionBonus, workerSpeedMultiplier } from '@hegemonia/shared';
import type PgBoss from 'pg-boss';

export async function listFactoryTypes() {
  return db.select().from(factoryTypes);
}

export async function listRecipes() {
  const allRecipes = await db.select().from(recipes);
  const allInputs = await db.select().from(recipeInputs);
  const allItems = await db.select().from(items);

  return allRecipes.map((r) => ({
    ...r,
    outputItem: allItems.find((i) => i.id === r.outputItemId),
    inputs: allInputs
      .filter((inp) => inp.recipeId === r.id)
      .map((inp) => ({
        ...inp,
        item: allItems.find((i) => i.id === inp.itemId),
      })),
  }));
}

export async function getUserFactories(userId: string) {
  const result = await db
    .select({
      factory: factories,
      type: factoryTypes,
      region: regions,
    })
    .from(factories)
    .innerJoin(factoryTypes, eq(factories.factoryTypeId, factoryTypes.id))
    .innerJoin(regions, eq(factories.regionId, regions.id))
    .where(eq(factories.ownerId, userId));

  return result.map((r) => ({
    ...r.factory,
    factoryType: r.type,
    regionName: r.region.name,
  }));
}

export async function getFactory(id: string) {
  const [result] = await db
    .select({ factory: factories, type: factoryTypes })
    .from(factories)
    .innerJoin(factoryTypes, eq(factories.factoryTypeId, factoryTypes.id))
    .where(eq(factories.id, id));

  if (!result) return null;

  const inventory = await db
    .select({ item: items, quantity: factoryInventories.quantity })
    .from(factoryInventories)
    .innerJoin(items, eq(factoryInventories.itemId, items.id))
    .where(eq(factoryInventories.factoryId, id));

  const orders = await db
    .select()
    .from(productionOrders)
    .where(eq(productionOrders.factoryId, id))
    .orderBy(productionOrders.startedAt);

  const postings = await db.select().from(jobPostings).where(eq(jobPostings.factoryId, id));

  return {
    ...result.factory,
    factoryType: result.type,
    inventory,
    productionOrders: orders,
    jobPostings: postings,
  };
}

export async function buildFactory(
  userId: string,
  regionId: number,
  factoryTypeId: number,
  boss: PgBoss,
) {
  const [type] = await db.select().from(factoryTypes).where(eq(factoryTypes.id, factoryTypeId));
  if (!type) throw new Error('Fabrika tipi bulunamadı');

  const wallet = await getWalletByUserId(userId);
  if (!wallet || wallet.balance < type.buildCost) throw new Error('Yetersiz sermaye');

  const buildEndsAt = new Date(Date.now() + type.buildDurationSec * 1000);

  const [factory] = await db
    .insert(factories)
    .values({
      ownerId: userId,
      regionId,
      factoryTypeId,
      status: 'building',
      buildEndsAt,
    })
    .returning();

  await debitWallet(wallet.id, type.buildCost, 'factory_build', 'factory', factory.id);

  await boss.send(
    'factory.complete',
    { factoryId: factory.id },
    { startAfter: buildEndsAt },
  );

  return factory;
}

export async function completeFactoryBuild(factoryId: string) {
  await db
    .update(factories)
    .set({ status: 'active', builtAt: new Date(), buildEndsAt: null })
    .where(eq(factories.id, factoryId));
}

export async function startProduction(
  userId: string,
  factoryId: string,
  recipeId: number,
  quantity: number,
  boss: PgBoss,
) {
  const factory = await getFactory(factoryId);
  if (!factory || factory.ownerId !== userId) throw new Error('Fabrika bulunamadı');
  if (factory.status !== 'active') throw new Error('Fabrika aktif değil');

  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
  if (!recipe) throw new Error('Reçete bulunamadı');

  const inputs = await db.select().from(recipeInputs).where(eq(recipeInputs.recipeId, recipeId));

  for (const input of inputs) {
    const [inv] = await db
      .select()
      .from(factoryInventories)
      .where(
        and(
          eq(factoryInventories.factoryId, factoryId),
          eq(factoryInventories.itemId, input.itemId),
        ),
      );
    const needed = input.qty * quantity;
    if (!inv || inv.quantity < needed) throw new Error('Yetersiz hammadde');
  }

  const bonuses = await db
    .select()
    .from(regionBonuses)
    .where(eq(regionBonuses.regionId, factory.regionId));

  const speedMult = workerSpeedMultiplier(factory.activeWorkers, factory.factoryType.maxWorkers);
  const durationMs =
    (recipe.durationSec * quantity * 1000) / Math.max(speedMult, 0.1);
  const endsAt = new Date(Date.now() + durationMs);

  const [order] = await db
    .insert(productionOrders)
    .values({
      factoryId,
      recipeId,
      quantity,
      status: 'running',
      startedAt: new Date(),
      endsAt,
    })
    .returning();

  for (const input of inputs) {
    await db
      .update(factoryInventories)
      .set({ quantity: factoryInventories.quantity })
      .where(
        and(
          eq(factoryInventories.factoryId, factoryId),
          eq(factoryInventories.itemId, input.itemId),
        ),
      );
    await db.execute(
      `UPDATE factory_inventories SET quantity = quantity - ${input.qty * quantity} WHERE factory_id = '${factoryId}' AND item_id = ${input.itemId}`,
    );
  }

  const jobId = await boss.send(
    'production.complete',
    { orderId: order.id },
    { startAfter: endsAt },
  );

  await db.update(productionOrders).set({ jobId: jobId ?? undefined }).where(eq(productionOrders.id, order.id));

  return order;
}

export async function completeProduction(orderId: string) {
  const [order] = await db.select().from(productionOrders).where(eq(productionOrders.id, orderId));
  if (!order || order.status !== 'running') return;

  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, order.recipeId));
  if (!recipe) return;

  const [factory] = await db.select().from(factories).where(eq(factories.id, order.factoryId));
  if (!factory) return;

  const [type] = await db.select().from(factoryTypes).where(eq(factoryTypes.id, factory.factoryTypeId));
  const bonuses = await db
    .select()
    .from(regionBonuses)
    .where(eq(regionBonuses.regionId, factory.regionId));

  const outputQty = applyRegionBonus(
    recipe.outputQty * order.quantity,
    type?.sector ?? '',
    bonuses.map((b) => ({ sector: b.sector, multiplier: Number(b.multiplier) })),
  );

  const [existing] = await db
    .select()
    .from(factoryInventories)
    .where(
      and(
        eq(factoryInventories.factoryId, order.factoryId),
        eq(factoryInventories.itemId, recipe.outputItemId),
      ),
    );

  if (existing) {
    await db.execute(
      `UPDATE factory_inventories SET quantity = quantity + ${outputQty} WHERE factory_id = '${order.factoryId}' AND item_id = ${recipe.outputItemId}`,
    );
  } else {
    await db.insert(factoryInventories).values({
      factoryId: order.factoryId,
      itemId: recipe.outputItemId,
      quantity: outputQty,
    });
  }

  await db
    .update(productionOrders)
    .set({ status: 'completed' })
    .where(eq(productionOrders.id, orderId));

  const { notifyUser } = await import('../../shared/notify.js');
  await notifyUser(
    factory.ownerId,
    'production_complete',
    'Üretim Tamamlandı',
    `${outputQty} birim ürün depoya eklendi.`,
  );
}

export async function createJobPosting(
  userId: string,
  factoryId: string,
  salaryPerShift: number,
  maxWorkers: number,
) {
  const factory = await getFactory(factoryId);
  if (!factory || factory.ownerId !== userId) throw new Error('Yetkisiz');

  const [posting] = await db
    .insert(jobPostings)
    .values({ factoryId, salaryPerShift, maxWorkers })
    .returning();

  return posting;
}

export async function listJobPostings(regionId?: number) {
  let query = db
    .select({
      posting: jobPostings,
      factory: factories,
      type: factoryTypes,
      region: regions,
    })
    .from(jobPostings)
    .innerJoin(factories, eq(jobPostings.factoryId, factories.id))
    .innerJoin(factoryTypes, eq(factories.factoryTypeId, factoryTypes.id))
    .innerJoin(regions, eq(factories.regionId, regions.id))
    .where(eq(jobPostings.isActive, true));

  const results = await query;
  return results
    .filter((r) => !regionId || r.factory.regionId === regionId)
    .map((r) => ({
      ...r.posting,
      factory: { ...r.factory, factoryType: r.type, regionName: r.region.name },
    }));
}

export async function applyForJob(userId: string, postingId: string, boss: PgBoss) {
  const [posting] = await db.select().from(jobPostings).where(eq(jobPostings.id, postingId));
  if (!posting || !posting.isActive) throw new Error('İlan bulunamadı');

  const [factory] = await db.select().from(factories).where(eq(factories.id, posting.factoryId));
  if (!factory) throw new Error('Fabrika bulunamadı');

  const activeCount = await db
    .select()
    .from(employments)
    .where(and(eq(employments.factoryId, posting.factoryId), eq(employments.status, 'active')));

  if (activeCount.length >= posting.maxWorkers) throw new Error('Kontenjan dolu');

  const [employment] = await db
    .insert(employments)
    .values({ userId, factoryId: posting.factoryId, jobPostingId: postingId })
    .returning();

  await db
    .update(factories)
    .set({ activeWorkers: factory.activeWorkers + 1 })
    .where(eq(factories.id, posting.factoryId));

  const { SALARY_SHIFT_SEC } = await import('@hegemonia/shared');
  await boss.send(
    'salary.pay',
    { employmentId: employment.id },
    { startAfter: new Date(Date.now() + SALARY_SHIFT_SEC * 1000) },
  );

  return employment;
}

export async function paySalary(employmentId: string, boss: PgBoss) {
  const [employment] = await db.select().from(employments).where(eq(employments.id, employmentId));
  if (!employment || employment.status !== 'active') return;

  const [posting] = await db
    .select()
    .from(jobPostings)
    .where(eq(jobPostings.id, employment.jobPostingId));
  if (!posting) return;

  const [factory] = await db.select().from(factories).where(eq(factories.id, employment.factoryId));
  if (!factory) return;

  const ownerWallet = await getWalletByUserId(factory.ownerId);
  const workerWallet = await getWalletByUserId(employment.userId);
  if (!ownerWallet || !workerWallet) return;

  try {
    const { transferFunds } = await import('../../shared/wallet.js');
    await transferFunds(
      ownerWallet.id,
      workerWallet.id,
      posting.salaryPerShift,
      'salary',
      'employment',
      employmentId,
    );

    const { notifyUser } = await import('../../shared/notify.js');
    await notifyUser(
      employment.userId,
      'salary_paid',
      'Maaş Yattı',
      `${posting.salaryPerShift} HA hesabınıza aktarıldı.`,
    );
  } catch {
    // Owner can't pay - employment continues
  }

  const { SALARY_SHIFT_SEC } = await import('@hegemonia/shared');
  await boss.send(
    'salary.pay',
    { employmentId },
    { startAfter: new Date(Date.now() + SALARY_SHIFT_SEC * 1000) },
  );
}

export async function workShift(userId: string, factoryId: string) {
  const [employment] = await db
    .select()
    .from(employments)
    .where(
      and(
        eq(employments.userId, userId),
        eq(employments.factoryId, factoryId),
        eq(employments.status, 'active'),
      ),
    );

  if (!employment) throw new Error('Bu fabrikada çalışmıyorsunuz');

  const { getUserById } = await import('../auth/service.js');
  const user = await getUserById(userId);
  if (!user || user.energy < 2) throw new Error('Yetersiz enerji');

  await db.update(users).set({ energy: user.energy - 2 }).where(eq(users.id, userId));

  const { incrementQuestProgress } = await import('../notifications/service.js');
  await incrementQuestProgress(userId, 'work_3', 1);

  return { energySpent: 2, message: 'Vardiya tamamlandı' };
}
