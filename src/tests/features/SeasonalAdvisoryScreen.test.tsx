import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SeasonalAdvisoryScreen } from '../../features/forecasts/seasonal-advisory/SeasonalAdvisoryScreen';
import { SeasonalConditionScreen } from '../../features/forecasts/seasonal-advisory/SeasonalConditionScreen';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { seasonalPayload } from '../fixtures/seasonal';
import { advicePayload } from '../fixtures/seasonalAdvice';
import { createTestQueryClient } from '../testQueryClient';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn() } }));

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let client: QueryClient;
let requested: string[];

type Answer = { advice?: object | 'fail' | 'missing'; set?: object };

function answer({ advice = advicePayload(), set = seasonalPayload() }: Answer = {}) {
  requested = [];
  globalThis.fetch = jest.fn((url: string) => {
    const href = String(url);
    requested.push(href);
    if (href.includes('/api/outlook/seasonal/advice/')) {
      if (advice === 'fail') return Promise.reject(new TypeError('Network request failed'));
      if (advice === 'missing') {
        return Promise.resolve({ ok: false, status: 404, json: async () => ({ detail: "Unknown region 'Atlantis'." }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true, data: advice }) });
    }
    if (href.includes('/api/outlook/seasonal')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true, data: set }) });
    }
    return Promise.reject(new TypeError('Network request failed'));
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  mockPush.mockClear();
  client = createTestQueryClient();
  answer();
});

afterEach(() => {
  client.clear();
  jest.restoreAllMocks();
});

function wrap(children: React.ReactNode) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('the full seasonal advisory', () => {
  it('leads with the one thing to know, then the figures and what to do', async () => {
    wrap(<SeasonalAdvisoryScreen region="Greater Accra" />);

    expect(await screen.findByText('The rains may start later than usual.')).toBeTruthy();
    expect(screen.getByText('Greater Accra')).toBeTruthy();
    expect(screen.getByText('Southern Major Season 2027')).toBeTruthy();
    expect(screen.getByText('From the ECMWF seasonal outlook')).toBeTruthy();

    expect(screen.getByText('At a glance')).toBeTruthy();
    expect(screen.getByText('Week 4 of March')).toBeTruthy();
    expect(screen.getByText('Later than usual')).toBeTruthy();
    expect(screen.getByText('Rainfall, Mar to May')).toBeTruthy();

    expect(screen.getByText('What to do')).toBeTruthy();
    expect(screen.getByText('Rains may start late')).toBeTruthy();
    expect(screen.getByText('Wait for the rains to settle before you plant.')).toBeTruthy();
    expect(screen.getByText(/not an official advisory/)).toBeTruthy();
  });

  it('says an action shared by several conditions once, not under each', async () => {
    wrap(<SeasonalAdvisoryScreen region="Greater Accra" />);
    await screen.findByText('What to do');

    expect(screen.getAllByText('Check the 7 day forecast before you plant.')).toHaveLength(1);
    expect(screen.getByText('For the whole season')).toBeTruthy();
  });

  it('asks the server for the season it was opened on, and switches season', async () => {
    wrap(<SeasonalAdvisoryScreen region="Greater Accra" season="southern-major" window="MJJ" />);
    await screen.findByText('At a glance');
    expect(requested.some((url) => url.includes('season=southern-major') && url.includes('window=MJJ'))).toBe(true);

    fireEvent.press(screen.getByLabelText('Season').findByProps({ accessibilityLabel: 'Minor season' }));
    await screen.findByText('Southern Minor Season 2027');
    // The drawer's months belonged to the major season, so they are not sent on.
    expect(requested.some((url) => url.includes('season=southern-minor') && !url.includes('window='))).toBe(true);
  });

  it('offers no season switch where there is only one season', async () => {
    answer({ advice: advicePayload({ region: 'Upper East', season: { key: 'northern', label: 'Northern Single Season', year: 2027 } }) });
    wrap(<SeasonalAdvisoryScreen region="Upper East" />);
    await screen.findByText('At a glance');

    expect(screen.queryByLabelText('Season')).toBeNull();
  });

  it('opens the advice for a figure', async () => {
    wrap(<SeasonalAdvisoryScreen region="Greater Accra" season="southern-major" />);
    fireEvent.press(await screen.findByLabelText(/^Rains end: /));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/seasonal/[region]/[variable]',
      params: { region: 'Greater Accra', variable: 'cessation', season: 'southern-major' },
    });
  });

  it('shows the month by month table from the map outlook, without stars', async () => {
    wrap(<SeasonalAdvisoryScreen region="Greater Accra" />);

    expect(await screen.findByText('Month by month')).toBeTruthy();
    for (const key of ['MAM', 'MJJ', 'JAS', 'SON']) expect(screen.getByText(key)).toBeTruthy();
    expect(screen.queryByText(/\*/)).toBeNull();
  });

  it('keeps the method notes folded until asked', async () => {
    wrap(<SeasonalAdvisoryScreen region="Greater Accra" />);
    await screen.findByText('About this outlook');

    expect(screen.queryByText(/A guide to the season/)).toBeNull();
    fireEvent.press(screen.getByLabelText('About this outlook'));
    expect(screen.getByText(/A guide to the season, not a day to day forecast/)).toBeTruthy();
  });

  it('names who published advice that replaced the rules', async () => {
    answer({ advice: advicePayload({ source: 'published', issuedBy: 'MoFA Accra' }) });
    wrap(<SeasonalAdvisoryScreen region="Greater Accra" />);

    expect(await screen.findByText('Advice from MoFA Accra')).toBeTruthy();
  });

  it('still shows the month by month figures when the advice cannot be fetched', async () => {
    // A region no earlier test cached, so nothing saved on the phone stands in.
    answer({ advice: 'fail' });
    wrap(<SeasonalAdvisoryScreen region="Volta" />);

    expect(await screen.findByText('Month by month')).toBeTruthy();
    expect(screen.queryByText('What to do')).toBeNull();
  });
});

describe('the advice for one condition', () => {
  it('shows the figure, the usual, the chances and what to do', async () => {
    wrap(<SeasonalConditionScreen region="Greater Accra" variable="onset" />);

    expect(await screen.findByText('Rains start')).toBeTruthy();
    expect(screen.getByText('Greater Accra · Southern Major Season 2027')).toBeTruthy();
    expect(screen.getByText('Week 4 of March')).toBeTruthy();
    expect(screen.getByText('Week 2 of March')).toBeTruthy();
    expect(screen.getByText('High confidence')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
    expect(screen.getByText('Later start')).toBeTruthy();
    expect(screen.getByText('Rains may start late')).toBeTruthy();
    expect(screen.getByText('Wait for the rains to settle before you plant.')).toBeTruthy();
  });

  it('names a three month figure by its months', async () => {
    wrap(<SeasonalConditionScreen region="Greater Accra" variable="rainfallTotal" window="MAM" />);

    expect(await screen.findByText('Greater Accra · March to May 2027')).toBeTruthy();
  });

  it('says plainly when the figure is the usual, not a forecast', async () => {
    const base = advicePayload();
    const usual = {
      ...base.conditions[0],
      condition: 'normal_only',
      title: 'Plan for the usual start',
      reading: { available: false, availableFrom: '2027-05', normalDisplay: 'Week 2 of September' },
    };
    answer({ advice: { ...base, conditions: [usual, ...base.conditions.slice(1)] } });
    wrap(<SeasonalConditionScreen region="Greater Accra" variable="onset" />);

    expect(await screen.findByText('Week 2 of September')).toBeTruthy();
    expect(screen.getByText('In most years')).toBeTruthy();
    expect(screen.getByText(/The forecast will be ready from May 2027/)).toBeTruthy();
    expect(screen.queryByText('High confidence')).toBeNull();
  });

  it('leads on to the full advisory', async () => {
    wrap(<SeasonalConditionScreen region="Greater Accra" variable="onset" season="southern-major" />);
    fireEvent.press(await screen.findByText('Full seasonal advisory'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/seasonal/[region]', params: { region: 'Greater Accra', season: 'southern-major' } });
  });

  it('says so when the region is not known', async () => {
    answer({ advice: 'missing' });
    wrap(<SeasonalConditionScreen region="Atlantis" variable="onset" />);

    expect(await screen.findByText(/Unknown region|could not|not found|Something/i)).toBeTruthy();
  });
});
