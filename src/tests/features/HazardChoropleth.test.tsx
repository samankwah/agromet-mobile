import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { HazardChoropleth } from '../../features/advisories/flood-drought/components/HazardChoropleth';
import type { HazardRegion } from '../../shared/domain/hazard';
import { GHANA_BOUNDARIES } from '../../shared/data/ghanaBoundaries';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

function region(name: string, band: string, centroid: [number, number]): HazardRegion {
  const block = {
    score: 50,
    band,
    drivers: [],
    advisories: [],
    overridden: false,
    source: 'open-meteo',
  };
  return {
    region: name,
    agroZone: 'Guinea Savannah',
    centroid,
    riverPoint: centroid,
    riverine: true,
    flood: block,
    drought: block,
    dominant: 'flood',
  } as unknown as HazardRegion;
}

/** Every region the boundary asset draws, so the label pass is exercised in
 * full rather than on a convenient subset. */
const ALL_REGIONS = Array.from(
  new Set(GHANA_BOUNDARIES.regions.map((feature) => feature.properties.name)),
).map((name) => region(name, 'normal', [8, -1]));

/**
 * The map wrapper is `accessible`, which collapses its whole subtree into one
 * accessibility element. That is deliberate — a screen reader should get a
 * single sentence, not sixteen orphaned <path> nodes — but it also means the
 * label text is unreachable through the normal text queries. So the labels are
 * read straight off the rendered tree instead.
 */
function renderMap(regions: HazardRegion[]) {
  return render(
    <ThemeProvider>
      <HazardChoropleth regions={regions} hazard="flood" onSelectRegion={() => {}} />
    </ThemeProvider>,
  );
}

/** Every string drawn anywhere in the rendered SVG.
 *
 * react-native-svg does not put label text in `children` — it lands on the
 * host TSpan as `props.content` — so both have to be collected. */
function drawnText(node: unknown, found: string[] = []): string[] {
  if (typeof node === 'string') {
    found.push(node);
    return found;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => drawnText(child, found));
    return found;
  }
  if (node && typeof node === 'object') {
    const content = (node as { props?: { content?: unknown } }).props?.content;
    if (typeof content === 'string') found.push(content);
    drawnText((node as { children?: unknown }).children, found);
  }
  return found;
}

describe('HazardChoropleth labels', () => {
  /* Without names the map is sixteen abstract shapes and a reader has to tap
     each one to find out where they are looking. */
  it('names every region it draws', () => {
    const labels = drawnText(renderMap(ALL_REGIONS).toJSON());

    for (const name of ['Northern', 'Ashanti', 'Volta', 'Savannah', 'Oti', 'Central']) {
      expect(labels).toContain(name);
    }
  });

  /* The longest names sit on some of the smallest shapes. Abbreviating keeps
     them recognisable where truncating would not. */
  it('abbreviates the names that will not fit their region', () => {
    const labels = drawnText(renderMap(ALL_REGIONS).toJSON());

    expect(labels).toContain('Gt. Accra');
    expect(labels).toContain('U. East');
    expect(labels).toContain('W. North');
    expect(labels).not.toContain('Greater Accra');
  });

  /* Two passes per label: a stroked copy underneath as a halo, then the solid
     glyphs on top. One stroked Text would have the halo eating into the
     letterforms, because SVG paints stroke over fill within an element. */
  it('draws each label twice so it stays legible over any fill', () => {
    const labels = drawnText(renderMap([region('Northern', 'extreme', [9.4, -0.37])]).toJSON());

    expect(labels.filter((label) => label === 'Northern')).toHaveLength(2);
  });

  it('describes the map in one sentence for a screen reader', () => {
    renderMap([
      region('Northern', 'severe', [9.4, -0.37]),
      region('Ashanti', 'normal', [6.7, -1.58]),
    ]);

    expect(screen.getByLabelText(/1 region is above normal flood risk: Northern/i)).toBeTruthy();
  });

  it('says so plainly when nothing is above normal', () => {
    renderMap([region('Ashanti', 'normal', [6.7, -1.58])]);

    expect(screen.getByLabelText(/No region is above normal flood risk/i)).toBeTruthy();
  });
});
