import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
import { resumeSessionIfAny } from '@/stores/roomStore';
import { MenuScreen } from '@/screens/MenuScreen';
import { SinglePlayerScreen } from '@/screens/SinglePlayerScreen';
import { LocalScreen } from '@/screens/LocalScreen';
import { OnlineScreen } from '@/screens/OnlineScreen';
import { LobbyScreen } from '@/screens/LobbyScreen';
import { GameScreen } from '@/components/game/GameScreen';
import { HubLink } from '@/components/HubLink';

export default function App() {
  const screen = useAppStore((s) => s.screen);

  // Rejoin a live room after a page refresh (seat is held during the grace window)
  useEffect(() => {
    void resumeSessionIfAny();
  }, []);

  return (
    <>
      {/* Hidden in-game so it never overlaps the board HUD */}
      {screen !== 'game' && <HubLink />}
      <AnimatePresence mode="wait">
        {screen === 'menu' && <MenuScreen key="menu" />}
        {screen === 'single' && <SinglePlayerScreen key="single" />}
        {screen === 'local' && <LocalScreen key="local" />}
        {screen === 'online' && <OnlineScreen key="online" />}
        {screen === 'lobby' && <LobbyScreen key="lobby" />}
        {screen === 'game' && <GameScreen key="game" />}
      </AnimatePresence>
    </>
  );
}
