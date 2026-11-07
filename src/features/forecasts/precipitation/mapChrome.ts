import type { MapLook } from './useMapDaylight';

/**
 * Colours for everything floating over the rain map: the close button, the
 * legend and the playback bar. White glass with dark type over Esri's light
 * daytime map, dark glass with white type over the night one, as the phone's
 * own weather app does.
 */
export type MapChrome = {
  card: string;
  border: string;
  text: string;
  muted: string;
  control: string;
  controlSelected: string;
  controlSelectedText: string;
  track: string;
  fill: string;
  tickMeasured: string;
  tickForecast: string;
  now: string;
};

export const MAP_CHROME: Record<MapLook, MapChrome> = {
  light: {
    card: 'rgba(255,255,255,0.9)',
    border: 'rgba(17,20,24,0.08)',
    text: '#111418',
    muted: 'rgba(17,20,24,0.55)',
    control: 'rgba(17,20,24,0.07)',
    controlSelected: '#ffffff',
    controlSelectedText: '#111418',
    track: 'rgba(17,20,24,0.12)',
    fill: '#111418',
    tickMeasured: 'rgba(17,20,24,0.45)',
    tickForecast: 'rgba(17,20,24,0.25)',
    now: '#111418',
  },
  dark: {
    card: 'rgba(16,22,30,0.84)',
    border: 'rgba(255,255,255,0.12)',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.62)',
    control: 'rgba(255,255,255,0.14)',
    controlSelected: 'rgba(255,255,255,0.9)',
    controlSelectedText: '#101820',
    track: 'rgba(255,255,255,0.18)',
    fill: '#ffffff',
    tickMeasured: 'rgba(255,255,255,0.55)',
    tickForecast: 'rgba(255,255,255,0.28)',
    now: '#ffffff',
  },
};
