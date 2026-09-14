import type { FarmReminder, ReminderRepeat } from '../../shared/domain/farmReminder';
import {
  attentionCount,
  dueState,
  groupReminders,
  nextOccurrence,
  scheduleTargetFor,
  sortByDue,
  weekProgress,
} from '../../shared/utils/reminderSchedule';

/**
 * `now` is passed in everywhere, matching formatRelativeTime and gridGeometry.
 * The repo has no fake-timer infrastructure and does not need any.
 */
const NOW = new Date(2026, 7, 20, 9, 0, 0); // Thu 20 Aug 2026, 09:00 local

function reminder(overrides: Partial<FarmReminder> = {}): FarmReminder {
  return {
    id: 'r1',
    title: 'Top-dress the maize',
    dueAt: new Date(2026, 7, 21, 7, 0, 0).toISOString(),
    repeat: 'none' as ReminderRepeat,
    isDone: false,
    source: 'manual',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

const at = (day: number, hour = 7) => new Date(2026, 7, day, hour, 0, 0).toISOString();

describe('dueState', () => {
  it('calls yesterday overdue and tomorrow upcoming', () => {
    expect(dueState(reminder({ dueAt: at(19) }), NOW)).toBe('overdue');
    expect(dueState(reminder({ dueAt: at(21) }), NOW)).toBe('upcoming');
  });

  it('treats anything else today as today, whether it has passed or not', () => {
    expect(dueState(reminder({ dueAt: at(20, 7) }), NOW)).toBe('today'); // two hours ago
    expect(dueState(reminder({ dueAt: at(20, 17) }), NOW)).toBe('today'); // this evening
  });

  /* Telling a farmer they are late for something they have already finished is
     the fastest way to make them stop trusting the list. */
  it('never calls a completed reminder overdue', () => {
    expect(dueState(reminder({ dueAt: at(1), isDone: true }), NOW)).toBe('done');
  });

  it('does not throw on an unparseable date', () => {
    expect(dueState(reminder({ dueAt: 'not a date' }), NOW)).toBe('upcoming');
  });
});

describe('nextOccurrence', () => {
  it('returns null for a one-off reminder', () => {
    expect(nextOccurrence(reminder({ repeat: 'none' }), NOW)).toBeNull();
  });

  it('keeps a future occurrence as it is', () => {
    const next = nextOccurrence(reminder({ repeat: 'daily', dueAt: at(21) }), NOW);
    expect(next?.getDate()).toBe(21);
  });

  it('rolls a daily reminder forward to the next morning', () => {
    const next = nextOccurrence(reminder({ repeat: 'daily', dueAt: at(20, 7) }), NOW);
    expect(next?.getDate()).toBe(21);
    expect(next?.getHours()).toBe(7);
  });

  it('rolls a weekly reminder forward a week at a time', () => {
    const next = nextOccurrence(reminder({ repeat: 'weekly', dueAt: at(13, 7) }), NOW);
    expect(next?.getDate()).toBe(27);
  });

  /* A daily reminder left alone for a season must not be walked forward one
     day per loop iteration, and must still land on the right morning. */
  it('catches up a long-neglected daily reminder in one jump', () => {
    const longAgo = new Date(2025, 0, 1, 7, 0, 0).toISOString();
    const next = nextOccurrence(reminder({ repeat: 'daily', dueAt: longAgo }), NOW);

    expect(next!.getTime()).toBeGreaterThan(NOW.getTime());
    expect(next!.getHours()).toBe(7);
    // The very next morning after `now`, not some arbitrary later date.
    expect(next!.getDate()).toBe(21);
  });
});

describe('scheduleTargetFor', () => {
  it('schedules a future one-off', () => {
    expect(scheduleTargetFor(reminder({ dueAt: at(21) }), NOW)).not.toBeNull();
  });

  /* Re-firing an alert for a moment that has gone is noise; the reminder still
     shows in the overdue list, which is the useful part. */
  it('does not schedule a one-off whose time has passed', () => {
    expect(scheduleTargetFor(reminder({ dueAt: at(19) }), NOW)).toBeNull();
  });

  it('still schedules a repeating reminder whose last occurrence passed', () => {
    expect(scheduleTargetFor(reminder({ repeat: 'daily', dueAt: at(19) }), NOW)).not.toBeNull();
  });

  it('never schedules a completed reminder', () => {
    expect(scheduleTargetFor(reminder({ dueAt: at(21), isDone: true }), NOW)).toBeNull();
  });
});

describe('groupReminders', () => {
  const set = [
    reminder({ id: 'late', dueAt: at(18) }),
    reminder({ id: 'today-early', dueAt: at(20, 6) }),
    reminder({ id: 'today-late', dueAt: at(20, 18) }),
    reminder({ id: 'soon', dueAt: at(23) }),
    reminder({ id: 'far', dueAt: new Date(2026, 8, 30, 7).toISOString() }),
    reminder({ id: 'finished', dueAt: at(15), isDone: true, completedAt: at(16) }),
  ];

  it('sorts each reminder into exactly one bucket', () => {
    const groups = groupReminders(set, NOW);

    expect(groups.overdue.map((r) => r.id)).toEqual(['late']);
    expect(groups.today.map((r) => r.id)).toEqual(['today-early', 'today-late']);
    expect(groups.thisWeek.map((r) => r.id)).toEqual(['soon']);
    expect(groups.later.map((r) => r.id)).toEqual(['far']);
    expect(groups.done.map((r) => r.id)).toEqual(['finished']);
  });

  it('loses nothing', () => {
    const groups = groupReminders(set, NOW);
    const total =
      groups.overdue.length + groups.today.length + groups.thisWeek.length + groups.later.length + groups.done.length;

    expect(total).toBe(set.length);
  });

  /* "This week" is the next seven days, not "until Sunday" — on a Saturday the
     latter would be almost empty and tell the farmer nothing. */
  it('measures this week as the next seven days', () => {
    const groups = groupReminders([reminder({ id: 'day6', dueAt: at(26) }), reminder({ id: 'day8', dueAt: at(28) })], NOW);

    expect(groups.thisWeek.map((r) => r.id)).toEqual(['day6']);
    expect(groups.later.map((r) => r.id)).toEqual(['day8']);
  });
});

describe('sortByDue', () => {
  it('puts the soonest first and unparseable dates last', () => {
    const sorted = sortByDue([
      reminder({ id: 'c', dueAt: at(25) }),
      reminder({ id: 'broken', dueAt: 'nonsense' }),
      reminder({ id: 'a', dueAt: at(21) }),
    ]);

    expect(sorted.map((r) => r.id)).toEqual(['a', 'c', 'broken']);
  });
});

describe('attentionCount', () => {
  /* The badge counts what needs doing now. Counting everything scheduled would
     leave it permanently lit, and a badge that is always on is invisible. */
  it('counts overdue and today, but not later or done', () => {
    const count = attentionCount(
      [
        reminder({ id: 'late', dueAt: at(18) }),
        reminder({ id: 'today', dueAt: at(20, 18) }),
        reminder({ id: 'later', dueAt: at(25) }),
        reminder({ id: 'done', dueAt: at(18), isDone: true }),
      ],
      NOW,
    );

    expect(count).toBe(2);
  });
});

describe('weekProgress', () => {
  it('counts what was finished this week against what is still due in it', () => {
    const progress = weekProgress(
      [
        reminder({ id: 'd1', isDone: true, completedAt: at(19) }),
        reminder({ id: 'd2', isDone: true, completedAt: at(20) }),
        reminder({ id: 'r1', dueAt: at(21) }),
        reminder({ id: 'r2', dueAt: at(18) }), // overdue still counts as remaining
      ],
      NOW,
    );

    expect(progress).toMatchObject({ completed: 2, remaining: 2, total: 4 });
    expect(progress.percent).toBe(50);
  });

  /* Counting next month's work as "remaining" would keep the bar short no
     matter how much the farmer got through today. */
  it('ignores work that is not due this week', () => {
    const progress = weekProgress([reminder({ id: 'far', dueAt: new Date(2026, 9, 1, 7).toISOString() })], NOW);

    expect(progress.total).toBe(0);
    expect(progress.percent).toBe(0);
  });

  it('ignores things completed long ago', () => {
    const progress = weekProgress(
      [reminder({ id: 'old', isDone: true, completedAt: new Date(2026, 5, 1).toISOString() })],
      NOW,
    );

    expect(progress.completed).toBe(0);
  });

  it('does not divide by zero on an empty list', () => {
    expect(weekProgress([], NOW)).toEqual({ completed: 0, remaining: 0, total: 0, percent: 0 });
  });
});
