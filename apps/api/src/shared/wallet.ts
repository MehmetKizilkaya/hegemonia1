import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { wallets, ledgerEntries } from '../db/schema/index.js';

export async function transferFunds(
  fromWalletId: string,
  toWalletId: string,
  amount: number,
  type: string,
  referenceType?: string,
  referenceId?: string,
): Promise<void> {
  if (amount <= 0) throw new Error('Amount must be positive');

  await db.transaction(async (tx) => {
    const [fromWallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.id, fromWalletId))
      .for('update');

    if (!fromWallet || fromWallet.balance < amount) {
      throw new Error('Yetersiz bakiye');
    }

    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} - ${amount}` })
      .where(eq(wallets.id, fromWalletId));

    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${amount}` })
      .where(eq(wallets.id, toWalletId));

    await tx.insert(ledgerEntries).values([
      {
        walletId: fromWalletId,
        amount: -amount,
        type,
        referenceType,
        referenceId,
      },
      {
        walletId: toWalletId,
        amount,
        type,
        referenceType,
        referenceId,
      },
    ]);
  });
}

export async function creditWallet(
  walletId: string,
  amount: number,
  type: string,
  referenceType?: string,
  referenceId?: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${amount}` })
      .where(eq(wallets.id, walletId));

    await tx.insert(ledgerEntries).values({
      walletId,
      amount,
      type,
      referenceType,
      referenceId,
    });
  });
}

export async function debitWallet(
  walletId: string,
  amount: number,
  type: string,
  referenceType?: string,
  referenceId?: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [wallet] = await tx.select().from(wallets).where(eq(wallets.id, walletId)).for('update');
    if (!wallet || wallet.balance < amount) throw new Error('Yetersiz bakiye');

    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} - ${amount}` })
      .where(eq(wallets.id, walletId));

    await tx.insert(ledgerEntries).values({
      walletId,
      amount: -amount,
      type,
      referenceType,
      referenceId,
    });
  });
}

export async function getWalletByUserId(userId: string) {
  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
  return wallet;
}
