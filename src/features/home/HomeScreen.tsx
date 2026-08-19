import React from 'react';

import { Screen } from '../../shared/ui/Screen';
import { AlertBanner } from '../advisories/weather-alerts/components/AlertBanner';
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
  const { weather, advisory, forecast, news, alerts, hasSavedDistricts } = useHomeData();

  return (
    <Screen>
      <HomeHeader />

      <AlertBanner
        alerts={alerts.alerts}
        status={alerts.status}
        error={alerts.error}
        onRetry={alerts.refetch}
        hasSavedDistricts={hasSavedDistricts}
        usingCachedFallback={alerts.usingCachedFallback}
        cachedAt={alerts.cachedAt}
      />

      <CityCarousel />

      <CurrentConditionsCard conditions={weather.data} status={weather.status} error={weather.error} onRetry={weather.refetch} />

      <QuickActionsRow />

      <FeaturedForecastCard forecast={forecast.data} status={forecast.status} error={forecast.error} onRetry={forecast.refetch} />

      <AdvisoryTeaserCard advisory={advisory.data} status={advisory.status} error={advisory.error} onRetry={advisory.refetch} />

      <NewsTeaserCard news={news.data} status={news.status} error={news.error} onRetry={news.refetch} />
    </Screen>
  );
}
