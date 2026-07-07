export interface ItemSeed {
  code: string;
  name: string;
  sector: string;
  basePrice: number;
}

export const MVP_ITEMS: ItemSeed[] = [
  { code: 'bugday', name: 'Buğday', sector: 'tarim', basePrice: 10 },
  { code: 'misir', name: 'Mısır', sector: 'tarim', basePrice: 8 },
  { code: 'pamuk', name: 'Pamuk', sector: 'tarim', basePrice: 15 },
  { code: 'un', name: 'Un', sector: 'gida', basePrice: 25 },
  { code: 'ekmek', name: 'Ekmek', sector: 'gida', basePrice: 40 },
  { code: 'ham_petrol', name: 'Ham Petrol', sector: 'petrol', basePrice: 50 },
  { code: 'benzin', name: 'Benzin', sector: 'petrol', basePrice: 80 },
  { code: 'komur', name: 'Kömür', sector: 'maden', basePrice: 30 },
  { code: 'demir_cevheri', name: 'Demir Cevheri', sector: 'maden', basePrice: 45 },
  { code: 'celik', name: 'Çelik', sector: 'demir_celik', basePrice: 120 },
  { code: 'elektrik', name: 'Elektrik (MWh)', sector: 'elektrik', basePrice: 20 },
];

export interface FactoryTypeSeed {
  code: string;
  sector: string;
  name: string;
  buildCost: number;
  buildDurationSec: number;
  dailyMaintenance: number;
  maxWorkers: number;
  baseCapacity: number;
  storageCapacity: number;
  energyPerUnit: number;
}

export const MVP_FACTORY_TYPES: FactoryTypeSeed[] = [
  {
    code: 'tarla',
    sector: 'tarim',
    name: 'Tarla',
    buildCost: 5000,
    buildDurationSec: 3600,
    dailyMaintenance: 100,
    maxWorkers: 10,
    baseCapacity: 100,
    storageCapacity: 500,
    energyPerUnit: 1,
  },
  {
    code: 'gida_fabrikasi',
    sector: 'gida',
    name: 'Gıda Fabrikası',
    buildCost: 15000,
    buildDurationSec: 7200,
    dailyMaintenance: 300,
    maxWorkers: 15,
    baseCapacity: 50,
    storageCapacity: 300,
    energyPerUnit: 2,
  },
  {
    code: 'petrol_kuyusu',
    sector: 'petrol',
    name: 'Petrol Kuyusu',
    buildCost: 50000,
    buildDurationSec: 14400,
    dailyMaintenance: 1000,
    maxWorkers: 20,
    baseCapacity: 30,
    storageCapacity: 200,
    energyPerUnit: 3,
  },
  {
    code: 'petrol_rafinerisi',
    sector: 'petrol',
    name: 'Petrol Rafinerisi',
    buildCost: 80000,
    buildDurationSec: 21600,
    dailyMaintenance: 2000,
    maxWorkers: 25,
    baseCapacity: 20,
    storageCapacity: 150,
    energyPerUnit: 4,
  },
  {
    code: 'elektrik_santrali',
    sector: 'elektrik',
    name: 'Elektrik Santrali',
    buildCost: 100000,
    buildDurationSec: 28800,
    dailyMaintenance: 3000,
    maxWorkers: 30,
    baseCapacity: 100,
    storageCapacity: 0,
    energyPerUnit: 0,
  },
];

export interface RecipeSeed {
  factoryCode: string;
  outputCode: string;
  outputQty: number;
  durationSec: number;
  energyCost: number;
  inputs: { itemCode: string; qty: number }[];
}

export const MVP_RECIPES: RecipeSeed[] = [
  { factoryCode: 'tarla', outputCode: 'bugday', outputQty: 10, durationSec: 300, energyCost: 2, inputs: [] },
  { factoryCode: 'tarla', outputCode: 'misir', outputQty: 12, durationSec: 300, energyCost: 2, inputs: [] },
  { factoryCode: 'gida_fabrikasi', outputCode: 'un', outputQty: 5, durationSec: 600, energyCost: 3, inputs: [{ itemCode: 'bugday', qty: 10 }] },
  { factoryCode: 'gida_fabrikasi', outputCode: 'ekmek', outputQty: 8, durationSec: 900, energyCost: 4, inputs: [{ itemCode: 'un', qty: 5 }] },
  { factoryCode: 'petrol_kuyusu', outputCode: 'ham_petrol', outputQty: 5, durationSec: 1200, energyCost: 5, inputs: [] },
  { factoryCode: 'petrol_rafinerisi', outputCode: 'benzin', outputQty: 3, durationSec: 1800, energyCost: 6, inputs: [{ itemCode: 'ham_petrol', qty: 5 }] },
  { factoryCode: 'elektrik_santrali', outputCode: 'elektrik', outputQty: 20, durationSec: 600, energyCost: 4, inputs: [{ itemCode: 'komur', qty: 5 }] },
];
