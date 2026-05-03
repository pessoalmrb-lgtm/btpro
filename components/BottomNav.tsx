'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Home, Trophy as TrophyIcon, User as UserIcon, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';
import { AppStep } from '../types';

export const BottomNav = ({ activeStep, setStep, isVisible, resetApp }: { activeStep: AppStep, setStep: (s: AppStep) => void, isVisible: boolean, resetApp: () => void }) => {
  if (!isVisible) return null;

  return (
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] bottom-nav-glass rounded-full px-4 py-1 flex items-center justify-between z-[200] h-16"
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
        <span className="text-[8px] font-black uppercase tracking-widest leading-none">Home</span>
      </button>
      
      <button 
        onClick={() => setStep('MY_RANKINGS')}
        className={cn(
          "flex flex-col items-center gap-1 transition-all active:scale-95 flex-1",
          activeStep === 'MY_RANKINGS' || activeStep === 'RANKING_DETAILS' || activeStep === 'CREATE_RANKING' ? "text-primary" : "text-on-surface-variant/60 opacity-80"
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          activeStep === 'MY_RANKINGS' || activeStep === 'RANKING_DETAILS' || activeStep === 'CREATE_RANKING' ? "bg-primary/10" : ""
        )}>
          <LayoutGrid size={20} className={activeStep === 'MY_RANKINGS' || activeStep === 'RANKING_DETAILS' || activeStep === 'CREATE_RANKING' ? "fill-primary/10" : "opacity-40"} />
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest leading-none">Ligas</span>
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
        <span className="text-[8px] font-black uppercase tracking-widest leading-none">Torneios</span>
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
        <span className="text-[8px] font-black uppercase tracking-widest leading-none">Perfil</span>
      </button>
    </motion.nav>
  );
};
