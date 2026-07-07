import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  marketListings,
  marketTrades,
  marketPriceHistory,
  items,
  userInventories,
} from '../../db/schema/index.js';
import { debitWallet, creditWallet, getWalletByUserId, transferFunds } from '../../shared/wallet.js';
import { adjustPrice } from '@hegemonia/shared';

export async function listListings(regionId?: number, itemId?: number) {
  let conditions = eq(marketListings.status, 'active');
  const all = await db
    .select({
      listing: marketListings,
      item: items,
    })
    .from(marketListings)
    .innerJoin(items, eq(marketListings.itemId, items.id))
    .where(conditions)
    .orderBy(desc(marketListings.createdAt));

  return all
    .filter((r) => {
      if (regionId && r.listing.regionId !== regionId) return false;
      if (itemId && r.listing.itemId !== itemId) return false;
      return true;
    })
    .map((r) => ({
      ...r.listing,
      item: r.item,
      createdAt: r.listing.createdAt.toISOString(),
      expiresAt: r.listing.expiresAt.toISOString(),
    }));
}

export async function createListing(
  userId: string,
  regionId: number,
  itemId: number,
  quantity: number,
  pricePerUnit: number,
) {
  const [inv] = await db
    .select()
    .from(userInventories)
    .where(and(eq(userInventories.userId, userId), eq(userInventories.itemId, itemId)));

  if (!inv || inv.quantity < quantity) throw new Error('Yetersiz envanter');

  await db.execute(
    `UPDATE user_inventories SET quantity = quantity - ${quantity} WHERE user_id = '${userId}' AND item_id = ${itemId}`,
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [listing] = await db
    .insert(marketListings)
    .values({ sellerId: userId, regionId, itemId, quantity, pricePerUnit, expiresAt })
    .returning();

  const { incrementQuestProgress } = await import('../notifications/service.js');
  await incrementQuestProgress(userId, 'sell_1', 1);

  return listing;
}

export async function buyListing(buyerId: string, listingId: string, quantity: number) {
  const [listing] = await db.select().from(marketListings).where(eq(marketListings.id, listingId));
  if (!listing || listing.status !== 'active') throw new Error('İlan bulunamadı');
  if (listing.sellerId === buyerId) throw new Error('Kendi ilanınızı alamazsınız');
  if (quantity > listing.quantity) throw new Error('Yetersiz stok');

  const totalPrice = listing.pricePerUnit * quantity;
  const buyerWallet = await getWalletByUserId(buyerId);
  const sellerWallet = await getWalletByUserId(listing.sellerId);
  if (!buyerWallet || !sellerWallet) throw new Error('Cüzdan bulunamadı');

  await transferFunds(buyerWallet.id, sellerWallet.id, totalPrice, 'market_trade', 'market_listing', listingId);

  const [existing] = await db
    .select()
    .from(userInventories)
    .where(and(eq(userInventories.userId, buyerId), eq(userInventories.itemId, listing.itemId)));

  if (existing) {
    await db.execute(
      `UPDATE user_inventories SET quantity = quantity + ${quantity} WHERE user_id = '${buyerId}' AND item_id = ${listing.itemId}`,
    );
  } else {
    await db.insert(userInventories).values({ userId: buyerId, itemId: listing.itemId, quantity });
  }

  const remaining = listing.quantity - quantity;
  await db
    .update(marketListings)
    .set({
      quantity: remaining,
      status: remaining === 0 ? 'sold' : 'active',
    })
    .where(eq(marketListings.id, listingId));

  const [trade] = await db
    .insert(marketTrades)
    .values({ listingId, buyerId, quantity, totalPrice })
    .returning();

  await recordPriceHistory(listing.itemId, listing.regionId, listing.pricePerUnit, quantity);

  return trade;
}

async function recordPriceHistory(itemId: number, regionId: number, price: number, volume: number) {
  const today = new Date().toISOString().split('T')[0];
  try {
    await db.insert(marketPriceHistory).values({
      itemId,
      regionId,
      avgPrice: price,
      volume,
      recordedAt: today,
    });
  } catch {
    // duplicate day entry - ignore
  }
}

export async function getPriceHistory(itemId: number, regionId?: number) {
  const history = await db
    .select()
    .from(marketPriceHistory)
    .where(eq(marketPriceHistory.itemId, itemId))
    .orderBy(desc(marketPriceHistory.recordedAt))
    .limit(30);

  return history.filter((h) => !regionId || h.regionId === regionId);
}

export async function getMarketPrice(itemId: number) {
  const [item] = await db.select().from(items).where(eq(items.id, itemId));
  if (!item) return null;

  const activeListings = await db
    .select()
    .from(marketListings)
    .where(and(eq(marketListings.itemId, itemId), eq(marketListings.status, 'active')));

  const supply = activeListings.reduce((s, l) => s + l.quantity, 0);
  const demand = Math.max(10, supply);
  const price = adjustPrice(item.basePrice, supply, demand);

  return { itemId, basePrice: item.basePrice, currentPrice: price, supply };
}

export async function getUserInventory(userId: string) {
  return db
    .select({ item: items, quantity: userInventories.quantity })
    .from(userInventories)
    .innerJoin(items, eq(userInventories.itemId, items.id))
    .where(eq(userInventories.userId, userId));
}

export async function withdrawFromFactory(
  userId: string,
  factoryId: string,
  itemId: number,
  quantity: number,
) {
  const { factories, factoryInventories } = await import('../../db/schema/index.js');
  const [factory] = await db.select().from(factories).where(eq(factories.id, factoryId));
  if (!factory || factory.ownerId !== userId) throw new Error('Yetkisiz');

  const [inv] = await db
    .select()
    .from(factoryInventories)
    .where(and(eq(factoryInventories.factoryId, factoryId), eq(factoryInventories.itemId, itemId)));

  if (!inv || inv.quantity < quantity) throw new Error('Yetersiz stok');

  await db.execute(
    `UPDATE factory_inventories SET quantity = quantity - ${quantity} WHERE factory_id = '${factoryId}' AND item_id = ${itemId}`,
  );

  const [existing] = await db
    .select()
    .from(userInventories)
    .where(and(eq(userInventories.userId, userId), eq(userInventories.itemId, itemId)));

  if (existing) {
    await db.execute(
      `UPDATE user_inventories SET quantity = quantity + ${quantity} WHERE user_id = '${userId}' AND item_id = ${itemId}`,
    );
  } else {
    await db.insert(userInventories).values({ userId, itemId, quantity });
  }
}
