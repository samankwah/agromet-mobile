import type { Ionicons } from '@expo/vector-icons';

/**
 * Reduces a free-text calendar activity ("1st fertilizer application (NPK)",
 * "2nd Newcastle (Lasota)", "earthening-up/staking/trellising/pruning") to a
 * small set of kinds.
 *
 * One classifier, several consumers — the fallback colour and the icon both
 * derive from this rather than each keeping its own keyword list, which is
 * how the two would end up disagreeing about what "brooder management" is.
 * Same shape as classifyCondition.ts, for the same reason.
 *
 * The names are typed by hand into spreadsheets by district officers, so
 * matching is on substrings and deliberately forgiving. Order matters:
 * earlier rules win, and the more specific ones come first.
 */
export type ActivityKind =
  | 'land'
  | 'planting'
  | 'fertilizer'
  | 'weeding'
  | 'pest'
  | 'water'
  | 'harvest'
  | 'storage'
  | 'brooding'
  | 'feeding'
  | 'vaccination'
  | 'biosecurity'
  | 'monitoring'
  | 'general';

export function classifyActivity(name: string): ActivityKind {
  const value = name.toLowerCase();

  // Poultry first: "vaccination" and "feed" are unambiguous, and a poultry
  // calendar's "harvesting/live bird market" must not read as a crop harvest
  // before the bird-specific rules get a chance.
  if (value.includes('vaccin') || value.includes('gumboro') || value.includes('newcastle') || value.includes('lasota')) {
    return 'vaccination';
  }
  if (value.includes('brood') || value.includes('day-old') || value.includes('chick')) return 'brooding';
  if (value.includes('biosecurity') || value.includes('hygiene') || value.includes('disinfect')) return 'biosecurity';
  if (value.includes('deworm') || value.includes('coccidio') || value.includes('disease prevention')) return 'pest';
  if (value.includes('feed') || value.includes('starter diet') || value.includes('grower diet') || value.includes('layer mash')) {
    return 'feeding';
  }

  // Crop.
  if (value.includes('site selection') || value.includes('land prep') || value.includes('housing') || value.includes('construction')) {
    return 'land';
  }
  if (value.includes('fertil') || value.includes('npk') || value.includes('urea') || value.includes('manure')) return 'fertilizer';
  if (value.includes('weed')) return 'weeding';
  if (value.includes('pest') || value.includes('disease') || value.includes('spray')) return 'pest';
  if (value.includes('irrig') || value.includes('water')) return 'water';
  // "post-harvest handling" is storage, not harvesting — check it first.
  if (value.includes('post-harvest') || value.includes('post harvest') || value.includes('storage') || value.includes('processing')) {
    return 'storage';
  }
  if (value.includes('harvest') || value.includes('market') || value.includes('egg collection')) return 'harvest';
  if (value.includes('plant') || value.includes('sow') || value.includes('transplant') || value.includes('nursing')) return 'planting';
  if (value.includes('germination') || value.includes('test') || value.includes('monitor') || value.includes('scout')) {
    return 'monitoring';
  }

  return 'general';
}

const ICON_BY_KIND: Record<ActivityKind, keyof typeof Ionicons.glyphMap> = {
  land: 'construct-outline',
  planting: 'leaf-outline',
  fertilizer: 'flask-outline',
  weeding: 'cut-outline',
  pest: 'bug-outline',
  water: 'water-outline',
  harvest: 'basket-outline',
  storage: 'cube-outline',
  brooding: 'thermometer-outline',
  feeding: 'nutrition-outline',
  vaccination: 'medkit-outline',
  biosecurity: 'shield-checkmark-outline',
  monitoring: 'eye-outline',
  general: 'ellipse-outline',
};

export function getActivityIcon(name: string): keyof typeof Ionicons.glyphMap {
  return ICON_BY_KIND[classifyActivity(name)];
}
