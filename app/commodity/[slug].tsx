import { useLocalSearchParams } from 'expo-router';

import { CommodityDetailScreen } from '../../src/features/market/CommodityDetailScreen';

export default function CommodityRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <CommodityDetailScreen slug={slug ?? ''} />;
}
