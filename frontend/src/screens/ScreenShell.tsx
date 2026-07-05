import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import { IconArrowLeft } from '@/components/icons';

/** Shared backdrop + entrance animation for every out-of-game screen. */
export function ScreenShell({
  children,
  onBack,
  width = 'max-w-xl',
}: {
  children: ReactNode;
  onBack?: () => void;
  width?: string;
}) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_35%_20%,#221530_0%,#0e0a16_55%,#080610_100%)]">
      {/* Ambient glow pools */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-game-gold/[0.05] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-[#8B5CF6]/[0.06] blur-3xl" />

      <motion.div
        className={`relative z-[1] w-full ${width} max-h-full overflow-y-auto px-5 py-8 [scrollbar-color:rgba(246,183,60,0.25)_transparent] [scrollbar-width:thin]`}
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.99 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        {onBack && (
          <Button variant="subtle" onClick={onBack} icon={<IconArrowLeft size={16} />} className="mb-4 -ml-3">
            Back
          </Button>
        )}
        {children}
      </motion.div>
    </div>
  );
}
