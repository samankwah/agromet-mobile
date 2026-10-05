# Releasing AgroMet Ghana to Google Play and the App Store

The runbook for the first public release and every release after it. Steps
marked **[you]** happen in a browser or on a phone. Steps marked **[run]** are
commands from `mobile/` (Claude can run them).

The copy to paste into the stores is in `store/listing.md`.

## Before anything: the accounts (start these today)

Identity checks take days, and nothing else on the store side can start
without them.

1. **[you] Google Play Console**, personal account, US$25 once:
   https://play.google.com/console/signup
   - Use a Google account you will keep. Finish the ID check, the phone check
     and the "you own an Android phone" check in the Play Console app.
   - A personal account shows your legal name and email on the listing.
2. **[you] Apple Developer Program**, individual, US$99 a year:
   https://developer.apple.com/programs/enroll/
   - Turn on two-factor sign-in for the Apple ID first. The seller name on the
     App Store will be your legal name.
3. **Done (2026-10-05):** the website is https://agromet-ghana.vercel.app
   (Vercel project `agromet-ghana`, deployed with `npx vercel --prod` from
   `frontend/`) and the contact email is `0243999631a@gmail.com`. Both are in
   `eas.json`, the backend env (`CONTACT_EMAIL`, `FRONTEND_ORIGINS`), the
   download page and the listings.

## Timeline to expect

| Step                                                   | Time                                        |
| ------------------------------------------------------ | ------------------------------------------- |
| Play account checks                                    | 1 to 7 days                                 |
| Apple enrolment                                        | 1 to 2 days                                 |
| Play closed test (required for a new personal account) | 14 days, at least 12 testers the whole time |
| Play production review after you apply                 | up to about 7 days                          |
| Apple review                                           | usually 1 to 3 days                         |

The Play closed test is the long pole: expect 3 to 4 weeks from the first
Android upload to the public listing. Do the Apple side during the 14 days.

---

## 1. Build and check on real phones first

1. **[run]** Checks:
   ```
   npx tsc --noEmit -p .
   npm run lint
   npx jest
   npx expo-doctor
   npx expo config --type introspect
   ```
   In the introspect output check: no `UIBackgroundModes`, `runtimeVersion` is
   `{ policy: appVersion }`, and the Android permissions do not include
   `ACCESS_FINE_LOCATION`, `SCHEDULE_EXACT_ALARM` or `FOREGROUND_SERVICE*`.
2. **[run]** Set the store version counters once (versions live on EAS now,
   `appVersionSource: remote`):
   ```
   eas build:version:set -p android   # enter 1
   eas build:version:set -p ios       # enter 1
   ```
3. **[run]** A test build that installs straight onto Android phones:
   ```
   eas build -p android --profile preview
   ```
4. **[you]** Install it on 2 or 3 phones, one of them a cheap or old one.
   Go through the checklist at the end of this file.

## 2. Google Play

### 2a. Create the app and upload the first build by hand

1. **[you]** Play Console > Create app. Name `AgroMet Ghana`, default
   language English, App, Free. Accept the declarations.
2. **[run]** The store build (an Android App Bundle, `.aab`):
   ```
   eas build -p android --profile production
   ```
3. **[you]** Download the `.aab` from the EAS build page. Play Console >
   Test and release > Testing > Internal testing > Create new release.
   Accept **Play App Signing** when asked, upload the `.aab`, add yourself as
   a tester, and roll it out. Google does not allow the very first upload of a
   new app through the API, so this one is by hand.
4. **[you]** Make a Google Cloud service account so later uploads can be done
   with one command: follow https://docs.expo.dev/submit/android/ (create the
   service account, give it the Play Console "Release" permissions for this
   app, download the JSON key).
5. **[run]** Store the key on EAS, never in git:
   ```
   eas credentials -p android     # Google Service Account > upload the JSON
   ```
   Then delete the downloaded JSON file from your computer.

### 2b. Fill in App content

**[you]** Play Console > Policy and programs > App content. Use the answers
in `store/listing.md` (privacy policy, app access, ads, content rating,
target audience, news, government app, data safety). Then Grow > Store
presence > Main store listing: name, short and full description, the 512 icon
(`store/store-icon-512.png`), the 1024 x 500 feature graphic and the phone
screenshots.

After this release Play should not ask for any special permission
declarations (exact alarms, foreground service, photos). If it does, the
merged manifest still contains that permission: tell Claude and do not tick a
declaration to get past it.

### 2c. The closed test: 12 testers for 14 days

New personal accounts must run this before they can publish. The rule:
at least **12 testers opted in, without a break, for 14 days**. If someone
leaves and joins again, their 14 days start over, so invite more than 12.

1. **[you]** Make a Google Group, for example `agromet-testers`, at
   https://groups.google.com (anyone can ask to join, or invite only).
2. **[you]** Play Console > Testing > Closed testing > Create track (or use
   "Alpha"). Testers: add the Google Group's email. Set a feedback email.
3. **[run]** Send the build to the closed track (or promote the internal
   release in Play Console):
   ```
   eas submit -p android --profile production
   ```
   then in Play Console move that release to the closed track and send it for
   review (closed releases are reviewed, usually within a day or two).
4. **[you]** Invite **15 to 20** people with Android phones and Google
   accounts: extension officers, farmer group leaders, colleagues. Send them
   this message:

   > Please help test AgroMet Ghana, a free farm weather app.
   >
   > 1. Join this group with your Google account: (group link)
   > 2. Open this link on your phone and tap "Become a tester": https://play.google.com/apps/testing/com.agromet.ghana
   > 3. Install AgroMet Ghana from Google Play.
   > 4. Keep it on your phone for 14 days, open it every few days, and tell us what is not clear or not working.

   While the test runs, set `android.testOptInUrl` in
   `frontend/src/config/mobileApp.js` so the download page shows a "Help us
   test" box.

5. **[you]** Keep a simple log: who joined when, and every piece of feedback.
   Check the tester count on the Play Console dashboard every day or two.
6. **[run]** Ship one or two fixes during the 14 days. JavaScript-only fixes
   can go out without a new build:
   ```
   eas update --channel production --message "Fix: ..."
   ```
   Native changes need `eas build` then `eas submit`. Google asks what you
   changed because of the test, so real fixes help the application.

### 2d. Apply for production

**[you]** After 14 days, Play Console > Dashboard > Apply for production.
Answer with concrete detail:

- How you found testers and how many stayed the full 14 days.
- What they used (forecast, warnings, crop check, AgroMet AI) and what they
  said, in numbers where you can.
- What you changed because of it (name each fix).
- Who the app is for (farmers in Ghana), why it is useful, how many installs
  you expect in the first year.

Review takes up to about 7 days. When approved, create a production release
(promote the tested build), roll out to 20% first, watch for crashes for a
day or two, then 100%.

### 2e. The website download (APK) for phones without Google Play

1. **[you]** Play Console > Test and release > App bundle explorer > pick the
   live version > Downloads > **Signed, universal APK**. This copy is signed
   with Google's app signing key, so people who install it can later update
   from Google Play. An APK built with `eas build` would not be.
2. **[run]**
   ```
   certutil -hashfile agromet-ghana-1.0.0.apk SHA256
   gh release create v1.0.0 agromet-ghana-1.0.0.apk --repo samankwah/agromet-mobile --title "AgroMet Ghana 1.0.0" --notes "First release."
   ```
3. **[run]** Fill `apk.url` (the release asset link), `version`, `sizeMb` and
   `sha256` in `frontend/src/config/mobileApp.js`, set `android.live: true`,
   and redeploy the website.

## 3. Apple App Store

1. **[you]** App Store Connect > Apps > New App: iOS, name `AgroMet Ghana`,
   primary language English, bundle ID `com.agromet.ghana` (register it at
   developer.apple.com > Identifiers if it is not offered), SKU
   `agromet-ghana-ios`. Note the **Apple ID** number on the App Information
   page and your **Team ID** (developer.apple.com > Membership).
2. **[run]** Add them to `eas.json` under `submit.production.ios`
   (`ascAppId`, `appleTeamId`).
3. **[run]** Build and send to TestFlight. The first run asks you to sign in
   with your Apple ID so EAS can make the certificate and profile:
   ```
   eas build -p ios --profile production
   eas submit -p ios --profile production
   ```
4. **[you]** TestFlight: install on an iPhone **and an iPad**. Go through the
   checklist below. On the iPad, check every screen in portrait, landscape and
   a smaller window (Split View or Stage Manager).
5. **[you]** Screenshots from those devices: iPhone 6.9 inch (1320 x 2868) and
   iPad 13 inch (2064 x 2752). If your phone's screenshots are another size,
   send them to Claude to place on a canvas of the exact size.
6. **[you]** App Store Connect: App Information (category Weather, secondary
   Education, age rating questionnaire), App Privacy (answers in
   `store/listing.md`), Pricing (Free) and Availability, the EU trader
   question ("not a trader"), and the 1.0 version page (screenshots, text,
   support and privacy URLs, App Review notes, choose the TestFlight build).
7. **[you]** Submit for review with "Manually release this version". When it
   is approved, press Release.
8. **[run]** Set `ios.appId` and `ios.live: true` in
   `frontend/src/config/mobileApp.js` and redeploy the website. The iPhone
   Smart App Banner on the download page turns on by itself.

## 4. After launch

- Make the QR code for the download page once the website address is final:
  ```
  npx --yes qrcode -t svg -o ../frontend/public/app-qr.svg "https://agromet-ghana.vercel.app/app"
  ```
  and set `shortUrl` in `frontend/src/config/mobileApp.js`. Print that QR on
  posters and flyers. It points at the page, not at a store, so it never
  needs reprinting.
- **JavaScript-only fixes:** `eas update --channel production`. Updates only
  reach builds with the same app `version`, so **bump `version` in app.json
  before any build that changes a native module, permission or plugin**.
  Otherwise a JavaScript update meant for the new build could reach phones
  still on the old one and crash it.
- **Native changes or new permissions:** `eas build -p all --profile
production`, then `eas submit` for each platform. Version numbers go up by
  themselves on EAS.
- **Each Android release:** refresh the universal APK on GitHub Releases and
  the numbers in `mobileApp.js`.
- **Reports of AI answers** arrive in the `ai_reports` table; contact form
  messages in `contact_messages`. Read both every week.

## Free plan limits

The EAS free plan gives 15 Android and 15 iOS builds a month, and
over-the-air updates for up to 1,000 monthly users. Use preview builds and
`eas update` while testing so builds last the month. When the app passes
about 1,000 active users, move to the Starter plan (about US$19 a month) or
updates stop reaching new users.

---

## Phone checklist (Android preview build and TestFlight)

- [ ] First open with no network: the app opens and says it is offline.
- [ ] Location: allow, the nearest town is picked. Deny, the app still works
      and you can pick a town.
- [ ] Forecast and 7 days load for a few towns.
- [ ] Crop check with the camera and from the gallery; cassava (checked on the
      phone) and another crop (checked online). The explanation shows a
      "Report this answer" link that works.
- [ ] AgroMet AI: type a question and ask one by voice. Hold an answer:
      Share, Read aloud and Report this answer all work.
- [ ] A reminder fires on time, and still fires after the phone restarts.
- [ ] The notification icon is a white cloud, not a grey square.
- [ ] The app icon looks right on the home screen, including round and themed
      (Material You) icons on Android.
- [ ] Maps load on a slow connection (flood and drought, rain map).
- [ ] Menu: Terms, Privacy and Contact all open; Contact shows the right
      email or phone.
- [ ] No invented content shown as real: no news card; where no advisory is
      published, the example advisory says it is an example; market prices say
      they are examples.
- [ ] Forecasts > Seasonal shows the SEAS5 outlook (onset, cessation, dry
      spells, season totals) and names ECMWF as the source.
- [ ] About says the app is independent and not an official government app.
- [ ] Share the app from the menu: the message links to `https://agromet-ghana.vercel.app/app`.
