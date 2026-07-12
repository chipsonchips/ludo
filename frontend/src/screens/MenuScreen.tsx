import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { ScreenShell } from './ScreenShell';
import { WelcomeOverlay } from '@/components/onboarding/WelcomeOverlay';
import { Button, TextInput, FieldLabel } from '@/components/ui';
import { ChipBalanceBadge } from '@/components/chips/ChipBalanceBadge';
import {
  AVATARS,
  AvatarBadge,
  IconBot,
  IconDice,
  IconUsers,
  IconWifi,
} from '@/components/icons';

const MODES = [
  {
    screen: 'single' as const,
    title: 'Single Player',
    blurb: 'Face the house bots — pick your difficulty.',
    Icon: IconBot,
    accent: '#F6B73C',
  },
  {
    screen: 'online' as const,
    title: 'Play Online',
    blurb: 'Create a private room and invite a friend.',
    Icon: IconWifi,
    accent: '#3B82F6',
  },
  {
    screen: 'local' as const,
    title: 'Local Two Players',
    blurb: 'Share this device, pass and play.',
    Icon: IconUsers,
    accent: '#22C55E',
  },
];

export function MenuScreen() {
  const { identity, setIdentity, navigate } = useAppStore();
  const openWelcome = useOnboardingStore((s) => s.openWelcome);

  return (
    <ScreenShell width="max-w-2xl">
      {/* Brand */}
      <div className="mb-8 flex flex-col items-center text-center">
        <motion.div
          className="mb-3 text-game-gold"
          initial={{ rotate: -12, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        >
          <IconDice size={52} />
        </motion.div>
        <h1 className="font-display text-2xl font-black tracking-[0.3em] text-white sm:text-3xl">
          LUDU<span className="text-game-gold">CHIPS</span>
        </h1>
        <p className="mt-2 text-[13px] tracking-wide text-game-secondary">
          Ludo, after dark — a high-stakes lounge for two dice and four houses.
        </p>
        <div className="mt-3">
          <ChipBalanceBadge />
        </div>
      </div>

      {/* Identity */}
      <div className="glass-panel mb-6 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FieldLabel>Display name</FieldLabel>
            <TextInput
              value={identity.name}
              maxLength={20}
              placeholder="What should we call you?"
              aria-label="Display name"
              onChange={(e) => setIdentity({ ...identity, name: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Badge</FieldLabel>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Choose your badge">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  role="radio"
                  aria-checked={identity.avatarId === a.id}
                  aria-label={a.label}
                  title={a.label}
                  onClick={() => setIdentity({ ...identity, avatarId: a.id })}
                  className={`rounded-full p-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70 ${
                    identity.avatarId === a.id
                      ? 'scale-110 ring-2 ring-game-gold/80'
                      : 'opacity-60 hover:scale-105 hover:opacity-100'
                  }`}
                >
                  <AvatarBadge avatarId={a.id} size={32} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mode cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.map((mode, i) => (
          <motion.button
            key={mode.screen}
            onClick={() => navigate(mode.screen)}
            className="glass-panel group flex flex-col items-start gap-3 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.06 }}
          >
            <span
              className="rounded-xl border p-2.5 transition-shadow group-hover:shadow-[0_0_18px_var(--mode-glow)]"
              style={{
                color: mode.accent,
                borderColor: `${mode.accent}44`,
                backgroundColor: `${mode.accent}14`,
                ['--mode-glow' as string]: `${mode.accent}33`,
              }}
            >
              <mode.Icon size={22} />
            </span>
            <span className="font-display text-sm font-bold uppercase tracking-wider text-white">
              {mode.title}
            </span>
            <span className="text-[12px] leading-snug text-game-secondary">{mode.blurb}</span>
          </motion.button>
        ))}
      </div>

      {/* Re-entry point for the first-visit tour */}
      <div className="mt-5 flex justify-center">
        <Button variant="subtle" onClick={openWelcome}>
          How to play
        </Button>
      </div>

      <WelcomeOverlay />
    </ScreenShell>
  );
}
