import { create } from 'zustand';

export type Screen = 'menu' | 'single' | 'local' | 'online' | 'lobby' | 'game';

export interface Identity {
  name: string;
  avatarId: string;
}

const IDENTITY_KEY = 'stellardice.identity';

function loadIdentity(): Identity {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Identity>;
      if (typeof parsed.name === 'string' && typeof parsed.avatarId === 'string') {
        return { name: parsed.name.slice(0, 20), avatarId: parsed.avatarId };
      }
    }
  } catch {
    // fall through to default
  }
  return { name: '', avatarId: 'pawn' };
}

/** Invite links look like https://host/#/join/ABC123 */
function parseJoinHash(): string | null {
  const match = /^#\/join\/([A-Za-z0-9]{4,10})$/.exec(location.hash);
  return match ? match[1].toUpperCase() : null;
}

interface AppStore {
  screen: Screen;
  identity: Identity;
  /** Room code carried in from an invite link, waiting to be used. */
  pendingJoinCode: string | null;

  navigate: (screen: Screen) => void;
  setIdentity: (identity: Identity) => void;
  consumePendingJoinCode: () => string | null;
}

export const useAppStore = create<AppStore>((set, get) => {
  const pendingJoinCode = typeof location !== 'undefined' ? parseJoinHash() : null;
  if (pendingJoinCode) {
    // Don't re-trigger the join on future reloads
    history.replaceState(null, '', location.pathname + location.search);
  }

  return {
    screen: pendingJoinCode ? 'online' : 'menu',
    identity: loadIdentity(),
    pendingJoinCode,

    navigate: (screen) => set({ screen }),

    setIdentity: (identity) => {
      const clean: Identity = {
        name: identity.name.trim().slice(0, 20),
        avatarId: identity.avatarId,
      };
      try {
        localStorage.setItem(IDENTITY_KEY, JSON.stringify(clean));
      } catch {
        // Private mode etc. — identity just won't persist
      }
      set({ identity: clean });
    },

    consumePendingJoinCode: () => {
      const code = get().pendingJoinCode;
      if (code) set({ pendingJoinCode: null });
      return code;
    },
  };
});

export function buildInviteLink(code: string): string {
  return `${location.origin}${location.pathname}#/join/${code}`;
}

// Dev-only handle so e2e scripts can drive navigation
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__appStore = useAppStore;
}
