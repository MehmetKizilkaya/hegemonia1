import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  timestamp,
  boolean,
  decimal,
  serial,
  jsonb,
  date,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseUid: text('firebase_uid').unique().notNull(),
  email: text('email').unique().notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  level: integer('level').default(1).notNull(),
  xp: bigint('xp', { mode: 'number' }).default(0).notNull(),
  energy: integer('energy').default(20).notNull(),
  energyUpdatedAt: timestamp('energy_updated_at', { withTimezone: true }).defaultNow(),
  residenceRegionId: integer('residence_region_id'),
  lastWarAttackAt: timestamp('last_war_attack_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).unique().notNull(),
  balance: bigint('balance', { mode: 'number' }).default(0).notNull(),
  currency: text('currency').default('HA').notNull(),
});

export const ledgerEntries = pgTable('ledger_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id').references(() => wallets.id).notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  type: text('type').notNull(),
  referenceType: text('reference_type'),
  referenceId: uuid('reference_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const regions = pgTable('regions', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  svgPathId: text('svg_path_id').notNull(),
  population: bigint('population', { mode: 'number' }).default(0).notNull(),
  controllerPartyId: uuid('controller_party_id'),
  countryId: integer('country_id').default(1).notNull(),
  defensePoints: bigint('defense_points', { mode: 'number' }).default(1000).notNull(),
  taxRate: integer('tax_rate').default(10).notNull(),
});

export const regionBonuses = pgTable('region_bonuses', {
  id: serial('id').primaryKey(),
  regionId: integer('region_id').references(() => regions.id).notNull(),
  sector: text('sector').notNull(),
  multiplier: decimal('multiplier', { precision: 4, scale: 2 }).notNull(),
});

export const factoryTypes = pgTable('factory_types', {
  id: serial('id').primaryKey(),
  code: text('code').unique().notNull(),
  sector: text('sector').notNull(),
  name: text('name').notNull(),
  buildCost: bigint('build_cost', { mode: 'number' }).notNull(),
  buildDurationSec: integer('build_duration_sec').notNull(),
  dailyMaintenance: bigint('daily_maintenance', { mode: 'number' }).notNull(),
  maxWorkers: integer('max_workers').notNull(),
  baseCapacity: integer('base_capacity').notNull(),
  storageCapacity: integer('storage_capacity').notNull(),
  energyPerUnit: decimal('energy_per_unit', { precision: 6, scale: 2 }).default('1').notNull(),
});

export const factories = pgTable('factories', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  regionId: integer('region_id').references(() => regions.id).notNull(),
  factoryTypeId: integer('factory_type_id').references(() => factoryTypes.id).notNull(),
  level: integer('level').default(1).notNull(),
  status: text('status').default('building').notNull(),
  activeWorkers: integer('active_workers').default(0).notNull(),
  builtAt: timestamp('built_at', { withTimezone: true }),
  buildEndsAt: timestamp('build_ends_at', { withTimezone: true }),
});

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  sector: text('sector').notNull(),
  basePrice: bigint('base_price', { mode: 'number' }).notNull(),
  stackable: boolean('stackable').default(true).notNull(),
});

export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  factoryTypeId: integer('factory_type_id').references(() => factoryTypes.id).notNull(),
  outputItemId: integer('output_item_id').references(() => items.id).notNull(),
  outputQty: integer('output_qty').notNull(),
  durationSec: integer('duration_sec').notNull(),
  energyCost: integer('energy_cost').notNull(),
});

export const recipeInputs = pgTable(
  'recipe_inputs',
  {
    recipeId: integer('recipe_id').references(() => recipes.id).notNull(),
    itemId: integer('item_id').references(() => items.id).notNull(),
    qty: integer('qty').notNull(),
  },
  (t) => [primaryKey({ columns: [t.recipeId, t.itemId] })],
);

export const productionOrders = pgTable('production_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  factoryId: uuid('factory_id').references(() => factories.id).notNull(),
  recipeId: integer('recipe_id').references(() => recipes.id).notNull(),
  quantity: integer('quantity').notNull(),
  status: text('status').default('queued').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  jobId: text('job_id'),
});

export const factoryInventories = pgTable(
  'factory_inventories',
  {
    factoryId: uuid('factory_id').references(() => factories.id).notNull(),
    itemId: integer('item_id').references(() => items.id).notNull(),
    quantity: integer('quantity').default(0).notNull(),
  },
  (t) => [primaryKey({ columns: [t.factoryId, t.itemId] })],
);

export const userInventories = pgTable(
  'user_inventories',
  {
    userId: uuid('user_id').references(() => users.id).notNull(),
    itemId: integer('item_id').references(() => items.id).notNull(),
    quantity: integer('quantity').default(0).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemId] })],
);

export const jobPostings = pgTable('job_postings', {
  id: uuid('id').primaryKey().defaultRandom(),
  factoryId: uuid('factory_id').references(() => factories.id).notNull(),
  salaryPerShift: bigint('salary_per_shift', { mode: 'number' }).notNull(),
  maxWorkers: integer('max_workers').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const employments = pgTable('employments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  factoryId: uuid('factory_id').references(() => factories.id).notNull(),
  jobPostingId: uuid('job_posting_id').references(() => jobPostings.id).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  lastPaidAt: timestamp('last_paid_at', { withTimezone: true }).defaultNow().notNull(),
  status: text('status').default('active').notNull(),
});

export const marketListings = pgTable('market_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id').references(() => users.id).notNull(),
  regionId: integer('region_id').references(() => regions.id).notNull(),
  itemId: integer('item_id').references(() => items.id).notNull(),
  quantity: integer('quantity').notNull(),
  pricePerUnit: bigint('price_per_unit', { mode: 'number' }).notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const marketTrades = pgTable('market_trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').references(() => marketListings.id).notNull(),
  buyerId: uuid('buyer_id').references(() => users.id).notNull(),
  quantity: integer('quantity').notNull(),
  totalPrice: bigint('total_price', { mode: 'number' }).notNull(),
  executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const marketPriceHistory = pgTable(
  'market_price_history',
  {
    itemId: integer('item_id').references(() => items.id).notNull(),
    regionId: integer('region_id'),
    avgPrice: bigint('avg_price', { mode: 'number' }).notNull(),
    volume: integer('volume').notNull(),
    recordedAt: date('recorded_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.regionId, t.recordedAt] })],
);

export const parties = pgTable('parties', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(),
  founderId: uuid('founder_id').references(() => users.id).notNull(),
  treasury: bigint('treasury', { mode: 'number' }).default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const partyMemberships = pgTable(
  'party_memberships',
  {
    partyId: uuid('party_id').references(() => parties.id).notNull(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    role: text('role').default('member').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.partyId, t.userId] })],
);

export const elections = pgTable('elections', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  regionId: integer('region_id').references(() => regions.id),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  status: text('status').default('upcoming').notNull(),
});

export const votes = pgTable(
  'votes',
  {
    electionId: uuid('election_id').references(() => elections.id).notNull(),
    voterId: uuid('voter_id').references(() => users.id).notNull(),
    partyId: uuid('party_id').references(() => parties.id).notNull(),
    castAt: timestamp('cast_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.electionId, t.voterId] })],
);

export const lawProposals = pgTable('law_proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposerId: uuid('proposer_id').references(() => users.id).notNull(),
  regionId: integer('region_id').references(() => regions.id),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').default('voting').notNull(),
  votingEndsAt: timestamp('voting_ends_at', { withTimezone: true }).notNull(),
});

export const lawVotes = pgTable(
  'law_votes',
  {
    proposalId: uuid('proposal_id').references(() => lawProposals.id).notNull(),
    voterId: uuid('voter_id').references(() => users.id).notNull(),
    vote: text('vote').notNull(),
  },
  (t) => [primaryKey({ columns: [t.proposalId, t.voterId] })],
);

export const wars = pgTable('wars', {
  id: uuid('id').primaryKey().defaultRandom(),
  attackerCountryId: integer('attacker_country_id').default(1).notNull(),
  defenderRegionId: integer('defender_region_id').references(() => regions.id).notNull(),
  declaredBy: uuid('declared_by').references(() => users.id).notNull(),
  lawProposalId: uuid('law_proposal_id').references(() => lawProposals.id),
  status: text('status').default('active').notNull(),
  attackerDamage: bigint('attacker_damage', { mode: 'number' }).default(0).notNull(),
  defenderDamage: bigint('defender_damage', { mode: 'number' }).default(0).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
});

export const warDamageLogs = pgTable('war_damage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  warId: uuid('war_id').references(() => wars.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  side: text('side').notNull(),
  damage: integer('damage').notNull(),
  energySpent: integer('energy_spent').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dailyQuests = pgTable('daily_quests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  questKey: text('quest_key').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  difficulty: text('difficulty').notNull(),
  progress: integer('progress').default(0).notNull(),
  target: integer('target').notNull(),
  completed: boolean('completed').default(false).notNull(),
  rewardXp: integer('reward_xp').notNull(),
  rewardGold: integer('reward_gold').notNull(),
  questDate: date('quest_date').notNull(),
});
