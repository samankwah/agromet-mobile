# AgroMet Ghana: store listing copy

Paste-ready text for Google Play Console and App Store Connect. Every feature
named here exists in the 1.0 build. If a feature is hidden or removed, take it
out of the description too, because both stores reject listings that promise
more than the app does.

House rules for this copy: plain short words for farmers, no em dashes, and
never present the app as official. It is an independent app.

---

## Shared facts

| Field                    | Value                                      |
| ------------------------ | ------------------------------------------ |
| App name                 | AgroMet Ghana                              |
| Package / bundle ID      | `com.agromet.ghana`                        |
| Category                 | Weather (Apple primary), Weather (Play)    |
| Apple secondary category | Education                                  |
| Price                    | Free. No ads. No in-app purchases.         |
| Privacy policy URL       | `https://agromet-ghana.vercel.app/privacy` |
| Terms URL                | `https://agromet-ghana.vercel.app/terms`   |
| Support URL              | `https://agromet-ghana.vercel.app/contact` |
| Marketing URL            | `https://agromet-ghana.vercel.app/app`     |
| Contact email            | `0243999631a@gmail.com`                    |
| Contact phone            | +233 24 399 9631                           |
| Countries                | Ghana first. Adding others is fine.        |
| Languages                | English                                    |

---

## Google Play

**App name (max 30):** `AgroMet Ghana: Farm Weather` (27)

**Short description (max 80):**
`Weather, farm advice and crop checks for farmers in Ghana, in simple words.` (75)

**Full description (max 4000):**

```
AgroMet Ghana helps farmers plan their work with the weather.

What you can do:
• See today's weather and the next 7 days for your town.
• Get warnings when heavy rain, strong wind or great heat is coming.
• See the rain outlook for the coming weeks.
• See the season ahead: when the rains may start and stop, dry spells, and how much rain the season may bring.
• Check flood and dry spell risk for your area.
• Read weekly farm advice for your district. Until advice is published for your area, the app shows an example, marked as an example.
• Use crop and poultry calendars to know when to plant, weed, harvest and care for birds.
• Set reminders for farm jobs.
• Take a photo of a sick leaf to find out what may be wrong and what to do.
• Ask AgroMet AI a farm question by typing or speaking.
• See example market prices and send an order on WhatsApp.

Made for low data and simple phones. The app keeps your last forecast so you can read it without network.

A word of care: forecasts are a best guess, not a promise, and AI answers can be wrong. For big decisions, also ask your local extension officer.

AgroMet Ghana is an independent app. It is not an official government app. Weather data comes from public weather services such as Open-Meteo, NOAA and ECMWF (seasonal outlook).
```

**Release notes (1.0.0):** `First release.`

**Graphics needed:**

- App icon 512 x 512 PNG: `store/store-icon-512.png` (already made).
- Feature graphic 1024 x 500 PNG or JPG: green `#145e49` background, the white
  icon on the left, "AgroMet Ghana" and "Farm weather and advice" on the right.
  No device frames, no badges, no prices.
- Phone screenshots, 2 to 8, at least 1080 px on the short side. Suggested 6:
  Home, 7 day forecast, a weather warning, flood and drought map, crop
  diagnosis result, AgroMet AI chat.

---

## Apple App Store

**Name (max 30):** `AgroMet Ghana` (13)

**Subtitle (max 30):** `Farm weather and crop advice` (28)

**Keywords (max 100, commas, no spaces):**
`farm,weather,rain,forecast,crop,maize,cassava,advisory,agriculture,planting,calendar,market,pest` (96)

**Promotional text (max 170):**
`Check the rain before you plant. Get farm advice for your district, set farm reminders, and take a photo of a sick crop to find out what is wrong.` (147)

**Description:** same as the Play full description above (Apple shows the
bullets as written).

**What's New (1.0):** `First release.`

**Copyright:** `2026 AgroMet Ghana`

**Screenshots needed** (PNG or JPG, no transparency, 3 to 10 each):

- iPhone 6.9 inch: 1320 x 2868 (or 1290 x 2796 / 1260 x 2736).
- iPad 13 inch: 2064 x 2752 (or 2048 x 2732). Required because the app
  supports iPad.
  Take them from TestFlight on real devices. Do not reuse Android screenshots.

**App Review notes:**

```
No login is needed. Every feature is open from the first screen.

To try crop diagnosis: Farm Tools > Diagnose a crop > take or choose a photo of a cassava or maize leaf. A result shows in a few seconds, with an AI explanation and a "Report this answer" link.

To try AgroMet AI: open the Consult tab and ask "When should I plant maize in Ashanti?". Hold any answer to see Share, Read aloud and Report this answer.

Market prices are shown as examples and labelled that way in the app. Until a weekly advisory is published for an area, the Advisories screen shows an example advisory, also labelled as an example.

The seasonal outlook (Forecasts > Seasonal) is worked out from ECMWF SEAS5 forecasts, through Open-Meteo. It is not an official Ghana Meteorological Agency outlook.

AgroMet Ghana is an independent app and does not claim to be a government service. Weather data comes from Open-Meteo, NOAA and ECMWF.

Contact: 0243999631a@gmail.com, +233 24 399 9631
```

---

## Google Play: App content answers

| Section               | Answer                                                                                                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy policy        | `https://agromet-ghana.vercel.app/privacy`                                                                                                                                                                             |
| App access            | All functionality is available without special access.                                                                                                                                                                 |
| Ads                   | No, the app does not contain ads.                                                                                                                                                                                      |
| Content rating (IARC) | Category: Reference, News or Educational. No violence, sex, drugs, gambling or bad language. Users cannot talk to each other. The app does not share the user's location with other users. Expect "Everyone" / PEGI 3. |
| Target audience       | 18 and over (also fine: 13 and over). Not for children. Do not tick under 13, so the Families policy does not apply.                                                                                                   |
| News app              | No.                                                                                                                                                                                                                    |
| Government app        | No. The app is independent and does not act for a government.                                                                                                                                                          |
| Financial features    | None.                                                                                                                                                                                                                  |
| Health                | None.                                                                                                                                                                                                                  |
| Data safety           | See the table below.                                                                                                                                                                                                   |

### Data safety

Data is encrypted in transit: **Yes**. Users can ask for their data to be
deleted: **Yes**, by email to `0243999631a@gmail.com`. No data is sold, and none is
used for ads or shared with third parties for their own use (service providers
that process data for us do not count as sharing).

| Data type                    | Collected | Shared | Optional | Purpose                             | Notes                                                                                                                                          |
| ---------------------------- | --------- | ------ | -------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                         | Yes       | No     | Yes      | Developer communications            | Contact form only                                                                                                                              |
| Email address                | Yes       | No     | Yes      | Developer communications            | Contact form only                                                                                                                              |
| Phone number                 | Yes       | No     | Yes      | Developer communications            | Contact form only                                                                                                                              |
| Photos                       | Yes       | No     | Yes      | App functionality                   | Crop photos for diagnosis, sent to Kindwise and not kept. Cassava photos are checked on the phone and never leave it.                          |
| Voice or sound recordings    | Yes       | No     | Yes      | App functionality                   | Turned into text, processed ephemerally, not kept                                                                                              |
| Other user-generated content | Yes       | No     | Yes      | App functionality                   | Questions to AgroMet AI (sent to OpenAI, not stored), and AI answers the user reports (stored)                                                 |
| Device or other IDs          | Yes       | No     | No       | App functionality, fraud prevention | A random app ID made on the phone, used for daily AI limits and to read reports from one phone together. Diagnosis history stays on the phone. |
| Approximate location         | No        |        |          |                                     | Used only on the phone to pick the nearest town. GPS is never sent: weather requests use the chosen town's fixed coordinates.                  |
| Crash logs / diagnostics     | No        |        |          |                                     | Crash reporting is off in 1.0. If Sentry is turned on later, change this to Yes.                                                               |

Check the location row against the release build before submitting: if any
request starts sending the phone's own coordinates, location becomes
"collected". The privacy policy served at `/api/legal/privacy` is the source
these answers must agree with.

---

## Apple: App Privacy answers

Data used to track you: **None**.

| Data type                                                | Linked to the user | Purpose                             |
| -------------------------------------------------------- | ------------------ | ----------------------------------- |
| Contact Info: Name, Email, Phone                         | Yes                | App Functionality (support replies) |
| User Content: Photos                                     | No                 | App Functionality                   |
| User Content: Audio Data                                 | No                 | App Functionality                   |
| User Content: Other User Content (AI questions, reports) | No                 | App Functionality                   |
| Identifiers: Device ID (random app ID)                   | No                 | App Functionality                   |

Not collected: location (stays on the phone), diagnostics (crash reporting off
in 1.0), purchases, financial info, health, browsing history, contacts.

**Age rating questionnaire:** answer None or No to every content question.
Unrestricted web access: No. User-generated content shared with others: No.
AI chat gives farm information. Expect 4+.

**EU Digital Services Act trader status:** "Not a trader" (the app earns no
money), or leave EU countries out of availability.

**Export compliance:** already answered in the build
(`ITSAppUsesNonExemptEncryption` is false; the app only uses HTTPS).
