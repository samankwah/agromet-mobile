import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSeverityMeta } from '../../../../shared/domain/alertSeverity';
import { alertProvenanceLine, type WeatherAlert } from '../../../../shared/domain/weatherAlert';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { BulletList } from '../../../../shared/ui/BulletList';
import { Button } from '../../../../shared/ui/Button';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';

type Props = {
  alert: WeatherAlert;
  onDismiss: () => void;
};

/** How many actions the popup carries before it starts asking to be scrolled.
 * The backend sends up to five; three is what fits beside a decision. */
const ACTIONS_SHOWN = 3;

/**
 * A severe alert, as the interruption a met service means it to be.
 *
 * The banner is passive — it waits on the page to be noticed. This does not: it
 * takes the screen on the launch after a qualifying alert appears, states the
 * hazard, who says so, how long it stands, and the first things to do, then gets
 * out of the way. `alertInterrupt.ts` decides which alerts earn this and how a
 * re-issue earns it again; the popup itself is dumb.
 *
 * Deliberately not dismissible by tapping outside, unlike `CartSheet` and the
 * other bottom sheets. A backdrop tap is how people close a sheet they did not
 * mean to open, and an emergency flood warning is not that — the dismissal
 * should be a decision, which is why it is a labelled button. `onRequestClose`
 * still honours the Android back gesture, because trapping someone in a modal
 * is a different sin.
 */
export function AlertPopup({ alert, onDismiss }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const meta = getSeverityMeta(alert.severity);
  const color = theme.severityColors[meta.colorToken];
  const place = alert.district ? `${alert.district}, ${alert.region}` : alert.region;
  const actions = alert.farmerActions.slice(0, ACTIONS_SHOWN);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: '#00000099',
          justifyContent: 'center',
          padding: theme.spacing.lg,
          paddingTop: Math.max(insets.top, theme.spacing.lg),
          paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
        }}
      >
        {/* `raised` and the severity stripe, so the popup is recognisably the
            same object as the banner it came from rather than a new kind of
            thing. */}
        <Card
          raised
          style={{ borderLeftWidth: 4, borderLeftColor: color, gap: theme.spacing.md, maxHeight: '100%' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Ionicons name={meta.icon} size={22} color={color} />
            {/* The severity word, not a generic "Alert" — colour is never the
                only signal for it. */}
            <Text variant="bodyStrong" color={color} style={{ flex: 1 }}>
              {meta.label.toUpperCase()}
            </Text>
          </View>

          <ScrollView
            // Only bites when the headline and three actions overflow a small
            // screen; otherwise the card sizes to its content.
            contentContainerStyle={{ gap: theme.spacing.sm }}
            showsVerticalScrollIndicator={false}
          >
            <Text variant="h2">{alert.headline}</Text>
            <Text variant="body" muted>
              {place} · {alert.hazardType}
            </Text>
            {/* The CAP triple. On the popup this is doing the most work of any
                line: it is what separates a forecaster's bulletin from a model
                reading at the moment the reader is deciding whether to act. */}
            <Text variant="caption" muted>
              {alertProvenanceLine(alert)}
            </Text>

            {actions.length > 0 ? (
              <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
                <Text variant="bodyStrong">What to do now</Text>
                <BulletList items={actions} accent />
              </View>
            ) : null}
          </ScrollView>

          <View style={{ gap: theme.spacing.sm }}>
            <Button
              label="See the full alert"
              onPress={() => {
                // Dismiss first: leaving the modal mounted over the pushed
                // screen is how a popup becomes a trap.
                onDismiss();
                router.push(`/alert/${alert.id}`);
              }}
            />
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Dismiss this alert"
              style={{ minHeight: theme.minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
            >
              {({ pressed }) => (
                <Text variant="body" muted style={{ opacity: pressed ? 0.6 : 1 }}>
                  Not now
                </Text>
              )}
            </Pressable>
          </View>
        </Card>
      </View>
    </Modal>
  );
}
