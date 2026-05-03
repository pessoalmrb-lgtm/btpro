'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut } from 'lucide-react';
import Image from 'next/image';
import { auth, signOut } from '../firebase';
import type { User } from '../firebase';

export const Header = ({ resetApp, user, userProfile }: { resetApp: () => void, user: User | null, userProfile: any }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const displayPhoto = userProfile?.photoURL || user?.photoURL;

  return (
    <div className="w-full flex justify-between items-center py-6">
      <button 
        onClick={resetApp}
        className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/5 rounded-full transition-all"
      >
        Meus Torneios
      </button>
      
      <div className="relative">
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/5 rounded-full transition-all"
        >
          Perfil
        </button>

        <AnimatePresence>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-64 bg-white border border-surface-container shadow-2xl rounded-2xl p-4 z-50"
              >
                <div className="space-y-4">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 pb-3 border-b border-surface-container">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                          {displayPhoto ? (
                            <div className="relative w-full h-full">
                              <Image src={displayPhoto} alt="Profile" fill className="object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <span className="text-primary font-black text-xs">{user.email?.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Atleta</p>
                          <p className="text-xs font-bold text-primary truncate overflow-hidden text-ellipsis">{user.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          signOut(auth);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-error/5 text-error rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-error/10 transition-all"
                      >
                        <LogOut size={14} />
                        Sair
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs font-bold text-on-surface-variant mb-4">Você não está logado</p>
                      <button 
                        onClick={() => {
                          window.location.reload();
                          setShowMenu(false);
                        }}
                        className="w-full py-3 bg-primary text-on-primary rounded-xl font-black text-[10px] uppercase tracking-widest"
                      >
                        Fazer Login
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
