import React from 'react';
import { CalendarBlank, Camera, CheckSquare, Egg, Tag } from 'phosphor-react-native';

import { HubGrid, HubTile } from '../../shared/ui/HubGrid';
import { AppHeader } from '../../shared/ui/AppHeader';
import { Screen } from '../../shared/ui/Screen';
import { useReminderAttentionCount } from './reminders/useReminders';

/**
 * Composed screen: Crop Diagnose is a fully working relocated feature —
 * its multi-step flow (crop/stage picker, photo, symptoms, result) gets
 * its own dedicated route (app/diagnose.tsx) rather than being embedded
 * inline here, matching the existing non-tab-route pattern already used
 * for alert details and saved-districts, so it isn't cramped mid-scroll.
 *
 * Every tool is now built, and every one is a HubTile — the same tile the
 * Advisories tab uses, from shared/ui/HubGrid.tsx. Diagnose used to be a
 * bespoke raised card with a filled button and no icon, from when it was the
 * only working tool among placeholders. That emphasis stopped meaning anything
 * once the others shipped and just read as an oversight.
 */
export function FarmToolsScreen() {
  const attention = useReminderAttentionCount();

  return (
    // `wallpaper`: same page ground as Home and the chat — see Screen's prop.
    <Screen wallpaper>
      <AppHeader title="Farm Tools" />
      <HubGrid>
        <HubTile icon={Camera} title="Diagnose a crop" linkLabel="Take a photo" actionLabel="Open diagnose" route="/diagnose" />
        <HubTile
          icon={CalendarBlank}
          title="Crop calendars"
          linkLabel="Browse"
          actionLabel="Browse crop calendars"
          route="/calendars/crop"
        />
        <HubTile
          icon={Egg}
          title="Poultry calendars"
          linkLabel="Browse"
          actionLabel="Browse poultry calendars"
          route="/calendars/poultry"
        />
        <HubTile icon={Tag} title="Market prices" linkLabel="See prices" actionLabel="Browse market prices" route="/market" />
        <HubTile
          icon={CheckSquare}
          title="Farm reminders"
          linkLabel="See reminders"
          actionLabel="Open reminders"
          route="/reminders"
          badge={attention}
        />
      </HubGrid>
    </Screen>
  );
}
