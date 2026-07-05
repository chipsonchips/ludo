/**
 * First-visit tour shown over the menu: how the game works, who you are,
 * and the fastest way into a first match. Reachable later via "How to play".
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DEFAULT_RULES } from '@shared/ludo/rules';
import { useAppStore } from '@/stores/appStore';
import { useGameStore } from '@/stores/gameStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { Button, FieldLabel, TextInput } from '@/components/ui';
import {
  AVATARS,
  AvatarBadge,
  IconBot,
  IconDice,
  IconHome,
  IconPlay,
  IconSparkle,
  IconSwords,
} from '@/components/icons';

const RULES = [
  { Icon: IconDice, text: 'Roll a 6 to bring a token out of base onto the track.' },
  { Icon: IconSparkle, text: 'A double six earns you a bonus roll.' },
  { Icon: IconSwords, text: 'Land on a rival token to capture it and send it home.' },
  { Icon: IconHome, text: 'First to walk all four tokens home wins the table.' },
];

const STEP_COUNT = 3;

export function WelcomeOverlay() {
  const welcomeOpen = useOnboardingStore((s) => s.welcomeOpen);
  const completeWelcome = useOnboardingStore((s) => s.completeWelcome);
  const { identity, setIdentity } = useAppStore();
  const startSinglePlayer = useGameStore((s) => s.startSinglePlayer);
  const [step, setStep] = useState(0);

  const quickMatch = () => {
    completeWelcome();
    startSinglePlayer({ bots: 1, difficulty: 'easy', rules: { ...DEFAULT_RULES } });
  };

  return (
    <AnimatePresence>
      {welcomeOpen && (
        <motion.div
          className="fixed inset-0 z-[40] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-panel relative w-full max-w-md rounded-3xl p-7 shadow-[0_0_60px_rgba(246,183,60,0.15)]"
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <button
              className="absolute right-5 top-5 text-[11px] uppercase tracking-widest text-game-secondary transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70"
              onClick={completeWelcome}
            >
              Skip
            </button>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {step === 0 && (
                  <div>
                    <div className="mb-1 font-display text-[10px] font-bold uppercase tracking-[0.3em] text-game-gold">
                      Welcome to the lounge
                    </div>
                    <h2 className="mb-4 font-display text-xl font-black tracking-wide text-white">
                      Ludo, after dark
                    </h2>
                    <p className="mb-5 text-[13px] leading-relaxed text-game-secondary">
                      Race your four tokens around the board and home before anyone else. The
                      whole game in four lines:
                    </p>
                    <ul className="flex flex-col gap-3">
                      {RULES.map(({ Icon, text }) => (
                        <li key={text} className="flex items-center gap-3">
                          <span className="shrink-0 rounded-lg border border-game-gold/30 bg-game-gold/10 p-2 text-game-gold">
                            <Icon size={16} />
                          </span>
                          <span className="text-[13px] leading-snug text-white/85">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <div className="mb-1 font-display text-[10px] font-bold uppercase tracking-[0.3em] text-game-gold">
                      Step 2 of 3
                    </div>
                    <h2 className="mb-4 font-display text-xl font-black tracking-wide text-white">
                      Take a seat
                    </h2>
                    <p className="mb-5 text-[13px] leading-relaxed text-game-secondary">
                      Pick a name and a badge — this is how opponents will see you at the table.
                    </p>
                    <FieldLabel>Display name</FieldLabel>
                    <TextInput
                      value={identity.name}
                      maxLength={20}
                      placeholder="What should we call you?"
                      aria-label="Display name"
                      autoFocus
                      onChange={(e) => setIdentity({ ...identity, name: e.target.value })}
                    />
                    <div className="mt-4">
                      <FieldLabel>Badge</FieldLabel>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose your badge">
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
                            <AvatarBadge avatarId={a.id} size={36} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <div className="mb-1 font-display text-[10px] font-bold uppercase tracking-[0.3em] text-game-gold">
                      Step 3 of 3
                    </div>
                    <h2 className="mb-4 font-display text-xl font-black tracking-wide text-white">
                      Pick your first table
                    </h2>
                    <p className="mb-5 text-[13px] leading-relaxed text-game-secondary">
                      The quickest way to learn is a friendly hand against an easy bot — we&apos;ll
                      walk you through your first turns.
                    </p>
                    <button
                      className="glass-panel group mb-3 flex w-full items-center gap-4 border-game-gold/40 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-game-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70"
                      onClick={quickMatch}
                    >
                      <span className="rounded-xl border border-game-gold/40 bg-game-gold/15 p-2.5 text-game-gold transition-shadow group-hover:shadow-[0_0_18px_rgba(246,183,60,0.3)]">
                        <IconBot size={22} />
                      </span>
                      <span>
                        <span className="block font-display text-sm font-bold uppercase tracking-wider text-white">
                          Quick match
                        </span>
                        <span className="mt-0.5 block text-[12px] text-game-secondary">
                          Head-to-head vs an easy bot — recommended
                        </span>
                      </span>
                      <span className="ml-auto text-game-gold">
                        <IconPlay size={18} />
                      </span>
                    </button>
                    <p className="text-center text-[12px] text-game-secondary">
                      Or close this tour and set up your own table — online rooms and
                      pass-and-play are one tap away.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Footer nav */}
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="subtle"
                className="px-3"
                onClick={() => setStep(step - 1)}
                disabled={step === 0}
              >
                Back
              </Button>
              <div className="flex gap-1.5" aria-hidden>
                {Array.from({ length: STEP_COUNT }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-all ${
                      i === step ? 'w-5 bg-game-gold' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
              {step < STEP_COUNT - 1 ? (
                <Button variant="primary" className="px-6" onClick={() => setStep(step + 1)}>
                  Next
                </Button>
              ) : (
                <Button variant="ghost" className="px-5" onClick={completeWelcome}>
                  Explore
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
