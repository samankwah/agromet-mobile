import { POULTRY_OMITTED_PARAMETERS } from '../domain/weeklyAdvisory';
import type { AdvisoryActivity, ArchivedAdvisory, WeeklyAdvisory } from '../domain/weeklyAdvisory';

/**
 * Seeded weekly advisories.
 *
 * These exist because the backend has none: `weekly_advisories` is empty in
 * every database, and stays empty until an extension officer uploads a bulletin
 * spreadsheet. Without a seeded copy the screen would be a permanently blank
 * page that looked broken rather than unpublished.
 *
 * The values are modelled on the parser's documented template
 * (`backend/app/spreadsheet_parser.py`), with parameter names spelled exactly
 * as the spreadsheet spells them. Every cell is filled: a real bulletin often
 * leaves some blank, and `rowsFrom` still writes the parser's literal "-" for
 * those, but a sample with holes in it reads as a broken screen rather than as
 * an illustration of one. Screens that render seeded data say so.
 *
 * The crop bulletin runs the whole season rather than a week or two of it. A
 * real uploaded bulletin carries one worksheet per activity from seed selection
 * through to storage, and a sample stopping after land preparation would leave
 * a farmer thinking the app only covers the start of the year.
 */

const CROP_PARAMETERS = [
  'RAINFALL',
  'TEMP',
  'HUMIDITY',
  'SOIL MOISTURE',
  'SOIL TEMP',
  'SUNSHINE INTENSITY',
  'SUNRISE',
  'SUNSET',
  'EVAPO-TRANSP.',
];

type Cells = Record<string, string>;

/** One worksheet of the bulletin, as the parser emits it. */
function stage(
  activity: string,
  when: { week: string; monthYear: string; startDate: string; endDate: string },
  forecast: Cells,
  implication: Cells,
  advisory: Cells,
  summaryTitle: string,
  summaryBody: string,
): AdvisoryActivity {
  return {
    activity,
    metadata: {
      zone: 'Forest',
      region: 'Eastern Region',
      district: 'Abuakwa North',
      crop: 'Rice',
      ...when,
    },
    rows: CROP_PARAMETERS.map((parameter) => ({
      parameter,
      forecast: forecast[parameter] ?? '-',
      implication: implication[parameter] ?? '-',
      advisory: advisory[parameter] ?? '-',
    })),
    summaryTitle,
    summaryBody,
  };
}

export const MOCK_CROP_ADVISORY: WeeklyAdvisory = {
  id: 'sample-crop-advisory',
  kind: 'crop',
  title: 'Rice Advisory',
  region: 'Eastern Region',
  district: 'Abuakwa North',
  crop: 'Rice',
  year: 2026,
  season: 'Major Season',
  summary: 'Weekly agrometeorological advisory for rice.',
  createdAt: '2026-01-26T06:00:00.000Z',
  recommendations: [],
  managementMetrics: {},
  activities: [
    stage(
      'Seed selection and seed treatment',
      { week: 'Weeks 5-8', monthYear: 'Jan/Feb 2026', startDate: '2026-01-26', endDate: '2026-02-22' },
      {
        RAINFALL: '30% occurrence',
        TEMP: '26/34 °C',
        HUMIDITY: '60%',
        'SOIL MOISTURE': 'Low, 20 - 30% of capacity',
        'SOIL TEMP': '28 - 31 °C',
        'SUNSHINE INTENSITY': '8 hours',
        SUNRISE: '6:13 AM',
        SUNSET: '6:05 PM',
        'EVAPO-TRANSP.': '3.5 - 4.0 mm/day',
      },
      {
        RAINFALL: 'No rainfall to low rainfall expected',
        TEMP: 'Warm days and cool nights',
        HUMIDITY: 'Suitable temperature',
        'SOIL MOISTURE': 'Moderate effect',
        'SOIL TEMP': 'Warm enough for germination',
        'SUNSHINE INTENSITY': 'High day light',
        SUNRISE: 'Late sunrise',
        SUNSET: 'Early sunset',
        'EVAPO-TRANSP.': 'High water loss from the soil',
      },
      {
        RAINFALL: 'Select good and viable seeds. Do your germination test for your variety and treat seeds.',
        TEMP: 'Field investigation activities can begin, including soil nutrient analysis and field measurement.',
        HUMIDITY: 'Good condition for field activities. Field workers are advised to hydrate often.',
        'SOIL MOISTURE':
          'The soil is too dry for direct sowing. Wet the nursery bed before sowing and mulch it to hold moisture.',
        'SOIL TEMP':
          'Soil warmth is right for germination. Sow in the nursery early in the morning while the bed is still moist.',
        'SUNSHINE INTENSITY': 'Adequate day length for field activity.',
        SUNRISE: 'Field activities can begin early in the day.',
        SUNSET: 'Darkness would set in early, decreasing visibility and affecting field activities.',
        'EVAPO-TRANSP.': 'Remain hydrated and wear protective clothing during field activities.',
      },
      'DRY CONDITIONS WITH GOOD WORKING DAYLIGHT',
      'Overall summary weather outlook and advisory for rice farmers in the Abuakwa North Municipality of the Eastern Region for the week of 26th January to 22nd February 2026. Little rainfall is expected, so prepare seed and equipment now and plan irrigation for the nursery.',
    ),

    stage(
      'Land preparation',
      { week: 'Weeks 9-10', monthYear: 'Feb 2026', startDate: '2026-02-23', endDate: '2026-03-08' },
      {
        RAINFALL: '45% occurrence',
        TEMP: '25/33 °C',
        HUMIDITY: '68%',
        'SOIL MOISTURE': 'Rising',
        'SOIL TEMP': '27 - 30 °C',
        'SUNSHINE INTENSITY': '7 hours',
        SUNRISE: '6:10 AM',
        SUNSET: '6:12 PM',
        'EVAPO-TRANSP.': '3.2 - 3.8 mm/day',
      },
      {
        RAINFALL: 'Occasional showers likely',
        TEMP: 'Milder days, less heat stress',
        HUMIDITY: 'Comfortable for field labour',
        'SOIL MOISTURE': 'Soil becoming workable',
        'SOIL TEMP': 'Steady, good for early growth',
        'SUNSHINE INTENSITY': 'Moderate day light',
        SUNRISE: 'Earlier sunrise',
        SUNSET: 'Later sunset',
        'EVAPO-TRANSP.': 'Less water lost than in January',
      },
      {
        RAINFALL: 'Time ploughing for the days after a shower, when the soil is moist but not saturated.',
        TEMP: 'Begin land preparation early in the morning to avoid the midday heat.',
        HUMIDITY: 'Comfortable for a full day of land preparation. Keep drinking water at the field.',
        'SOIL MOISTURE': 'Level the field and repair bunds while the soil holds moisture.',
        'SOIL TEMP': 'Soil temperature is steady. Prepare the nursery for transplanting in the coming weeks.',
        'SUNSHINE INTENSITY': 'Enough daylight for a full working day. Plough during the drier spells between showers.',
        SUNRISE: 'Start field work at first light, while the ground is still cool.',
        SUNSET: 'Longer evenings give extra working time. Finish bund repairs before dark.',
        'EVAPO-TRANSP.': 'Water loss is lower now, so a puddled field will hold water longer before transplanting.',
      },
      'SHOWERS RETURN, SOIL BECOMES WORKABLE',
      'Occasional showers through late February will soften the ground. Plough and level between showers, and repair bunds before the main rains arrive.',
    ),

    stage(
      'Nursery establishment',
      { week: 'Weeks 11-13', monthYear: 'Mar 2026', startDate: '2026-03-09', endDate: '2026-03-29' },
      {
        RAINFALL: '60% occurrence',
        TEMP: '24/32 °C',
        HUMIDITY: '74%',
        'SOIL MOISTURE': 'Adequate, 55 - 65% of capacity',
        'SOIL TEMP': '26 - 29 °C',
        'SUNSHINE INTENSITY': '6 hours',
        SUNRISE: '6:04 AM',
        SUNSET: '6:14 PM',
        'EVAPO-TRANSP.': '2.9 - 3.4 mm/day',
      },
      {
        RAINFALL: 'Regular showers beginning',
        TEMP: 'Favourable for seedling growth',
        HUMIDITY: 'Raised risk of damping off',
        'SOIL MOISTURE': 'Nursery beds stay wet without watering',
        'SOIL TEMP': 'Ideal for even emergence',
        'SUNSHINE INTENSITY': 'Cloudier days',
        SUNRISE: 'Sunrise earlier each week',
        SUNSET: 'Longer evenings',
        'EVAPO-TRANSP.': 'Lower water demand',
      },
      {
        RAINFALL: 'Raise nursery beds so showers drain off rather than washing the seed out.',
        TEMP: 'Temperatures favour steady growth. Expect seedlings ready to move in about three weeks.',
        HUMIDITY: 'Thin crowded seedlings and keep the nursery open to air to limit damping off.',
        'SOIL MOISTURE': 'Stop hand watering except in a dry spell of more than three days.',
        'SOIL TEMP': 'Emergence should be even. Gap up any bare patches within the first week.',
        'SUNSHINE INTENSITY': 'Cloud slows hardening off. Remove any shade cover once seedlings are up.',
        SUNRISE: 'Inspect the nursery at first light, when damping off shows most clearly.',
        SUNSET: 'Use the longer evening to fetch and stack the mulch you will need at transplanting.',
        'EVAPO-TRANSP.': 'Beds dry more slowly now, so water less often and check before you do.',
      },
      'RAINS SETTLE IN, GOOD NURSERY WEATHER',
      'Regular showers and mild temperatures through March suit nursery establishment. Raise the beds, thin crowded seedlings, and stop hand watering unless a dry spell runs past three days.',
    ),

    stage(
      'Transplanting',
      { week: 'Weeks 14-16', monthYear: 'Mar/Apr 2026', startDate: '2026-03-30', endDate: '2026-04-19' },
      {
        RAINFALL: '72% occurrence',
        TEMP: '24/31 °C',
        HUMIDITY: '80%',
        'SOIL MOISTURE': 'High, 75 - 85% of capacity',
        'SOIL TEMP': '25 - 28 °C',
        'SUNSHINE INTENSITY': '5 hours',
        SUNRISE: '5:58 AM',
        SUNSET: '6:15 PM',
        'EVAPO-TRANSP.': '2.5 - 3.0 mm/day',
      },
      {
        RAINFALL: 'Main rains established',
        TEMP: 'Low transplanting shock',
        HUMIDITY: 'Seedlings recover quickly',
        'SOIL MOISTURE': 'Fields can be puddled and held',
        'SOIL TEMP': 'Good for root establishment',
        'SUNSHINE INTENSITY': 'Overcast much of the day',
        SUNRISE: 'Early light',
        SUNSET: 'Long working evening',
        'EVAPO-TRANSP.': 'Little water lost from standing fields',
      },
      {
        RAINFALL: 'Transplant into a field already puddled and holding water, not into one still filling.',
        TEMP: 'Mild days mean less shock. Transplant in the afternoon so seedlings settle overnight.',
        HUMIDITY: 'High humidity speeds recovery. Expect new leaves within a week of transplanting.',
        'SOIL MOISTURE': 'Hold two to three centimetres of standing water for the first week after transplanting.',
        'SOIL TEMP': 'Roots will take quickly. Keep spacing at 20 by 20 centimetres for good tillering.',
        'SUNSHINE INTENSITY': 'Cloud reduces wilting, so seedlings can be moved through the day.',
        SUNRISE: 'Lift seedlings at first light and move them the same morning.',
        SUNSET: 'Finish transplanting before dark so the field can be flooded the same day.',
        'EVAPO-TRANSP.': 'Water loss is low, so bunds need checking only every few days.',
      },
      'MAIN RAINS ARRIVE, TRANSPLANT NOW',
      'The main rains are established and fields will hold water. Transplant three-week-old seedlings into a puddled field and keep shallow standing water for the first week.',
    ),

    stage(
      'Fertiliser application',
      { week: 'Weeks 17-19', monthYear: 'Apr/May 2026', startDate: '2026-04-20', endDate: '2026-05-10' },
      {
        RAINFALL: '68% occurrence',
        TEMP: '24/31 °C',
        HUMIDITY: '82%',
        'SOIL MOISTURE': 'High, 70 - 80% of capacity',
        'SOIL TEMP': '25 - 28 °C',
        'SUNSHINE INTENSITY': '5 hours',
        SUNRISE: '5:52 AM',
        SUNSET: '6:16 PM',
        'EVAPO-TRANSP.': '2.6 - 3.1 mm/day',
      },
      {
        RAINFALL: 'Heavy showers between drier days',
        TEMP: 'Steady growing conditions',
        HUMIDITY: 'Slow drying of applied fertiliser',
        'SOIL MOISTURE': 'Risk of nutrient washing out',
        'SOIL TEMP': 'Active nutrient uptake',
        'SUNSHINE INTENSITY': 'Moderate',
        SUNRISE: 'Early light',
        SUNSET: 'Long evening',
        'EVAPO-TRANSP.': 'Low',
      },
      {
        RAINFALL: 'Do not spread fertiliser before a heavy shower. Wait for a drier day and apply into shallow water.',
        TEMP: 'Conditions favour uptake. Apply the first top dressing at active tillering.',
        HUMIDITY: 'Store bags off the ground and closed, or they will cake before you finish the field.',
        'SOIL MOISTURE': 'Drain to a shallow depth before spreading, then re-flood after two days to hold nutrients.',
        'SOIL TEMP': 'Uptake is strong now, so split the nitrogen rather than applying it all at once.',
        'SUNSHINE INTENSITY': 'Spread in the cooler part of the day to limit losses to the air.',
        SUNRISE: 'Apply in the early morning, before the wind rises.',
        SUNSET: 'Close and store any opened bags before nightfall.',
        'EVAPO-TRANSP.': 'Low water loss means the field will hold its shallow depth for several days.',
      },
      'SPLIT THE NITROGEN BETWEEN SHOWERS',
      'Heavy showers between drier days will wash out fertiliser spread at the wrong time. Drain to shallow water, apply on a dry day, and re-flood after two days.',
    ),

    stage(
      'Weed control',
      { week: 'Weeks 20-22', monthYear: 'May 2026', startDate: '2026-05-11', endDate: '2026-05-31' },
      {
        RAINFALL: '70% occurrence',
        TEMP: '23/30 °C',
        HUMIDITY: '84%',
        'SOIL MOISTURE': 'High, 75 - 85% of capacity',
        'SOIL TEMP': '24 - 27 °C',
        'SUNSHINE INTENSITY': '4 hours',
        SUNRISE: '5:50 AM',
        SUNSET: '6:18 PM',
        'EVAPO-TRANSP.': '2.4 - 2.9 mm/day',
      },
      {
        RAINFALL: 'Frequent wet days',
        TEMP: 'Fast weed growth',
        HUMIDITY: 'Spray dries slowly on the leaf',
        'SOIL MOISTURE': 'Standing water suppresses some weeds',
        'SOIL TEMP': 'Rapid regrowth after weeding',
        'SUNSHINE INTENSITY': 'Low',
        SUNRISE: 'Early light',
        SUNSET: 'Long evening',
        'EVAPO-TRANSP.': 'Low',
      },
      {
        RAINFALL: 'Rain within six hours washes off herbicide. Weed by hand in a wet week rather than spraying.',
        TEMP: 'Weeds grow as fast as the crop now. Complete the first weeding within three weeks of transplanting.',
        HUMIDITY: 'Spray only on a drying morning, never with dew still on the leaf.',
        'SOIL MOISTURE': 'Keep five centimetres of standing water, which holds back most grass weeds on its own.',
        'SOIL TEMP': 'Regrowth is quick. Plan a second weeding about three weeks after the first.',
        'SUNSHINE INTENSITY': 'Low light slows the crop more than the weeds, so weed early rather than late.',
        SUNRISE: 'Hand weed in the cool early morning, when the work is easiest.',
        SUNSET: 'Remove pulled weeds from the field before dark so they cannot re-root.',
        'EVAPO-TRANSP.': 'The field holds its water, so maintain the depth that suppresses weeds.',
      },
      'WET WEEKS FAVOUR THE WEEDS',
      'Frequent rain will wash herbicide off the leaf and drive fast weed growth. Hand weed within three weeks of transplanting and keep standing water at about five centimetres.',
    ),

    stage(
      'Pest and disease management',
      { week: 'Weeks 23-26', monthYear: 'Jun 2026', startDate: '2026-06-01', endDate: '2026-06-28' },
      {
        RAINFALL: '65% occurrence',
        TEMP: '23/29 °C',
        HUMIDITY: '86%',
        'SOIL MOISTURE': 'High, 70 - 80% of capacity',
        'SOIL TEMP': '24 - 26 °C',
        'SUNSHINE INTENSITY': '4 hours',
        SUNRISE: '5:52 AM',
        SUNSET: '6:22 PM',
        'EVAPO-TRANSP.': '2.3 - 2.8 mm/day',
      },
      {
        RAINFALL: 'Persistent wet leaf surfaces',
        TEMP: 'Favourable for blast and stem borer',
        HUMIDITY: 'High disease pressure',
        'SOIL MOISTURE': 'Standing water suits snails',
        'SOIL TEMP': 'Steady',
        'SUNSHINE INTENSITY': 'Low, slow drying',
        SUNRISE: 'Early light',
        SUNSET: 'Long evening',
        'EVAPO-TRANSP.': 'Low',
      },
      {
        RAINFALL: 'Scout twice a week. Rain within six hours of spraying means the treatment must be repeated.',
        TEMP: 'These temperatures favour blast. Check the leaf collar and neck at booting.',
        HUMIDITY: 'Disease pressure is at its highest. Remove and burn badly infected hills rather than treating them.',
        'SOIL MOISTURE': 'Drain briefly if golden apple snails appear, then re-flood once they have been collected.',
        'SOIL TEMP': 'Stem borer is active. Look for dead hearts and cut out affected tillers.',
        'SUNSHINE INTENSITY': 'Leaves stay wet longer under cloud, so spray on the brightest morning of the week.',
        SUNRISE: 'Scout at first light, when borer moths and snails are easiest to find.',
        SUNSET: 'Do not spray in the evening. The leaf will not dry before nightfall.',
        'EVAPO-TRANSP.': 'Slow drying keeps spray on the leaf, but also keeps disease alive. Time it carefully.',
      },
      'HIGH DISEASE PRESSURE, SCOUT TWICE A WEEK',
      'Warm, wet and cloudy weather through June favours blast, stem borer and snails. Scout twice a week and spray only on a drying morning.',
    ),

    stage(
      'Harvesting',
      { week: 'Weeks 27-30', monthYear: 'Jul 2026', startDate: '2026-06-29', endDate: '2026-07-26' },
      {
        RAINFALL: '40% occurrence',
        TEMP: '22/29 °C',
        HUMIDITY: '78%',
        'SOIL MOISTURE': 'Falling, 45 - 55% of capacity',
        'SOIL TEMP': '24 - 27 °C',
        'SUNSHINE INTENSITY': '6 hours',
        SUNRISE: '5:58 AM',
        SUNSET: '6:22 PM',
        'EVAPO-TRANSP.': '2.8 - 3.3 mm/day',
      },
      {
        RAINFALL: 'Drier spell between rains',
        TEMP: 'Even ripening',
        HUMIDITY: 'Grain dries slowly in the field',
        'SOIL MOISTURE': 'Field firm enough to walk and carry',
        'SOIL TEMP': 'Steady',
        'SUNSHINE INTENSITY': 'Improving',
        SUNRISE: 'Later sunrise',
        SUNSET: 'Still long evenings',
        'EVAPO-TRANSP.': 'Rising',
      },
      {
        RAINFALL: 'Harvest in the drier spell. Grain left standing through a shower will sprout in the head.',
        TEMP: 'Ripening is even. Harvest when about four fifths of the grains have turned straw coloured.',
        HUMIDITY: 'Grain will not dry in the field alone. Plan to thresh and dry within two days of cutting.',
        'SOIL MOISTURE': 'Drain the field ten days before harvest so it is firm enough to carry the crop out.',
        'SOIL TEMP': 'No action needed. Turn attention to drying and storage.',
        'SUNSHINE INTENSITY': 'Better sunshine returns. Use it for drying rather than for cutting.',
        SUNRISE: 'Cut in the morning, once the dew has lifted.',
        SUNSET: 'Move cut sheaves under cover before nightfall.',
        'EVAPO-TRANSP.': 'Rising water loss helps drying. Spread the harvest thinly on a clean surface.',
      },
      'A DRIER SPELL, HARVEST AND DRY',
      'July brings a drier spell and better sunshine. Drain the field ten days ahead, cut at about four fifths straw colour, and thresh and dry within two days.',
    ),

    stage(
      'Post-harvest handling and storage',
      { week: 'Weeks 31-33', monthYear: 'Aug 2026', startDate: '2026-07-27', endDate: '2026-08-16' },
      {
        RAINFALL: '35% occurrence',
        TEMP: '22/28 °C',
        HUMIDITY: '76%',
        'SOIL MOISTURE': 'Low, 35 - 45% of capacity',
        'SOIL TEMP': '23 - 26 °C',
        'SUNSHINE INTENSITY': '6 hours',
        SUNRISE: '6:02 AM',
        SUNSET: '6:16 PM',
        'EVAPO-TRANSP.': '3.0 - 3.5 mm/day',
      },
      {
        RAINFALL: 'Occasional showers still possible',
        TEMP: 'Cool enough for safe storage',
        HUMIDITY: 'Grain can reabsorb moisture',
        'SOIL MOISTURE': 'Fields drying out',
        'SOIL TEMP': 'Falling',
        'SUNSHINE INTENSITY': 'Good drying days',
        SUNRISE: 'Later sunrise',
        SUNSET: 'Earlier sunset',
        'EVAPO-TRANSP.': 'Good for drying',
      },
      {
        RAINFALL: 'Showers can still catch a drying floor. Keep a cover within reach and never dry overnight.',
        TEMP: 'Cool nights suit storage. Bag the grain only once it has cooled after drying.',
        HUMIDITY: 'Dry to 13 percent moisture. Above that, grain reabsorbs moisture and moulds in the bag.',
        'SOIL MOISTURE': 'Fields are drying. Clear and burn stubble to break the pest cycle before next season.',
        'SOIL TEMP': 'Falling soil temperature slows regrowth in the stubble.',
        'SUNSHINE INTENSITY': 'Use the good drying days. Turn the grain every two hours on the drying floor.',
        SUNRISE: 'Spread grain once the dew has gone, not before.',
        SUNSET: 'Gather and cover the grain before dusk so it does not take up moisture overnight.',
        'EVAPO-TRANSP.': 'Drying conditions are good. Two clear days should be enough to reach storage moisture.',
      },
      'GOOD DRYING DAYS, STORE AT 13 PERCENT',
      'August offers good drying days with occasional showers. Dry to 13 percent moisture, cool the grain before bagging, and clear stubble to break the pest cycle.',
    ),
  ],
};

const POULTRY_PARAMETERS = CROP_PARAMETERS.filter(
  (parameter) => !POULTRY_OMITTED_PARAMETERS.includes(parameter),
);

type Band = { forecast: Cells; implication: Cells; advisory: Cells };
type Place = { region: string; district: string; crop: string };

const JASIKAN: Place = { region: 'Oti Region', district: 'Jasikan', crop: 'Broiler' };
const AHANTA_WEST: Place = { region: 'Western Region', district: 'Ahanta West', crop: 'Layer' };

/**
 * One worksheet of a poultry bulletin.
 *
 * Same builder as `stage` above with a place and a shared weather band —
 * poultry bulletins are authored on the identical district template, which is
 * exactly why the screen no longer branches on kind.
 *
 * Bands are shared by stage character rather than written out per stage: every
 * vaccination week faces the same weather question, and repeating the answer
 * twelve times would only invite the copies to drift.
 *
 * The soil columns are omitted entirely — see POULTRY_OMITTED_PARAMETERS in
 * domain/weeklyAdvisory.ts for why, and for the matching filter applied to real
 * uploads, which do carry those columns full of dashes.
 */
function poultryStage(
  place: Place,
  activity: string,
  week: string,
  band: Band,
  summaryTitle: string,
  summaryBody: string,
): AdvisoryActivity {
  return {
    activity,
    metadata: { zone: 'Forest', ...place, week, monthYear: 'Jan 2026', startDate: '', endDate: '' },
    rows: POULTRY_PARAMETERS.map((parameter) => ({
      parameter,
      forecast: band.forecast[parameter] ?? '-',
      implication: band.implication[parameter] ?? '-',
      advisory: band.advisory[parameter] ?? '-',
    })),
    summaryTitle,
    summaryBody,
  };
}

/* ------------------------------------------------------------------ bands --
 * Broiler figures are the Jasikan workbook's own. Layer figures are drafted:
 * the Ahanta West workbook groups the same programme into seven sheets and
 * carries weather for those, not for all sixteen stages below.
 */

const SUN_LONG: Cells = { 'SUNSHINE INTENSITY': '9 hours', SUNRISE: '5:50 AM', SUNSET: '6:10 PM' };
const SUN_SHORT: Cells = { 'SUNSHINE INTENSITY': '8 hours', SUNRISE: '5:50 AM', SUNSET: '6:15 PM' };
const IMPL_SUN: Cells = {
  'SUNSHINE INTENSITY': 'High day light',
  SUNRISE: 'Early sunrise',
  SUNSET: 'Late sunset',
  'EVAPO-TRANSP.': 'Moderate water loss',
};

/** Siting and building — dry, workable weather. */
const BAND_BUILD: Band = {
  forecast: { RAINFALL: '30% occurrence', TEMP: '26/34 °C', HUMIDITY: '60%', 'SUNSHINE INTENSITY': '8 hours', SUNRISE: '6:13 AM', SUNSET: '6:05 PM', 'EVAPO-TRANSP.': '3.5-4.0 mm/day' },
  implication: {
    RAINFALL: 'No rainfall to low rainfall expected',
    TEMP: 'Suitable temperature',
    HUMIDITY: 'Moderate effect',
    'SUNSHINE INTENSITY': 'High day light',
    SUNRISE: 'Late sunrise',
    SUNSET: 'Early sunset',
    'EVAPO-TRANSP.': 'Moderate water loss',
  },
  advisory: {
    RAINFALL: 'Site selection can go ahead. Choose ground that drains, away from other poultry, and set the house long axis east to west.',
    TEMP: 'Field investigation can begin, including access, water supply and market distance.',
    HUMIDITY: 'Good conditions for construction. Build in ridge and eave openings now; a house that traps moist air costs birds every wet season it stands.',
    'SUNSHINE INTENSITY': 'Adequate day length for construction work.',
    SUNRISE: 'Field activities can begin early in the morning.',
    SUNSET: 'Darkness sets in early, so plan to stop before dusk.',
    'EVAPO-TRANSP.': 'Remain hydrated.',
  },
};

/** The week before the chicks land. */
const BAND_PREP: Band = {
  forecast: { RAINFALL: '40% occurrence', TEMP: '26/34 °C', HUMIDITY: '65%', ...SUN_LONG, 'EVAPO-TRANSP.': '3.5-4.0 mm/day' },
  implication: { RAINFALL: 'Low rainfall expected', TEMP: 'Suitable temperature', HUMIDITY: 'Moderate effect', ...IMPL_SUN },
  advisory: {
    RAINFALL: 'Clean, disinfect and rest the house. Bed dry litter and set up guards, feeders and drinkers before the chicks arrive.',
    TEMP: 'Pre-heat the brooder well ahead so the litter itself is warm, not just the air.',
    HUMIDITY: 'Make sure the house can be ventilated without draughting the brooding area.',
    'SUNSHINE INTENSITY': 'Use the long day to finish preparation; nothing should be outstanding on arrival day.',
    SUNRISE: 'Field activity should begin very early in the morning.',
    SUNSET: 'Field activity can extend into the late evening.',
    'EVAPO-TRANSP.': 'Fill and check drinkers so water is at house temperature when the chicks go in.',
  },
};

/** Chick weeks — heat and water are the whole job. */
const BAND_BROOD: Band = {
  forecast: { RAINFALL: '60% occurrence', TEMP: '25/33 °C', HUMIDITY: '80%', ...SUN_LONG, 'EVAPO-TRANSP.': '3.5-4.0 mm/day' },
  implication: {
    RAINFALL: 'Low rainfall expected and chicks dehydrate faster in dry conditions, reducing feed intake.',
    TEMP: 'Suitable temperature',
    HUMIDITY: 'Moderate to high effects (dry air, dusty litter, and dehydration risks).',
    ...IMPL_SUN,
  },
  advisory: {
    RAINFALL: 'Ensure access to potable and cool water and feed ad lib; and add vitamins to water for the first 3 days to prevent dehydration.',
    TEMP: 'Hold 33-35 °C at chick level for the first 3 days, then step down about 2 °C a week.',
    HUMIDITY: 'Ensure minimum ventilation to exchange air without causing drafts on chicks.',
    'SUNSHINE INTENSITY': 'There will be suitable sunlight and energy to support brooding and growth of birds',
    SUNRISE: 'Farm activity should begin very early in the morning. Chicks bunched in a corner mean the heat is low.',
    SUNSET: 'Check brooder heat again after dark. Night temperature falls faster than the house feels.',
    'EVAPO-TRANSP.': 'Water in drinkers must be monitored regularly to ensure birds have access to clean and cool water.',
  },
};

/** Any feed change, starter through finisher or layer mash. */
const BAND_FEED: Band = {
  forecast: { RAINFALL: '60% occurrence', TEMP: '25/33 °C', HUMIDITY: '70-80%', ...SUN_LONG, 'EVAPO-TRANSP.': '3.7-4.3 mm/day' },
  implication: {
    RAINFALL: 'Medium rainfall expected',
    TEMP: 'Suitable temperature',
    HUMIDITY: 'Moderate effects (high humidity increases heat stress and fungal/bacterial risks)',
    ...IMPL_SUN,
  },
  advisory: {
    RAINFALL: 'Change the diet gradually over about a week; an abrupt switch costs intake.',
    TEMP: 'Feed during the cooler parts of the day. Intake drops once the house warms up.',
    HUMIDITY: 'Store feed on pallets away from the walls and keep the store ventilated. At this humidity mash cakes and moulds within days.',
    'SUNSHINE INTENSITY': 'Long daylight supports steady feeding. Keep troughs topped up through the day rather than filling once.',
    SUNRISE: 'Provide potable and cool water ad-lib',
    SUNSET: 'Delay evening feeding until temperatures drop (encourages activity during cooler hours).',
    'EVAPO-TRANSP.': 'Water in drinkers must be monitored regularly to ensure birds have access to clean and cool water.',
  },
};

/** Every water-route vaccination faces the same question: keep it alive. */
const BAND_VACCINE: Band = {
  forecast: { RAINFALL: '60% occurrence', TEMP: '26/33 °C', HUMIDITY: '67%', ...SUN_LONG, 'EVAPO-TRANSP.': '3.5-4.0 mm/day' },
  implication: { RAINFALL: 'Low rainfall effect', TEMP: 'Suitable temperature', HUMIDITY: 'Moderate effect', ...IMPL_SUN },
  advisory: {
    RAINFALL: 'Use skim milk (1 g/L) to stabilise the vaccine in the drinking water, and use it within two hours.',
    TEMP: 'Cooler morning temperature favours vaccination. Heat kills a live vaccine faster than anything else on the farm.',
    HUMIDITY: 'Low humidity facilitates the evaporation that concentrates the dose; keep the birds drinking.',
    'SUNSHINE INTENSITY': 'Dehydration risk from intense sunshine — keep vaccine and mixed water out of direct sun throughout.',
    SUNRISE: 'Withhold water 1-2 hours pre-vaccination so every bird drinks its share.',
    SUNSET: 'Do not carry a mixed vaccine over to the evening; discard and mix fresh.',
    'EVAPO-TRANSP.': 'Restore full water immediately afterwards.',
  },
};

/** Injected vaccination and other whole-flock handling. */
const BAND_HANDLING: Band = {
  forecast: { RAINFALL: '50% occurrence', TEMP: '24/30 °C', HUMIDITY: '72%', ...SUN_SHORT, 'EVAPO-TRANSP.': '3.5-4.0 mm/day' },
  implication: {
    RAINFALL: 'Low rainfall effect',
    TEMP: 'Milder days, less handling stress',
    HUMIDITY: 'Moderate effect',
    'SUNSHINE INTENSITY': 'Moderate day light',
    SUNRISE: 'Early sunrise',
    SUNSET: 'Late sunset',
    'EVAPO-TRANSP.': 'Moderate water loss',
  },
  advisory: {
    RAINFALL: 'Handle birds on a dry day; wet litter and handling together spread infection.',
    TEMP: 'Work in the cool of the morning. Handling in the heat costs weight and can cost birds.',
    HUMIDITY: 'Keep the house well aired while birds are crowded for catching.',
    'SUNSHINE INTENSITY': 'Dim the house to settle the flock before catching.',
    SUNRISE: 'Start at first light and finish before the day warms.',
    SUNSET: 'Give vitamins in the water and leave the flock undisturbed overnight afterwards.',
    'EVAPO-TRANSP.': 'Make sure water is available the moment handling ends.',
  },
};

/** Biosecurity, which runs the whole cycle rather than a stage of it. */
const BAND_BIOSECURITY: Band = {
  forecast: { RAINFALL: '60% occurrence', TEMP: '24/28 °C', HUMIDITY: '78%', ...SUN_SHORT, 'EVAPO-TRANSP.': '3.5-4.0 mm/day' },
  implication: { RAINFALL: 'Medium rainfall expected', TEMP: 'Suitable temperature', HUMIDITY: 'High effect', ...IMPL_SUN },
  advisory: {
    RAINFALL: 'Keep the footbath under cover. Rain dilutes the disinfectant to nothing, and a diluted footbath is worse than none because it is still trusted.',
    TEMP: 'Disinfectant loses strength in the heat. Mix a fresh solution each morning rather than topping up yesterday.',
    HUMIDITY: 'Damp litter keeps organic matter alive and disinfectant cannot work through it. Scrape and re-bed wet patches before spraying.',
    'SUNSHINE INTENSITY': 'Dry cleaned crates and equipment in full sun before they go back in the pen. Sunlight finishes what the disinfectant starts.',
    SUNRISE: 'Change the footbath and walk the pen first thing, before any visitor or vehicle reaches the farm.',
    SUNSET: 'Close and secure the house before dusk to keep rodents and wild birds out overnight.',
    'EVAPO-TRANSP.': 'Check that footbaths and spray drums have not evaporated dry during the day.',
  },
};

/** Broiler off-take: catching, processing, market. */
const BAND_OFFTAKE: Band = {
  forecast: { RAINFALL: '60% occurrence', TEMP: '24/28 °C', HUMIDITY: '78%', ...SUN_SHORT, 'EVAPO-TRANSP.': '3.5-4.0 mm/day' },
  implication: { RAINFALL: 'Medium rainfall expected', TEMP: 'Suitable temperature', HUMIDITY: 'High effect', ...IMPL_SUN },
  advisory: {
    RAINFALL: 'Catch and load under cover. Wet birds chill in transit and lose condition before they reach the market.',
    TEMP: 'Move birds in the cool of the early morning or evening, never in the middle of the day.',
    HUMIDITY: 'Process promptly and keep meat cold. High humidity shortens the time you have before spoilage.',
    'SUNSHINE INTENSITY': 'Keep crates shaded while birds wait; a crate in full sun becomes an oven.',
    SUNRISE: 'Withdraw feed 8-12 hours before catching, but never water.',
    SUNSET: 'Finish loading before dark so birds are not held overnight in crates.',
    'EVAPO-TRANSP.': 'Give water right up to catching to limit weight loss in transit.',
  },
};

/** Point of lay onward — egg hygiene and heat. */
const BAND_LAY: Band = {
  forecast: { RAINFALL: '55% occurrence', TEMP: '25/32 °C', HUMIDITY: '75%', ...SUN_LONG, 'EVAPO-TRANSP.': '3.7-4.3 mm/day' },
  implication: {
    RAINFALL: 'Medium rainfall expected',
    TEMP: 'Warm days; heat depresses egg size and shell quality',
    HUMIDITY: 'Moderate to high effect on egg hygiene',
    ...IMPL_SUN,
  },
  advisory: {
    RAINFALL: 'Keep nest boxes dry and bedded. A wet nest is the shortest route from a clean egg to a rejected one.',
    TEMP: 'Collect eggs at least three times a day in this heat, and more in the afternoon. Store cool and out of the sun.',
    HUMIDITY: 'Do not wash eggs; wipe soiling off dry. Washing drives bacteria through the shell.',
    'SUNSHINE INTENSITY': 'Hold the lighting programme steady at 16 hours; changing it mid-lay costs production.',
    SUNRISE: 'Take the first collection early, before the house warms.',
    SUNSET: 'Take a final collection before dark so no egg sits out overnight.',
    'EVAPO-TRANSP.': 'Water intake drives egg output. Never let the drinkers run dry.',
  },
};

/* ------------------------------------------------------- the two bulletins --
 * The ORDER of the stages is the district's own list. The names are shortened
 * from it, because each one renders twice — as a chip in a horizontal strip and
 * as the panel heading — and the district's own phrasing runs to fifteen words
 * ("1st Gumboro vaccine intermediate administration if day-old chicks were not
 * given Gumboro matelin at hatchery"), which wraps to three lines on a 360dp
 * screen and makes the chip row unreadable.
 *
 * Nothing is lost: the detail a short name drops — the strain, the route, the
 * hatchery condition — moves into that stage's summary body, which has room for
 * a sentence. Keep it that way. If a name has to grow, put the words in the body
 * instead. The week labels are drafted, and want an agronomist's eye.
 */

export const MOCK_POULTRY_ADVISORY: WeeklyAdvisory = {
  id: 'sample-poultry-advisory',
  kind: 'poultry',
  title: 'Broiler Advisory',
  region: 'Oti Region',
  district: 'Jasikan',
  crop: 'Broiler',
  year: 2026,
  season: '',
  summary: 'Weekly management advisory for broilers, day-old to market.',
  createdAt: '2026-01-26T06:00:00.000Z',
  /**
   * The broiler programme: twelve stages over an eight-week cycle.
   *
   * This used to be `[]`, which was accurate while poultry uploads were parsed
   * by a builder that could not read the district template and the screen sent
   * every poultry bulletin to the guidance card regardless. Both are fixed, so
   * the sample has to show what a parsed poultry bulletin looks like.
   *
   * The weather figures are the Jasikan workbook's own. Its sunrise/sunset
   * cells arrive as Excel time serials (0.2430555...); they are written here as
   * the times they mean.
   *
   * Summary titles are NOT the workbook's. Each sheet there is headed "OVERALL
   * SUMMARY ... FOR BROILER FARMERS IN THE OTI REGION", which is correct on a
   * Jasikan bulletin and wrong the moment this sample stands in for a district
   * that has published nothing — a farmer who picked Ashanti saw a card titled
   * after Oti. Where the stand-in came from is the FallbackNotice's job to say.
   */
  activities: [
    poultryStage(JASIKAN, 'Site and housing', 'Before Week 1', BAND_BUILD,
      'DRY SPELL, GOOD BUILDING WEATHER',
      'Site selection and construction of appropriate housing, and sourcing a market. Choose free-draining ground away from other poultry, oriented east to west, and line up an outlet before the first bird arrives.'),
    poultryStage(JASIKAN, 'Before chicks arrive', 'Before Week 1', BAND_PREP,
      'WARM AND DRY, PRE-HEAT THE BROODER',
      'Clean, disinfect and rest the house. Bed dry litter, set up guards, feeders and drinkers, and pre-heat the brooder well before the chicks land.'),
    poultryStage(JASIKAN, 'Brooder management', '1-  2', BAND_BROOD,
      'WARM DRY AIR, WATCH BROODER HEAT AND WATER',
      'During brooding ensure optimal temperature, humidity and air quality; enough feed and water in the troughs; and proper lighting. For the first 3 days hold 33-35 °C. If birds crowd into one spot, especially the corners, the heat is too low.'),
    poultryStage(JASIKAN, 'Starter feed and water', '1-4', BAND_FEED,
      'HUMID WEEKS, KEEP STARTER FEED DRY',
      'Provide recommended (good quality, quantity and nutrient levels) starter diet from day 1 to day 28, with potable cool water ad-lib. Store feed on pallets away from the side walls and practise first in, first out.'),
    poultryStage(JASIKAN, '1st Gumboro vaccine', '1', BAND_VACCINE,
      'COOL MORNINGS SUIT VACCINATION',
      'Intermediate strain, given only if the day-old chicks were not vaccinated against Gumboro at the hatchery. Give plain or vitamin-stabilised water before and after, and use the mixed vaccine within two hours.'),
    poultryStage(JASIKAN, '1st Newcastle (Hitchner)', '2', BAND_VACCINE,
      'COOL MORNINGS SUIT VACCINATION',
      'Withhold water 1-2 hours, then give the vaccine in cool stabilised water and make sure it is drunk within two hours.'),
    poultryStage(JASIKAN, '2nd Gumboro vaccine', '3', BAND_VACCINE,
      'COOL MORNINGS SUIT VACCINATION',
      'Intermediate plus strain, through the drinking water. The booster matters more than the first dose: same two-hour window, same cool early start.'),
    poultryStage(JASIKAN, '2nd Newcastle (Lasota)', '4', BAND_VACCINE,
      'COOL MORNINGS SUIT VACCINATION',
      'Give in stabilised drinking water early. Keep the flock off water beforehand so every bird takes a share.'),
    poultryStage(JASIKAN, 'Grower feed', '5-  6', BAND_FEED,
      'HEAT BUILDS, FEED EARLY AND LATE',
      'Move onto the grower diet from day 29, changing over across about a week. Birds are heavier now and shed heat poorly, so shift the main feeds to early morning and evening.'),
    poultryStage(JASIKAN, 'Finisher feed', '7-  8', BAND_FEED,
      'LAST WEEKS, PROTECT THE FINISHER FEED',
      'Broiler finisher diet to market weight. This is when the most feed goes through the house and spoils fastest, so keep the store dry and turn stock over quickly. Observe the withdrawal period for any medication.'),
    poultryStage(JASIKAN, 'Biosecurity', 'Before, during and after production', BAND_BIOSECURITY,
      'WET SPELLS RAISE DISEASE PRESSURE',
      'Implement measures to prevent the introduction and spread of disease: a disinfectant footbath at the entrance to the pen and farm, separate clothing and footwear, few visitors and vehicles, and hygienic disposal of dead birds by incineration or deep burial.'),
    poultryStage(JASIKAN, 'Harvest and market', '6 -8', BAND_OFFTAKE,
      'MILD SPELL, GOOD FOR CATCHING AND SALE',
      'Harvesting, processing and marketing. Withdraw feed 8-12 hours before catching but never water. Move birds in the cool of the day, process hygienically, and keep meat cold from the moment of slaughter.'),
  ],
  /**
   * Retained even though the bulletin above now parses into activities, because
   * they are what the *older* generated template produces — and that path is
   * still supported. Keeping them means the fallback layout has something to
   * render in a test without inventing a second fixture.
   */
  managementMetrics: {
    'Brooding temperature': '32–34 °C for the first week',
    'Stocking density': '10 birds per square metre',
    'Feed intake': '45 g per bird per day',
    'Water intake': '90 ml per bird per day',
    Ventilation: 'Increase midday airflow without creating a draught',
  },
  recommendations: [
    'Check brooder temperature at chick level twice daily, not at head height.',
    'Vaccinate against Newcastle disease at day 7 and keep the vaccine cold until use.',
    'Increase ventilation during the midday heat, avoiding draughts at floor level.',
    'Provide clean water continuously and flush the lines each morning.',
    'Remove wet litter promptly to keep ammonia down.',
  ],
};

export const MOCK_LAYER_ADVISORY: WeeklyAdvisory = {
  id: 'sample-layer-advisory',
  kind: 'poultry',
  title: 'Layer Advisory',
  region: 'Western Region',
  district: 'Ahanta West',
  crop: 'Layer',
  year: 2026,
  season: '',
  summary: 'Weekly management advisory for layers, brooding through lay.',
  createdAt: '2026-01-26T06:00:00.000Z',
  /**
   * The layer programme: sixteen stages, not the broiler's twelve. A layer runs
   * to point of lay and beyond, so it carries a longer vaccination programme,
   * debeaking, fowl pox, and three feed changes a broiler never reaches.
   *
   * The Ahanta West workbook groups the same programme into seven sheets with
   * prose week labels, and carries weather for those seven rather than for all
   * sixteen — so the placings here are a reading of layer practice, not a
   * transcription.
   */
  activities: [
    poultryStage(AHANTA_WEST, 'Site and housing', 'Before Week 1', BAND_BUILD,
      'DRY SPELL, GOOD BUILDING WEATHER',
      'Site selection and construction of appropriate housing, and sourcing a market. Oriented east to west so the long walls avoid the low sun, on ground that drains.'),
    poultryStage(AHANTA_WEST, 'Before chicks arrive', 'Before Week 1', BAND_PREP,
      'WARM AND DRY, PRE-HEAT THE BROODER',
      'Clean, disinfect and rest the house. Bed dry litter, set up guards, feeders and drinkers, and pre-heat the brooder well before the chicks land.'),
    poultryStage(AHANTA_WEST, 'Brooder management', '1 - 4', BAND_BROOD,
      'WARM DRY AIR, WATCH BROODER HEAT AND WATER',
      'Hold 33-35 °C at chick level for the first 3 days and step down about 2 °C a week. Watch how the chicks spread: bunched means cold, panting at the edges means hot.'),
    poultryStage(AHANTA_WEST, 'Starter feed and water', '1 - 8', BAND_FEED,
      'HUMID WEEKS, KEEP STARTER FEED DRY',
      'Provide a good quality starter to week 8, with cool potable water always available. Store feed on pallets and use it first in, first out.'),
    poultryStage(AHANTA_WEST, '1st Gumboro vaccine', '1', BAND_VACCINE,
      'COOL MORNINGS SUIT VACCINATION',
      'Intermediate strain, given only if the day-old chicks were not vaccinated against Gumboro at the hatchery. Through the drinking water in the cool of the morning, using skim milk to stabilise it.'),
    poultryStage(AHANTA_WEST, '1st Newcastle (Hitchner)', '2', BAND_VACCINE,
      'COOL MORNINGS SUIT VACCINATION',
      'Withhold water 1-2 hours, then give the vaccine in cool stabilised water and make sure it is drunk within two hours.'),
    poultryStage(AHANTA_WEST, '2nd Gumboro vaccine', '3', BAND_VACCINE,
      'COOL MORNINGS SUIT VACCINATION',
      'Intermediate plus strain, through the drinking water. The booster matters more than the first dose: same two-hour window, same cool early start.'),
    poultryStage(AHANTA_WEST, '2nd Newcastle (Lasota)', '4', BAND_VACCINE,
      'COOL MORNINGS SUIT VACCINATION',
      'Give in stabilised drinking water early. Keep the flock off water beforehand so every bird takes a share.'),
    poultryStage(AHANTA_WEST, '1st Fowl pox vaccine', '6', BAND_HANDLING,
      'MILD DAYS, GOOD FOR HANDLING',
      'Wing web route, one bird at a time. Check for a scab at the site about a week later; no scab means no take, and the flock needs doing again.'),
    poultryStage(AHANTA_WEST, 'Debeaking', '8', BAND_HANDLING,
      'MILD DAYS, LEAST HANDLING STRESS',
      'Debeak in the cool of the morning. Raise the feed level in the troughs for a few days afterwards and give vitamin K in the water.'),
    poultryStage(AHANTA_WEST, '2nd Fowl pox vaccine', '10', BAND_HANDLING,
      'MILD DAYS, GOOD FOR HANDLING',
      'Second wing web dose. Check takes again a week later before moving on.'),
    poultryStage(AHANTA_WEST, 'Grower feed and water', '9 - 18', BAND_FEED,
      'STEADY WEEKS, GROW THE FRAME',
      'Grower diet through to point of lay. This is where the frame is built, so do not let intake slip; underweight pullets never catch up in lay.'),
    poultryStage(AHANTA_WEST, '3rd Newcastle (injected)', '16', BAND_HANDLING,
      'MILD DAYS, GOOD FOR HANDLING',
      'Intramuscular, so every bird is handled rather than dosed through the water. Work early, keep the vaccine in a cool box at the pen, and change needles regularly.'),
    poultryStage(AHANTA_WEST, 'Biosecurity', 'Before, during and after production', BAND_BIOSECURITY,
      'WET SPELLS RAISE DISEASE PRESSURE',
      'Biosecurity measures and husbandry practices, observed throughout: footbath at every entrance, separate clothing and boots, few visitors, and hygienic disposal of dead birds. This one runs the whole cycle, not a stage of it.'),
    poultryStage(AHANTA_WEST, 'Layer feed and water', '19 - End', BAND_FEED,
      'HUMID WEEKS, PROTECT THE LAYER MASH',
      'Move onto layer mash as the flock comes into lay, changing over about a week. Calcium and water drive shell quality; neither can be allowed to run short.'),
    poultryStage(AHANTA_WEST, 'Egg harvest and market', 'From point of lay to end of production', BAND_LAY,
      'HEAT AND DAMP, COLLECT OFTEN',
      'Collect at least three times a day, more in the heat. Keep nests dry, wipe soiling off dry rather than washing, and store eggs cool, pointed end down.'),
  ],
  managementMetrics: {},
  recommendations: [],
};

/**
 * A seeded archive, for the same reason as the two bulletins above: the
 * advisory tables are empty in every database, so without this the archive
 * would only ever be able to demonstrate its own empty state.
 *
 * Deliberately more than a copy of the two full bulletins. An archive is a
 * list, and a list of one proves nothing — these span both kinds, four
 * districts across three regions, five subjects and two years, so the year
 * grouping, the place filters and the search all have something to bite on.
 *
 * The two records whose ids match the full bulletins above are the ones that
 * can be opened to real content; the rest are list entries only. That mirrors
 * what a partially-populated archive actually looks like.
 *
 * Screens rendering these must label them as samples — see FallbackNotice.
 */
export const MOCK_ADVISORY_ARCHIVE: ArchivedAdvisory[] = [
  {
    id: 1,
    kind: 'crop',
    title: 'Rice advisory — major season',
    description: 'Season-long guidance from seed selection through storage.',
    region: 'Eastern Region',
    district: 'Abuakwa North',
    subject: 'Rice',
    year: 2026,
    createdAt: '2026-01-26T06:00:00.000Z',
    activityCount: 9,
    activities: [
      'Seed selection',
      'Land preparation',
      'Nursery management',
      'Transplanting',
      'Weed control',
      'Top dressing',
      'Pest and disease watch',
      'Harvesting',
      'Storage',
    ],
    weekLabels: ['Weeks 1-4', 'Weeks 5-8', 'Weeks 9-12'],
  },
  {
    id: 2,
    kind: 'poultry',
    title: 'Broiler advisory — brooding to finishing',
    description: 'Management targets for temperature, ventilation and feed.',
    region: 'Ashanti Region',
    district: 'Ejisu',
    subject: 'Broiler',
    year: 2026,
    createdAt: '2026-02-09T06:00:00.000Z',
    activityCount: 0,
    activities: [],
    weekLabels: [],
  },
  {
    id: 3,
    kind: 'crop',
    title: 'Maize advisory — minor season',
    description: 'Planting window and fertiliser timing for the minor season.',
    region: 'Ashanti Region',
    district: 'Ejisu',
    subject: 'Maize',
    year: 2026,
    createdAt: '2026-03-02T06:00:00.000Z',
    activityCount: 6,
    activities: [
      'Land preparation',
      'Planting',
      'Fertiliser application',
      'Weed control',
      'Fall armyworm watch',
      'Harvesting',
    ],
    weekLabels: ['Weeks 1-3', 'Weeks 4-7'],
  },
  {
    id: 4,
    kind: 'crop',
    title: 'Tomato advisory — irrigated',
    description: 'Irrigation scheduling and blight watch for dry-season tomato.',
    region: 'Upper East Region',
    district: 'Bolgatanga Municipal',
    subject: 'Tomato',
    year: 2026,
    createdAt: '2026-04-13T06:00:00.000Z',
    activityCount: 5,
    activities: [
      'Nursery management',
      'Transplanting',
      'Irrigation scheduling',
      'Blight watch',
      'Harvesting',
    ],
    weekLabels: ['Weeks 2-5'],
  },
  {
    id: 5,
    kind: 'crop',
    title: 'Cowpea advisory',
    description: 'Short-duration cowpea for the late rains.',
    region: 'Upper East Region',
    district: 'Bolgatanga Municipal',
    subject: 'Cowpea',
    year: 2025,
    createdAt: '2025-08-18T06:00:00.000Z',
    activityCount: 4,
    activities: ['Land preparation', 'Planting', 'Pest watch', 'Harvesting'],
    weekLabels: ['Weeks 1-4'],
  },
  {
    id: 6,
    kind: 'poultry',
    title: 'Layer advisory — peak lay',
    description: 'Feed and lighting targets through peak production.',
    region: 'Eastern Region',
    district: 'Abuakwa North',
    subject: 'Layer',
    year: 2025,
    createdAt: '2025-06-30T06:00:00.000Z',
    activityCount: 0,
    activities: [],
    weekLabels: [],
  },
  {
    id: 7,
    kind: 'crop',
    title: 'Rice advisory — minor season',
    description: 'Guidance for the shorter second rice cycle.',
    region: 'Eastern Region',
    district: 'Suhum',
    subject: 'Rice',
    year: 2025,
    createdAt: '2025-09-15T06:00:00.000Z',
    activityCount: 7,
    activities: [
      'Seed selection',
      'Land preparation',
      'Transplanting',
      'Weed control',
      'Top dressing',
      'Harvesting',
      'Storage',
    ],
    weekLabels: ['Weeks 1-4', 'Weeks 5-9'],
  },
];
