import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { AdvisoryActivity, WeeklyAdvisory } from '../../../../shared/domain/weeklyAdvisory';
import { tint } from '../../../../shared/theme/blend';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';

/**
 * The panels either side of the forecast table.
 *
 * They follow the web bulletin's visual language: a circular tinted badge for
 * every icon, uppercase letter-spaced labels in the accent colour above their
 * values, and an accent-tinted summary panel. Sourced from the theme rather
 * than the web's fixed emerald, so the same panels hold up in dark mode.
 */

/** The circular tinted icon badge the web bulletin uses throughout. */
function IconBadge({
  icon,
  size = 32,
  over,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  /** The surface the badge is drawn on, when it is not a plain card. */
  over?: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tint(theme.colors.accent, over ?? theme.colors.surface, 0.14),
      }}
    >
      <Ionicons name={icon} size={size * 0.5} color={theme.colors.accent} />
    </View>
  );
}

/**
 * The bulletin's own conclusion, and the loudest panel on the screen.
 *
 * Tinted rather than solid: the web version is a pale emerald wash with a
 * circular badge and an uppercase title, which stays readable at length in a
 * way that white-on-saturated does not for a paragraph this long.
 */
export function AdvisorySummary({ activity }: { activity: AdvisoryActivity }) {
  const theme = useTheme();

  const title = activity.summaryTitle;
  const body = activity.summaryBody;
  if (!title && !body) return null;

  /* Opaque, not an alpha suffix. Android paints the card's elevation shadow
     behind it, and a see-through fill turns that shadow into a grey ring. */
  const fill = tint(theme.colors.accent, theme.colors.surface, 0.09);

  return (
    <Card
      raised
      style={{
        gap: theme.spacing.md,
        backgroundColor: fill,
        borderColor: tint(theme.colors.accent, theme.colors.border, 0.5),
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          paddingBottom: theme.spacing.md,
          borderBottomWidth: 1,
          borderColor: tint(theme.colors.accent, fill, 0.28),
        }}
      >
        <IconBadge icon="megaphone-outline" size={40} over={fill} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" color={theme.colors.accent} style={{ letterSpacing: 0.8 }}>
            FORECAST AND ADVISORY
          </Text>
          {title ? (
            <Text variant="h3" color={theme.colors.accentStrong}>
              {title}
            </Text>
          ) : null}
        </View>
      </View>

      {body ? <Text variant="body">{body}</Text> : null}
    </Card>
  );
}

/**
 * The fallback body, for a bulletin with no per-activity worksheets.
 *
 * Named for poultry because that is where it is met in practice: the older
 * generated template holds a flat table of target values and a list of
 * recommended actions, and nothing else. Rendering an empty forecast table for
 * one of those would suggest the data exists and simply failed to load.
 *
 * It is no longer *the* poultry layout. Bulletins on the current district
 * template — crop and poultry alike — carry per-worksheet forecasts and get the
 * table; see WeeklyAdvisoryScreen, which chooses on content rather than kind.
 */
export function PoultryGuidance({ advisory }: { advisory: WeeklyAdvisory }) {
  const theme = useTheme();
  const metrics = Object.entries(advisory.managementMetrics);

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {metrics.length > 0 ? (
        <Card style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Ionicons name="options-outline" size={16} color={theme.colors.accent} />
            <Text variant="caption" color={theme.colors.accent} style={{ letterSpacing: 0.8 }}>
              TARGETS THIS WEEK
            </Text>
          </View>

          {metrics.map(([label, value]) => (
            <View key={label} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
              <IconBadge icon="ellipse-outline" size={28} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text variant="caption" color={theme.colors.accent} style={{ letterSpacing: 0.5 }}>
                  {label.toUpperCase()}
                </Text>
                <Text variant="bodyStrong">{value}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {advisory.recommendations.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.accent} />
            <Text variant="caption" color={theme.colors.accent} style={{ letterSpacing: 0.8 }}>
              ADVISORY
            </Text>
          </View>

          {advisory.recommendations.map((item, index) => (
            <Card key={item} style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tint(theme.colors.accent, theme.colors.surface, 0.14),
                }}
              >
                <Text variant="caption" color={theme.colors.accent}>
                  {index + 1}
                </Text>
              </View>
              <Text variant="body" style={{ flex: 1 }}>
                {item}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}
    </View>
  );
}
