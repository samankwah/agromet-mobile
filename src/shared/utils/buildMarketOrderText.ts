import type { CartItem } from '../state/cartStore';
import { formatCedi } from './marketInsights';

/**
 * The order message handed to WhatsApp.
 *
 * There is no payment gateway and no order endpoint behind the market —
 * orders go to a person, which is how these commodities actually trade. The
 * desk number comes from EXPO_PUBLIC_MARKET_WHATSAPP; without it the app says
 * so rather than opening an empty compose window addressed to nobody.
 */

/** Digits only — wa.me rejects spaces, dashes and a leading plus. */
function normalizeNumber(value: string | undefined): string {
  return (value ?? '').replace(/[^\d]/g, '');
}

export function orderDeskNumber(): string {
  return normalizeNumber(process.env.EXPO_PUBLIC_MARKET_WHATSAPP);
}

export function canPlaceOrder(): boolean {
  return orderDeskNumber().length > 0;
}

export function buildMarketOrderText(items: CartItem[], region: string): string {
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return [
    'AgroMet Ghana: Market order',
    '',
    ...items.map((item) => `- ${item.name} x${item.qty} (${item.unit}) = ${formatCedi(item.price * item.qty)}`),
    '',
    `Total: ${formatCedi(total)}`,
    region ? `Region: ${region}` : undefined,
    '',
    'Please confirm availability.',
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}

/** The wa.me link for an order, or null when there is nothing to send. */
export function buildMarketOrderUrl(items: CartItem[], region: string): string | null {
  const number = orderDeskNumber();
  if (!number || items.length === 0) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildMarketOrderText(items, region))}`;
}
