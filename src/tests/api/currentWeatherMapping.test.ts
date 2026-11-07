import { toCurrentWeather } from '../../shared/api/openMeteo';

const ACCRA = { id: 'accra', name: 'Accra', lat: 5.6037, lng: -0.187, region: 'Greater Accra' };

const bundle = (current: Record<string, number | string>) => ({
  current: { time: '2026-11-07T16:15', temperature_2m: 30, weather_code: 2, ...current },
  daily: { temperature_2m_min: [26], temperature_2m_max: [32] },
});

describe('toCurrentWeather', () => {
  it('reads the cloud cover by height and the visibility', () => {
    const weather = toCurrentWeather(
      bundle({ cloud_cover: 13, cloud_cover_low: 12, cloud_cover_mid: 1, cloud_cover_high: 0, visibility: 22440 }),
      ACCRA,
    );
    expect(weather.cloudCover).toEqual({ total: 13, low: 12, mid: 1, high: 0 });
    expect(weather.visibilityM).toBe(22440);
  });

  /* A bundle stored before these fields were asked for has none of them. Zeros
     would draw a clear sky over whatever the weather is, so they stay absent
     and the sky estimates from the weather code instead. */
  it('leaves them out of a bundle that predates them', () => {
    const weather = toCurrentWeather(bundle({}), ACCRA);
    expect(weather.cloudCover).toBeUndefined();
    expect(weather.visibilityM).toBeUndefined();
  });

  it('works out the total from the layers when only the layers are given', () => {
    const weather = toCurrentWeather(bundle({ cloud_cover_low: 20, cloud_cover_mid: 70, cloud_cover_high: 10 }), ACCRA);
    expect(weather.cloudCover?.total).toBe(70);
  });
});
