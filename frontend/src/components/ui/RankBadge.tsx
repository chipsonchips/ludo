import type { Rank } from '@/types';

const RANK_LABELS: Record<Rank, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
};

const RANK_STYLES: Record<Rank, string> = {
  bronze: 'text-[#cd7f32]',
  silver: 'text-[#c0c0c0]',
  gold: 'text-[#ffd700]',
  platinum: 'text-[#e5e4e2]',
  diamond: 'text-[#b9f2ff] drop-shadow-[0_0_8px_rgba(185,242,255,0.5)]',
};

interface RankBadgeProps {
  rank: Rank;
  size?: 'sm' | 'md';
}

export function RankBadge({ rank, size = 'sm' }: RankBadgeProps) {
  return (
    <span
      className={`inline-block rounded font-display font-semibold uppercase tracking-wider bg-white/5 ${RANK_STYLES[rank]} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[11px]'
      }`}
    >
      {RANK_LABELS[rank]}
    </span>
  );
}
