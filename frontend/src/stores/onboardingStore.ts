/**
 * First-run onboarding state: the welcome tour on the menu and the in-game
 * coach marks. Both are one-shot — flags persist so returning players are
 * never bothered again (the tour stays reachable via "How to play").
 */
import { create } from 'zustand';

const STORAGE_KEY = 'luduchips.onboarding';

interface Flags {
  welcomeDone: boolean;
  tutorialDone: boolean;
}

function loadFlags(): Flags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Flags>;
      return { welcomeDone: !!parsed.welcomeDone, tutorialDone: !!parsed.tutorialDone };
    }
  } catch {
    // fall through to defaults
  }
  return { welcomeDone: false, tutorialDone: false };
}

function saveFlags(flags: Flags) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  } catch {
    // Private mode etc. — the tour will just show again next visit
  }
}

interface OnboardingStore extends Flags {
  /** Whether the welcome overlay is currently showing (auto-open on first visit). */
  welcomeOpen: boolean;

  openWelcome: () => void;
  completeWelcome: () => void;
  completeTutorial: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => {
  const flags = loadFlags();

  return {
    ...flags,
    welcomeOpen: !flags.welcomeDone,

    openWelcome: () => set({ welcomeOpen: true }),

    completeWelcome: () => {
      set({ welcomeDone: true, welcomeOpen: false });
      saveFlags({ welcomeDone: true, tutorialDone: get().tutorialDone });
    },

    completeTutorial: () => {
      if (get().tutorialDone) return;
      set({ tutorialDone: true });
      saveFlags({ welcomeDone: get().welcomeDone, tutorialDone: true });
    },
  };
});
