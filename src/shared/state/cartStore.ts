import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * The market cart.
 *
 * Persisted for the same reason as the web cart: a card opens a commodity
 * screen, so a cart that only lived on the list screen would empty itself the
 * moment a farmer looked at what they were buying. On a phone the stakes are
 * higher still — the app can be backgrounded mid-order and killed by the OS —
 * so this survives a restart, not just a navigation.
 *
 * Same persist + AsyncStorage pattern as settingsStore.ts.
 */

export type CartItem = {
  /** The catalogue slug, so three pepper varieties are three lines. */
  slug: string;
  name: string;
  price: number;
  unit: string;
  qty: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  updateQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) => {
        const existing = get().items.find((candidate) => candidate.slug === item.slug);
        set({
          items: existing
            ? get().items.map((candidate) =>
                candidate.slug === item.slug ? { ...candidate, qty: candidate.qty + qty } : candidate,
              )
            : [...get().items, { ...item, qty }],
        });
      },
      updateQty: (slug, qty) => {
        if (qty < 1) return;
        set({ items: get().items.map((item) => (item.slug === slug ? { ...item, qty } : item)) });
      },
      remove: (slug) => set({ items: get().items.filter((item) => item.slug !== slug) }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'agromet:zustand:cart',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Total number of units in the cart, for the badge. */
export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

/** Cart value. */
export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}
