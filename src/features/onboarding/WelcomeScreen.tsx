import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboardingStore } from '../../shared/state/onboardingStore';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { Button } from '../../shared/ui/Button';
import { ON_BACKDROP_COLOR, ON_BACKDROP_MUTED, PhotoBackdrop } from '../../shared/ui/PhotoBackdrop';
import { Text } from '../../shared/ui/Text';

/**
 * The photograph.
 *
 * The same image the web app uses behind its register page, copied from
 * `frontend/src/assets/images/register.jpg` rather than referenced across
 * projects — the mobile bundle has to carry its own assets, and the app is
 * built for districts where a remote image would simply fail to load.
 *
 * **Its licence is unrecorded.** The weather backdrops each carry a credit and a
 * CC BY-SA reference (`assets/weather/CREDITS.md`); this one arrived with the
 * web app and has neither. No credit is shown because inventing one would be
 * worse than none — see the note raised with this change.
 */
const BACKDROP = require('../../../assets/welcome.jpg');

/**
 * The first thing a farmer sees, once.
 *
 * The app had no introduction at all: a new install dropped straight into the
 * Home tab, mid-app, with no statement of what AgroMet is for. This is that
 * statement — a Ghanaian sky, the name, one sentence, one button.
 *
 * **Not a route.** The root layout renders this in place of the whole navigator
 * until the flag is set, rather than pushing `/welcome` on top of the tabs. As a
 * route it had to be left by replacing the top of the stack with a route that
 * already existed below it, which React Navigation resolved to a blank screen
 * with no tab bar — twice, under two different hrefs. Rendering above the
 * navigator instead of inside it removes the navigation entirely: there is no
 * stack to get wrong, nothing behind to bleed through, and "Get started" is a
 * single state change. The cost is that it cannot be deep-linked, which a
 * one-time brand moment does not need.
 *
 * Deliberately a dead end rather than a wizard. It does not ask for districts,
 * crops or permissions. Everything it could collect is available later from a
 * screen with more room to explain it, and a farmer who has not yet seen the app
 * has no basis for answering. Its only job is to say what this is and get out of
 * the way.
 */
export function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const markWelcomeSeen = useOnboardingStore((state) => state.markWelcomeSeen);

  return (
    <PhotoBackdrop source={BACKDROP}>
      {/* Always light, whatever the theme. The root sets the status bar from
          the colour scheme, and this screen is dark in both. */}
      <StatusBar style="light" />

      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          // Generous below the safe area, not merely clear of it: the button is
          // the last thing on the screen and was sitting on the gesture bar.
          paddingBottom: Math.max(insets.bottom, theme.spacing.lg) + theme.spacing['2xl'],
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {/* The title block sits a sixth of the way down rather than against the
            top edge, and is centred — both as the reference places it. A
            proportional spacer rather than a fixed padding, so the ratio holds
            on a short phone as well as a tall one. */}
        <View style={{ flex: 0.16 }} />

        <View style={{ gap: theme.spacing.xs, alignItems: 'center' }}>
          <Text variant="body" color={ON_BACKDROP_MUTED}>
            Welcome to
          </Text>
          {/* One header for a screen reader, not two lines of shouting. */}
          <Text variant="display" color={ON_BACKDROP_COLOR} accessibilityRole="header" style={{ textAlign: 'center' }}>
            AgroMet Ghana
          </Text>
        </View>

        {/* Pushes the promise and the action to the foot, where the scrim is
            densest and a thumb already rests. */}
        <View style={{ flex: 1 }} />

        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color={ON_BACKDROP_MUTED}>
            Farm weather, hazard alerts and weekly advisories for your district, built with the Ghana Meteorological Agency.
          </Text>

          {/* A light hairline and a light label, set in capitals, mirroring the
              reference — not a solid white button, which inverts it.
              `onBackdrop` rather than the themed `primary`: a green button on a
              green paddy field loses its edges, and the backdrop is dark in both
              colour schemes so the contrast is fixed rather than themed.

              No navigation call. Setting the flag is the whole action: the root
              layout renders this screen *instead of* the navigator, so marking
              it seen makes the app appear behind nothing. See RootNavigator. */}
          <Button
            label="GET STARTED"
            variant="onBackdrop"
            onPress={markWelcomeSeen}
            // Spoken normally; only the rendering is capitalised.
            accessibilityLabel="Get started"
          />
        </View>
      </View>
    </PhotoBackdrop>
  );
}
