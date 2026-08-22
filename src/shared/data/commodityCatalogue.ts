import type { CommodityCatalogueEntry } from '../domain/market';

/**
 * What the market screen lists.
 *
 * Kept in step with frontend/src/data/commodityCatalog.js — the same eighteen
 * entries, the same slugs, so a commodity opened on the web and on the phone
 * is the same commodity at the same address. Prices are not here: they come
 * from the backend, keyed by `commoditySlug`.
 */
export const COMMODITY_CATALOGUE: CommodityCatalogueEntry[] = [
  {
    slug: 'yellow-maize',
    commoditySlug: 'yellow-maize',
    name: 'Yellow Maize',
    category: 'Maize',
    description: 'Premium quality yellow maize',
    about:
      'Yellow maize is the main feed grain in Ghana, moving in 100kg bags from the transition and northern belts into poultry and livestock feed mills. Prices firm up ahead of the March-May planting window and ease once the major-season harvest lands.',
  },
  {
    slug: 'white-maize',
    commoditySlug: 'white-maize',
    name: 'White Maize',
    category: 'Maize',
    description: 'High-grade white maize',
    about:
      'White maize is the food-grade grain behind banku, kenkey and corn dough. It trades at a premium to yellow maize when household demand is strong, and follows the same major-season harvest calendar.',
  },
  {
    slug: 'yellow-soybeans',
    commoditySlug: 'soybeans',
    name: 'Yellow Soybeans',
    category: 'Soybeans',
    description: 'Fresh yellow soybeans',
    about:
      'Soybeans are a rotation crop across the northern savannah, sold to oil crushers and feed processors. Demand is growing faster than local supply, which keeps a floor under the price even in harvest months.',
  },
  {
    slug: 'yam',
    commoditySlug: 'yam',
    name: 'Yam',
    category: 'Yam',
    description: 'Puna yam',
    about:
      'Puna yam is the export-grade tuber from the Bono and Northern yam belt. Prices climb through the lean months before the new-yam harvest, then fall sharply once fresh tubers reach the markets.',
  },
  {
    slug: 'tomatoes',
    commoditySlug: 'tomatoes',
    name: 'Tomatoes',
    category: 'Tomatoes',
    description: 'Fresh tomatoes',
    about:
      'Tomatoes are the most volatile line on this market. Crates move fast and spoil faster, and the dry-season squeeze between January and March can lift the price of the same crate by half within weeks.',
  },
  {
    slug: 'rice',
    commoditySlug: 'rice',
    name: 'Rice',
    category: 'Rice',
    description: 'Jasmine rice',
    about:
      'Locally milled jasmine rice competes directly with imports, which caps how far the price can run. Demand lifts around December festivals and settles through the middle of the year.',
  },
  {
    slug: 'black-cobra-pepper',
    commoditySlug: 'pepper',
    name: 'Black Cobra Pepper',
    category: 'Pepper',
    description: 'Black Cobra pepper',
    about:
      'A hot, thin-walled chilli grown for the fresh market and for drying. It prices off the general pepper market, which rises through the dry season as irrigated volumes thin out.',
  },
  {
    slug: 'anaheim-pepper',
    commoditySlug: 'pepper',
    name: 'Anaheim Pepper',
    category: 'Pepper',
    description: 'Anaheim pepper',
    about:
      'A mild, long-fruited chilli favoured by hotels and processors. It follows the same pepper price line, with buyers paying up for consistent grading rather than for heat.',
  },
  {
    slug: 'aleppo-pepper',
    commoditySlug: 'pepper',
    name: 'Aleppo Pepper',
    category: 'Pepper',
    description: 'Aleppo pepper',
    about:
      'Grown mainly for drying and milling into flake. Because most of the crop is dried rather than sold fresh, it holds value better than the fresh chillies through a glut.',
  },
  {
    slug: 'red-onion',
    commoditySlug: 'onion',
    name: 'Red Onion',
    category: 'Onion',
    description: 'Purple/Red onion',
    about:
      'The staple cooking onion, largely trucked in from the north and across the Sahel border. Prices are strongly seasonal and swing with the condition of imported stock.',
  },
  {
    slug: 'white-onion',
    commoditySlug: 'onion',
    name: 'White Onion',
    category: 'Onion',
    description: 'White onion',
    about:
      'Milder than the red, and bought mostly by restaurants and processors. Thinner volumes mean the price moves with the wider onion market rather than setting its own.',
  },
  {
    slug: 'yellow-onion',
    commoditySlug: 'onion',
    name: 'Yellow Onion',
    category: 'Onion',
    description: 'Yellow onions',
    about:
      'Stores better than the red or white varieties, which makes it the one worth holding when the market is oversupplied. It tracks the general onion price with a shallower trough.',
  },
  {
    slug: 'dressed-chicken',
    commoditySlug: 'poultry',
    name: 'Dressed Chicken',
    category: 'Poultry',
    description: 'Dressed chicken meat',
    about:
      'Processed, chilled birds sold by weight to households, caterers and cold stores. Demand spikes hard in December and around Easter, and feed-grain costs set the floor under the price.',
  },
  {
    slug: 'live-chicken',
    commoditySlug: 'poultry',
    name: 'Live Chicken',
    category: 'Poultry',
    description: 'Live broiler chicken',
    about:
      'Live broilers sold at the farm gate and in open markets. The price tracks dressed chicken but reacts faster, because birds still on feed cost money every day they go unsold.',
  },
  {
    slug: 'beans',
    commoditySlug: 'beans',
    name: 'Beans',
    category: 'Beans',
    description: 'Premium beans',
    about:
      'Cowpea sold dry in bags, so it stores well and the price rises steadily through the lean season. That storability makes it one of the easier crops to time deliberately.',
  },
  {
    slug: 'plantain',
    commoditySlug: 'plantain',
    name: 'Plantain',
    category: 'Plantain',
    description: 'Fresh Apem plantain',
    about:
      'Apem plantain from the forest zone, sold by the bunch. It cannot be stored, so the price is set almost entirely by how much reached the market that week.',
  },
  {
    slug: 'cassava',
    commoditySlug: 'cassava',
    name: 'Cassava',
    category: 'Cassava',
    description: 'Esi Abaaya cassava',
    about:
      'Fresh roots for household use and for processing into gari and dough. Because cassava can be left in the ground until it is needed, the price stays flatter than most fresh produce.',
  },
  {
    slug: 'sorghum',
    commoditySlug: 'sorghum',
    name: 'Sorghum',
    category: 'Sorghum',
    description: 'Premium Kapala sorghum',
    about:
      'Kapala sorghum from the north, bought by brewers and by feed millers. Demand is steadier than maize but thinner, so large lots take longer to move.',
  },
];

/** Category filter options, 'All' first. */
export const COMMODITY_CATEGORIES = [
  'All',
  ...Array.from(new Set(COMMODITY_CATALOGUE.map((entry) => entry.category))).sort(),
];

export function catalogueEntryFor(slug: string): CommodityCatalogueEntry | undefined {
  return COMMODITY_CATALOGUE.find((entry) => entry.slug === slug);
}

export function relatedCommodities(entry: CommodityCatalogueEntry, limit = 4): CommodityCatalogueEntry[] {
  return COMMODITY_CATALOGUE.filter(
    (candidate) => candidate.category === entry.category && candidate.slug !== entry.slug,
  ).slice(0, limit);
}
