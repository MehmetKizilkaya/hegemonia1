import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { notifications, dailyQuests, users } from '../../db/schema/index.js';
import { MAX_ENERGY, ENERGY_REGEN_HOURS } from '@hegemonia/shared';

const QUEST_TEMPLATES = [
  { key: 'work_3', title: 'Çalışkan İşçi', description: '3 kez vardiya çalış', difficulty: 'easy', target: 3, rewardXp: 50, rewardGold: 100 },
  { key: 'sell_1', title: 'Tüccar', description: 'Pazarda 1 ürün sat', difficulty: 'medium', target: 1, rewardXp: 100, rewardGold: 200 },
  { key: 'war_damage', title: 'Cephe Kahramanı', description: 'Savaşta 500 hasar ver', difficulty: 'hard', target: 500, rewardXp: 200, rewardGold: 500 },
];

export async function getUserNotifications(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function getDailyQuests(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  let quests = await db
    .select()
    .from(dailyQuests)
    .where(and(eq(dailyQuests.userId, userId), eq(dailyQuests.questDate, today)));

  if (quests.length === 0) {
    const inserted = await Promise.all(
      QUEST_TEMPLATES.map((t) =>
        db
          .insert(dailyQuests)
          .values({
            userId,
            questKey: t.key,
            title: t.title,
            description: t.description,
            difficulty: t.difficulty,
            target: t.target,
            rewardXp: t.rewardXp,
            rewardGold: t.rewardGold,
            questDate: today,
          })
          .returning(),
      ),
    );
    quests = inserted.flat();
  }

  return quests;
}

export async function incrementQuestProgress(userId: string, questKey: string, amount = 1) {
  const today = new Date().toISOString().split('T')[0];
  const [quest] = await db
    .select()
    .from(dailyQuests)
    .where(
      and(
        eq(dailyQuests.userId, userId),
        eq(dailyQuests.questKey, questKey),
        eq(dailyQuests.questDate, today),
      ),
    );

  if (!quest || quest.completed) return;

  const progress = Math.min(quest.target, quest.progress + amount);
  const completed = progress >= quest.target;

  await db
    .update(dailyQuests)
    .set({ progress, completed })
    .where(eq(dailyQuests.id, quest.id));

  if (completed) {
    await db
      .update(users)
      .set({ xp: sql`${users.xp} + ${quest.rewardXp}` })
      .where(eq(users.id, userId));

    const { creditWallet, getWalletByUserId } = await import('../../shared/wallet.js');
    const wallet = await getWalletByUserId(userId);
    if (wallet) {
      await creditWallet(wallet.id, quest.rewardGold, 'quest_reward', 'daily_quest', quest.id);
    }
  }
}

export async function regenEnergy(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.energy >= MAX_ENERGY) return;

  const hoursSinceUpdate =
    (Date.now() - (user.energyUpdatedAt?.getTime() ?? Date.now())) / (1000 * 60 * 60);
  const regenCount = Math.floor(hoursSinceUpdate / ENERGY_REGEN_HOURS);

  if (regenCount > 0) {
    const newEnergy = Math.min(MAX_ENERGY, user.energy + regenCount);
    await db
      .update(users)
      .set({ energy: newEnergy, energyUpdatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
