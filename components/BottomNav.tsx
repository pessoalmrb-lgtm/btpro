'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Home, Trophy as TrophyIcon, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { AppStep } from '../types';

export const BottomNav = ({ activeStep, setStep, isVisible, resetApp }: { activeStep: AppStep, setStep: (s: AppStep) => void, isVisible: boolean, resetApp: () => void }) => {
  if (!isVisible) return null;

  return (
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] bottom-nav-glass rounded-full px-6 py-1 flex items-center justify-between z-[200] h-16"
    >
      <button 
        onClick={resetApp}
        className={cn(
          "flex flex-col items-center gap-1 transition-all active:scale-95 flex-1",
          activeStep === 'HOME' ? "text-primary" : "text-on-surface-variant/60 opacity-80"
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          activeStep === 'HOME' ? "bg-primary/10" : ""
        )}>
          <Home size={20} className={activeStep === 'HOME' ? "fill-primary/10" : ""} />
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest">Início</span>
      </button>
      
      <button 
        onClick={() => setStep('TOURNAMENTS_LIST')}
        className={cn(
          "flex flex-col items-center gap-1 transition-all active:scale-95 flex-1",
          activeStep === 'TOURNAMENTS_LIST' ? "text-primary" : "text-on-surface-variant/60 opacity-80"
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          activeStep === 'TOURNAMENTS_LIST' ? "bg-primary/10" : ""
        )}>
          <TrophyIcon size={20} className={activeStep === 'TOURNAMENTS_LIST' ? "fill-primary/10" : ""} />
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest">Torneios</span>
      </button>
      
      <button 
        onClick={() => setStep('PROFILE')}
        className={cn(
          "flex flex-col items-center gap-1 transition-all active:scale-95 flex-1",
          activeStep === 'PROFILE' ? "text-primary" : "text-on-surface-variant/60 opacity-80"
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          activeStep === 'PROFILE' ? "bg-primary/10" : ""
        )}>
          <UserIcon size={20} className={activeStep === 'PROFILE' ? "fill-primary/10" : ""} />
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest">Perfil</span>
      </button>
    </motion.nav>
  );
};
