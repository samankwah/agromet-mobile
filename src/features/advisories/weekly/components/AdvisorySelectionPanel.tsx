import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { AGRO_ZONES, regionIsInZone, regionsInZone, zoneForRegion } from '../../../../shared/data/agroZones';
import { districtsInRegion } from '../../../../shared/data/ghanaRegions';
import type {
  AdvisoryActivity,
  AdvisoryFilterState,
  AdvisoryKind,
} from '../../../../shared/domain/weeklyAdvisory';
import { tint } from '../../../../shared/theme/blend';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card } from '../../../../shared/ui/Card';
import { OptionSheet } from '../../../../shared/ui/OptionSheet';
import { Text } from '../../../../shared/ui/Text';
import { POULTRY_TYPES } from '../../../farm-tools/calendars/components/CalendarFilters';
import { activityForDate, initialPickerDate, monthOptions, weekOptions } from '../activitySelection';

const UNSET = '';

/**
 * The crops advisories are published for.
 *
 * A fixed list rather than one derived from what happens to be published,
 * following the calendar filters' rule: a farmer growing something the office
 * has not written about yet must still be able to pick it and be told plainly
 * that nothing is there.
 */
const CROPS = ['Maize', 'Rice', 'Cassava', 'Yam', 'Tomato', 'Pepper', 'Onion', 'Soybean', 'Groundnut', 'Cocoa'];

/** Which cell has a sheet open. Only one can be open at a time. */
type OpenField = 'zone' | 'region' | 'district' | 'subject' | 'week' | 'month' | null;
type OpenPicker = 'start' | 'end' | null;

type Props = {
  kind: AdvisoryKind;
  filter: AdvisoryFilterState;
  onFilterChange: (next: AdvisoryFilterState) => void;
  activities: AdvisoryActivity[];
  activityIndex: number;
  onActivityChange: (index: number) => void;
};

/**
 * The header block, and every control on the screen.
 *
 * This began as a read-only summary of the bulletin sitting under a separate
 * row of filter dropdowns, which meant the region was printed twice: once as
 * something you set, once as something you read. Now there is one surface —
 * every field is the control for itself. Tap the district to change district,
 * tap the week to jump to another week.
 *
 * The fields divide into two kinds, and it matters which is which:
 *
 *   - Zone, region, district and commodity are the *search*. Changing one
 *     fetches a different bulletin, so they show what the farmer chose rather
 *     than what the bulletin says. When a sample stands in for a district with
 *     nothing published, the notice above says so — the panel does not quietly
 *     relabel itself to another district.
 *   - Week, month, starts and ends are the *activity* within the bulletin
 *     already loaded. They pick by time what the chip row picks by name, and
 *     they change nothing on the server.
 *
 * A field with nothing to offer is not a button. Before a bulletin loads there
 * are no weeks to choose between, and a tappable cell that opens an empty sheet
 * is worse than plain text.
 */
export function AdvisorySelectionPanel({
  kind,
  filter,
  onFilterChange,
  activities,
  activityIndex,
  onActivityChange,
}: Props) {
  const theme = useTheme();
  const [openField, setOpenField] = useState<OpenField>(null);
  const [openPicker, setOpenPicker] = useState<OpenPicker>(null);

  const isCrop = kind === 'crop';
  const subjectLabel = isCrop ? 'Commodity' : 'Bird';
  const subjects = isCrop ? CROPS : POULTRY_TYPES;

  const activity = activities[activityIndex] ?? null;
  const weeks = weekOptions(activities);
  const months = monthOptions(activities);

  const regions = regionsInZone(filter.zone);
  const districts = filter.region === UNSET ? [] : districtsInRegion(filter.region);

  const zoneDisplay = filter.zone || zoneForRegion(filter.region);

  /* Picking a date is picking an activity, so an out-of-range date still lands
     somewhere useful rather than doing nothing. */
  const selectDate = (picked: Date | undefined) => {
    setOpenPicker(null);
    if (!picked) return;

    const index = activityForDate(activities, picked);
    if (index !== -1) onActivityChange(index);
  };

  return (
    <Card style={{ gap: theme.spacing.md }}>
      <View style={{ gap: 2, paddingBottom: theme.spacing.md, borderBottomWidth: 1, borderColor: theme.colors.border }}>
        <Text variant="caption" color={theme.colors.accent} style={{ letterSpacing: 0.8 }}>
          ACTIVITY
        </Text>
        <Text variant="h2">{activity?.activity ?? 'No activity published'}</Text>
      </View>

      {/* Two columns of badge-plus-label rather than eight stacked rows, which
          would run this panel down half the screen for mostly short values. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.spacing.md }}>
        <Field
          icon="map-outline"
          label="Zone"
          value={zoneDisplay}
          placeholder="All zones"
          onPress={() => setOpenField('zone')}
        />
        <Field
          icon="location-outline"
          label="Region"
          value={filter.region}
          placeholder="All regions"
          onPress={() => setOpenField('region')}
        />
        <Field
          icon="business-outline"
          label="District"
          value={filter.district}
          /* Districts cannot be listed nationally — there are 261, and they
             mean nothing without their region. So this reads as the whole
             country until a region narrows it. */
          placeholder={filter.region === UNSET ? 'All districts' : 'Select district'}
          onPress={filter.region === UNSET ? undefined : () => setOpenField('district')}
        />
        <Field
          icon="leaf-outline"
          label={subjectLabel}
          value={filter.subject}
          placeholder={isCrop ? 'All commodities' : 'All birds'}
          onPress={() => setOpenField('subject')}
        />
        <Field
          icon="calendar-number-outline"
          label="Weeks"
          value={activity?.metadata.week ?? ''}
          onPress={weeks.length > 1 ? () => setOpenField('week') : undefined}
        />
        <Field
          icon="calendar-outline"
          label="Month"
          value={activity?.metadata.monthYear ?? ''}
          onPress={months.length > 1 ? () => setOpenField('month') : undefined}
        />
        <Field
          icon="play-outline"
          label="Starts"
          value={activity?.metadata.startDate ?? ''}
          onPress={activities.length > 1 ? () => setOpenPicker('start') : undefined}
        />
        <Field
          icon="flag-outline"
          label="Ends"
          value={activity?.metadata.endDate ?? ''}
          onPress={activities.length > 1 ? () => setOpenPicker('end') : undefined}
        />
      </View>

      <OptionSheet
        visible={openField === 'zone'}
        title="Agro-ecological zone"
        options={[{ id: UNSET, label: 'All zones' }, ...AGRO_ZONES.map((zone) => ({ id: zone, label: zone }))]}
        selectedId={filter.zone}
        onClose={() => setOpenField(null)}
        /* A zone the current region does not reach would leave the panel
           showing a region the region list no longer offers. */
        onSelect={(zone) =>
          onFilterChange(
            regionIsInZone(filter.region, zone)
              ? { ...filter, zone }
              : { ...filter, zone, region: UNSET, district: UNSET },
          )
        }
      />

      <OptionSheet
        visible={openField === 'region'}
        title="Region"
        options={[
          { id: UNSET, label: 'All regions' },
          ...regions.map((region) => ({ id: region, label: region })),
        ]}
        selectedId={filter.region}
        onClose={() => setOpenField(null)}
        // A district cannot survive a region change — it belongs to one region.
        onSelect={(region) => onFilterChange({ ...filter, region, district: UNSET })}
      />

      <OptionSheet
        visible={openField === 'district'}
        title="District"
        options={[
          { id: UNSET, label: 'All districts in this region' },
          ...districts.map((district) => ({ id: district, label: district })),
        ]}
        selectedId={filter.district}
        onClose={() => setOpenField(null)}
        onSelect={(district) => onFilterChange({ ...filter, district })}
      />

      <OptionSheet
        visible={openField === 'subject'}
        title={subjectLabel}
        options={[
          { id: UNSET, label: isCrop ? 'All commodities' : 'All birds' },
          ...subjects.map((subject) => ({ id: subject, label: subject })),
        ]}
        selectedId={filter.subject}
        onClose={() => setOpenField(null)}
        onSelect={(subject) => onFilterChange({ ...filter, subject })}
      />

      <OptionSheet
        visible={openField === 'week'}
        title="Week"
        options={weeks}
        selectedId={String(activityIndex)}
        onClose={() => setOpenField(null)}
        onSelect={(index) => onActivityChange(Number(index))}
      />

      <OptionSheet
        visible={openField === 'month'}
        title="Month"
        options={months}
        selectedId={String(activityIndex)}
        onClose={() => setOpenField(null)}
        onSelect={(index) => onActivityChange(Number(index))}
      />

      {/* Mounted only while open: on Android this is a modal dialog, and one
          left mounted reopens itself on every render. */}
      {openPicker ? (
        <DateTimePicker
          mode="date"
          value={initialPickerDate(activity, openPicker)}
          onChange={(event, picked) => selectDate(event.type === 'set' ? picked : undefined)}
        />
      ) : null}
    </Card>
  );
}

/**
 * One cell of the grid: a badge, its label, and its value.
 *
 * With `onPress` it is a button that opens a picker and shows a chevron; the
 * chevron is the only thing telling a farmer the cell can be tapped, so a cell
 * with nothing to offer must not have one.
 */
function Field({
  icon,
  label,
  value,
  placeholder,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  placeholder?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();

  const isBlank = value.trim() === '' || value.trim() === '-';
  const display = isBlank ? placeholder ?? '—' : value;

  const body = (pressed: boolean) => (
    // Chrome on a View, never on the Pressable — Button.tsx documents why:
    // Android drops a Pressable's own background and border while still
    // drawing its children.
    <View
      style={{
        flexDirection: 'row',
        gap: theme.spacing.sm,
        alignItems: 'center',
        minHeight: theme.minTouchTarget,
        opacity: pressed ? 0.6 : 1,
      }}
    >
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
        <Ionicons name={icon} size={14} color={theme.colors.accent} />
      </View>

      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="caption" color={theme.colors.accent} style={{ letterSpacing: 0.5 }}>
          {label.toUpperCase()}
        </Text>
        <Text variant="bodyStrong" muted={isBlank} numberOfLines={2}>
          {display}
        </Text>
      </View>

      {onPress ? <Ionicons name="chevron-down" size={14} color={theme.colors.teal} /> : null}
    </View>
  );

  const cell = { width: '50%' as const, paddingRight: theme.spacing.sm };

  if (!onPress) {
    return <View style={cell}>{body(false)}</View>;
  }

  return (
    <View style={cell}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${display}. Change it.`}>
        {({ pressed }) => body(pressed)}
      </Pressable>
    </View>
  );
}
