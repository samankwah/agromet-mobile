import { useLocalSearchParams } from 'expo-router';

import { LegalScreen } from '../../src/features/legal/LegalScreen';
import { isLegalSlug } from '../../src/shared/domain/legal';

export default function LegalRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  // An unknown slug still renders a screen rather than a blank: LegalScreen's
  // query reports the 404 through the shared error state, with a retry.
  return <LegalScreen slug={isLegalSlug(slug ?? '') ? (slug as 'terms' | 'privacy') : 'terms'} />;
}
