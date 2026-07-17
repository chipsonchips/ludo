import { useState } from 'react';
import type { AiDifficulty } from '@shared/ludo/types';
import { DEFAULT_RULES, type GameRules } from '@shared/ludo/rules';
import { useAppStore } from '@/stores/appStore';
import { useGameStore } from '@/stores/gameStore';
import { ScreenShell } from './ScreenShell';
import { RulesEditor } from '@/components/lobby/RulesEditor';
import { StakePicker } from '@/components/chips/StakePicker';
import { Button, FieldLabel, SegmentedControl } from '@/components/ui';
import { IconBot, IconPlay } from '@/components/icons';

const DIFFICULTY_HINTS: Record<AiDifficulty, string> = {
  easy: 'Bots play loose and make mistakes.',
  medium: 'Bots chase captures and play the odds.',
  hard: 'Bots weigh risk on every square. Bring a plan.',
};

export function SinglePlayerScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const startSinglePlayer = useGameStore((s) => s.startSinglePlayer);
  const [difficulty, setDifficulty] = useState<AiDifficulty>('medium');
  const [bots, setBots] = useState<'1' | '2' | '3'>('3');
  const [rules, setRules] = useState<GameRules>({ ...DEFAULT_RULES });
  const [stake, setStake] = useState(0);

  // Head-to-head seats two owners; bigger tables seat you + each bot
  const seats = bots === '1' ? 2 : Number(bots) + 1;

  return (
    <ScreenShell onBack={() => navigate('menu')}>
      <div className="mb-6 flex items-center gap-3">
        <span className="rounded-xl border border-game-gold/30 bg-game-gold/10 p-2.5 text-game-gold">
          <IconBot size={22} />
        </span>
        <div>
          <h2 className="font-display text-lg font-black uppercase tracking-[0.2em] text-white">Single Player</h2>
          <p className="text-[12px] text-game-secondary">Set the table, then take on the house.</p>
        </div>
      </div>

      <div className="glass-panel flex flex-col gap-6 p-6">
        <div>
          <FieldLabel>Difficulty</FieldLabel>
          <SegmentedControl
            label="Difficulty"
            value={difficulty}
            onChange={setDifficulty}
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ]}
          />
          <p className="mt-2 text-[11px] text-game-secondary">{DIFFICULTY_HINTS[difficulty]}</p>
        </div>

        <div>
          <FieldLabel>Opponents</FieldLabel>
          <SegmentedControl
            label="Number of opponents"
            value={bots}
            onChange={setBots}
            options={[
              { value: '1', label: '1 bot', hint: 'Head-to-head — two houses each' },
              { value: '2', label: '2 bots' },
              { value: '3', label: '3 bots', hint: 'Full table' },
            ]}
          />
        </div>

        <StakePicker value={stake} onChange={setStake} seats={seats} />

        <RulesEditor rules={rules} onChange={setRules} />

        <Button
          variant="primary"
          icon={<IconPlay size={16} />}
          className="self-center px-10 py-3"
          onClick={() => startSinglePlayer({ bots: Number(bots), difficulty, rules, stake })}
        >
          {stake > 0 ? `Buy in · ${stake} chips` : 'Start Match'}
        </Button>
      </div>
    </ScreenShell>
  );
}
