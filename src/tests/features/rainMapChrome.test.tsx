import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { formatFrameTime } from '../../features/forecasts/precipitation/PlaybackBar';
import { PrecipitationLegend } from '../../features/forecasts/precipitation/PrecipitationLegend';
import { axisLabel } from '../../features/forecasts/precipitation/TimelineScrubber';
import { MAP_CHROME } from '../../features/forecasts/precipitation/mapChrome';
import { PLAYBACK_RATE } from '../../features/forecasts/precipitation/frames';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

describe('rain map timeline labels', () => {
  it('labels the hour as "4 PM" and the half hour as "4:30"', () => {
    expect(axisLabel(Date.UTC(2026, 10, 7, 16, 0))).toBe('4 PM');
    expect(axisLabel(Date.UTC(2026, 10, 7, 16, 30))).toBe('4:30');
    expect(axisLabel(Date.UTC(2026, 10, 7, 0, 0))).toBe('12 AM');
    expect(axisLabel(Date.UTC(2026, 10, 7, 12, 0))).toBe('12 PM');
  });

  it('titles the frame with its weekday and time', () => {
    expect(formatFrameTime('2026-11-07T16:44:00Z')).toBe('Saturday 4:44 PM');
    expect(formatFrameTime('2026-11-08T09:05:00Z')).toBe('Sunday 9:05 AM');
  });

  /* Slowed after testing: the rain moved too fast to follow. */
  it('plays slower than it used to', () => {
    expect(PLAYBACK_RATE['1h']).toBeLessThan(90);
    expect(PLAYBACK_RATE['12h']).toBeLessThan(150);
  });
});

describe('PrecipitationLegend', () => {
  it('names the four intensities, heaviest first, without numbers', () => {
    render(
      <ThemeProvider>
        <PrecipitationLegend chrome={MAP_CHROME.light} />
      </ThemeProvider>,
    );
    const labels = ['Extreme', 'Heavy', 'Moderate', 'Light'].map((label) => screen.getByText(label));
    expect(labels).toHaveLength(4);
    expect(screen.queryByText('mm per hour')).toBeNull();
    expect(screen.queryByText('20')).toBeNull();
  });
});

describe('map chrome', () => {
  it('uses dark type on the light daytime map and white type at night', () => {
    expect(MAP_CHROME.light.text).toBe('#111418');
    expect(MAP_CHROME.dark.text).toBe('#ffffff');
  });
});
