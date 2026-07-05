import { useState } from 'react';
import { DEFAULT_RULES, type GameRules } from '@shared/ludo/rules';
import { useAppStore } from '@/stores/appStore';
import { useGameStore } from '@/stores/gameStore';
import { ScreenShell } from './ScreenShell';
import { RulesEditor } from '@/components/lobby/RulesEditor';
import { Button, FieldLabel, TextInput } from '@/components/ui';
import { IconPlay, IconUsers } from '@/components/icons';
import { LUDO_COLORS } from '@/ludo/constants';
import { pairColorsFor } from '@shared/ludo/gameLogic';

export function LocalScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const identity = useAppStore((s) => s.identity);
  const startLocal = useGameStore((s) => s.startLocal);
  const [name1, setName1] = useState(identity.name || '');
  const [name2, setName2] = useState('');
  const [rules, setRules] = useState<GameRules>({ ...DEFAULT_RULES });

  // One-on-one plays with two houses per player; pairing follows the rules toggle
  const [pair1, pair2] = pairColorsFor(rules.sameLinePairs);

  return (
    <ScreenShell onBack={() => navigate('menu')}>
      <div className="mb-6 flex items-center gap-3">
        <span className="rounded-xl border border-game-green/30 bg-game-green/10 p-2.5 text-game-green">
          <IconUsers size={22} />
        </span>
        <div>
          <h2 className="font-display text-lg font-black uppercase tracking-[0.2em] text-white">Local Two Players</h2>
          <p className="text-[12px] text-game-secondary">One device, two rivals — pass it between turns.</p>
        </div>
      </div>

      <div className="glass-panel flex flex-col gap-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Player 1', value: name1, set: setName1, colors: pair1, placeholder: 'First player' },
            { label: 'Player 2', value: name2, set: setName2, colors: pair2, placeholder: 'Second player' },
          ].map((p) => (
            <div key={p.label}>
              <FieldLabel>
                <span className="inline-flex items-center gap-1.5">
                  {p.colors.map((c) => (
                    <span
                      key={c}
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: LUDO_COLORS[c].hex }}
                    />
                  ))}
                  {p.label} · {p.colors.map((c) => LUDO_COLORS[c].label).join(' + ')}
                </span>
              </FieldLabel>
              <TextInput
                value={p.value}
                maxLength={20}
                placeholder={p.placeholder}
                aria-label={`${p.label} name`}
                onChange={(e) => p.set(e.target.value)}
              />
            </div>
          ))}
        </div>

        <RulesEditor rules={rules} onChange={setRules} />

        <Button
          variant="primary"
          icon={<IconPlay size={16} />}
          className="self-center px-10 py-3"
          onClick={() => startLocal({ names: [name1, name2], rules })}
        >
          Start Match
        </Button>
      </div>
    </ScreenShell>
  );
}
