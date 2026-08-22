import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import type { HazardKind, HazardRegion } from '../../../../shared/domain/hazard';
import { getHazardBandMeta, hazardBandColor } from '../../../../shared/domain/hazardBand';
import { tint } from '../../../../shared/theme/blend';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { Text } from '../../../../shared/ui/Text';
import { driverSummary } from '../hazardSelectors';
import { HazardBandBadge } from './HazardBandBadge';

type Props = {
  entries: { region: HazardRegion; districts: string[] }[];
  hazard: HazardKind;
  onOpen: (region: string) => void;
};

/**
 * The reader's own regions, first on the screen.
 *
 * A farmer opens this to answer one question — "does this affect me?" — and the
 * national table answers it last, after sixteen rows of other people's weather.
 * This puts their own districts at the top, which is the one thing a phone can
 * do that the desktop page does not.
 *
 * When nothing is saved it becomes the prompt to save something, rather than
 * disappearing: an absent section teaches nobody that the feature exists.
 */
export function YourAreaCard({ entries, hazard, onOpen }: Props) {
  const theme = useTheme();

  if (entries.length === 0) {
    return (
      <Pressable
        onPress={() => router.push('/saved-districts')}
        accessibilityRole="button"
        accessibilityLabel="Save your districts to see your own area first. Opens the saved districts list."
      >
        <Card
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            minHeight: theme.minTouchTarget,
          }}
        >
          <Ionicons name="location-outline" size={20} color={theme.colors.accent} />
          <Text variant="body" style={{ flex: 1 }}>
            Save your districts to see your own area first
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </Card>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {entries.map(({ region, districts }) => {
        const block = region[hazard];
        const meta = getHazardBandMeta(block.band);
        const color = hazardBandColor(block.band, theme);
        const reason = driverSummary(block);

        return (
          <Pressable
            key={region.region}
            onPress={() => onOpen(region.region)}
            accessibilityRole="button"
            accessibilityLabel={
              `Your area: ${region.region}, ${meta.label} ${hazard} risk.` +
              (reason ? ` ${reason}.` : '') +
              ' Open region details.'
            }
          >
            <Card
              style={{
                gap: theme.spacing.sm,
                // tint(), not an alpha suffix: a translucent background lets the
                // Android elevation shadow through and leaves a grey ring.
                backgroundColor: tint(color, theme.colors.surface, 0.07),
                borderColor: tint(color, theme.colors.border, 0.35),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Text variant="h3" style={{ flex: 1 }} numberOfLines={1}>
                  {region.region}
                </Text>
                <HazardBandBadge band={block.band} size="sm" />
              </View>

              <Text variant="caption" muted numberOfLines={2}>
                {districts.join(', ')}
              </Text>

              {/* The action, not the measurement — this card exists to answer
                  "what do I do", and the first advisory is that answer. */}
              {block.advisories.length > 0 ? (
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                  <Ionicons name="arrow-forward" size={14} color={color} style={{ marginTop: 3 }} />
                  <Text variant="body" style={{ flex: 1 }} numberOfLines={2}>
                    {block.advisories[0]}
                  </Text>
                </View>
              ) : (
                <Text variant="body" muted>
                  Nothing to act on beyond normal seasonal practice.
                </Text>
              )}
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}
