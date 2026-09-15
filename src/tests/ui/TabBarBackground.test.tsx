import React from 'react';
import { render } from '@testing-library/react-native';

import { neu } from '../../shared/theme/tokens';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { TabBarBackground } from '../../shared/ui/TabBarBackground';

/* The bar floats over whatever the current tab is showing, which is not always
   a page of its own scheme. On the forecasts tab it sits over a dark
   precipitation map while carrying its own light chrome, and a neumorphic
   *pair* put its near-opaque white half up-left — a haze band across the screen
   above the bar. It was invisible on Home only because that page is already
   near-white, which is exactly why this is pinned by a test rather than left to
   be spotted on one screen. */

function shadows(node: unknown): { color?: string }[] {
  const found: { color?: string }[] = [];
  const walk = (current: any) => {
    if (!current || typeof current !== 'object') return;
    if (Array.isArray(current)) return current.forEach(walk);
    const style = current.props?.style;
    for (const entry of Array.isArray(style) ? style : [style]) {
      if (entry && Array.isArray(entry.boxShadow)) found.push(...entry.boxShadow);
    }
    walk(current.children);
  };
  walk(node);
  return found;
}

describe('TabBarBackground', () => {
  for (const scheme of ['light', 'dark'] as const) {
    it(`casts a shadow but never a highlight in ${scheme}`, () => {
      const tree = render(
        <ThemeProvider forceScheme={scheme}>
          <TabBarBackground />
        </ThemeProvider>,
      ).toJSON();

      const cast = shadows(tree);
      expect(cast.length).toBeGreaterThan(0);
      for (const shadow of cast) {
        expect(shadow.color).not.toBe(neu[scheme].shadowLight);
      }
    });
  }

  it('still reads as lifted, not flat', () => {
    // Dropping the highlight must not quietly drop the depth with it: the bar
    // is the one surface whose whole job is to float over the page.
    const tree = render(
      <ThemeProvider forceScheme="light">
        <TabBarBackground />
      </ThemeProvider>,
    ).toJSON();

    const [dark] = shadows(tree);
    expect(dark.color).toBe(neu.light.shadowDark);
  });
});
