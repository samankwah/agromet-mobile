import type { GeoPolygonGeometry, GhanaBoundaries } from '../domain/spatialOutlook';

export type SvgViewport = { width: number; height: number; padding: number };
export type ProjectedPoint = { x: number; y: number };
export type Projector = (lng: number, lat: number) => ProjectedPoint;

/**
 * A simple equirectangular projection, scaled and centered to fit `bounds`
 * into `viewport`, with a latitude-cosine correction so Ghana's shape
 * isn't horizontally stretched. Good enough at a single country's scale —
 * no need for a full map-projection library for this.
 */
export function createProjector(bounds: GhanaBoundaries['bounds'], viewport: SvgViewport): Projector {
  const { minLng, minLat, maxLng, maxLat } = bounds;
  const midLat = (minLat + maxLat) / 2;
  const cos = Math.cos((midLat * Math.PI) / 180);

  const lngSpan = (maxLng - minLng) * cos || 1;
  const latSpan = maxLat - minLat || 1;

  const usableWidth = viewport.width - viewport.padding * 2;
  const usableHeight = viewport.height - viewport.padding * 2;
  const scale = Math.min(usableWidth / lngSpan, usableHeight / latSpan);

  const drawnWidth = lngSpan * scale;
  const drawnHeight = latSpan * scale;
  const offsetX = viewport.padding + (usableWidth - drawnWidth) / 2;
  const offsetY = viewport.padding + (usableHeight - drawnHeight) / 2;

  return (lng, lat) => ({
    x: offsetX + (lng - minLng) * cos * scale,
    y: offsetY + (maxLat - lat) * scale, // screen y grows downward, latitude grows upward
  });
}

/** Converts a Polygon/MultiPolygon geometry into an SVG path `d` string
 * via the given projector. */
export function polygonToSvgPath(geometry: GeoPolygonGeometry, project: Projector): string {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates as number[][][]] : (geometry.coordinates as number[][][][]);

  return polygons
    .map((rings) =>
      rings
        .map((ring) => {
          const points = ring.map(([lng, lat]) => project(lng, lat));
          const [first, ...rest] = points;
          if (!first) return '';
          const line = rest.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
          return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ${line} Z`;
        })
        .join(' '),
    )
    .join(' ');
}
