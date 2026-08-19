import type { Calendar, CalendarActivity } from '../domain/calendar';

/**
 * Fallback calendars, used when the backend is unreachable or has nothing
 * for the chosen filters. Shown with a MockDataTag so it is never mistaken
 * for live content.
 *
 * This is not invented data. The Tomato calendar is the real row currently
 * in backend/agromet.db, activity-for-activity, including the hex fills
 * harvested from the uploaded spreadsheet. The broiler and layer cycles are
 * the agronomist-authored `basePoultryActivities` from the web app
 * (frontend/src/pages/PoultryCalendar.jsx) — real vaccination weeks, not
 * placeholders. Without these the poultry screen would be permanently
 * blank, because the database holds no poultry calendars at all.
 */

const NOW = new Date().toISOString();

function calendar(partial: Partial<Calendar> & Pick<Calendar, 'id' | 'title' | 'calendarType' | 'crop' | 'totalWeeks'>): Calendar {
  return {
    commodity: partial.crop,
    region: 'Ashanti Region',
    regionCode: 'Ashanti Region',
    district: 'Adansi North',
    districtCode: 'Adansi North',
    year: null,
    sampleActivities: [],
    seasons: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

export const MOCK_CALENDARS: Calendar[] = [
  calendar({
    id: 'mock-tomato-adansi-north',
    title: 'Tomato Calendar',
    description: 'Tomato calendar for Adansi North, Ashanti Region',
    calendarType: 'seasonal',
    crop: 'Tomato',
    totalWeeks: 28,
    seasons: ['Major Season'],
    sampleActivities: [
      'Site selection',
      'land preparation',
      'germination test',
      'nursing',
      'transplanting',
      'addition of starter solution',
    ],
  }),
  calendar({
    id: 'mock-broiler-cycle',
    title: 'Broiler Production Cycle',
    description: 'Standard 8-week broiler cycle',
    calendarType: 'cycle',
    crop: 'Broiler',
    totalWeeks: 8,
    year: 2026,
    cycleDuration: 8,
    breedType: 'Cobb 500',
    region: 'Greater Accra Region',
    regionCode: 'Greater Accra Region',
    district: 'Accra Metropolitan',
    districtCode: 'Accra Metropolitan',
    sampleActivities: [
      'Arrival of day-old chicks',
      'Brooder management',
      '1st Gumboro vaccine',
      'Feed (Starter Diet)',
      'Biosecurity measures',
    ],
  }),
  calendar({
    id: 'mock-layer-cycle',
    title: 'Layer Production Cycle',
    description: 'Standard 20-week layer cycle to point of lay',
    calendarType: 'cycle',
    crop: 'Layer',
    totalWeeks: 20,
    year: 2025,
    cycleDuration: 20,
    breedType: 'Isa Brown',
    region: 'Greater Accra Region',
    regionCode: 'Greater Accra Region',
    district: 'Accra Metropolitan',
    districtCode: 'Accra Metropolitan',
    sampleActivities: ['Brooder management', 'Vaccination (Gumboro, Newcastle)', 'Deworming', 'Fowl pox vaccination', 'Egg Collection'],
  }),
];

function activity(name: string, startWeek: number, endWeek: number, color: string): CalendarActivity {
  return {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${startWeek}`,
    activityId: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    activityName: name,
    startWeek,
    endWeek,
    productionWeek: startWeek,
    backgroundColor: color,
    colors: [color],
  };
}

export const MOCK_CALENDAR_ACTIVITIES: Record<string, CalendarActivity[]> = {
  // Verbatim from the live database row, colours included.
  'mock-tomato-adansi-north': [
    activity('Site selection', 1, 1, '#00B0F0'),
    activity('land preparation', 2, 2, '#BF9000'),
    activity('germination test', 3, 3, '#ED7D31'),
    activity('nursing', 4, 6, '#AEABAB'),
    activity('pest and disease management', 4, 17, '#FF0000'),
    activity('transplanting', 7, 7, '#000000'),
    activity('addition of starter solution', 7, 7, '#4472C4'),
    activity('1st fertilizer application (NPK)', 9, 9, '#FFFF00'),
    activity('earthening-up/staking/trellising/pruning', 9, 9, '#4472C4'),
    activity('2nd fertilizer application (NPK)', 11, 11, '#FFFF00'),
    activity('harvesting', 18, 18, '#008000'),
    activity('post-harvest handling', 18, 19, '#993366'),
  ],

  'mock-broiler-cycle': [
    activity('Construction of appropriate housing', 1, 1, '#00B0F0'),
    activity('Arrival of day-old chicks', 1, 1, '#375623'),
    activity('Brooder management', 1, 4, '#000000'),
    activity('Feed (Starter Diet)', 1, 4, '#FFFF00'),
    activity('1st Gumboro vaccine', 1, 1, '#FF0000'),
    activity('1st Newcastle HB1 (Hitchner)', 2, 2, '#FF0000'),
    activity('2nd Gumboro vaccine', 3, 3, '#FF0000'),
    activity('Coccidiosis prevention', 1, 5, '#C6E0B4'),
    activity('Feed (Grower Diet)', 5, 8, '#FFFF00'),
    activity('2nd Newcastle (Lasota)', 6, 6, '#FF0000'),
    activity('Biosecurity measures', 1, 8, '#1F497D'),
    activity('Harvesting/live bird market', 8, 8, '#00B050'),
    activity('Processing', 8, 8, '#993366'),
  ],

  'mock-layer-cycle': [
    activity('Site selection/Construction of appropriate housing', 1, 1, '#00B0F0'),
    activity('Brooder management', 1, 3, '#000000'),
    activity('Feeding and Water for Starters', 1, 7, '#FFFF00'),
    activity('Vaccination (Gumboro, Newcastle)', 1, 4, '#FF0000'),
    activity('Coccidiosis prevention', 1, 20, '#C6E0B4'),
    activity('Biosecurity measures', 1, 20, '#1F497D'),
    activity('Deworming', 7, 7, '#0070C0'),
    activity('Feeding and Water for Growers', 8, 15, '#FFFF00'),
    activity('Fowl pox vaccination', 8, 12, '#FF0000'),
    activity('Feed (Layer mash)', 16, 20, '#FFFF00'),
    activity('Egg Collection', 16, 20, '#7F7F7F'),
  ],
};
