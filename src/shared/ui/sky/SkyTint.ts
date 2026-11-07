import { createContext, useContext } from 'react';

/**
 * The see-through colour for cards drawn over the sky, taken from the weather:
 * grey glass on a grey day, blue on a clear one. Provided by `WeatherBackdrop`;
 * null everywhere else, where a translucent card keeps its usual navy.
 */
export const SkyTintContext = createContext<string | null>(null);

export function useSkyTint(): string | null {
  return useContext(SkyTintContext);
}
