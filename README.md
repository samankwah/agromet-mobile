# AgroMet Ghana: Mobile App

The Android and iOS app for AgroMet Ghana. It gives farmers forecasts, flood and
drought warnings, seasonal outlooks, advisories, crop diagnosis, market prices
and an AI assistant.

**Download (Android):** [agromet-ghana-1.0.0.apk](https://github.com/samankwah/agromet-mobile/releases/download/v1.0.0/agromet-ghana-1.0.0.apk)

The backend, website and model training code are in
[samankwah/agromet](https://github.com/samankwah/agromet).

Built with React Native, Expo SDK 57 and TypeScript.

## Features

| Tab | What it does |
|---|---|
| Home | Weather for the farmer's town or GPS location, severe weather banner, latest advisory |
| Forecasts | Hourly, 7 days, live rain map, weeks 2 to 4 outlook and seasonal outlook on maps of Ghana |
| Advisories | Weather alerts for the farmer's district, crop and poultry advisories, flood and drought risk |
| Farm Tools | Crop diagnosis, crop and poultry calendars, market prices, reminders |
| Consult | AgroMet AI chat, with voice and photo questions and read-aloud answers |

- **Diagnosis without internet:** a cassava model runs on the phone
  (`assets/models/cassava.tflite`, 71.5% accuracy). Other crops are sent to the
  backend.
- **District from GPS:** the app finds which of Ghana's 260 districts the farmer
  is in and shows alerts for it.
- **Works offline:** screens show the last saved data when there is no signal.
- **Example content:** market prices are example figures, and a labelled sample
  advisory shows when none is published. The app has no sign-in.

## Run it

```bash
npm install
cp .env.example .env
npx expo start
```

Scan the QR code with Expo Go. The phone and computer must be on the same Wi-Fi.

Two features need a development build instead of Expo Go: on-device diagnosis
and reminder notifications.

```bash
npx eas-cli@latest build --profile development --platform android
npx expo start --dev-client
```

## Environment variables

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend address (production: `https://agromet-backend.vercel.app`). Unset uses port 8000 on your computer |
| `EXPO_PUBLIC_SITE_URL` | Website for Terms and Privacy |
| `EXPO_PUBLIC_MARKET_WHATSAPP` | WhatsApp number for market orders |
| `EXPO_PUBLIC_CONTACT_EMAIL`, `EXPO_PUBLIC_CONTACT_PHONE` | Contact details in the menu |
| `EXPO_PUBLIC_SENTRY_DSN` | Crash reporting (optional) |

Release builds already set these in `eas.json`. After changing `.env`, restart
with `npx expo start -c`.

## Scripts

```bash
npm test              # 1,185 tests
npm run lint
npx tsc --noEmit      # type check
```

## Build

```bash
npx eas-cli@latest build -p android --profile apk          # APK to share
npx eas-cli@latest build -p android --profile production   # Google Play
```

Store release steps are in [`store/RELEASE.md`](store/RELEASE.md).

## Folders

```
app/                 Screens (Expo Router)
src/features/        Code for each area: home, forecasts, advisories, chat, ...
src/shared/api/      All calls to the backend
src/shared/data/     Ghana boundaries, regions, districts
src/tests/           Tests
assets/models/       The on-device diagnosis model
scripts/             Builds the map boundaries from GADM data
store/               Store listing and release steps
```
