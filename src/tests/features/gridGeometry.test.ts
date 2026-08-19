import {
  activitiesInWeek,
  activityAccessibilityLabel,
  activityRuns,
  buildMonthBands,
  buildWeekBlockBands,
  WEEK_COLUMN_WIDTH,
  computeNameColumnWidth,
  formatActivityDates,
  monthNameToIndex,
  resolveWeekOneDate,
  weekStartDate,
} from '../../features/farm-tools/calendars/gridGeometry';
import type { CalendarActivity } from '../../shared/domain/calendar';

function makeActivity(partial: Partial<CalendarActivity> & Pick<CalendarActivity, 'id' | 'activityName'>): CalendarActivity {
  return {
    activityId: partial.id,
    startWeek: 1,
    endWeek: 1,
    productionWeek: 1,
    ...partial,
  };
}

describe('monthNameToIndex', () => {
  it('accepts the forms the backend actually stores', () => {
    expect(monthNameToIndex('April')).toBe(3);
    expect(monthNameToIndex('apr')).toBe(3);
    expect(monthNameToIndex('  SEPTEMBER ')).toBe(8);
    expect(monthNameToIndex('4')).toBe(3);
  });

  it('returns null rather than guessing', () => {
    expect(monthNameToIndex('')).toBeNull();
    expect(monthNameToIndex(null)).toBeNull();
    expect(monthNameToIndex('harvest')).toBeNull();
    expect(monthNameToIndex('13')).toBeNull();
  });
});

describe('resolveWeekOneDate', () => {
  it('prefers a running cycle, because that is the only real date a farmer has', () => {
    const date = resolveWeekOneDate({ cycleStartDate: '2026-04-20', seasonStartMonth: 'January', year: 2020 });
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(3);
  });

  it('falls back to the season anchor', () => {
    const date = resolveWeekOneDate({ seasonStartMonth: 'April', year: 2026 });
    expect(date?.getMonth()).toBe(3);
    expect(date?.getDate()).toBe(1);
  });

  it('returns null when there is no anchor at all — the common case', () => {
    // The real Tomato calendar has year: null and no season month. A
    // production calendar describes a cycle, not a point in the year.
    expect(resolveWeekOneDate({ seasonStartMonth: null, year: null })).toBeNull();
    expect(resolveWeekOneDate({ seasonStartMonth: 'April', year: null })).toBeNull();
    expect(resolveWeekOneDate({ cycleStartDate: 'not-a-date' })).toBeNull();
  });
});

describe('weekStartDate', () => {
  it('advances seven days per week, week 1 being the anchor itself', () => {
    const weekOne = new Date(2026, 3, 20);
    expect(weekStartDate(weekOne, 1).getDate()).toBe(20);
    expect(weekStartDate(weekOne, 2).getDate()).toBe(27);
    expect(weekStartDate(weekOne, 3).getMonth()).toBe(4); // rolls into May
  });

  it('does not mutate the anchor', () => {
    const weekOne = new Date(2026, 3, 20);
    weekStartDate(weekOne, 10);
    expect(weekOne.getDate()).toBe(20);
  });
});

describe('buildMonthBands', () => {
  it('merges consecutive weeks of the same month into one spanning band', () => {
    const bands = buildMonthBands(9, new Date(2026, 3, 1));

    expect(bands[0].label).toBe('Apr');
    expect(bands[0].startWeek).toBe(1);
    // Weeks 1-5 start in April (1, 8, 15, 22, 29); week 6 starts 6 May.
    expect(bands[0].endWeek).toBe(5);
    expect(bands[1].label).toBe('May');
    expect(bands[1].startWeek).toBe(6);
  });

  it('covers every week exactly once, with no gap or overlap', () => {
    const bands = buildMonthBands(28, new Date(2026, 0, 1));
    const covered = bands.flatMap((band) => {
      const weeks: number[] = [];
      for (let w = band.startWeek; w <= band.endWeek; w += 1) weeks.push(w);
      return weeks;
    });

    expect(covered).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
  });

  it('adds a year suffix only once the season crosses into a new year', () => {
    const bands = buildMonthBands(20, new Date(2026, 10, 1)); // Nov 2026 →
    expect(bands[0].label).toBe('Nov');
    expect(bands.some((band) => band.label.includes("'27"))).toBe(true);
  });

  it('returns nothing without an anchor, rather than inventing months', () => {
    expect(buildMonthBands(28, null)).toEqual([]);
    expect(buildMonthBands(0, new Date(2026, 0, 1))).toEqual([]);
  });
});

describe('buildWeekBlockBands', () => {
  it('blocks the weeks and labels the final short block honestly', () => {
    const bands = buildWeekBlockBands(10, 4);

    expect(bands.map((band) => band.label)).toEqual(['W1–4', 'W5–8', 'W9–10']);
    expect(bands[2].endWeek).toBe(10);
  });

  it('covers every week for the real calendar lengths', () => {
    for (const totalWeeks of [8, 20, 28, 36]) {
      const bands = buildWeekBlockBands(totalWeeks);
      expect(bands[0].startWeek).toBe(1);
      expect(bands[bands.length - 1].endWeek).toBe(totalWeeks);
    }
  });
});

describe('activityRuns', () => {
  it('produces one run per activity, not one cell per week', () => {
    // The whole point: 12 activities x 36 weeks would be 432 Views.
    const runs = activityRuns(makeActivity({ id: 'a', activityName: 'pest and disease management', startWeek: 4, endWeek: 17 }), 28);

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ startWeek: 4, endWeek: 17 });
  });

  it('prefers backgroundColor, then the first Excel fill', () => {
    expect(activityRuns(makeActivity({ id: 'a', activityName: 'x', backgroundColor: '#FF0000', colors: ['#00FF00'] }), 8)[0].color).toBe(
      '#FF0000',
    );
    expect(activityRuns(makeActivity({ id: 'b', activityName: 'x', colors: ['#00FF00'] }), 8)[0].color).toBe('#00FF00');
    expect(activityRuns(makeActivity({ id: 'c', activityName: 'x' }), 8)[0].color).toBeNull();
  });

  it('clamps a bad upload into the grid instead of drawing off-canvas', () => {
    expect(activityRuns(makeActivity({ id: 'a', activityName: 'x', startWeek: 0, endWeek: 99 }), 28)[0]).toMatchObject({
      startWeek: 1,
      endWeek: 28,
    });
  });

  it('drops activities that cannot be placed', () => {
    expect(activityRuns(makeActivity({ id: 'a', activityName: 'x', startWeek: 9, endWeek: 4 }), 28)).toEqual([]);
    expect(activityRuns(makeActivity({ id: 'b', activityName: 'x', startWeek: NaN }), 28)).toEqual([]);
    expect(activityRuns(makeActivity({ id: 'c', activityName: 'x' }), 0)).toEqual([]);
  });

  it('treats a missing endWeek as a single week', () => {
    expect(activityRuns(makeActivity({ id: 'a', activityName: 'x', startWeek: 7, endWeek: null }), 28)[0]).toMatchObject({
      startWeek: 7,
      endWeek: 7,
    });
  });
});

describe('formatActivityDates', () => {
  it('runs to the END of the final week, not its start', () => {
    // Week 2 of a 20 April start is 27 April; the activity is done with it
    // on 3 May, and saying "27 Apr" would understate it by six days.
    const runs = activityRuns(makeActivity({ id: 'a', activityName: 'x', startWeek: 1, endWeek: 2 }), 8);
    expect(formatActivityDates(runs, new Date(2026, 3, 20))).toMatch(/May 3/);
  });

  it('is null without an anchor, so no screen invents a date', () => {
    const runs = activityRuns(makeActivity({ id: 'a', activityName: 'x', startWeek: 1, endWeek: 2 }), 8);
    expect(formatActivityDates(runs, null)).toBeNull();
  });
});

describe('activityAccessibilityLabel', () => {
  it('states every fact the colour bar encodes', () => {
    const activity = makeActivity({ id: 'a', activityName: 'Nursing', startWeek: 4, endWeek: 6 });
    const label = activityAccessibilityLabel(activity, activityRuns(activity, 28), 28, null);

    expect(label).toBe('Nursing. weeks 4 to 6 of 28.');
  });

  it('reads a single week naturally', () => {
    const activity = makeActivity({ id: 'a', activityName: 'Transplanting', startWeek: 7, endWeek: 7 });
    expect(activityAccessibilityLabel(activity, activityRuns(activity, 28), 28, null)).toBe('Transplanting. week 7 of 28.');
  });

  it('adds real dates when the calendar is anchored', () => {
    const activity = makeActivity({ id: 'a', activityName: 'Nursing', startWeek: 4, endWeek: 6 });
    const label = activityAccessibilityLabel(activity, activityRuns(activity, 28), 28, new Date(2026, 3, 20));

    expect(label).toContain('May 11');
  });

  it('says so when an activity has no placeable weeks', () => {
    const activity = makeActivity({ id: 'a', activityName: 'Orphan', startWeek: 9, endWeek: 4 });
    expect(activityAccessibilityLabel(activity, activityRuns(activity, 28), 28, null)).toBe('Orphan. No scheduled weeks.');
  });
});

describe('activitiesInWeek', () => {
  const activities = [
    makeActivity({ id: 'a', activityName: 'nursing', startWeek: 4, endWeek: 6 }),
    makeActivity({ id: 'b', activityName: 'pest and disease management', startWeek: 4, endWeek: 17 }),
    makeActivity({ id: 'c', activityName: 'harvesting', startWeek: 18, endWeek: 18 }),
  ];

  it('finds what is live in a given week, inclusive of both ends', () => {
    expect(activitiesInWeek(activities, 4, 28).map((a) => a.id)).toEqual(['a', 'b']);
    expect(activitiesInWeek(activities, 6, 28).map((a) => a.id)).toEqual(['a', 'b']);
    expect(activitiesInWeek(activities, 7, 28).map((a) => a.id)).toEqual(['b']);
    expect(activitiesInWeek(activities, 18, 28).map((a) => a.id)).toEqual(['c']);
  });

  it('returns nothing for a quiet week rather than throwing', () => {
    expect(activitiesInWeek(activities, 25, 28)).toEqual([]);
  });
});

describe('column sizing', () => {
  it('keeps every week wide enough to read, rather than fitting the season on screen', () => {
    // A 34-week season squeezed into a 360px phone gives each week 6px:
    // a one-week activity becomes a dot and no bar can hold a label. The
    // grid scrolls instead, so this width is fixed.
    expect(WEEK_COLUMN_WIDTH).toBeGreaterThanOrEqual(30);
  });

  it('leaves a usable strip of weeks beside the frozen column at every supported width', () => {
    for (const screenWidth of [320, 360, 390, 430]) {
      const nameW = computeNameColumnWidth(screenWidth);
      const body = screenWidth - nameW - 32;
      expect(nameW).toBeGreaterThanOrEqual(112);
      // At least three weeks visible at once, or the timeline reads as a
      // keyhole rather than a calendar.
      expect(body / WEEK_COLUMN_WIDTH).toBeGreaterThanOrEqual(3);
    }
  });
});
