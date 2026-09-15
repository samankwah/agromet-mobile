import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ArchivedAdvisory } from '../../../../shared/domain/weeklyAdvisory';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Dropdown } from '../../../../shared/ui/Dropdown';
import { SegmentedControl } from '../../../../shared/ui/SegmentedControl';
import { Text } from '../../../../shared/ui/Text';
import {
  activeFilterCount,
  archiveFacets,
  type ArchiveFilterState,
  type ArchiveKindFilter,
  UNSET,
} from '../archiveFilters';

const KINDS: ArchiveKindFilter[] = ['all', 'crop', 'poultry'];

/**
 * One facet's picker, or nothing.
 *
 * Two rules live here rather than at each call site, because there are four of
 * them and repeating either is how they drift apart:
 *
 * 1. **A facet with one option is hidden.** Options are derived from what has
 *    actually been published, so with a single region on file a region picker is
 *    furniture — a control whose only effect is to reopen the same choice.
 * 2. **The selected value is always in the list.** Facets narrow as other
 *    facets are set, so a selection can fall out of its own options: choose year
 *    2025, then a region with nothing from 2025, and the year is still filtering
 *    while `Dropdown` finds no match and labels itself "Select". Re-adding it
 *    keeps the control honest about what it is doing, and keeps it visible.
 */
function Facet({
  label,
  anyLabel,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  anyLabel: string;
  options: string[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const complete =
    selectedId === UNSET || options.includes(selectedId) ? options : [...options, selectedId].sort();

  if (complete.length < 2) return null;

  return (
    <Dropdown
      label={label}
      options={[{ id: UNSET, label: anyLabel }, ...complete.map((value) => ({ id: value, label: value }))]}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}

type Props = {
  entries: ArchivedAdvisory[];
  value: ArchiveFilterState;
  onChange: (change: Partial<ArchiveFilterState>) => void;
  onClear: () => void;
};

/**
 * The archive's filters.
 *
 * The place and time pickers are folded away by default, and that is the whole
 * point of the layout. Four stacked dropdowns are roughly 250dp of chrome —
 * a phone's entire first screen — so leaving them open meant opening an archive
 * and seeing controls rather than records. The kind switch stays out because it
 * is one tap, used constantly, and costs a single row.
 *
 * Every option list comes from the records that exist rather than from the
 * national catalogue — see `archiveFacets` for why offering 261 districts when
 * four have been published is a menu of dead ends.
 *
 * A single filter is cleared by re-selecting its "All …" option, this app's
 * established idiom; there is no chip-with-an-× anywhere in it. "Clear filters"
 * exists because six of them is enough to get stuck in.
 */
export function ArchiveFilters({ entries, value, onChange, onClear }: Props) {
  const theme = useTheme();
  const facets = archiveFacets(entries, value);
  const active = activeFilterCount(value);
  const isPoultry = value.kind === 'poultry';

  // Opened on demand, but forced open whenever a picker is actually narrowing
  // something — a hidden active filter is how a reader ends up convinced the
  // archive is missing records.
  const narrowedByPicker =
    value.region !== UNSET || value.district !== UNSET || value.subject !== UNSET || value.year !== UNSET;
  const [open, setOpen] = useState(false);
  const expanded = open || narrowedByPicker;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <SegmentedControl
            segments={['All', 'Crops', 'Poultry']}
            selectedIndex={KINDS.indexOf(value.kind)}
            onChange={(index) => onChange({ kind: KINDS[index] })}
            accessibilityLabel="Advisory type"
            variant="pill"
          />
        </View>

        <Pressable
          onPress={() => setOpen((current) => !current)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? 'Hide place and time filters' : 'Show place and time filters'}
        >
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                minHeight: theme.minTouchTarget,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                // Stays pressed in while the filters are open, so the button
                // shows what it is holding open.
                boxShadow: expanded || pressed ? theme.sunken('sm') : theme.raised('sm'),
              }}
            >
              <Ionicons name="options-outline" size={16} color={theme.colors.muted} />
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.colors.muted}
              />
            </View>
          )}
        </Pressable>
      </View>

      {!expanded ? null : (
        <View style={{ gap: theme.spacing.md }}>
          <Facet
            label="Region"
            anyLabel="All regions"
            options={facets.regions}
            selectedId={value.region}
            onSelect={(region) => onChange({ region })}
          />

          <Facet
            label="District"
            anyLabel="All districts"
            options={facets.districts}
            selectedId={value.district}
            onSelect={(district) => onChange({ district })}
          />

          <Facet
            label={isPoultry ? 'Bird' : 'Crop'}
            anyLabel={isPoultry ? 'All birds' : 'All crops'}
            options={facets.subjects}
            selectedId={value.subject}
            onSelect={(subject) => onChange({ subject })}
          />

          <Facet
            label="Year"
            anyLabel="Any year"
            options={facets.years}
            selectedId={value.year}
            onSelect={(year) => onChange({ year })}
          />
        </View>
      )}

      {active > 0 ? (
        <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel="Clear all filters">
          {({ pressed }) => (
            // Chrome on a nested View — Button.tsx documents why: Android drops
            // a Pressable's own padding while still drawing its children.
            <View
              style={{
                opacity: pressed ? 0.6 : 1,
                minHeight: theme.minTouchTarget,
                justifyContent: 'center',
                alignSelf: 'flex-start',
              }}
            >
              <Text variant="bodyStrong" color={theme.colors.accent}>
                Clear {active === 1 ? 'filter' : 'filters'}
              </Text>
            </View>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
