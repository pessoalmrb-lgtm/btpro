'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const StepContainer = ({ children, title, subtitle, currentStep }: { children: React.ReactNode, title: string, subtitle?: string, currentStep?: number }) => {
  const totalSteps = 8;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-xl mx-auto px-4 py-12 flex flex-col min-h-screen bg-slate-50 relative z-10"
    >
      {currentStep && (
        <div className="flex gap-1 mb-8 max-w-[200px]">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                i + 1 <= currentStep ? "bg-primary flex-1" : "bg-surface-container-highest w-2"
              )}
            />
          ))}
        </div>
      )}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-1.5 h-10 bg-tertiary rounded-full mt-1 shrink-0 shadow-sm shadow-tertiary/20" />
        <div className="min-w-0">
          <h2 className="text-3xl font-display font-black text-primary uppercase leading-tight italic tracking-tight break-words">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[10px] font-black text-on-surface-variant/70 uppercase tracking-widest mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </motion.div>
  );
};
