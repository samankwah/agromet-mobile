import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Card } from '../../../shared/ui/Card';
import { SampleContentNotice } from '../../../shared/ui/SampleContentNotice';
import { Text } from '../../../shared/ui/Text';

type Props = {
  /** The quiet line above the content — "This week", "Latest news". */
  label: string;
  /** Sits opposite the label: a severity badge, a timestamp. */
  trailing?: React.ReactNode;
  /** Where the card goes, and what the footer promises it will do. */
  href: Href;
  action: string;
  /** The whole card is one button, so it needs one spoken description. */
  accessibilityLabel: string;
  /** Set when the content is a sample rather than something GMet issued. */
  notice?: string;
  children: React.ReactNode;
};

/**
 * The shared chrome behind Home's three teaser cards.
 *
 * They had drifted into three near-copies of the same layout with three
 * different sets of mistakes: the forecast card put its timestamp top-right,
 * the advisory card put a badge there and a dev-only flask at the very bottom,
 * the news card had neither and simply trailed off. None of the three said it
 * was tappable, though all three were.
 *
 * So the frame lives here once — label row, content, footer — and each card
 * supplies only what is actually different about it. The footer is where the
 * two fixes land: the sample notice moves off the bottom edge into a row that
 * balances it against an explicit affordance, so a card that is a link finally
 * looks like one.
 */
export function TeaserCard({ label, trailing, href, action, accessibilityLabel, notice, children }: Props) {
  const theme = useTheme();

  return (
    <Pressable onPress={() => router.push(href)} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {({ pressed }) => (
        <Card style={{ gap: theme.spacing.sm, opacity: pressed ? 0.75 : 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="caption" muted style={{ flexShrink: 1 }} numberOfLines={1}>
              {label}
            </Text>
            {trailing}
          </View>

          {children}

          {/* Hairline above the footer: it separates the promise from the
              content without adding a second card edge. */}
          <View style={{ height: 1, backgroundColor: theme.colors.border, marginTop: theme.spacing.xs }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm }}>
            {notice ? <SampleContentNotice text={notice} /> : <View />}
            {/* Decorative: the Pressable above already carries the spoken
                label, so reading this again would say the card twice. */}
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}
            >
              <Text variant="caption" color={theme.colors.accent}>
                {action}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={theme.colors.accent} />
            </View>
          </View>
        </Card>
      )}
    </Pressable>
  );
}
