import '../../load-env.js';
import { eq } from 'drizzle-orm';
import PgBoss from 'pg-boss';
import { PROVINCES, MVP_ITEMS, MVP_FACTORY_TYPES, MVP_RECIPES } from '@hegemonia/shared';
import { env } from '../../config/env.js';
import { db, pool } from '../index.js';
import {
  regions,
  regionBonuses,
  items,
  factoryTypes,
  recipes,
  recipeInputs,
  elections,
} from '../schema/index.js';
import * as politicsService from '../../modules/politics/service.js';

async function seedRegions() {
  console.log('Seeding regions...');
  for (const province of PROVINCES) {
    let [region] = await db.select().from(regions).where(eq(regions.slug, province.slug));

    if (!region) {
      [region] = await db
        .insert(regions)
        .values({
          slug: province.slug,
          name: province.name,
          svgPathId: province.svgPathId,
          population: province.population,
        })
        .returning();
    }

    if (province.bonuses && region) {
      const existingBonuses = await db
        .select()
        .from(regionBonuses)
        .where(eq(regionBonuses.regionId, region.id));

      if (existingBonuses.length === 0) {
        for (const bonus of province.bonuses) {
          await db.insert(regionBonuses).values({
            regionId: region.id,
            sector: bonus.sector,
            multiplier: String(bonus.multiplier),
          });
        }
      }
    }
  }
}

async function seedItems() {
  console.log('Seeding items...');
  const itemMap = new Map<string, number>();

  for (const item of MVP_ITEMS) {
    let [row] = await db.select().from(items).where(eq(items.code, item.code));
    if (!row) {
      [row] = await db.insert(items).values(item).returning();
    }
    if (row) itemMap.set(item.code, row.id);
  }

  return itemMap;
}

async function seedFactoryTypes() {
  console.log('Seeding factory types...');
  const typeMap = new Map<string, number>();

  for (const ft of MVP_FACTORY_TYPES) {
    let [row] = await db.select().from(factoryTypes).where(eq(factoryTypes.code, ft.code));
    if (!row) {
      [row] = await db
        .insert(factoryTypes)
        .values({
          ...ft,
          energyPerUnit: String(ft.energyPerUnit),
        })
        .returning();
    }
    if (row) typeMap.set(ft.code, row.id);
  }

  return typeMap;
}

async function seedRecipes(itemMap: Map<string, number>, typeMap: Map<string, number>) {
  console.log('Seeding recipes...');
  const existing = await db.select().from(recipes);
  if (existing.length > 0) return;

  for (const r of MVP_RECIPES) {
    const factoryTypeId = typeMap.get(r.factoryCode);
    const outputItemId = itemMap.get(r.outputCode);
    if (!factoryTypeId || !outputItemId) continue;

    const [recipe] = await db
      .insert(recipes)
      .values({
        factoryTypeId,
        outputItemId,
        outputQty: r.outputQty,
        durationSec: r.durationSec,
        energyCost: r.energyCost,
      })
      .returning();

    for (const input of r.inputs) {
      const itemId = itemMap.get(input.itemCode);
      if (itemId) {
        await db.insert(recipeInputs).values({
          recipeId: recipe.id,
          itemId,
          qty: input.qty,
        });
      }
    }
  }
}

async function main() {
  const boss = new PgBoss(env.DATABASE_URL);
  await boss.start();

  await seedRegions();
  const itemMap = await seedItems();
  const typeMap = await seedFactoryTypes();
  await seedRecipes(itemMap, typeMap);

  const [ankara] = await db.select().from(regions).where(eq(regions.slug, 'ankara'));
  const existingElections = await db.select().from(elections).limit(1);
  if (ankara && existingElections.length === 0) {
    console.log('Starting initial election for Ankara...');
    await politicsService.startRegionalElection(ankara.id, boss);
  }

  console.log('Seed complete.');
  await boss.stop();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
