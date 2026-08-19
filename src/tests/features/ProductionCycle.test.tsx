import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CycleProgressCard } from '../../features/farm-tools/calendars/components/CycleProgressCard';
import type { CalendarActivity, ProductionCycle } from '../../shared/domain/calendar';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function activity(id: string, name: string, startWeek: number, endWeek: number): CalendarActivity {
  return { id, activityId: id, activityName: name, startWeek, endWeek, productionWeek: startWeek };
}

const BROILER_ACTIVITIES = [
  activity('a', 'Brooder management', 1, 4),
  activity('b', '2nd Newcastle (Lasota)', 6, 6),
  activity('c', 'Biosecurity measures', 1, 8),
  activity('d', 'Harvesting/live bird market', 8, 8),
];

function makeCycle(partial: Partial<ProductionCycle> = {}): ProductionCycle {
  return {
    id: '1',
    calendarId: '2',
    batchName: 'Batch A',
    commodity: 'Broiler',
    status: 'active',
    startDate: '2026-07-06',
    expectedEndDate: '2026-08-31',
    initialQuantity: 500,
    currentQuantity: 500,
    notes: null,
    currentWeek: 6,
    totalDurationWeeks: 8,
    progressPercent: 75,
    createdAt: '2026-07-06T00:00:00.000Z',
    updatedAt: '2026-07-06T00:00:00.000Z',
    ...partial,
  };
}

const onSetStatus = jest.fn();

function renderCard(cycle: ProductionCycle, activities = BROILER_ACTIVITIES, totalWeeks = 8) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <CycleProgressCard cycle={cycle} activities={activities} totalWeeks={totalWeeks} onSetStatus={onSetStatus} isUpdating={false} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('CycleProgressCard', () => {
  beforeEach(() => onSetStatus.mockClear());

  it("reports the server's week and progress rather than recomputing them", () => {
    // The server owns this arithmetic. If the card derived the week from
    // the device clock, a phone in another timezone would disagree with the
    // dashboard about which week a flock is in.
    renderCard(makeCycle({ currentWeek: 6, totalDurationWeeks: 8, progressPercent: 75 }));

    expect(screen.getByText('Week 6 of 8')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('trusts the server even when its figures disagree with the dates', () => {
    // startDate is months ago, but the server says week 2. The card must
    // not "correct" it — the server may have paused the cycle.
    renderCard(makeCycle({ startDate: '2020-01-01', currentWeek: 2, progressPercent: 25 }));

    expect(screen.getByText('Week 2 of 8')).toBeTruthy();
  });

  it('names exactly the activities live in the current week', () => {
    renderCard(makeCycle({ currentWeek: 6 }));

    // Week 6: the Lasota vaccination and ongoing biosecurity. Brooding
    // ended at week 4; harvest is week 8.
    expect(screen.getByText('2nd Newcastle (Lasota)')).toBeTruthy();
    expect(screen.getByText('Biosecurity measures')).toBeTruthy();
    expect(screen.queryByText('Brooder management')).toBeNull();
    expect(screen.queryByText('Harvesting/live bird market')).toBeNull();
  });

  it('says so plainly when a week has nothing scheduled', () => {
    renderCard(makeCycle({ currentWeek: 5 }), [activity('a', 'Brooder management', 1, 4)]);

    expect(screen.getByText(/Nothing scheduled for week 5/)).toBeTruthy();
  });

  it('announces progress to a screen reader, since a bar alone says nothing', () => {
    renderCard(makeCycle({ currentWeek: 6, totalDurationWeeks: 8, progressPercent: 75 }));

    expect(screen.getByLabelText('Week 6 of 8, 75 percent through the cycle.')).toBeTruthy();
  });

  it('shows the expected finish date while running, and stops promising one when done', () => {
    const { unmount } = renderCard(makeCycle({ currentWeek: 6 }));
    expect(screen.getByText(/Expected to finish/)).toBeTruthy();
    unmount();

    renderCard(makeCycle({ status: 'completed', currentWeek: 8, progressPercent: 100 }));
    expect(screen.getByText('Cycle complete')).toBeTruthy();
    expect(screen.queryByText(/Expected to finish/)).toBeNull();
  });

  it('survives a progress figure outside 0-100 rather than drawing off the end', () => {
    renderCard(makeCycle({ progressPercent: 140 }));
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('can pause a running batch and resume a paused one', () => {
    const { unmount } = renderCard(makeCycle({ status: 'active' }));
    fireEvent.press(screen.getByText('Pause'));
    expect(onSetStatus).toHaveBeenCalledWith('paused');
    unmount();

    renderCard(makeCycle({ status: 'paused' }));
    fireEvent.press(screen.getByText('Resume'));
    expect(onSetStatus).toHaveBeenCalledWith('active');
  });

  it('can finish a batch, and offers nothing further once finished', () => {
    const { unmount } = renderCard(makeCycle({ status: 'active' }));
    fireEvent.press(screen.getByText('Finish'));
    expect(onSetStatus).toHaveBeenCalledWith('completed');
    unmount();

    // A completed batch has no next state — leaving the buttons would let a
    // farmer "resume" a flock that has already gone to market.
    renderCard(makeCycle({ status: 'completed' }));
    expect(screen.queryByText('Pause')).toBeNull();
    expect(screen.queryByText('Finish')).toBeNull();
  });

  it('omits the flock size when none was recorded', () => {
    renderCard(makeCycle({ initialQuantity: 0 }));

    expect(screen.queryByText(/birds/)).toBeNull();
    expect(screen.getByText(/Started/)).toBeTruthy();
  });
});
