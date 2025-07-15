import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/localStorage';

interface GameSettings {
  players: string[];
  citizenWord: string;
  wolfWord: string;
}

interface GameContextType {
  settings: GameSettings | null;
  setSettings: (settings: GameSettings) => void;
  resetSettings: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettingsState] = useState<GameSettings | null>(null);

  useEffect(() => {
    // アプリケーションロード時にローカルストレージから設定を読み込む
    const savedSettings = loadFromLocalStorage<GameSettings>('gameSettings');
    if (savedSettings) {
      setSettingsState(savedSettings);
    }
  }, []);

  const setSettings = (newSettings: GameSettings) => {
    setSettingsState(newSettings);
    saveToLocalStorage('gameSettings', newSettings);
  };

  const resetSettings = () => {
    setSettingsState(null);
    saveToLocalStorage('gameSettings', null);
  };

  return (
    <GameContext.Provider value={{ settings, setSettings, resetSettings }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
