import { eq, and, sql, count } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  parties,
  partyMemberships,
  elections,
  votes,
  lawProposals,
  lawVotes,
  regions,
  wars,
} from '../../db/schema/index.js';
import { debitWallet, getWalletByUserId } from '../../shared/wallet.js';
import { PARTY_CREATE_COST } from '@hegemonia/shared';
import type PgBoss from 'pg-boss';

export async function listParties() {
  const allParties = await db.select().from(parties);
  const memberships = await db
    .select({ partyId: partyMemberships.partyId, count: count() })
    .from(partyMemberships)
    .groupBy(partyMemberships.partyId);

  const countMap = new Map(memberships.map((m) => [m.partyId, Number(m.count)]));

  return allParties.map((p) => ({
    ...p,
    memberCount: countMap.get(p.id) ?? 0,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function createParty(userId: string, name: string) {
  const wallet = await getWalletByUserId(userId);
  if (!wallet || wallet.balance < PARTY_CREATE_COST) throw new Error('Yetersiz sermaye');

  const [party] = await db.insert(parties).values({ name, founderId: userId }).returning();

  await debitWallet(wallet.id, PARTY_CREATE_COST, 'party_create', 'party', party.id);

  await db.insert(partyMemberships).values({ partyId: party.id, userId, role: 'leader' });

  return party;
}

export async function joinParty(userId: string, partyId: string) {
  const [existing] = await db
    .select()
    .from(partyMemberships)
    .where(eq(partyMemberships.userId, userId));

  if (existing) throw new Error('Zaten bir partidesiniz');

  await db.insert(partyMemberships).values({ partyId, userId, role: 'member' });
}

export async function getActiveElection(regionId?: number) {
  const now = new Date();
  const all = await db.select().from(elections).where(eq(elections.status, 'active'));

  return all.find((e) => {
    if (regionId && e.regionId !== regionId) return false;
    return e.startsAt <= now && e.endsAt >= now;
  });
}

export async function castVote(voterId: string, electionId: string, partyId: string) {
  const [election] = await db.select().from(elections).where(eq(elections.id, electionId));
  if (!election || election.status !== 'active') throw new Error('Seçim aktif değil');

  await db.insert(votes).values({ electionId, voterId, partyId });
}

export async function createLawProposal(
  proposerId: string,
  regionId: number | null,
  type: string,
  payload: Record<string, unknown>,
  boss: PgBoss,
) {
  const votingEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const [proposal] = await db
    .insert(lawProposals)
    .values({ proposerId, regionId, type, payload, votingEndsAt })
    .returning();

  await boss.send('election.close', { proposalId: proposal.id }, { startAfter: votingEndsAt });

  return proposal;
}

export async function voteOnLaw(voterId: string, proposalId: string, vote: string) {
  await db.insert(lawVotes).values({ proposalId, voterId, vote });
}

export async function listLawProposals(regionId?: number) {
  const all = await db.select().from(lawProposals).orderBy(lawProposals.votingEndsAt);

  const withVotes = await Promise.all(
    all
      .filter((p) => !regionId || p.regionId === regionId)
      .map(async (p) => {
        const lawVoteList = await db
          .select()
          .from(lawVotes)
          .where(eq(lawVotes.proposalId, p.id));

        return {
          ...p,
          votingEndsAt: p.votingEndsAt.toISOString(),
          proVotes: lawVoteList.filter((v) => v.vote === 'pro').length,
          contraVotes: lawVoteList.filter((v) => v.vote === 'contra').length,
        };
      }),
  );

  return withVotes;
}

export async function closeLawProposal(proposalId: string, boss: PgBoss) {
  const [proposal] = await db.select().from(lawProposals).where(eq(lawProposals.id, proposalId));
  if (!proposal || proposal.status !== 'voting') return;

  const lawVoteList = await db.select().from(lawVotes).where(eq(lawVotes.proposalId, proposalId));
  const pro = lawVoteList.filter((v) => v.vote === 'pro').length;
  const contra = lawVoteList.filter((v) => v.vote === 'contra').length;
  const passed = pro > contra;

  await db
    .update(lawProposals)
    .set({ status: passed ? 'passed' : 'rejected' })
    .where(eq(lawProposals.id, proposalId));

  if (passed) {
    await executeLaw(proposal, boss);
  }
}

async function executeLaw(proposal: typeof lawProposals.$inferSelect, boss: PgBoss) {
  const payload = proposal.payload as Record<string, unknown>;

  switch (proposal.type) {
    case 'tax_rate': {
      if (proposal.regionId) {
        await db
          .update(regions)
          .set({ taxRate: payload.rate as number })
          .where(eq(regions.id, proposal.regionId));
      }
      break;
    }
    case 'budget_transfer': {
      const partyId = payload.partyId as string;
      const amount = payload.amount as number;
      await db
        .update(parties)
        .set({ treasury: sql`${parties.treasury} + ${amount}` })
        .where(eq(parties.id, partyId));
      break;
    }
    case 'war_declaration': {
      const defenderRegionId = payload.defenderRegionId as number;
      const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const [war] = await db
        .insert(wars)
        .values({
          defenderRegionId,
          declaredBy: proposal.proposerId,
          lawProposalId: proposal.id,
          endsAt,
        })
        .returning();

      await boss.send('war.tick', { warId: war.id }, { startAfter: endsAt });
      break;
    }
  }
}

export async function listElections() {
  return db.select().from(elections).orderBy(elections.endsAt);
}

export async function startRegionalElection(regionId: number, boss: PgBoss) {
  const startsAt = new Date();
  const endsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const [election] = await db
    .insert(elections)
    .values({ type: 'regional', regionId, startsAt, endsAt, status: 'active' })
    .returning();

  await boss.send('election.close', { electionId: election.id }, { startAfter: endsAt });

  return election;
}

export async function closeElection(electionId: string) {
  const voteCounts = await db
    .select({ partyId: votes.partyId, count: count() })
    .from(votes)
    .where(eq(votes.electionId, electionId))
    .groupBy(votes.partyId);

  const winner = voteCounts.sort((a, b) => Number(b.count) - Number(a.count))[0];

  await db.update(elections).set({ status: 'completed' }).where(eq(elections.id, electionId));

  const [election] = await db.select().from(elections).where(eq(elections.id, electionId));
  if (election?.regionId && winner) {
    await db
      .update(regions)
      .set({ controllerPartyId: winner.partyId })
      .where(eq(regions.id, election.regionId));
  }

  return winner;
}
