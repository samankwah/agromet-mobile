# AgroMet Ghana — Mobile

A native React Native + Expo app delivering agrometeorological alerts,
advisories, forecasts, farm tools, and reference material to Ghanaian
farmers. Part of the AgroMet monorepo, alongside `frontend/` (the web app /
admin surface) and `backend/` (FastAPI). This is a native app, not a
WebView wrapper.

## Navigation

Five bottom tabs, each covering a distinct area of the product:

| Tab            | Status this increment                                                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home**       | Real — alert banner, city carousel, current conditions, quick actions, featured forecast, latest advisory, latest news                                                                                                     |
| **Forecasts**  | Real — Today (hourly strip + stats + a farm-actionable card), 7-Day (expandable list with a min–max range bar), and Outlook (subseasonal + seasonal, marked as probabilistic), plus a lightweight, honest map preview card |
| **Advisories** | Real — weather alerts derived from the hazard index, crop and poultry advisories, flood/drought monitoring, and a searchable advisory archive        |
| **Farm Tools** | Crop Diagnose, crop/poultry calendars, market prices and farm reminders — every tool on this tab is built and routes out from here                                                                                        |
| **Consult**    | Real — a conversational assistant over the backend's `/api/chat`, in a messaging layout: multi-turn context, day-grouped tailed bubbles, starter questions, inline retry, voice input, photo questions, read-aloud. Answers are grounded server-side in the farmer's own forecast, hazard bands and prices. The transcript survives a restart for 24 hours (`storage/chatHistory`) and clears itself after. The tab is named for the action; the assistant itself is still AgroMet AI wherever it speaks |

Settings live at `app/settings.tsx`, reached from the app menu — the button at
the right of every tab's header, which opens `shared/ui/MenuDrawer`. Settings is
deliberately not a sixth tab: the five tabs run with `headerShown: false`, and
app-level utilities (About, Settings, Share, Contact, Terms, Privacy) belong
together behind one menu rather than competing with the five things a farmer
actually opens the app to do.

The fifth tab used to be **Library**, a single card of four FAQ answers. The
assistant replaced it: the backend had been serving `/api/chat` all along with
nothing in this app calling it, and a conversation is a better use of the slot
than a static list. The FAQ *data layer* is deliberately retained, currently
unplaced — see `src/features/library/useFaqs.ts`, which explains which five
files that covers and why none of them is dead code.

Several areas still run on mock data, clearly tagged in development (see
"Mock data" below). See "Mock services" for which are real and which are
not, and how to swap the rest in.

## Farm reminders and notifications

Reminders are **device-local**. There is no reminders table, scheduler or push
infrastructure on the AgroMet backend, and a farmer with no signal is the case
this app is built for — so `shared/state/reminderStore.ts` (zustand + persist,
`agromet:zustand:reminders`) is the source of truth. The OS notification is a
projection of it, not the record.

A reminder can be created three ways: typed in on the reminders screen, from a
crop or poultry calendar activity (which needs a started cycle, because a week
number only becomes a date once one is running), or from a weather alert.

### Notifications need a development build

`expo-notifications` cannot deliver Android local notifications from **Expo Go**
— support was removed in SDK 53. In Expo Go the reminders list works fully and
the screen says plainly that alerts will not fire; it does not pretend the
schedule was accepted. To get real alerts:

```bash
npx eas-cli@latest login
npx eas-cli@latest init      # writes extra.eas.projectId into app.json
npx eas-cli@latest build --profile development --platform android
npx expo start --dev-client
```

`eas.json`'s `development` profile already sets `developmentClient: true`, so no
build configuration changes are needed.

### Physical iPhone testing needs an iOS development build too

Expo Go on iOS is a dead end for this app. Two reasons stack up:

- **SDK mismatch.** Apple only ships the newest Expo Go and an older one cannot
  be sideloaded, so an iPhone whose Expo Go has updated past this project's SDK
  shows "Project is incompatible with this version of Expo Go" and never loads.
- **Native modules.** `react-native-fast-tflite` (crop diagnosis) and
  `expo-notifications` local alerts are not in Expo Go regardless of SDK.

So a physical iPhone needs the same development build the Android side does. The
`development` profile in `eas.json` now carries an `ios` block:

```bash
npx eas-cli@latest login
npx eas-cli@latest device:create        # register the iPhone's UDID
npx eas-cli@latest build --profile development --platform ios
npx expo start --dev-client             # scan the QR with the Camera app, not Expo Go
```

An EAS iOS device build signs against a registered device, which requires an
active **Apple Developer Program** membership (a free Apple ID only allows 7-day
local Xcode builds on a Mac). Without one, test on Android, which runs the full
feature set today.

### Known limitation, stated rather than papered over

On Android 12+ an exact alarm can still be deferred by OEM battery
optimisation, which is common on exactly the low-end devices this app targets.
`SCHEDULE_EXACT_ALARM` and `USE_EXACT_ALARM` are declared and the reminders
channel is created at `HIGH` importance, which is as far as an app can go.
**Reminders are best-effort at the OS level; the in-app list is the reliable
record.** A row whose notification is not registered says "No alert" rather than
looking identical to one that is.

`reconcile()` re-registers notifications on launch, because the OS drops
scheduled ones on reinstall and a reminder created while permission was denied
never had one.

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
  (tabs)/                      Home, Forecasts, Advisories, Farm Tools, Consult tabs
  alert/[id].tsx                Alert details
  saved-districts.tsx           Manage which districts you get alerts for
  diagnose.tsx                  Crop Diagnose (reached from a Farm Tools card, not a tab itself)
  settings.tsx                  App settings (reached from the app menu, not a tab)
  about.tsx                     What the app is, its sources and its version
  contact.tsx                   Write to the AgroMet team (POSTs to /api/contact)
  legal/[slug].tsx              Terms and Privacy, fetched from /api/legal/{slug}
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
    chat/                        AgroMet AI: transcript reducer (useChat), tailed bubbles, contact header,
                                 pill composer + attachment grid, starter prompts
    library/                     Retained FAQ layer (useFaqs, FaqItem, LibrarySkeleton) — no screen
                                 renders it today; retained deliberately, not dead code
    settings/                    App settings: appearance, text size, data saver, reminder alerts
  shared/
    domain/                      TypeScript types for every feature area (see "Domain models" below)
    data/                        Mock data — one file per domain, clearly the swap target for real content
    api/                         Service functions — the sole swap point for real APIs (see below)
    state/                       Zustand stores — client-only preference/selection state (see below)
    storage/                     Generic AsyncStorage cache + the diagnosis offline queue
    net/                         Connectivity hook (NetInfo)
    theme/                       Design tokens (ported from the web app's palette) + ThemeProvider
    ui/                          Shared primitives — Screen, Card, Button, Text, AsyncStateView, EmptyState,
                                  DoodleWallpaper (the page pattern behind Home, Advisories, Farm Tools and
                                  the chat — opt-in via Screen's `wallpaper` prop; Forecasts skips it because
                                  it paints its own photographic ground),
                                  Skeleton, OfflineBanner, SeverityBadge, MockDataTag, StatTile, BulletList,
                                  DetailRow, Divider, FieldLabel, TextField, DateTimeField, OptionSheet,
                                  SegmentedControl, TemperatureRangeBar, ConfidenceBadge, ChoroplethMap,
                                  MapLibreChoropleth, ColorScaleLegend, LineAreaChart, WeatherBackdrop,
                                  Dropdown, Drawer
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
    Only four of these are wired to a consumer — theme, text size, data
    saver and `notificationPrefs.remindersEnabled` — and `app/settings.tsx`
    deliberately exposes only those four. See that screen's header comment
    before adding a control for any of the others.
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
milestone that builds their UI is pure UI work):
`calendarService`, `poultryCalendarService`, `marketService`,
`mapService`, `settingsService` (a no-op sync
placeholder — settings are store-owned), `authService` (guest-only).

`bulletinService` and its mock used to sit in that list. They were deleted
rather than carried: there is no bulletins endpoint, and real bulletins
already reach farmers as the weekly advisory and its archive under
Advisories, so the placeholder only implied a feature that was not coming.

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
`FarmReminder`, `NewsUpdate`, `UserSettings`, `Account`.

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
