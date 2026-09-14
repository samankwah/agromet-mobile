/**
 * The one interface between "where rain data comes from" and "how the map
 * draws it".
 *
 * Ghana has no weather radar in any public network, so the Apple-style radar
 * loop has no feed to draw. What this models instead is two real sources
 * stitched across now: NASA GIBS IMERG satellite tiles for the measured past,
 * and a forecast model for the hours ahead. A future Ghana Meteorological
 * Agency radar or model feed becomes a third `PrecipitationTimelineProvider`
 * and nothing in the map, the scrubber or the legend changes.
 */

export type TimelineSpan = '1h' | '12h';

/**
 * Where a frame's rain comes from. Three kinds, not two, because the satellite
 * runs about six hours behind: the stretch between the newest satellite frame
 * and now is the model's own analysis of the recent past, and labelling that
 * "observed" would be a claim the reader has no way to check.
 */
export type PrecipFrameKind = 'observed' | 'analysis' | 'forecast';

export type PrecipFrame = {
  /** The instant this frame depicts, ISO 8601 UTC. The timeline axis is linear
   * in this, not in frame index: the frames are unevenly spaced, and a gap in
   * the data should read as a gap. */
  validAt: string;
  /**
   * How many minutes of weather this frame stands for.
   *
   * Satellite frames are 30 minutes and model frames are 60, and playback paces
   * on this rather than on frame count so the animation does not visibly speed
   * up when it crosses from one source to the other.
   */
  stepMinutes: number;
  kind: PrecipFrameKind;
  render:
    | { type: 'raster'; tileUrlTemplate: string; maxZoom: number }
    /** Index into `PrecipitationTimeline.values`, not the values themselves:
     * the whole matrix crosses into the WebView once, and a frame change is
     * then a single paint-property swap rather than a re-serialised payload. */
    | { type: 'cells'; valueRow: number };
};

export type PrecipitationTimeline = {
  frames: PrecipFrame[];
  /** Where "Now" sits on the axis, ISO 8601 UTC. */
  nowIso: string;
  /** Model grid cell centres, parallel to every row of `values`. Empty while
   * only the satellite half exists. */
  grid: { lat: number; lng: number }[];
  /** Width of a grid cell in degrees. Travels with the grid because whichever
   * source answered owns both, and a client that assumed one would mis-draw the
   * whole field the day the other changed. */
  cellSizeDeg: number;
  /** values[row][cellIndex], in mm/h. Built once when the forecast resolves. */
  values: number[][];
  /** Fixed class breaks in mm/h, shared by the map fill and the legend so a
   * colour cannot mean one rate on the map and another in the key. */
  breaks: number[];
  /** Licence lines that must be shown. Open-Meteo is CC-BY 4.0; NASA GIBS asks
   * for a courtesy credit. */
  attributions: string[];
  /** Set when a half is missing, so the screen can say which and why rather
   * than quietly showing less than it promised. */
  notices: string[];
};

/**
 * The seam a GMet feed would later implement.
 *
 * One method rather than one per half, so a source that serves both the past
 * and the future from a single endpoint implements it in a single call. The
 * current split between satellite and model is an implementation detail of
 * today's public sources, not part of the contract.
 */
export type PrecipitationTimelineProvider = {
  id: string;
  buildTimeline(options: { now: Date; span: TimelineSpan }): Promise<PrecipitationTimeline>;
};
