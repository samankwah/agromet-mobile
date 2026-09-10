import React from 'react';

import { Screen } from '../../shared/ui/Screen';
import { AlertBanner } from '../advisories/weather-alerts/components/AlertBanner';
import { AlertPopup } from '../advisories/weather-alerts/components/AlertPopup';
import { useAlertPopup } from '../advisories/weather-alerts/useAlertPopup';
import { AdvisoryTeaserCard } from './components/AdvisoryTeaserCard';
import { CityCarousel } from './components/CityCarousel';
import { CurrentConditionsCard } from './components/CurrentConditionsCard';
import { FeaturedForecastCard } from './components/FeaturedForecastCard';
import { HomeHeader } from './components/HomeHeader';
import { NewsTeaserCard } from './components/NewsTeaserCard';
import { QuickActionsRow } from './components/QuickActionsRow';
import { useHomeData } from './useHomeData';

/**
 * Pure composition — no data-fetching logic of its own, everything comes
 * from useHomeData(). Home's alert card is AlertBanner from the
 * (relocated) weather-alerts feature, used directly rather than
 * re-implemented here. City selection is CityCarousel (replaces the
 * previous increment's LocationSelector — see that component's header
 * comment).
 */
export function HomeScreen() {
  const { weather, advisory, forecast, news, alerts, hasDistrictScope, locationPrompt, locationPermission } = useHomeData();
  // Reads the alerts Home already has — no extra request, and it inherits the
  // lapse check and severity gate `useAlerts` applied.
  const popup = useAlertPopup(alerts.alerts);

  return (
    // `wallpaper`: Home is a column of opaque cards, so the pattern shows only
    // in the gutters between them and gives the column a ground to sit on
    // rather than a flat void. Same treatment as the AgroMet AI transcript, so
    // moving between the two tabs no longer changes what the page is made of.
    <Screen wallpaper>
      <HomeHeader />

      <AlertBanner
        alerts={alerts.alerts}
        status={alerts.status}
        error={alerts.error}
        onRetry={alerts.refetch}
        hasDistrictScope={hasDistrictScope}
        locationPrompt={locationPrompt}
        locationPermission={locationPermission}
        usingCachedFallback={alerts.usingCachedFallback}
        cachedAt={alerts.cachedAt}
      />

      <CityCarousel />

      <CurrentConditionsCard conditions={weather.data} status={weather.status} error={weather.error} onRetry={weather.refetch} />

      <QuickActionsRow />

      <FeaturedForecastCard forecast={forecast.data} status={forecast.status} error={forecast.error} onRetry={forecast.refetch} />

      <AdvisoryTeaserCard advisory={advisory.data} status={advisory.status} error={advisory.error} onRetry={advisory.refetch} />

      <NewsTeaserCard news={news.data} status={news.status} error={news.error} onRetry={news.refetch} />

      {/* Mounted on Home alone. Advisories renders the same banner, but a modal
          that can appear on two tabs would show twice to anyone who visits
          both — and Home is the screen a farmer opens first. */}
      {popup.alert ? <AlertPopup alert={popup.alert} onDismiss={popup.dismiss} /> : null}
    </Screen>
  );
}
