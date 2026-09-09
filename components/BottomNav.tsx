'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Home, Trophy as TrophyIcon, User as UserIcon, Award } from 'lucide-react';
import { cn } from '../lib/utils';
import { AppStep } from '../types';

export const BottomNav = ({ activeStep, setStep, isVisible, resetApp }: { activeStep: AppStep, setStep: (s: AppStep) => void, isVisible: boolean, resetApp: () => void }) => {
  if (!isVisible || typeof document === 'undefined') return null;

  // A navegação só aparece após o login; todo o app autenticado usa o tema noturno.
  const darkNavigation = true;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[200] flex justify-center px-4">
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className={cn(
        "pointer-events-auto h-[4.5rem] w-full max-w-[440px] rounded-full px-4 py-1 flex items-center justify-between transition-colors duration-500",
        darkNavigation ? "bottom-nav-night" : "bottom-nav-glass"
      )}
    >
      <button 
        onClick={resetApp}
        className={cn(
          "flex flex-col items-center gap-1 transition-all active:scale-95 flex-1",
          activeStep === 'HOME' ? (darkNavigation ? "text-secondary" : "text-primary") : (darkNavigation ? "text-slate-400" : "text-on-surface-variant/60 opacity-80")
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          activeStep === 'HOME' ? (darkNavigation ? "bg-secondary/10 ring-1 ring-secondary/30 shadow-[0_0_24px_rgba(226,255,0,.16)]" : "bg-primary/10") : ""
        )}>
          <Home size={20} className={activeStep === 'HOME' ? "fill-primary/10" : ""} />
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest leading-none">Home</span>
      </button>
      
      <button 
        onClick={() => setStep('MY_RANKINGS')}
        className={cn(
          "flex flex-col items-center gap-1 transition-all active:scale-95 flex-1",
          activeStep === 'MY_RANKINGS' || activeStep === 'RANKING_DETAILS' || activeStep === 'CREATE_RANKING' ? (darkNavigation ? "text-secondary" : "text-primary") : (darkNavigation ? "text-slate-400" : "text-on-surface-variant/60 opacity-80")
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          activeStep === 'MY_RANKINGS' || activeStep === 'RANKING_DETAILS' || activeStep === 'CREATE_RANKING' ? (darkNavigation ? "bg-secondary/10 ring-1 ring-secondary/30 shadow-[0_0_24px_rgba(226,255,0,.16)]" : "bg-primary/10") : ""
        )}>
          <Award size={20} className={activeStep === 'MY_RANKINGS' || activeStep === 'RANKING_DETAILS' || activeStep === 'CREATE_RANKING' ? "fill-primary/10" : "opacity-40"} />
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest leading-none">Ligas</span>
      </button>

      <button 
        onClick={() => setStep('TOURNAMENTS_LIST')}
        className={cn(
          "flex flex-col items-center gap-1 transition-all active:scale-95 flex-1",
          activeStep === 'TOURNAMENTS_LIST' || activeStep === 'TOURNAMENT' ? (darkNavigation ? "text-secondary" : "text-primary") : (darkNavigation ? "text-slate-400" : "text-on-surface-variant/60 opacity-80")
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          activeStep === 'TOURNAMENTS_LIST' || activeStep === 'TOURNAMENT' ? (darkNavigation ? "bg-secondary/10 ring-1 ring-secondary/30 shadow-[0_0_24px_rgba(226,255,0,.16)]" : "bg-primary/10") : ""
        )}>
          <TrophyIcon size={20} className={activeStep === 'TOURNAMENTS_LIST' || activeStep === 'TOURNAMENT' ? "fill-current/10" : ""} />
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest leading-none">Torneios</span>
      </button>
      
      <button 
        onClick={() => setStep('PROFILE')}
        className={cn(
          "flex flex-col items-center gap-1 transition-all active:scale-95 flex-1",
          activeStep === 'PROFILE' ? (darkNavigation ? "text-secondary" : "text-primary") : (darkNavigation ? "text-slate-400" : "text-on-surface-variant/60 opacity-80")
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          activeStep === 'PROFILE' ? (darkNavigation ? "bg-secondary/10 ring-1 ring-secondary/30 shadow-[0_0_24px_rgba(226,255,0,.16)]" : "bg-primary/10") : ""
        )}>
          <UserIcon size={20} className={activeStep === 'PROFILE' ? "fill-primary/10" : ""} />
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest leading-none">Perfil</span>
      </button>
    </motion.nav>
    </div>,
    document.body
  );
};
