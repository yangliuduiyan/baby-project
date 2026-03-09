import React, { createContext, useContext, useState, useEffect } from 'react';
import { Baby } from '@/types';
import { storage } from '@/utils/storage';

interface BabyContextType {
  currentBaby: Baby | null;
  babies: Baby[];
  setCurrentBaby: (baby: Baby) => void;
  addBaby: (baby: Baby) => void;
  refreshBabies: () => Promise<void>;
}

const BabyContext = createContext<BabyContextType | undefined>(undefined);

export function BabyProvider({ children }: { children: React.ReactNode }) {
  const [currentBaby, setCurrentBabyState] = useState<Baby | null>(null);
  const [babies, setBabies] = useState<Baby[]>([]);

  useEffect(() => {
    loadBabies();
  }, []);

  const loadBabies = async () => {
    const allBabies = await storage.getBabies();
    setBabies(allBabies);

    if (allBabies.length > 0) {
      const currentId = await storage.getCurrentBabyId();
      const current = currentId
        ? allBabies.find((b) => b.id === currentId) ?? allBabies[0]
        : allBabies[0];
      setCurrentBabyState(current);
      if (currentId && !allBabies.find((b) => b.id === currentId)) {
        await storage.setCurrentBabyId(current.id);
      }
    }
  };

  const setCurrentBaby = async (baby: Baby) => {
    setCurrentBabyState(baby);
    await storage.setCurrentBabyId(baby.id);
  };

  const addBaby = async (baby: Baby) => {
    await storage.saveBaby(baby);
    const currentId = await storage.getCurrentBabyId();
    if (!currentId) await storage.setCurrentBabyId(baby.id);
    await loadBabies();
  };

  const refreshBabies = async () => {
    await loadBabies();
  };

  return (
    <BabyContext.Provider
      value={{ currentBaby, babies, setCurrentBaby, addBaby, refreshBabies }}
    >
      {children}
    </BabyContext.Provider>
  );
}

export function useBaby() {
  const context = useContext(BabyContext);
  if (!context) {
    throw new Error('useBaby 必须在 BabyProvider 内使用');
  }
  return context;
}
