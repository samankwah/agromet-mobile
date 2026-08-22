import type { MarketCenter, MarketCommodity, MarketTrend } from '../domain/market';

/**
 * The offline fallback for market data.
 *
 * Mirrors SEED_COMMODITIES / SEED_TRENDS / SEED_MARKET_CENTERS in
 * backend/app/main.py. Every commodity has a trend: the card draws a sparkline
 * and the commodity screen draws a full chart, so a commodity without a series
 * is a visibly broken screen the moment the phone loses signal. The last point
 * of each series is that commodity's current price, by construction.
 */

export const MOCK_COMMODITIES: MarketCommodity[] = [
  { slug: 'yellow-maize', name: 'Yellow Maize', category: 'Maize', price: 299.99, unit: 'per bag', trend: 'stable', demand: 'high' },
  { slug: 'white-maize', name: 'White Maize', category: 'Maize', price: 289.99, unit: 'per bag', trend: 'rising', demand: 'high' },
  { slug: 'rice', name: 'Rice', category: 'Rice', price: 159.99, unit: 'per bag', trend: 'stable', demand: 'very-high' },
  { slug: 'yam', name: 'Yam', category: 'Yam', price: 389.99, unit: 'per bag', trend: 'rising', demand: 'high' },
  { slug: 'cassava', name: 'Cassava', category: 'Cassava', price: 129.99, unit: 'per bag', trend: 'stable', demand: 'moderate' },
  { slug: 'tomatoes', name: 'Tomatoes', category: 'Tomatoes', price: 149.99, unit: 'per crate', trend: 'volatile', demand: 'high' },
  { slug: 'pepper', name: 'Pepper', category: 'Pepper', price: 59.99, unit: 'per bag', trend: 'rising', demand: 'high' },
  { slug: 'onion', name: 'Onion', category: 'Onion', price: 89.99, unit: 'per bag', trend: 'seasonal', demand: 'moderate' },
  { slug: 'plantain', name: 'Plantain', category: 'Plantain', price: 79.99, unit: 'per bunch', trend: 'stable', demand: 'high' },
  { slug: 'beans', name: 'Beans', category: 'Beans', price: 199.99, unit: 'per bag', trend: 'rising', demand: 'moderate' },
  { slug: 'soybeans', name: 'Soybeans', category: 'Soybeans', price: 399.99, unit: 'per bag', trend: 'stable', demand: 'growing' },
  { slug: 'sorghum', name: 'Sorghum', category: 'Sorghum', price: 189.99, unit: 'per bag', trend: 'stable', demand: 'low' },
  { slug: 'groundnuts', name: 'Groundnuts', category: 'Groundnuts', price: 249.99, unit: 'per bag', trend: 'rising', demand: 'moderate' },
  { slug: 'cocoa', name: 'Cocoa', category: 'Cocoa', price: 850.0, unit: 'per bag', trend: 'volatile', demand: 'export' },
  { slug: 'poultry', name: 'Poultry', category: 'Poultry', price: 45.0, unit: 'per kg', trend: 'rising', demand: 'very-high' },
];

export const MOCK_MARKET_TRENDS: Record<string, MarketTrend> = {
  'yellow-maize': {
    commoditySlug: 'yellow-maize',
    monthPrices: [280, 285, 290, 295, 298, 299.99],
    seasonalPattern: 'Low during harvest (July-August), High during planting (March-April)',
    peakMonths: [3, 4, 5],
    lowMonths: [7, 8, 9],
  },
  'white-maize': {
    commoditySlug: 'white-maize',
    monthPrices: [265, 270, 276, 282, 287, 289.99],
    seasonalPattern: 'Tracks yellow maize, but firmer when household demand for banku and kenkey is strong',
    peakMonths: [3, 4, 5],
    lowMonths: [8, 9, 10],
  },
  rice: {
    commoditySlug: 'rice',
    monthPrices: [150, 152, 155, 157, 158, 159.99],
    seasonalPattern: 'Stable year-round, slight increase during festivals',
    peakMonths: [12, 1],
    lowMonths: [6, 7, 8],
  },
  tomatoes: {
    commoditySlug: 'tomatoes',
    monthPrices: [120, 140, 160, 180, 170, 149.99],
    seasonalPattern: 'Very volatile, peaks during dry season',
    peakMonths: [1, 2, 3],
    lowMonths: [6, 7, 8],
  },
  yam: {
    commoditySlug: 'yam',
    monthPrices: [350, 360, 370, 380, 385, 389.99],
    seasonalPattern: 'Peaks before harvest, drops after new yam season',
    peakMonths: [6, 7, 8],
    lowMonths: [9, 10, 11],
  },
  cassava: {
    commoditySlug: 'cassava',
    monthPrices: [126, 127, 128, 128.5, 129, 129.99],
    seasonalPattern: 'Flat year-round; roots can be left in the ground until they are needed',
    peakMonths: [2, 3],
    lowMonths: [8, 9],
  },
  pepper: {
    commoditySlug: 'pepper',
    monthPrices: [48, 51, 54, 57, 59, 59.99],
    seasonalPattern: 'Climbs through the dry season as irrigated volumes thin out',
    peakMonths: [12, 1, 2],
    lowMonths: [6, 7, 8],
  },
  onion: {
    commoditySlug: 'onion',
    monthPrices: [110, 102, 95, 90, 88, 89.99],
    seasonalPattern: 'Strongly seasonal; falls once northern and Sahel stock arrives',
    peakMonths: [4, 5, 6],
    lowMonths: [10, 11, 12],
  },
  plantain: {
    commoditySlug: 'plantain',
    monthPrices: [72, 75, 82, 85, 81, 79.99],
    seasonalPattern: "Cannot be stored, so the price follows that week's arrivals",
    peakMonths: [1, 2, 3],
    lowMonths: [7, 8, 9],
  },
  beans: {
    commoditySlug: 'beans',
    monthPrices: [178, 183, 189, 194, 197, 199.99],
    seasonalPattern: 'Stores well, so the price rises steadily through the lean season',
    peakMonths: [4, 5, 6],
    lowMonths: [11, 12],
  },
  soybeans: {
    commoditySlug: 'soybeans',
    monthPrices: [372, 380, 388, 393, 397, 399.99],
    seasonalPattern: 'Crusher demand outruns local supply, so harvest dips stay shallow',
    peakMonths: [2, 3, 4],
    lowMonths: [11, 12],
  },
  sorghum: {
    commoditySlug: 'sorghum',
    monthPrices: [180, 182, 185, 187, 188, 189.99],
    seasonalPattern: 'Steady brewer and feed-mill demand; thin volumes move slowly',
    peakMonths: [3, 4],
    lowMonths: [10, 11],
  },
  groundnuts: {
    commoditySlug: 'groundnuts',
    monthPrices: [225, 231, 238, 243, 247, 249.99],
    seasonalPattern: 'Rises through the lean season once the northern harvest is sold down',
    peakMonths: [4, 5, 6],
    lowMonths: [10, 11, 12],
  },
  cocoa: {
    commoditySlug: 'cocoa',
    monthPrices: [790, 815, 870, 905, 862, 850.0],
    seasonalPattern: 'Volatile; set by the world price and the announced farmgate rate',
    peakMonths: [10, 11, 12],
    lowMonths: [5, 6, 7],
  },
  poultry: {
    commoditySlug: 'poultry',
    monthPrices: [41, 42, 43, 44, 44.5, 45.0],
    seasonalPattern: 'Spikes in December and around Easter; feed-grain cost sets the floor',
    peakMonths: [12, 4],
    lowMonths: [6, 7, 8],
  },
};

export const MOCK_MARKET_CENTERS: MarketCenter[] = [
  { region: 'Greater Accra', majorMarkets: ['Tema Market', 'Kaneshie Market', 'Makola Market'], transportAccess: 'excellent', pricePremium: 1.1 },
  { region: 'Ashanti', majorMarkets: ['Kumasi Central Market', 'Kejetia Market'], transportAccess: 'good', pricePremium: 1.05 },
  { region: 'Northern', majorMarkets: ['Tamale Market', 'Yendi Market'], transportAccess: 'fair', pricePremium: 0.95 },
  { region: 'Western', majorMarkets: ['Takoradi Market', 'Tarkwa Market'], transportAccess: 'good', pricePremium: 1.02 },
];
