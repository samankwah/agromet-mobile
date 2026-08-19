import type { Calendar, CalendarActivity } from '../domain/calendar';

/**
 * Sample calendars, shown when the backend is unreachable or has nothing
 * published for the chosen filters. Always labelled — see SampleDataNotice.
 *
 * These are not invented schedules. The Tomato calendar is the real row in
 * backend/agromet.db, activity for activity, including the hex fills
 * harvested from the uploaded spreadsheet. The Maize, Rice, Sorghum and
 * Soybean calendars are transcribed from the published calendars as the web
 * dashboard renders them, colours included. The poultry cycles come from the
 * web app's agronomist-authored `basePoultryActivities`.
 *
 * Week boundaries on the four crop calendars are read off rendered images,
 * so a bar may sit a week either side of the source. They exist to show the
 * shape of a season on a phone until district officers upload the real
 * workbooks, at which point live data replaces them entirely.
 */

const NOW = new Date().toISOString();

/** The palette the printed calendars use, kept so a farmer who already
 * knows the paper version recognises the rows. */
const C = {
  site: '#00B0F0',
  land: '#BF9000',
  seed: '#7030A0',
  nursery: '#D9D9D9',
  sowing: '#000000',
  fertilizer: '#FFFF00',
  weeds: '#FF0000',
  rogueing: '#FF66CC',
  birds: '#90EE90',
  harvest: '#008000',
  postHarvest: '#993366',
} as const;

type CalendarSeed = Partial<Calendar> & Pick<Calendar, 'id' | 'title' | 'calendarType' | 'crop' | 'totalWeeks' | 'region' | 'district'>;

function calendar(partial: CalendarSeed): Calendar {
  return {
    commodity: partial.crop,
    regionCode: partial.region,
    districtCode: partial.district,
    year: null,
    sampleActivities: [],
    seasons: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

let sequence = 0;
function activity(name: string, startWeek: number, endWeek: number, color: string): CalendarActivity {
  sequence += 1;
  return {
    // Names repeat within a calendar — the maize schedule has two separate
    // "Harvesting" rows — so an id derived from the name alone would clash.
    id: `sample-activity-${sequence}`,
    activityId: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    activityName: name,
    startWeek,
    endWeek,
    productionWeek: startWeek,
    backgroundColor: color,
    colors: [color],
  };
}

// calendarType, seasons and year are set here, so a caller must not be
// asked to supply them.
function cropCalendar(partial: Omit<CalendarSeed, 'calendarType'> & { activities: CalendarActivity[] }): Calendar {
  const { activities, ...rest } = partial;
  return calendar({
    ...rest,
    calendarType: 'seasonal',
    seasons: ['Major Season'],
    year: 2026,
    sampleActivities: activities.slice(0, 6).map((entry) => entry.activityName),
  });
}

// --- Crop schedules --------------------------------------------------------

const MAIZE = [
  activity('Site Selection', 1, 5, C.site),
  activity('Land Preparation', 1, 10, C.land),
  activity('Sowing / Planting', 11, 16, C.sowing),
  activity('1st Fertilizer Application (NPK)', 13, 18, C.fertilizer),
  activity('2nd Weed Control & Pest Management', 17, 21, C.weeds),
  activity('1st Weed Control & Pest Management', 18, 20, C.weeds),
  activity('2nd Fertilizer Application (Urea)', 19, 22, C.fertilizer),
  activity('Harvesting', 27, 29, C.harvest),
  activity('Harvesting', 30, 31, C.harvest),
  activity('Post-harvest Handling', 27, 34, C.postHarvest),
];

const RICE = [
  activity('Site Selection', 1, 8, C.site),
  activity('Land preparation', 4, 9, C.land),
  activity('Seed Selection and Seed Treatment', 5, 8, C.seed),
  activity('Nursery Establishment', 8, 10, C.nursery),
  activity('Sowing / Transplanting', 12, 18, C.sowing),
  activity('1st Weed control & Pest Management', 13, 18, C.weeds),
  activity('1st Fertilizer Application (NPK)', 14, 19, C.fertilizer),
  activity('Bird Scaring and Netting', 17, 29, C.birds),
  activity('2nd Weed Control & Pest Management', 17, 22, C.weeds),
  activity('Rogueing', 18, 26, C.rogueing),
  activity('2nd Fertilizer Application (Urea)', 18, 22, C.fertilizer),
  activity('3rd Fertilizer Application (Urea)', 23, 26, C.fertilizer),
  activity('Harvesting', 28, 31, C.harvest),
  activity('Postharvest Handling', 29, 35, C.postHarvest),
];

/** Sorghum and soybean are published against one shared schedule. */
function drylandCereal(): CalendarActivity[] {
  return [
    activity('Site Selection', 1, 5, C.site),
    activity('Land preparation', 6, 9, C.land),
    activity('Planting/sowing', 10, 16, C.sowing),
    activity('1st fertilizer application', 12, 18, C.fertilizer),
    activity('First weed management & Control of fall army worm', 13, 20, C.weeds),
    activity('2nd Fertilizer Application (Urea & SOA)', 15, 19, C.fertilizer),
    activity('Second weed management & Pest and disease control', 16, 20, C.weeds),
    activity('Harvesting', 20, 28, C.harvest),
    activity('Post harvest handling', 20, 28, C.postHarvest),
  ];
}

const SORGHUM = drylandCereal();
const SOYBEAN = drylandCereal();

const TOMATO = [
  activity('Site selection', 1, 1, C.site),
  activity('land preparation', 2, 2, C.land),
  activity('germination test', 3, 3, '#ED7D31'),
  activity('nursing', 4, 6, '#AEABAB'),
  activity('pest and disease management', 4, 17, C.weeds),
  activity('transplanting', 7, 7, C.sowing),
  activity('addition of starter solution', 7, 7, '#4472C4'),
  activity('1st fertilizer application (NPK)', 9, 9, C.fertilizer),
  activity('earthening-up/staking/trellising/pruning', 9, 9, '#4472C4'),
  activity('2nd fertilizer application (NPK)', 11, 11, C.fertilizer),
  activity('harvesting', 18, 18, C.harvest),
  activity('post-harvest handling', 18, 19, C.postHarvest),
];

const BROILER = [
  activity('Construction of appropriate housing', 1, 1, C.site),
  activity('Arrival of day-old chicks', 1, 1, '#375623'),
  activity('Brooder management', 1, 4, C.sowing),
  activity('Feed (Starter Diet)', 1, 4, C.fertilizer),
  activity('1st Gumboro vaccine', 1, 1, C.weeds),
  activity('Coccidiosis prevention', 1, 5, '#C6E0B4'),
  activity('Biosecurity measures', 1, 8, '#1F497D'),
  activity('1st Newcastle HB1 (Hitchner)', 2, 2, C.weeds),
  activity('2nd Gumboro vaccine', 3, 3, C.weeds),
  activity('Feed (Grower Diet)', 5, 8, C.fertilizer),
  activity('2nd Newcastle (Lasota)', 6, 6, C.weeds),
  activity('Harvesting/live bird market', 8, 8, '#00B050'),
  activity('Processing', 8, 8, C.postHarvest),
];

const LAYER = [
  activity('Site selection/Construction of appropriate housing', 1, 1, C.site),
  activity('Brooder management', 1, 3, C.sowing),
  activity('Feeding and Water for Starters', 1, 7, C.fertilizer),
  activity('Vaccination (Gumboro, Newcastle)', 1, 4, C.weeds),
  activity('Coccidiosis prevention', 1, 20, '#C6E0B4'),
  activity('Biosecurity measures', 1, 20, '#1F497D'),
  activity('Deworming', 7, 7, '#0070C0'),
  activity('Feeding and Water for Growers', 8, 15, C.fertilizer),
  activity('Fowl pox vaccination', 8, 12, C.weeds),
  activity('Feed (Layer mash)', 16, 20, C.fertilizer),
  activity('Egg Collection', 16, 20, '#7F7F7F'),
];

// --- Calendars -------------------------------------------------------------

export const MOCK_CALENDARS: Calendar[] = [
  cropCalendar({
    id: 'sample-maize-ejura',
    title: 'Maize Calendar',
    description: 'Maize production calendar for Ejura Sekyedumase, Ashanti Region',
    crop: 'Maize',
    region: 'Ashanti Region',
    district: 'Ejura Sekyedumase Municipal',
    totalWeeks: 34,
    seasonStartMonth: 'January',
    activities: MAIZE,
  }),
  cropCalendar({
    id: 'sample-rice-tamale',
    title: 'Rice Calendar',
    description: 'Rice production calendar for Tamale Metropolitan, Northern Region',
    crop: 'Rice',
    region: 'Northern Region',
    district: 'Tamale Metropolitan',
    totalWeeks: 37,
    seasonStartMonth: 'January',
    activities: RICE,
  }),
  // The northern schedules run April to November — one long season rather
  // than the south's major/minor pair.
  cropCalendar({
    id: 'sample-sorghum-bolgatanga',
    title: 'Sorghum Calendar',
    description: 'Sorghum production calendar for Bolgatanga Municipal, Upper East Region',
    crop: 'Sorghum',
    region: 'Upper East Region',
    district: 'Bolgatanga Municipal',
    totalWeeks: 29,
    seasonStartMonth: 'April',
    activities: SORGHUM,
  }),
  cropCalendar({
    id: 'sample-soybean-savelugu',
    title: 'Soybean Calendar',
    description: 'Soybean production calendar for Savelugu, Northern Region',
    crop: 'Soybean',
    region: 'Northern Region',
    district: 'Savelugu Municipal',
    totalWeeks: 29,
    seasonStartMonth: 'April',
    activities: SOYBEAN,
  }),
  calendar({
    id: 'sample-tomato-adansi-north',
    title: 'Tomato Calendar',
    description: 'Tomato calendar for Adansi North, Ashanti Region',
    calendarType: 'seasonal',
    crop: 'Tomato',
    region: 'Ashanti Region',
    district: 'Adansi North',
    totalWeeks: 28,
    seasons: ['Major Season'],
    sampleActivities: TOMATO.slice(0, 6).map((entry) => entry.activityName),
  }),
  calendar({
    id: 'sample-broiler-cycle',
    title: 'Broiler Production Cycle',
    description: 'Standard 8-week broiler cycle',
    calendarType: 'cycle',
    crop: 'Broiler',
    region: 'Greater Accra Region',
    district: 'Accra Metropolitan',
    totalWeeks: 8,
    year: 2026,
    cycleDuration: 8,
    breedType: 'Cobb 500',
    sampleActivities: BROILER.slice(0, 5).map((entry) => entry.activityName),
  }),
  calendar({
    id: 'sample-layer-cycle',
    title: 'Layer Production Cycle',
    description: 'Standard 20-week layer cycle to point of lay',
    calendarType: 'cycle',
    crop: 'Layer',
    region: 'Greater Accra Region',
    district: 'Accra Metropolitan',
    totalWeeks: 20,
    year: 2025,
    cycleDuration: 20,
    breedType: 'Isa Brown',
    sampleActivities: LAYER.slice(0, 5).map((entry) => entry.activityName),
  }),
];

export const MOCK_CALENDAR_ACTIVITIES: Record<string, CalendarActivity[]> = {
  'sample-maize-ejura': MAIZE,
  'sample-rice-tamale': RICE,
  'sample-sorghum-bolgatanga': SORGHUM,
  'sample-soybean-savelugu': SOYBEAN,
  'sample-tomato-adansi-north': TOMATO,
  'sample-broiler-cycle': BROILER,
  'sample-layer-cycle': LAYER,
};
