import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { useReduceMotion } from '../../../shared/a11y/useReduceMotion';
import { getCarouselConditions } from '../../../shared/api/weatherService';
import { HOME_LOCATIONS } from '../../../shared/data/mockWeather';
import { useLocationStore } from '../../../shared/state/locationStore';
import { useSettingsStore } from '../../../shared/state/settingsStore';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { chamferedRectPath } from '../../../shared/ui/cardShape';
import { Text } from '../../../shared/ui/Text';
import { formatTemperature } from '../../../shared/utils/formatTemperature';
import {
  MARQUEE_SPEED_PPS,
  cityCardHeight,
  cityCardWidth,
  citySnapOffsets,
  marqueeCycleWidth,
  marqueeOffsetAt,
} from '../cityCarouselLayout';

/**
 * Which town the rest of Home — and the whole Forecasts tab — is describing.
 *
 * **Even cards, name and temperature only.** The card used to carry the weather
 * condition too, with no width cap, so the string set the width — "Thunderstorms
 * likely" made Tamale's card half again as wide as Accra's "Partly cloudy" and
 * the strip scanned as a ragged pile rather than a row. The condition has not
 * been lost: `CurrentConditionsCard`, immediately below, shows it in full for
 * whichever town is selected. Even widths are also what let every distance here
 * be arithmetic rather than measured — see `cityCarouselLayout.ts`.
 *
 * **It flows.** Left alone, the towns stream past continuously at a slow,
 * constant speed rather than hopping one card at a time. Two consequences shape
 * the implementation:
 *
 *   - The row renders the towns **twice** and translates by exactly one cycle,
 *     so the loop restarts on an identical frame. A single copy would have to
 *     rewind visibly at the end.
 *   - Motion is a `transform` on the native driver, not a scroll position
 *     nudged from JavaScript. A JS-driven scroll at sixty frames a second is
 *     precisely what stutters on the low-end Android this app targets, and a
 *     stuttering carousel is worse than a still one.
 *
 * **It never chooses for you.** `selectedLocationId` is untouched by the flow,
 * so nothing below reloads and the town the farmer picked stays picked.
 * Advancing the selection on a timer would silently re-fetch conditions,
 * forecast and advisory over and over; on a metered rural connection that is a
 * bill, not a flourish.
 *
 * **The first touch hands over to a real scroller.** Flowing content cannot
 * also be swiped or snapped, so touching the strip stops the flow for good and
 * swaps in a snapping `ScrollView` — starting at the offset the flow had
 * reached, so nothing jumps. From then on it behaves as a normal strip: flick
 * and it settles flush, tap a town and it glides to the front. A flow that
 * resumed after the farmer took hold of it would be fighting them.
 *
 * With reduced motion requested, the flow never starts and the scroller is what
 * renders from the outset.
 *
 * Data-saver behaviour: when enabled, only the selected town's query runs
 * eagerly — the rest stay disabled (showing a "…" placeholder) until the farmer
 * taps them, rather than fetching all ten towns' conditions up front.
 */
export function CityCarousel() {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const hasPositioned = useRef(false);
  const reduceMotion = useReduceMotion();

  const [interacted, setInteracted] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const flowStartedAt = useRef(0);
  const handoffOffset = useRef(0);

  const selectedLocationId = useLocationStore((state) => state.selectedLocationId);
  const setSelectedLocationId = useLocationStore((state) => state.setSelectedLocationId);
  const hasHydrated = useLocationStore((state) => state.hasHydrated);
  const dataSaverEnabled = useSettingsStore((state) => state.dataSaverEnabled);

  // One request for the whole strip, not one per town.
  //
  // This was `useQueries` over `HOME_LOCATIONS` — fine at ten towns, indefensible
  // at thirty-two: thirty-two requests, each returning a full bundle of 7 daily
  // and 168 hourly readings, to render one number per card. Open-Meteo takes a
  // comma-separated coordinate list, so `getCarouselConditions` asks once and
  // gets roughly 2 KB back. See its docblock for why it goes direct.
  //
  // `hasHydrated` matches every other Home consumer (useHomeData.ts). Data saver
  // now skips the strip entirely rather than fetching one town of it: the
  // selected town's reading already arrives through `useHomeData`, and the
  // conditions card below shows it in full.
  const strip = useQuery({
    queryKey: ['carouselConditions'],
    queryFn: getCarouselConditions,
    enabled: hasHydrated && !dataSaverEnabled,
  });

  const gap = theme.spacing.sm;
  const cardWidth = cityCardWidth(theme.typeScale.bodyStrong.fontSize);
  const cardHeight = cityCardHeight(
    theme.typeScale.body.lineHeight,
    theme.spacing.sm,
    theme.spacing.xs,
    theme.minTouchTarget + 16,
  );
  /* One path for all sixty-four cards. Every card is the same size, so the
     silhouette is identical — building it once here rather than per card keeps
     the flowing row cheap to mount, and keeps these chips on exactly the same
     chamfered edge as every Card in the app. */
  const cardPath = useMemo(
    () =>
      chamferedRectPath({
        width: cardWidth,
        height: cardHeight,
        chamfer: theme.cardShape.chamfer,
        minorChamfer: theme.cardShape.minorChamfer,
      }),
    [cardWidth, cardHeight, theme.cardShape.chamfer, theme.cardShape.minorChamfer],
  );
  const cycleWidth = marqueeCycleWidth(HOME_LOCATIONS.length, cardWidth, gap);
  const snapOffsets = useMemo(
    () => citySnapOffsets(HOME_LOCATIONS.length, cardWidth, gap),
    [cardWidth, gap],
  );
  const selectedIndex = HOME_LOCATIONS.findIndex((location) => location.id === selectedLocationId);
  const isFlowing = !interacted && !reduceMotion;

  /** Stops the flow and remembers where it had got to, so the scroller can
   *  start from the same place instead of snapping back to the first town. */
  const takeOver = useCallback(() => {
    if (flowStartedAt.current > 0) {
      handoffOffset.current = marqueeOffsetAt(Date.now() - flowStartedAt.current, cycleWidth);
    }
    setInteracted(true);
  }, [cycleWidth]);

  useFocusEffect(
    useCallback(() => {
      if (!isFlowing || cycleWidth <= 0) return;

      translateX.setValue(0);
      flowStartedAt.current = Date.now();

      const loop = Animated.loop(
        Animated.timing(translateX, {
          toValue: -cycleWidth,
          duration: (cycleWidth / MARQUEE_SPEED_PPS) * 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();

      return () => {
        loop.stop();
        // Elapsed time, not an Animated listener: a native-driven value only
        // reaches JS by shipping every frame across the bridge, and the offset
        // is derivable from the clock for nothing.
        if (flowStartedAt.current > 0) {
          handoffOffset.current = marqueeOffsetAt(Date.now() - flowStartedAt.current, cycleWidth);
        }
      };
    }, [isFlowing, cycleWidth, translateX]),
  );

  useEffect(() => {
    // Only meaningful once the scroller exists; while the strip is flowing there
    // is no scroll position to set.
    if (isFlowing || !hasHydrated || selectedIndex < 0) return;

    // The first positioning is a jump, not a glide: the strip should simply
    // already be where it belongs. Every later one is a selection the farmer
    // just made, so it moves visibly and they can follow it.
    const animated = hasPositioned.current && !reduceMotion;
    hasPositioned.current = true;

    scrollRef.current?.scrollTo({ x: snapOffsets[selectedIndex], y: 0, animated });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlowing, hasHydrated, selectedIndex, cardWidth]);

  const renderCard = (location: (typeof HOME_LOCATIONS)[number], copy = 0) => {
    const isSelected = location.id === selectedLocationId;
    const conditions = strip.data?.[location.id];
    const fg = isSelected ? theme.colors.onAccent : theme.colors.text;

    return (
      <Pressable
        key={`${location.id}-${copy}`}
        onPress={() => {
          takeOver();
          setSelectedLocationId(location.id);
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${location.name}${conditions ? `, ${formatTemperature(conditions.temperatureC)}, ${conditions.condition}` : ''}`}
      >
        {({ pressed }) => (
          // Chrome on a View, never on the Pressable — Button.tsx documents why:
          // Android drops a Pressable's own background and border while still
          // drawing its children. This component used to style the Pressable
          // directly and got away with it only because the style was a static
          // object; a pressed state makes it a function, which is the case that
          // breaks.
          <View
            style={{
              width: cardWidth,
              // An exact height, not a minimum: the painted path below is drawn
              // to this size, and a card that grew past it would show its fill
              // stopping short of its own text.
              height: cardHeight,
              paddingHorizontal: theme.spacing.md,
              justifyContent: 'center',
              gap: theme.spacing.xs,
              opacity: pressed ? 0.7 : 1,
            }}
          >
            {/* The chamfered silhouette, as on every card in the app. Painted
                rather than set with borderRadius, because no radius cuts a
                corner straight — see ui/cardShape.ts. */}
            <Svg
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              width={cardWidth}
              height={cardHeight}
            >
              <Path
                d={cardPath}
                fill={isSelected ? theme.colors.accent : theme.colors.surface}
                stroke={isSelected ? theme.colors.accent : theme.colors.border}
                strokeWidth={1}
              />
            </Svg>
            <Text variant="bodyStrong" color={fg} numberOfLines={1}>
              {location.name}
            </Text>
            <Text variant="body" color={fg}>
              {conditions ? formatTemperature(conditions.temperatureC) : '…'}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  // Runs to both screen edges instead of stopping at the page gutter, so cards
  // travel off the edge rather than vanishing at an invisible margin. The
  // matching inner padding keeps the first card on the same gutter as the cards
  // above and below.
  const bleed = -theme.spacing.lg;

  if (isFlowing) {
    return (
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Choose a town"
        style={{ marginHorizontal: bleed, overflow: 'hidden' }}
        onTouchStart={takeOver}
      >
        <Animated.View
          style={{
            flexDirection: 'row',
            gap,
            paddingHorizontal: theme.spacing.lg,
            transform: [{ translateX }],
          }}
        >
          {HOME_LOCATIONS.map((location) => renderCard(location, 0))}
          {/* The second pass exists only so the loop can restart without a
              visible rewind, so it is hidden from assistive tech — a screen
              reader should hear ten towns, not twenty. */}
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ flexDirection: 'row', gap }}
          >
            {HOME_LOCATIONS.map((location) => renderCard(location, 1))}
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel="Choose a town"
      snapToOffsets={snapOffsets}
      decelerationRate="fast"
      contentOffset={{ x: handoffOffset.current, y: 0 }}
      style={{ marginHorizontal: bleed }}
      contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap }}
    >
      {HOME_LOCATIONS.map((location) => renderCard(location, 0))}
    </ScrollView>
  );
}
