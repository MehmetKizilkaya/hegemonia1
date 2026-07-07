import { eq, sql, count } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { regions, regionBonuses, factories } from '../../db/schema/index.js';

export async function listRegions() {
  const allRegions = await db.select().from(regions).orderBy(regions.name);
  const bonuses = await db.select().from(regionBonuses);
  const factoryCounts = await db
    .select({ regionId: factories.regionId, count: count() })
    .from(factories)
    .where(eq(factories.status, 'active'))
    .groupBy(factories.regionId);

  const countMap = new Map(factoryCounts.map((f) => [f.regionId, Number(f.count)]));

  return allRegions.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    svgPathId: r.svgPathId,
    population: r.population,
    defensePoints: r.defensePoints,
    controllerPartyId: r.controllerPartyId,
    taxRate: r.taxRate,
    factoryCount: countMap.get(r.id) ?? 0,
    bonuses: bonuses
      .filter((b) => b.regionId === r.id)
      .map((b) => ({ sector: b.sector, multiplier: Number(b.multiplier) })),
  }));
}

export async function getRegion(id: number) {
  const [region] = await db.select().from(regions).where(eq(regions.id, id));
  if (!region) return null;

  const bonuses = await db.select().from(regionBonuses).where(eq(regionBonuses.regionId, id));
  const [fc] = await db
    .select({ count: count() })
    .from(factories)
    .where(sql`${factories.regionId} = ${id} AND ${factories.status} = 'active'`);

  return {
    id: region.id,
    slug: region.slug,
    name: region.name,
    svgPathId: region.svgPathId,
    population: region.population,
    defensePoints: region.defensePoints,
    controllerPartyId: region.controllerPartyId,
    taxRate: region.taxRate,
    factoryCount: Number(fc?.count ?? 0),
    bonuses: bonuses.map((b) => ({ sector: b.sector, multiplier: Number(b.multiplier) })),
  };
}

export async function getRegionBySlug(slug: string) {
  const [region] = await db.select().from(regions).where(eq(regions.slug, slug));
  if (!region) return null;
  return getRegion(region.id);
}
