import { useOnboardingStore } from '../../shared/state/onboardingStore';

/**
 * The flag behind the welcome screen.
 *
 * Worth its own suite because two of its three states are indistinguishable in a
 * screenshot: "not yet seen" and "not yet read back from disk" both have
 * `hasSeenWelcome === false`, and confusing them shows the welcome screen on
 * every cold start. The root layout separates them by holding the splash until
 * `hasHydrated`, which only works if these stay distinct values.
 */
beforeEach(() => {
  useOnboardingStore.setState({ hasSeenWelcome: false, hasHydrated: false });
});

describe('onboardingStore', () => {
  it('starts unseen and unhydrated, so a fresh install shows the welcome', () => {
    expect(useOnboardingStore.getState().hasSeenWelcome).toBe(false);
    expect(useOnboardingStore.getState().hasHydrated).toBe(false);
  });

  it('records the welcome as seen', () => {
    useOnboardingStore.getState().markWelcomeSeen();
    expect(useOnboardingStore.getState().hasSeenWelcome).toBe(true);
  });

  it('puts the welcome back, so it can be demonstrated without wiping app data', () => {
    useOnboardingStore.getState().markWelcomeSeen();
    useOnboardingStore.getState().resetWelcome();
    expect(useOnboardingStore.getState().hasSeenWelcome).toBe(false);
  });

  /* Hydration is a separate axis from having been seen. If `markWelcomeSeen`
     also flipped this — or if `hasHydrated` were persisted — a returning farmer
     would be indistinguishable from one whose flag had not loaded yet. */
  it('keeps hydration independent of the flag', () => {
    useOnboardingStore.getState().markWelcomeSeen();
    expect(useOnboardingStore.getState().hasHydrated).toBe(false);

    useOnboardingStore.getState().setHasHydrated(true);
    useOnboardingStore.getState().resetWelcome();
    expect(useOnboardingStore.getState().hasHydrated).toBe(true);
  });
});
