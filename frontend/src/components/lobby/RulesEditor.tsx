import { RULE_DEFS, type GameRules } from '@shared/ludo/rules';
import { ToggleSwitch, FieldLabel } from '../ui';

/**
 * Match-rules panel, generated from the shared rule registry — adding a rule
 * to RULE_DEFS makes it appear here (and travel over the wire) automatically.
 */
export function RulesEditor({
  rules,
  onChange,
  disabled = false,
}: {
  rules: GameRules;
  /** Omit to render read-only (e.g. the guest's view of the host's rules). */
  onChange?: (rules: GameRules) => void;
  disabled?: boolean;
}) {
  const readOnly = !onChange || disabled;
  return (
    <div>
      <FieldLabel>
        Match rules
        {readOnly && <span className="ml-2 normal-case tracking-normal text-white/30">set by the host</span>}
      </FieldLabel>
      <ul className="flex flex-col divide-y divide-white/5 rounded-xl border border-white/10 bg-black/20">
        {RULE_DEFS.map((def) => (
          <li key={def.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-white/90">{def.label}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-game-secondary">{def.description}</div>
            </div>
            <ToggleSwitch
              checked={rules[def.id]}
              disabled={readOnly}
              label={def.label}
              onChange={(next) => onChange?.({ ...rules, [def.id]: next })}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
