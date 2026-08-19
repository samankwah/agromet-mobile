# AgroMet Ghana — Mobile

A native React Native + Expo app delivering agrometeorological alerts,
advisories, forecasts, farm tools, and a bulletin library to Ghanaian
farmers. Part of the AgroMet monorepo, alongside `frontend/` (the web app /
admin surface) and `backend/` (FastAPI). This is a native app, not a
WebView wrapper.

## Navigation

Five bottom tabs, each covering a distinct area of the product:

| Tab            | Status this increment                                                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home**       | Real — alert banner, city carousel, current conditions, quick actions, featured forecast, latest advisory, latest news                                                                                                     |
| **Forecasts**  | Real — Today (hourly strip + stats + a farm-actionable card), 7-Day (expandable list with a min–max range bar), and Outlook (subseasonal + seasonal, marked as probabilistic), plus a lightweight, honest map preview card |
| **Advisories** | Real Weather Alerts (relocated from the previous increment) + placeholder sections for crop-specific advisory, flood/drought monitoring, and the advisory archive                                                          |
| **Farm Tools** | Real Crop Diagnose (relocated, reached via its own screen from a card here) + placeholder sections for crop/poultry calendars, market prices, and reminders                                                                |
| **Library**    | Placeholder — bulletins, news, maps, FAQs, contacts, and settings are a future milestone                                                                                                                                   |

Everything currently runs on mock data, clearly tagged in development (see
"Mock data" below). See "Mock services" for how that's structured and how
to swap in a real backend later.

## Prerequisites

- Node.js (matching the repo root — v24.x)
- npm
- The [Expo Go](https://expo.dev/go) app on a physical device (iOS or
  Android — Android is the primary release target, but the app runs on
  both), or a simulator/emulator

## Install

```bash
cd mobile
npm install
```

## Environment variables

```bash
cp .env.example .env
```

Expo only exposes client-side env vars prefixed `EXPO_PUBLIC_` (unlike the
web app's Vite-based `VITE_` prefix). `EXPO_PUBLIC_API_BASE_URL` is defined
but unused this increment — every service function currently reads local
mock data; it's reserved for the increment that points the app at a real
backend.

## Run

```bash
npx expo start
```

Or from the repo root: `npm run mobile:start`.

Scan the QR code with Expo Go — on Android, use Expo Go's own scanner; on
iOS, point your Camera app at it. Device and computer must be on the same
Wi-Fi network. Press `a` in the terminal to launch an Android emulator
instead, if you have one configured.

Other scripts:

```bash
npm run android       # expo start --android
npm test              # jest — utilities, domain logic, and a Home smoke render test
npm run lint           # expo lint (ESLint, flat config)
npm run format         # prettier --write .
npm run format:check   # prettier --check . (what CI runs)
npx tsc --noEmit       # type-check
```

## Project structure

```
app/                          Expo Router routes — thin, just render a screen
  (tabs)/                      Home, Forecasts, Advisories, Farm Tools, Library tabs
  alert/[id].tsx                Alert details
  saved-districts.tsx           Manage which districts you get alerts for
  diagnose.tsx                  Crop Diagnose (reached from a Farm Tools card, not a tab itself)
  spatial-outlook.tsx           Seasonal Outlook's gridded map (reached from SeasonalOutlookCard, not a tab)
src/
  features/
    home/                       Home screen + its cards (CityCarousel, FeaturedForecastCard, NewsTeaserCard, …)
    advisories/
      weather-alerts/            Alert banner, details/saved-districts screens, useAlerts
      AdvisoriesScreen.tsx        Composed screen: live alerts + stub sections
    farm-tools/
      diagnose/                   Diagnose form, photo capture, result card, WhatsApp share
      FarmToolsScreen.tsx          Composed screen: live diagnose entry + stub sections
    forecasts/                   Today / 7-Day / Outlook segmented screen, useForecastsData, components/
    library/                     Placeholder screen
  shared/
    domain/                      TypeScript types for every feature area (see "Domain models" below)
    data/                        Mock data — one file per domain, clearly the swap target for real content
    api/                         Service functions — the sole swap point for real APIs (see below)
    state/                       Zustand stores — client-only preference/selection state (see below)
    storage/                     Generic AsyncStorage cache + the diagnosis offline queue
    net/                         Connectivity hook (NetInfo)
    theme/                       Design tokens (ported from the web app's palette) + ThemeProvider
    ui/                          Shared primitives — Screen, Card, Button, Text, AsyncStateView, EmptyState,
                                  ComingSoon, ComingSoonCard, OfflineBanner, SeverityBadge, MockDataTag,
                                  StatTile, BulletList, DetailRow, SegmentedControl, TemperatureRangeBar,
                                  ConfidenceBadge, ChoroplethMap, ColorScaleLegend, Dropdown, Drawer
    utils/                       Formatting helpers
  tests/                        Jest tests, mirroring the src/ structure
```

## State: TanStack Query vs. Zustand

Two different jobs, two different tools:

- **TanStack Query** owns every fetch with a server-shaped answer — current
  conditions, forecasts, advisories, alerts, news. It already handles
  loading/error/retry/caching.
- **Zustand** (`shared/state/`) owns client-only preference/selection state
  that has no server source of truth:
  - `locationStore.ts` — which town is selected on Home, which districts
    the farmer saved for alerts. Persisted via `zustand/middleware`'s
    `persist` + AsyncStorage.
  - `settingsStore.ts` — theme override, text size, data-saver mode,
    language, favourite districts/crops, livestock type, notification
    preferences. Backs `ThemeProvider`'s dark-mode/text-size resolution.
  - `authStore.ts` — a guest-only placeholder (`{ mode: 'guest', guestId }`)
    so later milestones don't have to retrofit an auth concept into
    stores/components that assumed a single implicit user.

Both persist through AsyncStorage directly (Zustand's own idiomatic
pattern), namespaced `agromet:zustand:*` — distinct from
`shared/storage/cache.ts`'s `agromet:cache:*`, which remains a separate,
timestamped "last successful fetch" cache for query results (e.g. the
alerts offline fallback), not preferences.

## Mock services and swapping in a real backend later

Every screen gets its data through a function in `src/shared/api/`. No UI
component ever imports mock data directly — only the matching service
function, each wrapped in `mockDelay()` to simulate latency. That means
pointing the app at a real backend is a change to one file per domain, not
a rewrite.

**Fully backed by real mock data and consumed by real UI**: `weatherService`,
`advisoryService`, `alertsService` (+ `getAlertById`), `diagnosisService`,
`newsService`, and `forecastService`'s `getDailyForecast`/
`getWeeklyForecast`/`getFeaturedWeeklyForecast`/`getHourlyForecast`
(the Forecasts tab's Today and 7-Day sections).

`forecastService.getSubseasonalOutlook`/`getSeasonalOutlook`/
`getForecastMapLayers` are now also consumed by real UI (the Outlook
section and the map preview card) — the mock _data_ stays intentionally
static/placeholder-quality (one hardcoded outlook regardless of location,
no real map imagery), but the screens built against them are real, not
stubs.

**Signature + placeholder mock only, no UI yet** (types exist now so the
milestone that builds their UI is pure UI work): `bulletinService`,
`calendarService`, `poultryCalendarService`, `marketService`,
`reminderService`, `mapService`, `settingsService` (a no-op sync
placeholder — settings are store-owned), `authService` (guest-only).

Real-integration notes:

- `weatherService.getCurrentConditions()` — field names mirror the web
  app's Open-Meteo-normalized shape, so it can call a backend proxy or
  Open-Meteo directly (`frontend/src/services/openMeteoService.js`).
- `advisoryService.getLatestAdvisoryTeaser()` — points at the backend's
  `GET /api/weekly-advisories` (`backend/app/main.py`).
- `alertsService` — no backend or CAP feed exists yet; see
  `shared/domain/alertSeverity.ts` for the CAP severity mapping this was
  designed against.
- `diagnosisService.submitDiagnosis()` — the `DiagnosisRequest`
  in/`DiagnosisResult` out contract a real Azure ML endpoint, or the
  backend's Kindwise-based `POST /api/crop-diagnosis`
  (`backend/app/diagnosis.py`), needs to satisfy.
- `calendarService` — field names mirror the backend's
  `serialize_calendar`/`serialize_calendar_activity`
  (`backend/app/domain.py`) 1:1.
- `marketService` — mirrors the backend's `GET /api/market/*` shape 1:1.

## Domain models

Every feature area from the product's full scope has a TypeScript type in
`shared/domain/`, even where no screen consumes it yet: `CurrentWeather`,
`WeatherAlert`/`AlertSeverity`, `AgroAdvisory` (general or crop-specific,
via a `kind` discriminant), `DiagnosisRequest`/`DiagnosisResult`/
`QueuedDiagnosisSubmission`, `DailyForecast`/`WeeklyForecast`/
`HourlyForecast`, `SubseasonalOutlook`/`SeasonalOutlook` (both carry a
**mandatory** `plainLanguageSummary` — a probabilistic climate outlook
can't be rendered without also carrying its own uncertainty explanation),
`ForecastMapLayer`/`MapLayer`, `CropCalendar`/`CropCalendarActivity`,
`PoultryCalendar`/`PoultryGuidanceItem`, `MarketCommodity`/`MarketTrend`,
`FarmReminder`, `Bulletin`, `NewsUpdate`, `UserSettings`, `Account`.

`SpatialOutlookDataset`/`SpatialGridCell` (`shared/domain/spatialOutlook.ts`)
back the Seasonal Outlook's gridded map — see "Seasonal Outlook spatial
map" below.

## Seasonal Outlook spatial map

`SeasonalOutlookCard` has a "View spatial map" action (`app/spatial-outlook.tsx`)
that opens a gridded choropleth of Ghana with a bottom drawer of filters
(Forecast View: Probability/Deterministic, Geography: Region/District,
Variable, Sub-season) over an always-visible color-scale legend — expand
the drawer for every control, collapse it to leave the map fully visible.

**The map geometry is real, the grid values are mock:**

- `shared/data/ghanaBoundaries.json` — real, simplified Ghana country/
  region/district boundaries plus a pre-baked ~0.15°-resolution grid
  (~865 cells, each already tagged with its region/district), generated
  once by **`scripts/build-ghana-boundaries.mjs`** from the web app's
  boundary assets (`frontend/src/assets/ghana-district-boundaries.json`,
  `ghana-regions.json`). That script uses `@turf/turf` (a devDependency,
  never shipped in the app) to simplify/dissolve/union the source
  polygons and bake the grid — re-run it (`node
scripts/build-ghana-boundaries.mjs`) if the source boundary data
  changes. The output stays minified (see `.prettierignore`) since
  pretty-printing roughly doubles its size.
- `shared/api/spatialOutlookService.ts` fills each pre-baked cell's
  `value` with a plausible mock pattern (`shared/data/mockSpatialOutlook.ts`)
  — the real gridded dataset will be supplied later and slots into the
  same per-cell shape (`regionName`/`districtName`/`value`), so swapping
  it in doesn't touch the map rendering at all.
- Rendered via `react-native-svg` (`shared/ui/ChoroplethMap.tsx`,
  `shared/utils/geoProjection.ts` for the lat/lng→screen projection,
  `shared/utils/colorScale.ts` for the viridis-style legend) — not a map-
  tile library. This is a static country-scale illustration, not a
  pannable/zoomable slippy map, so a full map library would be
  unjustified weight.

## Mock data

The user-facing rule this app follows: **never present fake real-time
claims — label mock data clearly in development.** Every Home card backed
by mock data renders a small `MockDataTag` (`shared/ui/MockDataTag.tsx`) —
`__DEV__`-gated, zero cost in production builds.

The 10 towns Home supports: Accra, Kumasi, Tamale, Bolgatanga, Damongo,
Cape Coast, Koforidua, Tema, Ho, Yendi (`shared/data/mockWeather.ts`,
coordinates cross-referenced from the web app's `ghanaCities`).

## Testing

```bash
npm test
```

Covers `shared/utils/*`, `shared/theme/tokens.ts`'s `scaleTypeScale`,
`shared/domain/alertSeverity.ts` (severity → label/color/icon mapping,
including an exhaustive-switch guard), `shared/data/districts.ts`'s
town-to-district mapping, `shared/api/forecastService.ts` (including that
`SeasonalOutlook.rainfallProbability`'s three categories sum to 100), and
a Home screen smoke render test.

## Deployment roadmap (not run by this increment)

1. **Expo Go** (this increment) — fastest loop for iterating on screens.
2. **EAS Build** — `eas.json` has `development`, `preview`, and
   `production` Android build profiles ready. Requires an
   [EAS](https://expo.dev/eas) account: `npx eas login`, then
   `npx eas build --platform android --profile preview` for an installable
   internal APK.
3. **Field testing** — install the preview APK on field officers' and a
   small farmer group's devices directly.
4. **Google Play Console** — once stable, `npx eas build --profile
production` produces an app bundle, submitted via `npx eas submit` or
   manually. Needs a Google Play Developer account and EAS signing
   configuration first.

Before an EAS build, replace the placeholder icon/splash assets in
`assets/` with AgroMet Ghana branding — they're currently the Expo default
template's.

## CI

`.github/workflows/mobile-ci.yml` (repo root), path-filtered to
`mobile/**`: installs, then runs `format:check`, `lint`, `tsc --noEmit`,
`test`, and an `expo export --platform ios` smoke bundle. Single Node
version, no device matrix — deliberately minimal for a mock-data
increment.
