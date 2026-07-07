import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, wallets } from '../../db/schema/index.js';
import { MAX_ENERGY } from '@hegemonia/shared';

export async function syncUser(firebaseUid: string, email: string, displayName?: string) {
  const existing = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));

  if (existing.length > 0) {
    const user = existing[0];
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, user.id));
    return { user, wallet };
  }

  const [user] = await db
    .insert(users)
    .values({
      firebaseUid,
      email,
      displayName: displayName ?? email.split('@')[0],
    })
    .returning();

  const [wallet] = await db.insert(wallets).values({ userId: user.id }).returning();

  return { user, wallet };
}

export function formatUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    level: user.level,
    xp: user.xp,
    energy: user.energy,
    maxEnergy: MAX_ENERGY,
    residenceRegionId: user.residenceRegionId,
    createdAt: user.createdAt.toISOString(),
  };
}

export function formatWallet(wallet: typeof wallets.$inferSelect) {
  return {
    id: wallet.id,
    userId: wallet.userId,
    balance: wallet.balance,
    currency: wallet.currency,
  };
}

export async function getUserByFirebaseUid(firebaseUid: string) {
  const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
  return user;
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function setResidence(userId: string, regionId: number) {
  const [user] = await db
    .update(users)
    .set({ residenceRegionId: regionId })
    .where(eq(users.id, userId))
    .returning();
  return user;
}
