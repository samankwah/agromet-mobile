import {
  activityForDate,
  activityWindow,
  initialPickerDate,
  monthOptions,
  parseIsoDate,
  weekOptions,
} from '../../features/advisories/weekly/activitySelection';
import type { AdvisoryActivity } from '../../shared/domain/weeklyAdvisory';

function activityAt(
  name: string,
  week: string,
  monthYear: string,
  startDate: string,
  endDate: string,
): AdvisoryActivity {
  return {
    activity: name,
    metadata: {
      zone: 'Forest',
      region: 'Eastern Region',
      district: 'Abuakwa North',
      monthYear,
      week,
      startDate,
      endDate,
      crop: 'Rice',
    },
    rows: [],
    summaryTitle: null,
    summaryBody: null,
  };
}

const ACTIVITIES = [
  activityAt('Seed selection', 'Weeks 5-8', 'Jan/Feb 2026', '2026-01-26', '2026-02-22'),
  activityAt('Land preparation', 'Weeks 9-10', 'Feb 2026', '2026-02-23', '2026-03-08'),
];

describe('parseIsoDate', () => {
  /* `new Date('2026-01-26')` is UTC midnight, which reads as the 25th on any
     device west of Greenwich — enough to land on the wrong week. */
  it('reads a bulletin date in the device timezone, not UTC', () => {
    const parsed = parseIsoDate('2026-01-26')!;

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(0);
    expect(parsed.getDate()).toBe(26);
  });

  it('rejects anything that is not a plain date', () => {
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate('-')).toBeNull();
    expect(parseIsoDate('26 January 2026')).toBeNull();
    expect(parseIsoDate('2026-13-45')).not.toBeNull(); // JS rolls this over; only the shape is checked here
  });
});

describe('week and month options', () => {
  it('offers each week, pointing at the activity it belongs to', () => {
    expect(weekOptions(ACTIVITIES)).toEqual([
      { id: '0', label: 'Weeks 5-8' },
      { id: '1', label: 'Weeks 9-10' },
    ]);
  });

  /* Two activities can share a month. The picker offers it once, and lands on
     the earlier of the two — the one a farmer reading down the bulletin meets
     first. */
  it('collapses a repeated month onto its first activity', () => {
    const sharing = [
      activityAt('First', 'Weeks 1-2', 'Jan 2026', '2026-01-01', '2026-01-14'),
      activityAt('Second', 'Weeks 3-4', 'Jan 2026', '2026-01-15', '2026-01-28'),
    ];

    expect(monthOptions(sharing)).toEqual([{ id: '0', label: 'Jan 2026' }]);
  });

  /* The parser writes a literal "-" for a blank cell. An option labelled "-"
     selects nothing anyone asked for. */
  it('drops blank labels rather than offering them', () => {
    const blank = [activityAt('Nameless week', '-', '', '2026-01-01', '2026-01-14')];

    expect(weekOptions(blank)).toEqual([]);
    expect(monthOptions(blank)).toEqual([]);
  });
});

describe('picking an activity by date', () => {
  it('finds the activity whose window contains the date', () => {
    expect(activityForDate(ACTIVITIES, new Date(2026, 1, 1))).toBe(0);
    expect(activityForDate(ACTIVITIES, new Date(2026, 1, 25))).toBe(1);
  });

  it('includes both ends of the window', () => {
    expect(activityForDate(ACTIVITIES, new Date(2026, 0, 26))).toBe(0);
    expect(activityForDate(ACTIVITIES, new Date(2026, 1, 22))).toBe(0);
  });

  /* Activities do not always tile the calendar, and a tap that resolved to
     nothing would look broken. */
  it('falls back to the nearest activity for a date outside every window', () => {
    expect(activityForDate(ACTIVITIES, new Date(2025, 11, 1))).toBe(0);
    expect(activityForDate(ACTIVITIES, new Date(2026, 5, 1))).toBe(1);
  });

  it('treats a one-sided window as covering the single date it has', () => {
    const oneSided = [activityAt('Open ended', 'Week 1', 'Jan 2026', '2026-01-05', '-')];

    expect(activityForDate(oneSided, new Date(2026, 0, 5))).toBe(0);
    expect(activityForDate(oneSided, new Date(2026, 0, 9))).toBe(0); // nearest
  });

  it('reports no match when nothing carries a date at all', () => {
    const undated = [activityAt('Undated', 'Week 1', 'Jan 2026', '-', '-')];

    expect(activityForDate(undated, new Date(2026, 0, 5))).toBe(-1);
  });
});

describe('opening the date picker', () => {
  it('opens on the start or end date the activity carries', () => {
    expect(initialPickerDate(ACTIVITIES[1], 'start')).toEqual(new Date(2026, 1, 23));
    expect(initialPickerDate(ACTIVITIES[1], 'end')).toEqual(new Date(2026, 2, 8));
  });

  it('falls back to the other end when one date is missing', () => {
    const oneSided = activityAt('Open ended', 'Week 1', 'Jan 2026', '2026-01-05', '-');

    expect(initialPickerDate(oneSided, 'end')).toEqual(new Date(2026, 0, 5));
  });

  it('reads a window off an activity', () => {
    expect(activityWindow(ACTIVITIES[0]).start).toEqual(new Date(2026, 0, 26));
    expect(activityWindow(ACTIVITIES[0]).end).toEqual(new Date(2026, 1, 22));
  });
});
