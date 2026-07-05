/**
 * Small shared UI kit — buttons, inputs, toggles — so every screen speaks the
 * same visual language (dark lounge, gold accents, glass panels).
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { IconSpinner } from './icons';

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle';

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    'border-game-gold/60 bg-gradient-to-b from-game-gold/25 to-game-gold/5 text-white shadow-[0_0_24px_rgba(246,183,60,0.15)] hover:border-game-gold hover:shadow-[0_0_32px_rgba(246,183,60,0.35)] focus-visible:ring-game-gold/70',
  ghost:
    'border-white/15 bg-white/5 text-white/90 hover:border-white/35 hover:bg-white/10 focus-visible:ring-white/40',
  danger:
    'border-game-red/40 bg-game-red/10 text-game-red hover:border-game-red/70 hover:bg-game-red/20 focus-visible:ring-game-red/60',
  subtle:
    'border-transparent bg-transparent text-game-secondary hover:text-white hover:bg-white/5 focus-visible:ring-white/30',
};

export function Button({
  variant = 'ghost',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 font-display text-xs font-bold uppercase tracking-[0.16em] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-40 ${BUTTON_STYLES[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <IconSpinner size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function TextInput({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-game-primary placeholder:text-white/25 transition-colors focus:border-game-gold/60 focus:bg-white/10 ${className}`}
      {...rest}
    />
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70 ${
        checked ? 'border-game-gold/70 bg-game-gold/30' : 'border-white/15 bg-white/5'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span
        className={`absolute top-0.5 h-[18px] w-[18px] rounded-full transition-all ${
          checked ? 'left-[22px] bg-game-gold shadow-[0_0_8px_rgba(246,183,60,0.6)]' : 'left-0.5 bg-white/40'
        }`}
      />
    </button>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full border border-white/10 bg-black/30 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          title={opt.hint}
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-full px-4 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-game-gold/70 ${
            value === opt.value
              ? 'bg-game-gold/20 text-game-gold shadow-[inset_0_0_0_1px_rgba(246,183,60,0.5)]'
              : 'text-game-secondary hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.22em] text-game-secondary">
      {children}
    </div>
  );
}
