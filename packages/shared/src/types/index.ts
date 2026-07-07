export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  xp: number;
  energy: number;
  maxEnergy: number;
  residenceRegionId: number | null;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
}

export interface Region {
  id: number;
  slug: string;
  name: string;
  svgPathId: string;
  population: number;
  defensePoints: number;
  controllerPartyId: string | null;
  bonuses: RegionBonus[];
  factoryCount?: number;
}

export interface RegionBonus {
  sector: string;
  multiplier: number;
}

export interface FactoryType {
  id: number;
  code: string;
  sector: string;
  name: string;
  buildCost: number;
  buildDurationSec: number;
  dailyMaintenance: number;
  maxWorkers: number;
  baseCapacity: number;
  storageCapacity: number;
}

export interface Factory {
  id: string;
  ownerId: string;
  regionId: number;
  factoryTypeId: number;
  factoryType?: FactoryType;
  level: number;
  status: FactoryStatus;
  activeWorkers: number;
  builtAt: string | null;
}

export type FactoryStatus = 'building' | 'active' | 'paused' | 'demolished';

export interface Item {
  id: number;
  code: string;
  name: string;
  sector: string;
  basePrice: number;
}

export interface Recipe {
  id: number;
  factoryTypeId: number;
  outputItemId: number;
  outputQty: number;
  durationSec: number;
  energyCost: number;
  inputs: RecipeInput[];
  outputItem?: Item;
}

export interface RecipeInput {
  itemId: number;
  qty: number;
  item?: Item;
}

export interface ProductionOrder {
  id: string;
  factoryId: string;
  recipeId: number;
  quantity: number;
  status: 'queued' | 'running' | 'completed' | 'cancelled';
  startedAt: string | null;
  endsAt: string | null;
}

export interface JobPosting {
  id: string;
  factoryId: string;
  salaryPerShift: number;
  maxWorkers: number;
  isActive: boolean;
  factory?: Factory;
}

export interface Employment {
  id: string;
  userId: string;
  factoryId: string;
  status: 'active' | 'quit' | 'fired';
  startedAt: string;
}

export interface MarketListing {
  id: string;
  sellerId: string;
  regionId: number;
  itemId: number;
  item?: Item;
  quantity: number;
  pricePerUnit: number;
  status: 'active' | 'sold' | 'expired' | 'cancelled';
  createdAt: string;
  expiresAt: string;
}

export interface Party {
  id: string;
  name: string;
  founderId: string;
  treasury: number;
  memberCount?: number;
  createdAt: string;
}

export interface Election {
  id: string;
  type: 'regional' | 'national';
  regionId: number | null;
  startsAt: string;
  endsAt: string;
  status: 'upcoming' | 'active' | 'completed';
}

export interface LawProposal {
  id: string;
  proposerId: string;
  type: LawType;
  payload: Record<string, unknown>;
  status: 'voting' | 'passed' | 'rejected';
  votingEndsAt: string;
  proVotes?: number;
  contraVotes?: number;
}

export type LawType = 'tax_rate' | 'budget_transfer' | 'war_declaration';

export interface War {
  id: string;
  defenderRegionId: number;
  declaredBy: string;
  status: 'active' | 'won_attacker' | 'won_defender';
  attackerDamage: number;
  defenderDamage: number;
  startedAt: string;
  endsAt: string;
  defenderRegion?: Region;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  progress: number;
  target: number;
  completed: boolean;
  rewardXp: number;
  rewardGold: number;
}

export interface InventoryItem {
  itemId: number;
  quantity: number;
  item?: Item;
}

export interface AuthSyncResponse {
  user: UserProfile;
  wallet: Wallet;
}
