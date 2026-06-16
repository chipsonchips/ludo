import { motion } from 'framer-motion';

function formatTime(): string {
  const now = new Date();
  let h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function TopBar() {
  return (
    <motion.div
      className="flex flex-col items-end gap-2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Status pill */}
      <div
        className="flex items-center gap-3 rounded-xl px-3 py-2"
        style={{
          background: 'rgba(8, 6, 16, 0.90)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1.5px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Clock */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-white/50">⏰</span>
          <span className="font-display text-[11px] font-bold text-white/85">
            {formatTime()}
          </span>
        </div>
        <div className="h-3.5 w-px bg-white/15" />
        {/* Ping */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-game-green">📶</span>
          <span className="font-display text-[11px] font-bold text-white/85">42ms</span>
        </div>
        <div className="h-3.5 w-px bg-white/15" />
        {/* Settings */}
        <button className="flex h-6 w-6 items-center justify-center rounded-full text-[13px] text-white/50 transition-colors hover:text-white/90">
          ⚙️
        </button>
      </div>

      {/* ChipsBettt branding */}
      <span
        style={{
          fontFamily: 'Georgia, "Times New Roman", cursive',
          fontStyle: 'italic',
          fontSize: '1.8rem',
          fontWeight: 700,
          color: '#F6B73C',
          textShadow: '0 0 20px rgba(246,183,60,0.55), 0 0 40px rgba(246,183,60,0.25)',
          letterSpacing: '0.02em',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        ChipsBettt
      </span>
    </motion.div>
  );
}
