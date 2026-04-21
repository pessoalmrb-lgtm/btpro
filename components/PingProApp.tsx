'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Minus, 
  Users, 
  LayoutGrid, 
  ChevronRight, 
  ChevronLeft, 
  Waves, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Home, 
  BarChart, 
  LogOut, 
  Lock, 
  Zap, 
  X, 
  Settings, 
  History, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Check,
  Grid,
  Lightbulb,
  ArrowRightLeft,
  Sparkles,
  Trophy as TrophyIcon,
  User as UserIcon
} from 'lucide-react';
import Image from 'next/image';
import { AppStep, Player, TournamentState, Match, TournamentFormat, MatchFormat, TeamRegistrationType, RankingCriterion, PlayoffRound } from '../types';
import { generateRoundRobin, validateSetScore, calculateRankings, generateGroupStage, generateIndividualDoubles, getPossibleGroupStructures, checkPlayoffPossibility, generatePlayoffs } from '../lib/tournament-logic';
import { cn } from '../lib/utils';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, handleFirestoreError, OperationType, cleanData } from '../firebase';
import type { User } from '../firebase';

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, errorInfo: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Ocorreu um erro inesperado.";
      try {
        const errorStr = String(this.state.errorInfo || "");
        if (errorStr.startsWith("{")) {
          const parsed = JSON.parse(errorStr);
          if (parsed && typeof parsed === 'object' && parsed.error && parsed.error.includes("insufficient permissions")) {
            displayMessage = "Erro de permissão no banco de dados. Por favor, verifique se você está logado corretamente.";
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
            <AlertCircle size={48} className="text-error mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-primary mb-2">Ops! Algo deu errado</h2>
            <p className="text-slate-500 mb-6">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary w-full py-3"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Header = ({ resetApp, user }: { resetApp: () => void, user: User | null }) => {
  const [showMenu, setShowMenu] = useState(false);

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
                          {user.photoURL ? (
                            <div className="relative w-full h-full">
                              <Image src={user.photoURL} alt="Profile" fill className="object-cover" referrerPolicy="no-referrer" />
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
                        onClick={() => signOut(auth)}
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
                        onClick={() => window.location.reload()}
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

const StepContainer = ({ children, title, subtitle, currentStep }: { children: React.ReactNode, title: string, subtitle?: string, currentStep?: number }) => {
  const totalSteps = 8;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-xl mx-auto px-4 py-4 flex flex-col justify-center min-h-[calc(100dvh-120px)]"
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

const BottomNav = ({ activeStep, setStep, isVisible, resetApp }: { activeStep: AppStep, setStep: (s: AppStep) => void, isVisible: boolean, resetApp: () => void }) => {
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

export default function PingProApp() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [step, setStep] = useState<AppStep>('HOME');
  const [tournaments, setTournaments] = useState<TournamentState[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Creation Flow State
  const [tournamentName, setTournamentName] = useState('');
  const [playerCount, setPlayerCount] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedCourts, setSelectedCourts] = useState<number[]>([]);
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('6_GAMES_TIEBREAK');
  const [registrationType, setRegistrationType] = useState<TeamRegistrationType>('RANDOM_DRAW');
  const [tournamentFormat, setTournamentFormat] = useState<TournamentFormat>('SUPER_8_INDIVIDUAL');
  const [rankingCriteria, setRankingCriteria] = useState<RankingCriterion[]>([]);
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);
  const [groupsMatchPlay, setGroupsMatchPlay] = useState<'INTRA' | 'INTER'>('INTRA');
  const [playoffRounds, setPlayoffRounds] = useState<PlayoffRound[]>(['FINAL']);
  const [drawnGroups, setDrawnGroups] = useState<{ id: string, teams: Player[] }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnTeams, setDrawnTeams] = useState<{p1: Player, p2: Player}[]>([]);
  const [courtWarning, setCourtWarning] = useState<{ court: number; tournamentName: string } | null>(null);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null);
  const [tournamentTab, setTournamentTab] = useState<'MATCHES' | 'RANKING' | 'ROUNDS'>('MATCHES');
  const [tournamentViewRound, setTournamentViewRound] = useState<number | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // --- Scroll to Top on Step Change ---
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, activeTournamentId]);

  // --- Keyboard Visibility Hook ---
  React.useEffect(() => {
    const handleResize = () => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      
      if (window.visualViewport) {
        // Visual viewport height shrinks when keyboard is up. 
        // 25% height reduction is a very safe threshold to distinguish from browser chrome changes.
        const keyboardActive = window.visualViewport.height < window.innerHeight * 0.75;
        setIsKeyboardVisible(keyboardActive || !!isInputFocused);
      } else {
        setIsKeyboardVisible(!!isInputFocused);
      }
    };

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setIsKeyboardVisible(true);
      }
    };

    const handleBlur = () => {
      // Small timeout to check if focus moved to another input
      setTimeout(() => {
        handleResize();
      }, 150);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    document.addEventListener('focusin', handleFocus as any);
    document.addEventListener('focusout', handleBlur);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocus as any);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  // --- Auth & Firestore Sync ---
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!user) {
      setTournaments([]);
      return;
    }

    const q = query(collection(db, 'tournaments'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as TournamentState);
      setTournaments(docs.sort((a, b) => b.createdAt - a.createdAt));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tournaments');
    });

    return () => unsubscribe();
  }, [user]);

  React.useEffect(() => {
    if (!user) {
      setIsPremium(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, async (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data();
        setIsPremium(userData.isPremium || false);
      } else {
        // Create user profile if it doesn't exist
        try {
          const userData = cleanData({
            uid: user.uid,
            email: user.email,
            isPremium: false,
            createdAt: Date.now()
          });
          await setDoc(userDocRef, userData);
        } catch (err) {
          // Ignore permission error if it's just a race condition
          console.error("Error creating user profile:", err);
        }
      }
    }, (err) => {
      // If it's a permission error, it might be because the doc doesn't exist yet
      // and the rules are strict. But onSnapshot should work if we have read access.
      console.error("Error syncing user profile:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // --- History Management ---
  React.useEffect(() => {
    // Set initial state if not present
    if (!window.history.state) {
      window.history.replaceState({ step: 'HOME', activeTournamentId: null }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        if (event.state.step) setStep(event.state.step);
        // We use undefined check because null is a valid value for activeTournamentId
        if ('activeTournamentId' in event.state) {
          setActiveTournamentId(event.state.activeTournamentId);
        }
        if ('showMatchHistory' in event.state) {
          setShowMatchHistory(event.state.showMatchHistory);
        }
      } else {
        setStep('HOME');
        setActiveTournamentId(null);
        setShowMatchHistory(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync step, activeTournamentId and showMatchHistory with history
  React.useEffect(() => {
    const currentState = window.history.state;
    const hasChanged = 
      currentState?.step !== step || 
      currentState?.activeTournamentId !== activeTournamentId ||
      currentState?.showMatchHistory !== showMatchHistory;
    
    if (hasChanged) {
      window.history.pushState({ step, activeTournamentId, showMatchHistory }, '');
    }
  }, [step, activeTournamentId, showMatchHistory]);

  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  // --- Actions ---

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, activeTournament?.currentRound]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    if (!email.includes('@')) {
      setAuthError("Por favor, insira um e-mail válido.");
      setIsAuthLoading(false);
      return;
    }

    if (password.length < 6) {
      setAuthError("A senha deve ter pelo menos 6 caracteres.");
      setIsAuthLoading(false);
      return;
    }

    try {
      if (authMode === 'REGISTER') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      const error = err as { code?: string; message?: string };
      console.error("Auth error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError("E-mail ou senha incorretos.");
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError("Este e-mail já está sendo usado.");
      } else if (error.code === 'auth/invalid-email') {
        setAuthError("E-mail inválido.");
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError("O login por e-mail/senha não está ativado no console do Firebase.");
      } else if (error.code === 'auth/weak-password') {
        setAuthError("A senha é muito fraca.");
      } else {
        setAuthError(`Erro: ${error.message || "Ocorreu um erro ao processar sua solicitação."}`);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const error = err as { code?: string };
      console.error("Google login error:", error);
      if (error.code === 'auth/popup-blocked') {
        setAuthError("O popup de login foi bloqueado pelo seu navegador.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // User closed the popup, ignore
      } else if (error.code === 'auth/unauthorized-domain') {
        setAuthError("Este domínio não está autorizado no Firebase Console. Adicione este domínio às 'Authorized Domains' nas configurações de Autenticação do Firebase.");
      } else {
        setAuthError("Erro ao tentar entrar com o Google. Verifique se os popups estão permitidos.");
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const startNewTournament = () => {
    if (tournaments.length >= 4) {
      setShowLimitPopup(true);
      return;
    }
    setTournamentName('');
    setStep('TOURNAMENT_NAME');
  };

  const handleNameConfirm = () => {
    if (!tournamentName.trim()) {
      setError("O nome do torneio é obrigatório.");
      return;
    }
    setError(null);
    setStep('PLAYER_COUNT');
  };

  const handleFormatConfirm = (format: TournamentFormat) => {
    setTournamentFormat(format);
    if (format === 'GROUPS_MATA_MATA' || format === 'GROUPS') {
      setStep('GROUP_CONFIG');
    } else {
      setStep('MATCH_FORMAT');
    }
  };

  const handlePlayerCountConfirm = () => {
    if (playerCount < 4) {
      setError("Mínimo de 4 atletas.");
      return;
    }
    if (playerCount % 2 !== 0) {
      setError("O número de atletas deve ser par para formar duplas.");
      return;
    }
    setError(null);
    setStep('FORMAT_SELECTION');
  };

  const handleMatchFormatConfirm = (format: MatchFormat) => {
    setMatchFormat(format);
    setStep('RANKING_CRITERIA');
  };

  const handleRegistrationTypeConfirm = (type: TeamRegistrationType) => {
    setRegistrationType(type);
    
    // Initialize players/teams based on count and type
    let count = 0;
    if (type === 'RANDOM_DRAW') {
      count = playerCount; // Individual athletes
    } else {
      count = playerCount / 2; // Fixed teams
    }

    const initialPlayers = Array.from({ length: count }, (_, i) => ({
      id: `p-${Date.now()}-${i}`,
      name: ''
    }));
    setPlayers(initialPlayers);
    setStep('ATHLETE_REGISTRATION');
  };

  const handleAthletesConfirm = async () => {
    const emptyIndex = players.findIndex(p => !p.name.trim());
    if (emptyIndex !== -1) {
      const label = registrationType === 'RANDOM_DRAW' ? `Atleta ${emptyIndex + 1}` : `Dupla ${emptyIndex + 1}`;
      setError(`O campo "${label}" é obrigatório.`);
      return;
    }
    setError(null);
    
    if (!user) {
      setError("Você precisa estar logado para criar um torneio.");
      return;
    }

    const isIndividual = tournamentFormat.includes('INDIVIDUAL') || tournamentFormat === 'REI_DA_QUADRA';
    
    if (tournamentFormat === 'GROUPS_MATA_MATA' || tournamentFormat === 'GROUPS') {
      setStep('DRAWING');
      setIsDrawing(true);
      
      setTimeout(() => {
        setIsDrawing(false);
        let teamsToGroup: Player[] = [];
        if (registrationType === 'RANDOM_DRAW') {
          const shuffled = [...players].sort(() => Math.random() - 0.5);
          for (let i = 0; i < shuffled.length; i += 2) {
            const p1 = shuffled[i];
            const p2 = shuffled[i+1];
            teamsToGroup.push({
              id: `team-${p1.id}-${p2.id}`,
              name: `${p1.name} / ${p2.name}`
            });
          }
        } else {
          teamsToGroup = players;
        }

        const groupsCount = Math.ceil(teamsToGroup.length / teamsPerGroup);
        const { groups } = generateGroupStage(teamsToGroup, selectedCourts, { groupsCount, teamsPerGroup, type: groupsMatchPlay });
        setDrawnGroups(groups);
        setStep('GROUPS_DISPLAY');
      }, 2000);
      return;
    }

    if (isIndividual) {
      setStep('DRAWING');
      setIsDrawing(true);
      
      setTimeout(async () => {
        setIsDrawing(false);
        
        const matches = generateIndividualDoubles(players, selectedCourts);
        const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
        
        const tournamentId = `t-${Date.now()}`;
        const newTournament: TournamentState = {
          id: tournamentId,
          name: tournamentName,
          players: players,
          athleteCount: playerCount,
          matches,
          currentRound: 1,
          totalRounds,
          tables: selectedCourts,
          format: tournamentFormat,
          matchFormat,
          registrationType,
          rankingCriteria,
          isFinished: false,
          createdAt: Date.now()
        };
        
        try {
          const tournamentData = cleanData({ ...newTournament, uid: user.uid });
          await setDoc(doc(db, 'tournaments', tournamentId), tournamentData);
          setActiveTournamentId(tournamentId);
          setStep('TOURNAMENT');
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `tournaments/${tournamentId}`);
        }
      }, 2000);
    } else if (registrationType === 'RANDOM_DRAW') {
      setStep('DRAWING');
      setIsDrawing(true);
      
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      const teams: {p1: Player, p2: Player}[] = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        teams.push({ p1: shuffled[i], p2: shuffled[i+1] });
      }
      setDrawnTeams(teams);

      setTimeout(async () => {
        setIsDrawing(false);
        
        const finalTeams = teams.map(t => ({
          id: `team-${t.p1.id}-${t.p2.id}`,
          name: `${t.p1.name} / ${t.p2.name}`
        }));

        let matches: Match[] = [];
        matches = generateRoundRobin(finalTeams, selectedCourts);

        const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
        
        const tournamentId = `t-${Date.now()}`;
        const newTournament: TournamentState = {
          id: tournamentId,
          name: tournamentName,
          players: finalTeams,
          athleteCount: playerCount,
          matches,
          currentRound: 1,
          totalRounds,
          tables: selectedCourts,
          format: tournamentFormat,
          matchFormat,
          registrationType,
          rankingCriteria,
          isFinished: false,
          createdAt: Date.now()
        };
        
        try {
          const tournamentData = cleanData({ ...newTournament, uid: user.uid });
          await setDoc(doc(db, 'tournaments', tournamentId), tournamentData);
          setActiveTournamentId(tournamentId);
          setStep('TOURNAMENT');
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `tournaments/${tournamentId}`);
        }
      }, 3000);
    } else {
      const finalTeams = [...players];
      let matches: Match[] = [];
      matches = generateRoundRobin(finalTeams, selectedCourts);

      const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
      
      const tournamentId = `t-${Date.now()}`;
      const newTournament: TournamentState = {
        id: tournamentId,
        name: tournamentName,
        players: finalTeams,
        athleteCount: playerCount,
        matches,
        currentRound: 1,
        totalRounds,
        tables: selectedCourts,
        format: tournamentFormat,
        matchFormat,
        registrationType,
        rankingCriteria,
        isFinished: false,
        createdAt: Date.now()
      };
      
      try {
        const tournamentData = cleanData({ ...newTournament, uid: user.uid });
        await setDoc(doc(db, 'tournaments', tournamentId), tournamentData);
        setActiveTournamentId(tournamentId);
        setStep('TOURNAMENT');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tournaments/${tournamentId}`);
      }
    }
  };

  const handleRankingCriteriaConfirm = () => {
    if (rankingCriteria.length === 0) {
      setError("Selecione ao menos um critério.");
      return;
    }
    setError(null);
    setStep('TABLE_COUNT');
  };

  const handleTableCountConfirm = () => {
    if (selectedCourts.length === 0) {
      setError("Selecione pelo menos uma quadra.");
      return;
    }
    setError(null);

    const isGroupFormat = tournamentFormat === 'GROUPS' || tournamentFormat === 'GROUPS_MATA_MATA';
    
    if (isGroupFormat) {
      setStep('REGISTRATION_TYPE');
    } else {
      const isIndividual = tournamentFormat.includes('INDIVIDUAL') || tournamentFormat === 'REI_DA_QUADRA';
      if (isIndividual) {
        setRegistrationType('RANDOM_DRAW');
        const initialPlayers = Array.from({ length: playerCount }, (_, i) => ({
          id: `p-${Date.now()}-${i}`,
          name: ''
        }));
        setPlayers(initialPlayers);
        setStep('ATHLETE_REGISTRATION');
      } else {
        setStep('REGISTRATION_TYPE');
      }
    }
  };

  const updateMatchScore = async (matchId: string, player: 1 | 2, value: number) => {
    if (!activeTournament) return;

    const newMatches = activeTournament.matches.map(m => {
      if (m.id !== matchId) return m;
      if (m.isCompleted) return m;
      
      const currentSet = { ...m.currentSet };
      const newValue = player === 1 ? currentSet.player1 + value : currentSet.player2 + value;
      
      const otherValue = player === 1 ? currentSet.player2 : currentSet.player1;
      const sum = newValue + otherValue;
      
      if (newValue < 0) return m;

      if (activeTournament.matchFormat === '6_GAMES_TIEBREAK') {
        if (newValue > 7) return m;
        if (newValue === 7 && otherValue < 5) return m;
      } else if (activeTournament.matchFormat === '6_GAMES_MAX') {
        if (newValue > 6) return m;
      } else if (activeTournament.matchFormat === '5_GAMES_MAX') {
        if (newValue > 5) return m;
      } else if (activeTournament.matchFormat === 'SUM_9_GAMES') {
        if (sum > 9) return m;
      } else if (activeTournament.matchFormat === 'SUM_7_GAMES') {
        if (sum > 7) return m;
      } else if (activeTournament.matchFormat === 'SUM_5_GAMES') {
        if (sum > 5) return m;
      }

      if (player === 1) currentSet.player1 = newValue;
      else currentSet.player2 = newValue;
      
      return { ...m, currentSet };
    });

    try {
      await updateDoc(doc(db, 'tournaments', activeTournament.id), { matches: newMatches });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tournaments/${activeTournament.id}`);
    }
  };

  const confirmSet = async (matchId: string) => {
    if (!activeTournament) return;
    const match = activeTournament.matches.find(m => m.id === matchId)!;
    const set = match.currentSet;
    
    const validation = validateSetScore(set.player1, set.player2, activeTournament.matchFormat);
    if (!validation.isValid) {
      setError(validation.error || "Placar inválido");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const winnerId = set.player1 > set.player2 ? match.player1Id : match.player2Id;
    
    let newMatchesList = activeTournament.matches.map(m => {
        if (m.id !== matchId) return m;
        return { 
          ...m, 
          sets: [set], 
          isCompleted: true, 
          winnerId,
          currentSet: set
        };
    });

    // --- Advance Playoff Winner ---
    if (match.id.startsWith('playoff-')) {
      const parts = match.id.split('-');
      const roundType = parts[1] as PlayoffRound;
      const matchIdx = parseInt(parts[2]);
      
      const roundsOrder: PlayoffRound[] = ['ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
      const selectedRounds = activeTournament.playoffRounds || [];
      const currentRounds = roundsOrder.filter(r => selectedRounds.includes(r));
      
      const currentRoundIdxInSelection = currentRounds.indexOf(roundType);
      
      if (currentRoundIdxInSelection !== -1 && currentRoundIdxInSelection < currentRounds.length - 1) {
        const nextRoundType = currentRounds[currentRoundIdxInSelection + 1];
        const nextMatchIdx = Math.floor(matchIdx / 2);
        const nextMatchId = `playoff-${nextRoundType}-${nextMatchIdx}`;
        const isPlayer1 = matchIdx % 2 === 0;
        
        const winner = activeTournament.players.find(p => p.id === winnerId) || { id: winnerId, name: winnerId };

        newMatchesList = newMatchesList.map(m => {
          if (m.id === nextMatchId) {
            return {
              ...m,
              [isPlayer1 ? 'player1Id' : 'player2Id']: winner.id
            };
          }
          return m;
        });
      }
    }

    try {
      await updateDoc(doc(db, 'tournaments', activeTournament.id), { matches: newMatchesList });
      setError(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tournaments/${activeTournament.id}`);
    }
  };

  const nextRound = async () => {
    if (!activeTournament) return;
    
    const availableRounds = Array.from(new Set(activeTournament.matches.map(m => m.round))).sort((a, b) => a - b);
    const currentIndex = availableRounds.indexOf(activeTournament.currentRound);
    const isMataMataFormat = activeTournament.format === 'GROUPS_MATA_MATA';
    const hasPlayoffs = activeTournament.playoffRounds && activeTournament.playoffRounds.length > 0;
    const isEndingGroups = isMataMataFormat && hasPlayoffs && activeTournament.currentRound < 100 && (currentIndex === availableRounds.filter(r => r < 100).length - 1);

    if (isEndingGroups) {
      // Transition from Groups to Playoffs
      const roundsOrder: PlayoffRound[] = ['ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
      const currentRounds = roundsOrder.filter(r => activeTournament.playoffRounds?.includes(r));
      const firstPlayoffRound = currentRounds[0];
      
      const numPlayoffSlots = Math.pow(2, currentRounds.length); // Total teams in the first playoff round
      const groups = Array.from(new Set(activeTournament.matches.map(m => m.groupId).filter(id => id && !id.includes('playoff'))));
      const numGroups = groups.length;
      
      if (numGroups > 0) {
        const qualifiersPerGroup = Math.floor(numPlayoffSlots / numGroups);
        let qualifiedTeams: Player[] = [];
        
        groups.sort().forEach(groupId => {
          const groupMatches = activeTournament.matches.filter(m => m.groupId === groupId);
          const groupTeamsIds = new Set(groupMatches.flatMap(m => [m.player1Id, m.player2Id]));
          const groupPlayers = activeTournament.players.filter(p => groupTeamsIds.has(p.id));
          
          const groupRankings = calculateRankings(groupPlayers, groupMatches, activeTournament.rankingCriteria);
          qualifiedTeams = [...qualifiedTeams, ...groupRankings.slice(0, qualifiersPerGroup)];
        });

        // Fill first round matches
        const newMatches = activeTournament.matches.map(m => {
          if (m.id.startsWith(`playoff-${firstPlayoffRound}-`)) {
            const idx = parseInt(m.id.split('-')[2]);
            const p1 = qualifiedTeams[idx * 2];
            const p2 = qualifiedTeams[idx * 2 + 1];
            return {
              ...m,
              player1Id: p1?.id || m.player1Id,
              player2Id: p2?.id || m.player2Id
            };
          }
          return m;
        });

        try {
          // Transition from Groups to Playoffs
          const roundsOrder: PlayoffRound[] = ['ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
          const firstPlayoffRound = roundsOrder.filter(r => activeTournament.playoffRounds?.includes(r))[0];
          const firstPlayoffRoundIdx = roundsOrder.indexOf(firstPlayoffRound);

          await updateDoc(doc(db, 'tournaments', activeTournament.id), { 
            matches: newMatches,
            currentRound: 100 + firstPlayoffRoundIdx // Jump to the correct first playoff round
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `tournaments/${activeTournament.id}`);
        }
        return;
      }
    }

    if (currentIndex !== -1 && currentIndex < availableRounds.length - 1) {
      const nextRoundNum = availableRounds[currentIndex + 1];
      try {
        await updateDoc(doc(db, 'tournaments', activeTournament.id), { currentRound: nextRoundNum });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tournaments/${activeTournament.id}`);
      }
    } else {
      try {
        await updateDoc(doc(db, 'tournaments', activeTournament.id), { isFinished: true });
        setStep('FINISHED');
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0f172a', '#bef264', '#000000']
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tournaments/${activeTournament.id}`);
      }
    }
  };

  const prevRound = async () => {
    if (!activeTournament) return;
    
    const availableRounds = Array.from(new Set(activeTournament.matches.map(m => m.round))).sort((a, b) => a - b);
    const currentIndex = availableRounds.indexOf(activeTournament.currentRound);

    if (currentIndex > 0) {
      const prevRoundNum = availableRounds[currentIndex - 1];
      try {
        await updateDoc(doc(db, 'tournaments', activeTournament.id), { currentRound: prevRoundNum });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tournaments/${activeTournament.id}`);
      }
    }
  };

  const editMatch = async (matchId: string) => {
    if (!activeTournament) return;
    const newMatches = activeTournament.matches.map(m => {
      if (m.id !== matchId) return m;
      return { ...m, isCompleted: false };
    });
    try {
      await updateDoc(doc(db, 'tournaments', activeTournament.id), { matches: newMatches });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tournaments/${activeTournament.id}`);
    }
  };

  const resetApp = () => {
    setStep('HOME');
    setActiveTournamentId(null);
    setPlayers([]);
    setPlayerCount(8);
    setSelectedCourts([]);
    setError(null);
  };

  const deleteTournament = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tournaments', id));
      if (activeTournamentId === id) {
        setActiveTournamentId(null);
        setStep('HOME');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tournaments/${id}`);
    }
  };

  return (
    <ErrorBoundary>
      <main className={cn(
        "min-h-[100dvh] flex flex-col items-center overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+5rem)] transition-colors duration-500",
        step === 'HOME' ? "bg-[#004a8c]" : "bg-slate-50"
      )}>
        <div className="w-full flex-grow">
          <AnimatePresence mode="wait">
          {!isAuthReady ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <RefreshCw size={48} className="animate-spin text-primary mb-4" />
              <p className="text-slate-500 font-medium">Carregando...</p>
            </motion.div>
          ) : !user ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 px-6 w-full max-w-md mx-auto space-y-10"
            >
              <div className="text-center space-y-2">
                <h2 className="text-4xl font-display font-black tracking-tight text-on-surface">Bem-vindo à Arena</h2>
                <p className="text-on-surface-variant font-medium">Sua jornada no beach tennis começa aqui.</p>
              </div>

              <div className="w-full bg-surface-container-low p-2 rounded-2xl shadow-xl space-y-4">
                {/* Segmented Control (Tabs) */}
                <div className="grid grid-cols-2 bg-surface-container gap-1 p-1 rounded-full">
                  <button 
                    onClick={() => setAuthMode('LOGIN')}
                    className={cn(
                      "py-3 px-6 rounded-full text-sm font-black font-display transition-all duration-200 uppercase tracking-widest",
                      authMode === 'LOGIN' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    ENTRAR
                  </button>
                  <button 
                    onClick={() => setAuthMode('REGISTER')}
                    className={cn(
                      "py-3 px-6 rounded-full text-sm font-black font-display transition-all duration-200 uppercase tracking-widest",
                      authMode === 'REGISTER' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    CADASTRAR
                  </button>
                </div>

                {/* Form Section */}
                <div className="bg-surface-container-lowest p-8 rounded-xl space-y-6">
                  <form onSubmit={handleAuth} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black font-display uppercase tracking-widest text-on-surface-variant ml-4">E-mail</label>
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field"
                        placeholder="nome@exemplo.com"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-4">
                        <label className="text-xs font-black font-display uppercase tracking-widest text-on-surface-variant">Senha</label>
                        <button type="button" className="text-xs font-bold text-primary hover:text-primary-dim transition-colors">Esqueceu a senha?</button>
                      </div>
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field"
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    {authError && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-error/10 text-error rounded-xl text-xs font-bold flex items-center gap-2"
                      >
                        <AlertCircle size={14} />
                        {authError}
                      </motion.div>
                    )}

                    <button 
                      type="submit"
                      disabled={isAuthLoading}
                      className="w-full btn-primary mt-4"
                    >
                      {isAuthLoading ? (
                        <RefreshCw size={20} className="animate-spin" />
                      ) : (
                        authMode === 'LOGIN' ? 'ENTRAR' : 'CADASTRAR'
                      )}
                    </button>
                  </form>

                  <div className="flex items-center gap-4 py-2">
                    <div className="h-[1px] flex-grow bg-surface-container-highest/50"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-outline-variant">ou</span>
                    <div className="h-[1px] flex-grow bg-surface-container-highest/50"></div>
                  </div>

                  <button 
                    type="button" 
                    onClick={handleGoogleLogin} 
                    className="w-full btn-outline"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Entrar com o Google</span>
                  </button>
                </div>
              </div>

              <p className="text-center text-xs text-on-surface-variant font-medium px-8 leading-relaxed">
                Ao entrar, você concorda com nossos <a className="underline font-bold decoration-primary/30" href="#">Termos de Uso</a> e <a className="underline font-bold decoration-primary/30" href="#">Política de Privacidade</a>.
              </p>
            </motion.div>
          ) : step === 'HOME' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <div className="arena-hero-bg pt-4 pb-16 px-8 flex flex-col items-center text-center">
                <div className="w-full flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-sm border border-white/20">
                      <UserIcon size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-black text-white/50 uppercase tracking-widest leading-none mb-1">Bem-vindo</p>
                      <p className="text-xs font-black text-white uppercase italic leading-none">{user?.displayName?.split(' ')[0] || 'Organizador'}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="brand-glass inline-block mb-4">
                    <h1 className="brand-text text-white text-4xl md:text-5xl leading-none">
                      BEACH<span className="text-accent">PRÓ</span>
                    </h1>
                  </div>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">
                    Arena Management System
                  </p>
                </div>
                
                <div className="flex flex-col w-full gap-4 max-w-[340px]">
                  <button 
                    onClick={() => {
                      if (tournaments.length >= 4) {
                        setShowLimitPopup(true);
                      } else {
                        setStep('TOURNAMENT_NAME');
                      }
                    }}
                    className="btn-hero-neon group h-20"
                  >
                    <div className="bg-white/20 w-14 h-14 rounded-full flex items-center justify-center text-on-secondary shadow-lg">
                      <Plus size={28} />
                    </div>
                    <span className="text-on-secondary font-black text-sm uppercase tracking-widest flex-1">
                      NOVO TORNEIO
                    </span>
                    <div className="w-14 h-14 flex items-center justify-center bg-black/5 rounded-full mr-1">
                      <ChevronRight size={22} className="text-on-secondary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      alert("Funcionalidade de IA em desenvolvimento!");
                    }}
                    className="btn-hero-glass group h-20"
                  >
                    <div className="bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center text-primary shadow-sm border border-primary/5">
                      <Sparkles size={24} />
                    </div>
                    <span className="text-primary font-black text-xs uppercase tracking-widest flex-1">
                      CRIAR COM IA
                    </span>
                    <div className="w-14 h-14 flex items-center justify-center">
                      <ChevronRight size={22} className="text-primary/30 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>

              <div className="wave-container px-6 pt-10 pb-32">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex flex-col">
                      <h3 className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Torneios Ativos
                      </h3>
                      <p className="text-xs font-black text-on-surface uppercase italic">Em andamento na Arena</p>
                    </div>
                    {tournaments.length > 0 && (
                      <button 
                        onClick={() => setStep('TOURNAMENTS_LIST')}
                        className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-4 py-2 rounded-full border border-primary/10 hover:bg-primary/10 transition-colors"
                      >
                        Ver Todos
                      </button>
                    )}
                  </div>
                  {tournaments.length > 0 ? (
                    <div className="grid gap-5">
                      {tournaments.map((t) => {
                        const totalRegular = t.matches.length > 0 ? Math.max(...t.matches.map(m => m.round).filter(r => r < 100), 0) : 0;
                        const roundLabel = t.currentRound >= 100 ? (() => {
                          const types: { [key: number]: string } = { 100: 'Oitavas', 101: 'Quartas', 102: 'Semi', 103: 'Final' };
                          return types[t.currentRound] || `Playoff`;
                        })() : `Rodada ${t.currentRound}/${totalRegular || t.totalRounds}`;

                        return (
                          <motion.button 
                            key={t.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setActiveTournamentId(t.id);
                              setTournamentTab('MATCHES');
                              setTournamentViewRound(null);
                              setStep(t.isFinished ? 'FINISHED' : 'TOURNAMENT');
                            }}
                            className="bg-white rounded-[1.5rem] p-4 border border-surface-container shadow-sm hover:shadow-md hover:border-primary/20 transition-all group w-full text-left flex items-center justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2 mb-1">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                 <h4 className="text-xs font-black text-primary uppercase italic truncate font-display tracking-tight group-hover:text-primary">
                                  {t.name}
                                </h4>
                               </div>
                               <div className="flex items-center gap-3 opacity-40">
                                  <div className="flex items-center gap-1">
                                    <Users size={10} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">{(t.athleteCount || t.players.length)} Atletas</span>
                                  </div>
                               </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                                    {roundLabel}
                                  </span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all text-on-surface-variant/20">
                                  <ChevronRight size={16} />
                                </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-[3rem] p-12 text-center border border-dashed border-surface-container-highest flex flex-col items-center">
                      <div className="w-20 h-20 bg-surface-container-lowest rounded-[2rem] flex items-center justify-center text-surface-container-highest mb-6 shadow-inner">
                        <Waves size={40} />
                      </div>
                      <h4 className="text-sm font-black text-on-surface-variant/30 uppercase tracking-widest mb-4 italic">Nenhum torneio ativo</h4>
                      <p className="text-[10px] text-on-surface-variant/40 font-black uppercase tracking-tight max-w-[200px] leading-relaxed mb-8">
                        Comece criando um torneio incrível para sua arena agora mesmo.
                      </p>
                      <button 
                        onClick={() => setStep('TOURNAMENT_NAME')}
                        className="btn-primary py-4 px-10 text-xs"
                      >
                        CRIAR PRIMEIRO TORNEIO
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 'TOURNAMENT_NAME' && (
            <StepContainer 
              key="tournament-name"
              title="Nome do Torneio"
              subtitle="Como se chama esta competição?"
              currentStep={1}
            >
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Nome da Categoria / Torneio</label>
                  <input 
                    type="text"
                    placeholder="Ex: Categoria C Masculina"
                    className="w-full bg-surface-container-low border-none rounded-[2rem] p-6 text-xl font-black text-primary placeholder:text-on-surface-variant/20 focus:ring-2 focus:ring-primary/20 transition-all"
                    value={tournamentName}
                    onFocus={(e) => {
                      setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }, 300);
                    }}
                    onChange={(e) => setTournamentName(e.target.value)}
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-error text-[10px] font-black uppercase tracking-widest flex items-center gap-2 bg-red-50 p-4 rounded-2xl border border-red-100">
                    <AlertCircle size={16} /> {error}
                  </p>
                )}

                <div className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10 flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Info size={20} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Dica Pro</h4>
                    <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-tight leading-relaxed">
                      Use nomes curtos e objetivos para facilitar a visualização nas tabelas e rankings.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setStep('HOME')}
                    className="flex-1 py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={handleNameConfirm}
                    className="flex-1 py-4 bg-primary text-on-primary rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
                  >
                    AVANÇAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'PLAYER_COUNT' && (
            <StepContainer 
              key="player-count"
              title="Atletas"
              subtitle="Quantos atletas participarão do torneio?"
              currentStep={2}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setPlayerCount(Math.max(0, playerCount - 2))}
                    className="w-12 h-12 flex items-center justify-center bg-surface-container rounded-2xl hover:bg-surface-container-high transition-all text-primary active:scale-90 shadow-sm"
                  >
                    <Minus size={20} />
                  </button>
                  <div className="text-center min-w-[80px]">
                    <span className="text-5xl font-display font-black text-primary italic leading-none">
                      {playerCount}
                    </span>
                    <span className="block text-[10px] font-black text-on-surface-variant/30 uppercase tracking-widest mt-1">Atletas</span>
                  </div>
                  <button 
                    onClick={() => setPlayerCount(Math.min(60, playerCount + 2))}
                    className="w-12 h-12 flex items-center justify-center bg-surface-container rounded-2xl hover:bg-surface-container-high transition-all text-primary active:scale-90 shadow-sm"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                {error && (
                  <p className="text-error text-[10px] font-black uppercase tracking-widest flex items-center gap-2 bg-red-50 p-4 rounded-2xl border border-red-100 w-full">
                    <AlertCircle size={16} /> {error}
                  </p>
                )}

                <div className="w-full flex gap-3 pt-4">
                  <button 
                    onClick={() => setStep('TOURNAMENT_NAME')}
                    className="flex-1 py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    VOLTAR
                  </button>
                  <button 
                    onClick={handlePlayerCountConfirm}
                    className="flex-1 py-4 bg-primary text-on-primary rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
                  >
                    AVANÇAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'FORMAT_SELECTION' && (
            <StepContainer 
              key="format"
              title="Formato do Torneio"
              subtitle={`Opções para ${playerCount} atletas.`}
              currentStep={3}
            >
              <div className="space-y-4 pr-2 custom-scrollbar">
                {[
                  { id: 'REI_DA_QUADRA', title: 'REI DA QUADRA (4 Atletas)', desc: 'Formato individual: 3 rodadas onde cada atleta joga com um parceiro diferente a cada jogo. Todos jogam com todos.', icon: TrophyIcon, req: 4 },
                  { id: 'SUPER_6_INDIVIDUAL', title: 'SUPER 6 INDIVIDUAL', desc: 'Formato individual: 5 rodadas de integração total. Você joga uma vez com cada um dos outros 5 atletas como parceiro.', icon: Users, req: 6 },
                  { id: 'SUPER_3_FIXED', title: 'SUPER 3 DUPLAS FIXAS', desc: '3 duplas fixas (6 atletas) em formato todos contra todos.', icon: Users, req: 6 },
                  { id: 'SUPER_4_FIXED', title: 'SUPER 4 DUPLAS FIXAS', desc: '4 duplas fixas (8 atletas) em combate direto. Round Robin completo.', icon: Users, req: 8 },
                  { id: 'SUPER_8_INDIVIDUAL', title: 'SUPER 8 INDIVIDUAL', desc: 'Formato individual: 7 rodadas épicas. Rotação completa de parceiros.', icon: Users, req: 8 },
                  { id: 'SUPER_5_FIXED', title: 'SUPER 5 DUPLAS FIXAS', desc: '5 duplas fixas (10 atletas) em formato todos contra todos.', icon: Users, req: 10 },
                  { id: 'SUPER_10_INDIVIDUAL', title: 'SUPER 10 INDIVIDUAL', desc: 'Formato individual: 9 rodadas de alto nível. Máxima integração.', icon: Users, req: 10 },
                  { id: 'SUPER_12_INDIVIDUAL', title: 'SUPER 12 INDIVIDUAL', desc: 'Formato individual: 11 rodadas de integração total. Rotação completa de parceiros.', icon: Users, req: 12 },
                  { id: 'SUPER_6_FIXED', title: 'SUPER 6 DUPLAS FIXAS', desc: '6 duplas fixas (12 atletas) que se enfrentam todas contra todas.', icon: Users, req: 12 },
                  { id: 'SUPER_8_FIXED', title: 'SUPER 8 DUPLAS FIXAS', desc: '8 duplas fixas (16 atletas) em disputa intensa.', icon: Users, req: 16 },
                  { id: 'SUPER_10_FIXED', title: 'SUPER 10 DUPLAS FIXAS', desc: '10 duplas fixas (20 atletas) em formato de liga.', icon: Users, req: 20 },
                  { id: 'SUPER_12_FIXED', title: 'SUPER 12 DUPLAS FIXAS', desc: '12 duplas fixas (24 atletas). O desafio máximo de resistência.', icon: Users, req: 24 },
                  { id: 'GROUPS_MATA_MATA', title: 'GRUPOS + MATA-MATA', desc: 'Torneio clássico: fase de grupos seguida de eliminatórias.', icon: LayoutGrid, req: 4 },
                ].filter(f => {
                  if (f.id === 'GROUPS_MATA_MATA') return playerCount >= 4;
                  return playerCount === f.req;
                }).map((f) => (
                  <div 
                    key={f.id}
                    onClick={() => {
                      handleFormatConfirm(f.id as TournamentFormat);
                    }}
                    className={cn(
                      "p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between group bg-white",
                      tournamentFormat === f.id ? "border-primary bg-primary/5" : "border-surface-container hover:border-primary/20"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all shadow-sm",
                        tournamentFormat === f.id ? "bg-primary text-on-primary" : "bg-surface-container text-primary"
                      )}>
                        <f.icon size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest">{f.title}</h4>
                        </div>
                        <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-tight mt-1">{f.desc}</p>
                      </div>
                    </div>
                    {tournamentFormat === f.id && <CheckCircle2 size={24} className="text-primary" />}
                  </div>
                ))}

                {playerCount !== 12 && playerCount !== 16 && playerCount !== 20 && playerCount !== 24 && (
                  <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/10 text-primary text-[10px] font-black text-center uppercase tracking-widest leading-relaxed">
                    Formatos &quot;SUPER&quot; exigem quantidades específicas de atletas.
                  </div>
                )}

                <div className="pt-4">
                  <button 
                    onClick={() => setStep('PLAYER_COUNT')}
                    className="w-full py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    VOLTAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'GROUP_CONFIG' && (
            <StepContainer 
              key="group-config"
              title="Estrutura de Grupos"
              subtitle="Escolha a melhor distribuição para o seu torneio."
              currentStep={3}
            >
              <div className="space-y-6">
                <div className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10 flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Sugestão Técnica</h4>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-tight leading-relaxed">
                      {playerCount / 2 <= 8 ? 'Grupos de 4 duplas garantem um torneio equilibrado e dinâmico.' : 
                       playerCount / 2 <= 16 ? 'Dividir em 4 grupos de 4 é excelente para o fluxo das quadras.' :
                       'Muitos atletas? Grupos menores (3) aceleram a fase classificatória.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">Selecione uma Distribuição</label>
                  <div className="grid gap-2">
                    {getPossibleGroupStructures(playerCount / 2).map((possibility) => (
                      <button
                        key={possibility.label}
                        onClick={() => {
                          setTeamsPerGroup(possibility.teamsPerGroup);
                        }}
                        className={cn(
                          "p-5 rounded-[1.5rem] border-2 transition-all flex items-center justify-between text-left",
                          teamsPerGroup === possibility.teamsPerGroup ? "border-primary bg-primary/5" : "border-surface-container bg-white"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                            teamsPerGroup === possibility.teamsPerGroup ? "bg-primary text-on-primary" : "bg-surface-container text-primary"
                          )}>
                            <Users size={18} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-primary uppercase tracking-widest">{possibility.label}</h4>
                            <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-tight mt-1">Sugerido para {playerCount} atletas</p>
                          </div>
                        </div>
                        {teamsPerGroup === possibility.teamsPerGroup && <CheckCircle2 size={20} className="text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">Modo de Confronto</label>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => setGroupsMatchPlay('INTRA')}
                      className={cn(
                        "w-full p-6 rounded-[1.5rem] border-2 transition-all flex items-center gap-4 text-left",
                        groupsMatchPlay === 'INTRA' ? "border-primary bg-primary/5" : "border-surface-container bg-white"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                        groupsMatchPlay === 'INTRA' ? "bg-primary text-on-primary" : "bg-surface-container text-primary"
                      )}>
                        <Grid size={24} />
                      </div>
                      <div className="flex-1">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-primary">Grupo vs Grupo</span>
                        <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-tight mt-1 leading-relaxed">Confrontos entre atletas que estão no mesmo grupo.</p>
                      </div>
                      {groupsMatchPlay === 'INTRA' && <CheckCircle2 size={20} className="text-primary" />}
                    </button>
                    
                    {(playerCount / 2 / teamsPerGroup) % 2 === 0 && (
                      <button 
                        onClick={() => setGroupsMatchPlay('INTER')}
                        className={cn(
                          "w-full p-6 rounded-[1.5rem] border-2 transition-all flex items-center gap-4 text-left",
                          groupsMatchPlay === 'INTER' ? "border-primary bg-primary/5" : "border-surface-container bg-white"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                          groupsMatchPlay === 'INTER' ? "bg-primary text-on-primary" : "bg-surface-container text-primary"
                        )}>
                          <ArrowRightLeft size={24} />
                        </div>
                        <div className="flex-1">
                          <span className="block text-[10px] font-black uppercase tracking-widest text-primary">Inter-Grupos</span>
                          <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-tight mt-1 leading-relaxed">Confrontos entre atletas de grupos diferentes.</p>
                        </div>
                        {groupsMatchPlay === 'INTER' && <CheckCircle2 size={20} className="text-primary" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    onClick={() => setStep('TABLE_COUNT')}
                    className="flex-1 py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    VOLTAR
                  </button>
                  <button 
                    onClick={() => setStep('PLAYOFF_CONFIG')}
                    className="flex-1 py-4 bg-primary text-on-primary rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
                  >
                    AVANÇAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'PLAYOFF_CONFIG' && (
            <StepContainer 
              key="playoff-config"
              title="Fase Eliminatória"
              subtitle="Quais fases o torneio terá?"
              currentStep={3}
            >
              <div className="space-y-6">
                <div className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10 flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-tertiary-container flex items-center justify-center text-on-tertiary-container shrink-0">
                    <Lightbulb size={20} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-on-tertiary-container uppercase tracking-widest mb-1">Dica de Competição</h4>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-tight leading-relaxed">
                      {playerCount >= 32 ? 'Com 16 duplas ou mais, as Oitavas de Final criam um clima de torneio profissional.' : 
                       playerCount >= 16 ? 'Quartas de Final é o ponto ideal de equilíbrio para este volume de atletas.' :
                       'Para poucos atletas, Semifinal e Final garantem emoção sem cansaço excessivo.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'ROUND_OF_16', title: 'Oitavas de Final' },
                    { id: 'QUARTER_FINALS', title: 'Quartas de Final' },
                    { id: 'SEMI_FINALS', title: 'Semifinal' },
                    { id: 'FINAL', title: 'Final' },
                  ].map((round) => {
                    const validation = checkPlayoffPossibility(playerCount, [round.id as PlayoffRound]);
                    const isPossible = validation.possible;
                    const isSelected = playoffRounds.includes(round.id as PlayoffRound);
                    
                    return (
                      <button
                        key={round.id}
                        disabled={!isPossible}
                        onClick={() => {
                          if (isSelected) {
                            setPlayoffRounds(playoffRounds.filter(r => r !== round.id));
                          } else {
                            setPlayoffRounds([...playoffRounds, round.id as PlayoffRound]);
                          }
                        }}
                        className={cn(
                          "p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between group text-left",
                          !isPossible ? "opacity-30 cursor-not-allowed bg-surface-container border-transparent" :
                          isSelected ? "border-primary bg-primary/5 cursor-pointer" : "border-surface-container hover:border-primary/20 cursor-pointer bg-white"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                            isSelected ? "bg-primary text-on-primary" : "bg-surface-container text-primary"
                          )}>
                            <LayoutGrid size={20} />
                          </div>
                          <div>
                            <h3 className="text-xs font-black text-primary uppercase tracking-widest">{round.title}</h3>
                            {!isPossible && <p className="text-error text-[10px] font-black uppercase tracking-widest mt-1">{validation.message}</p>}
                          </div>
                        </div>
                        <div className={cn(
                          "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
                          isSelected ? "bg-primary border-primary text-on-primary shadow-lg shadow-primary/20" : "border-surface-container bg-white"
                        )}>
                          {isSelected ? (
                            <Check size={16} strokeWidth={4} />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-surface-container" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex gap-3 pt-6">
                  <button 
                    onClick={() => setStep('GROUP_CONFIG')}
                    className="flex-1 py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    VOLTAR
                  </button>
                  <button 
                    onClick={() => {
                      setStep('MATCH_FORMAT');
                    }}
                    className="flex-1 py-4 bg-primary text-on-primary rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
                  >
                    PRÓXIMO
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'MATCH_FORMAT' && (
            <StepContainer 
              key="match-format"
              title="Formato do Jogo"
              subtitle="Escolha a quantidade de games que quer disputar."
              currentStep={4}
            >
              <div className="space-y-4">
                {[
                  { id: '6_GAMES_TIEBREAK', title: '6 games com tie-break', desc: 'Disputa padrão de 6 games. Em caso de empate 6x6, haverá um tie-break.' },
                  { id: '6_GAMES_MAX', title: '6 games máximos', desc: 'Partida decidida em 6 games diretos. Quem fizer 6 primeiro vence.' },
                  { id: '5_GAMES_MAX', title: '5 games máximos', desc: 'Partida rápida de 5 games. Quem fizer 5 primeiro vence.' },
                  { id: 'SUM_9_GAMES', title: 'Soma de 9 games', desc: 'Disputa por pontos corridos onde a soma total dos games deve ser 9.' },
                  { id: 'SUM_7_GAMES', title: 'Soma de 7 games', desc: 'Disputa por pontos corridos onde a soma total dos games deve ser 7.' },
                  { id: 'SUM_5_GAMES', title: 'Soma de 5 games', desc: 'Disputa por pontos corridos onde a soma total dos games deve ser 5.' },
                ].map((f) => (
                  <div 
                    key={f.id}
                    onClick={() => handleMatchFormatConfirm(f.id as MatchFormat)}
                    className={cn(
                      "p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center justify-between group bg-white shadow-sm",
                      matchFormat === f.id ? "border-primary bg-primary/5" : "border-surface-container hover:border-primary/20"
                    )}
                  >
                    <div>
                      <h3 className="text-xs font-black text-primary uppercase tracking-widest">{f.title}</h3>
                      <p className="text-on-surface-variant/30 text-[10px] font-black uppercase tracking-tight mt-1">{f.desc}</p>
                    </div>
                    {matchFormat === f.id && <CheckCircle2 className="text-primary" size={28} />}
                  </div>
                ))}

                <div className="pt-6">
                  <button 
                    onClick={() => setStep('FORMAT_SELECTION')}
                    className="w-full py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    VOLTAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'REGISTRATION_TYPE' && (
            <StepContainer 
              key="reg-type"
              title="Formação de Duplas"
              subtitle="Como as duplas serão organizadas?"
              currentStep={5}
            >
              <div className="space-y-4">
                <div 
                  className={cn(
                    "p-8 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center justify-between group bg-white shadow-sm",
                    registrationType === 'RANDOM_DRAW' ? "border-primary bg-primary/5" : "border-surface-container hover:border-primary/20"
                  )}
                  onClick={() => handleRegistrationTypeConfirm('RANDOM_DRAW')}
                >
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all shadow-sm",
                      registrationType === 'RANDOM_DRAW' ? "bg-primary text-on-primary" : "bg-surface-container text-primary"
                    )}>
                      <RefreshCw size={24} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-primary uppercase tracking-widest">Sorteio de Duplas</h3>
                      <p className="text-on-surface-variant/30 text-[10px] font-black uppercase tracking-tight mt-1">O sistema sorteará aleatoriamente as duplas.</p>
                    </div>
                  </div>
                  {registrationType === 'RANDOM_DRAW' && <CheckCircle2 className="text-primary" size={28} />}
                </div>

                <div 
                  className={cn(
                    "p-8 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center justify-between group bg-white shadow-sm",
                    registrationType === 'DEFINED_TEAMS' ? "border-primary bg-primary/5" : "border-surface-container hover:border-primary/20"
                  )}
                  onClick={() => handleRegistrationTypeConfirm('DEFINED_TEAMS')}
                >
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all shadow-sm",
                      registrationType === 'DEFINED_TEAMS' ? "bg-primary text-on-primary" : "bg-surface-container text-primary"
                    )}>
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-primary uppercase tracking-widest">Duplas Definidas</h3>
                      <p className="text-on-surface-variant/30 text-[10px] font-black uppercase tracking-tight mt-1">Você preencherá o nome de cada dupla já formada.</p>
                    </div>
                  </div>
                  {registrationType === 'DEFINED_TEAMS' && <CheckCircle2 className="text-primary" size={28} />}
                </div>

                <div className="pt-6">
                  <button 
                    onClick={() => setStep('TABLE_COUNT')}
                    className="w-full py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    VOLTAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'ATHLETE_REGISTRATION' && (
            <StepContainer 
              key="athletes"
              title={registrationType === 'RANDOM_DRAW' ? "Cadastro de Atletas" : "Cadastro de Duplas"}
              subtitle={registrationType === 'RANDOM_DRAW' ? "Insira o nome de cada atleta para o sorteio." : "Insira o nome de cada dupla."}
              currentStep={6}
            >
              <div className="space-y-4 mb-6">
                {registrationType === 'RANDOM_DRAW' ? (
                  // Individual Registration
                  players.map((player, idx) => (
                    <div key={player.id} className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-widest">
                        Atleta {idx + 1}
                      </label>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="Nome do atleta"
                          className="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-black text-primary placeholder:text-on-surface-variant/20 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                          value={player.name}
                          onChange={(e) => {
                            const newPlayers = [...players];
                            newPlayers[idx].name = e.target.value;
                            setPlayers(newPlayers);
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  // Fixed Duos Registration
                  players.map((team, idx) => {
                    const names = team.name.split(' / ');
                    const p1 = names[0] || '';
                    const p2 = names[1] || '';
                    
                    return (
                      <div key={team.id} className="bg-white p-5 rounded-[2rem] border-2 border-surface-container space-y-4 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-surface-container pb-3">
                          <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-xs font-black text-primary">
                            {idx + 1}
                          </div>
                          <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Dupla {idx + 1}</span>
                        </div>
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={p1}
                            onChange={(e) => {
                              const newPlayers = [...players];
                              newPlayers[idx].name = `${e.target.value} / ${p2}`;
                              setPlayers(newPlayers);
                            }}
                            className="w-full px-5 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-black text-primary placeholder:text-on-surface-variant/20 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                            placeholder="Nome do Atleta 1"
                          />
                          <input
                            type="text"
                            value={p2}
                            onChange={(e) => {
                              const newPlayers = [...players];
                              newPlayers[idx].name = `${p1} / ${e.target.value}`;
                              setPlayers(newPlayers);
                            }}
                            className="w-full px-5 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-black text-primary placeholder:text-on-surface-variant/20 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                            placeholder="Nome do Atleta 2"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {error && (
                <p className="text-error text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 bg-red-50 p-4 rounded-2xl border border-red-100">
                  <AlertCircle size={16} /> {error}
                </p>
              )}
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setStep('REGISTRATION_TYPE')}
                  className="flex-1 py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                >
                  VOLTAR
                </button>
                <button 
                  onClick={handleAthletesConfirm}
                  className="flex-1 py-4 bg-primary text-on-primary rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
                >
                  AVANÇAR
                </button>
              </div>
            </StepContainer>
          )}

          {step === 'DRAWING' && (
            <StepContainer 
              key="drawing"
              title="Sorteando Duplas"
              subtitle="Aguarde enquanto o sistema define as parcerias..."
            >
              <div className="flex flex-col items-center py-10 space-y-10">
                <div className="relative w-40 h-40">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-primary">
                    <RefreshCw size={56} className="animate-pulse" />
                  </div>
                </div>
                
                <div className="w-full space-y-3">
                  <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-widest text-center mb-4">Formando parcerias...</p>
                  {drawnTeams.slice(0, 3).map((team, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: i * 0.5 }}
                      className="bg-white p-5 rounded-[2rem] border border-surface-container flex justify-between items-center shadow-sm"
                    >
                      <span className="text-xs font-black text-primary uppercase tracking-tight">{team.p1.name}</span>
                      <span className="text-[10px] font-black text-on-surface-variant/20 uppercase italic">/</span>
                      <span className="text-xs font-black text-primary uppercase tracking-tight">{team.p2.name}</span>
                    </motion.div>
                  ))}
                  <p className="text-center text-on-surface-variant/40 text-[10px] font-black uppercase tracking-widest animate-bounce pt-6">Finalizando sorteio...</p>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'GROUPS_DISPLAY' && (
            <StepContainer 
              key="groups-display"
              title="Grupos Sorteados"
              subtitle="Confira a composição dos grupos."
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-2 custom-scrollbar">
                  {drawnGroups.map((group) => (
                    <div key={group.id} className="bg-white p-5 rounded-[2rem] border border-surface-container shadow-sm">
                      <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Users size={16} className="text-accent" />
                        Grupo {group.id}
                      </h3>
                      <div className="space-y-2">
                        {group.teams.map((team, idx) => (
                          <div key={team.id} className="bg-surface-container-low p-3 rounded-2xl text-[10px] font-black text-primary uppercase tracking-tight border border-surface-container flex items-center gap-3">
                            <span className="text-on-surface-variant/20 italic">{idx + 1}º</span>
                            {team.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setStep('ATHLETE_REGISTRATION')}
                    className="flex-1 py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    REFAZER
                  </button>
                  <button 
                    onClick={async () => {
                      // Finalize tournament creation for Mata-Mata or Groups
                      if (!user) return;
                      
                      const teamsToGroup = drawnGroups.flatMap(g => g.teams);
                      const groupsCount = drawnGroups.length;
                      const { matches: groupMatches } = generateGroupStage(teamsToGroup, selectedCourts, { groupsCount, teamsPerGroup, type: groupsMatchPlay });
                      
                      // Add playoffs if selected
                      let playoffMatches: Match[] = [];
                      if (playoffRounds.length > 0) {
                        playoffMatches = generatePlayoffs([], selectedCourts, playoffRounds);
                      }
                      
                      const matches = [...groupMatches, ...playoffMatches];
                      const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
                      
                      const tournamentId = `t-${Date.now()}`;
                      const newTournament: TournamentState = {
                        id: tournamentId,
                        name: tournamentName,
                        players: teamsToGroup,
                        athleteCount: playerCount,
                        matches,
                        currentRound: 1,
                        totalRounds,
                        tables: selectedCourts,
                        format: tournamentFormat,
                        matchFormat,
                        registrationType,
                        rankingCriteria,
                        teamsPerGroup,
                        playoffRounds,
                        isFinished: false,
                        createdAt: Date.now()
                      };
                      
                      try {
                        const tournamentData = cleanData({ ...newTournament, uid: user.uid });
                        await setDoc(doc(db, 'tournaments', tournamentId), tournamentData);
                        setActiveTournamentId(tournamentId);
                        setStep('TOURNAMENT');
                      } catch (err) {
                        handleFirestoreError(err, OperationType.WRITE, `tournaments/${tournamentId}`);
                      }
                    }} 
                    className="flex-1 py-4 bg-primary text-on-primary rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
                  >
                    AVANÇAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'RANKING_CRITERIA' && (
            <StepContainer 
              key="ranking-criteria"
              title="Critérios de Desempate"
              subtitle="Defina a ordem de prioridade para o ranking."
              currentStep={7}
            >
              <div className="space-y-6">
                <div className="bg-surface-container-low p-6 rounded-[2rem] border border-surface-container">
                  <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-widest mb-4">Ordem Selecionada</p>
                  <div className="flex flex-wrap gap-2">
                    {rankingCriteria.map((c, idx) => (
                      <div key={c} className="bg-primary text-on-primary px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                        <span className="text-accent italic">{idx + 1}º</span>
                        <span>{c === 'WINS' ? 'Vitórias' : c === 'GAME_BALANCE' ? 'S. Games' : c === 'SET_BALANCE' ? 'S. Sets' : c === 'HEAD_TO_HEAD' ? 'Confronto' : 'Pró'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'WINS', title: 'Vitórias', desc: 'Número total de partidas ganhas.' },
                    { id: 'GAME_BALANCE', title: 'Saldo de Games', desc: 'Games Pró menos Games Contra.' },
                    { id: 'HEAD_TO_HEAD', title: 'Confronto Direto', desc: 'Resultado entre os empatados.' },
                    { id: 'GAMES_WON', title: 'Games Pró', desc: 'Total de games marcados.' },
                    { id: 'SET_BALANCE', title: 'Saldo de Sets', desc: 'Sets Pró menos Sets Contra.' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (rankingCriteria.includes(c.id as RankingCriterion)) {
                          setRankingCriteria(rankingCriteria.filter(item => item !== c.id));
                        } else {
                          setRankingCriteria([...rankingCriteria, c.id as RankingCriterion]);
                        }
                      }}
                      className={cn(
                        "p-6 rounded-[2rem] border-2 transition-all text-left flex items-center justify-between group shadow-sm",
                        rankingCriteria.includes(c.id as RankingCriterion) ? "border-primary bg-primary/5" : "border-surface-container bg-white hover:border-primary/20"
                      )}
                    >
                      <div className="min-w-0">
                        <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-1">{c.title}</h3>
                        <p className="text-[10px] text-on-surface-variant/30 font-black uppercase tracking-tight truncate">{c.desc}</p>
                      </div>
                      <div className={cn(
                        "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
                        rankingCriteria.includes(c.id as RankingCriterion) ? "bg-primary border-primary text-on-primary shadow-lg shadow-primary/20" : "border-surface-container bg-white"
                      )}>
                        {rankingCriteria.includes(c.id as RankingCriterion) ? (
                          <span className="text-xs font-display font-black italic">{rankingCriteria.indexOf(c.id as RankingCriterion) + 1}</span>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-surface-container" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-6 flex gap-3">
                  <button 
                    onClick={() => setStep('MATCH_FORMAT')}
                    className="flex-1 py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    VOLTAR
                  </button>
                  <button 
                    onClick={handleRankingCriteriaConfirm} 
                    disabled={rankingCriteria.length === 0}
                    className="flex-1 py-4 bg-primary text-on-primary rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
                  >
                    AVANÇAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {step === 'TABLE_COUNT' && (
            <StepContainer 
              key="table-count"
              title="Quadras"
              subtitle="Selecione as quadras que serão utilizadas (1 a 12)."
              currentStep={8}
            >
              <div className="flex flex-col items-center gap-8">
                <div className="grid grid-cols-4 gap-4 w-full">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        if (selectedCourts.includes(num)) {
                          setSelectedCourts(selectedCourts.filter(c => c !== num));
                        } else {
                          // Check if court is used in another active tournament
                          const usingTournament = tournaments.find(t => !t.isFinished && t.tables.includes(num));
                          if (usingTournament) {
                            setCourtWarning({ court: num, tournamentName: usingTournament.name });
                          } else {
                            setSelectedCourts([...selectedCourts, num].sort((a, b) => a - b));
                          }
                        }
                      }}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded-[1.5rem] font-display font-black text-2xl transition-all border-2 shadow-sm",
                        selectedCourts.includes(num) 
                          ? "bg-primary border-primary text-on-primary shadow-lg shadow-primary/20 scale-105" 
                          : "bg-white border-surface-container text-primary hover:border-primary/20"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="text-error text-[10px] font-black uppercase tracking-widest flex items-center gap-2 bg-red-50 p-4 rounded-2xl border border-red-100 w-full">
                    <AlertCircle size={16} /> {error}
                  </p>
                )}

                <div className="w-full flex gap-3 pt-4">
                  <button 
                    onClick={() => setStep('RANKING_CRITERIA')}
                    className="flex-1 py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    VOLTAR
                  </button>
                  <button 
                    onClick={handleTableCountConfirm}
                    className="flex-1 py-4 bg-primary text-on-primary rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
                  >
                    AVANÇAR
                  </button>
                </div>
              </div>

              {/* Court Warning Modal */}
              <AnimatePresence>
                {courtWarning && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100"
                    >
                      <div className="bg-amber-50 w-16 h-16 rounded-2xl flex items-center justify-center text-amber-500 mb-6 mx-auto">
                        <AlertCircle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-primary text-center mb-2">Quadra em Uso</h3>
                      <p className="text-slate-500 text-center mb-8 text-sm leading-relaxed">
                        A <span className="font-bold text-primary">Quadra {courtWarning.court}</span> já está sendo utilizada no torneio <span className="font-bold text-accent italic">{courtWarning.tournamentName}</span>. 
                        Deseja utilizá-la mesmo assim?
                      </p>
                      <div className="flex flex-col gap-3">
                        <button 
                          onClick={() => {
                            setSelectedCourts([...selectedCourts, courtWarning.court].sort((a, b) => a - b));
                            setCourtWarning(null);
                          }}
                          className="btn-primary py-4 w-full"
                        >
                          SIM, UTILIZAR
                        </button>
                        <button 
                          onClick={() => setCourtWarning(null)}
                          className="btn-outline py-4 w-full"
                        >
                          NÃO, ESCOLHER OUTRA
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </StepContainer>
          )}

          {step === 'TOURNAMENT' && activeTournament && (
            <motion.div 
              key="tournament"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-2xl mx-auto space-y-6 pt-2 px-2"
            >
              {/* Compact Tournament Switcher Extra */}
              <div className="space-y-1.5 -mx-1 mb-4">
                <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] ml-3">
                  ACESSO RÁPIDO AOS SEUS TORNEIOS ATIVOS
                </span>
                <div className="arena-hero-bg p-3 rounded-[2rem] shadow-xl shadow-primary/20 overflow-hidden relative">
                  {/* Decorative background flare */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16 rounded-full pointer-events-none" />
                  
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 relative z-10">
                    {tournaments.filter(t => !t.isFinished).map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTournamentId(t.id)}
                        className={cn(
                          "flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95",
                          t.id === activeTournament.id 
                            ? "bg-secondary text-on-secondary shadow-lg shadow-black/10 scale-105" 
                            : "bg-white/10 text-white/80 border border-white/5 hover:bg-white/20"
                        )}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tournament Hero Info */}
              <section className="mb-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setStep('HOME')}
                      className="p-2 -ml-2 text-on-surface-variant/40 hover:text-primary transition-colors flex items-center gap-1 group"
                    >
                      <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Início</span>
                    </button>
                  </div>
                  <div className="flex justify-between items-start">
                    <h1 className="text-3xl font-extrabold text-on-surface tracking-tighter font-display break-words leading-tight flex-1 mr-4 italic">
                      {activeTournament.name}
                    </h1>
                    <button 
                      onClick={() => setTournamentToDelete(activeTournament.id)}
                      className="text-[9px] font-black text-red-500/40 uppercase tracking-widest hover:text-red-500 transition-colors border border-red-500/20 px-3 py-1.5 rounded-full mt-1 shrink-0"
                    >
                      Encerrar
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center bg-primary rounded-full px-4 py-1.5 border border-primary shadow-lg shadow-primary/20">
                      <span className="text-[10px] font-black text-on-primary uppercase tracking-widest">
                        {activeTournament.currentRound >= 100 ? (
                          (() => {
                            const types: { [key: number]: string } = {
                              100: 'Oitavas de Final',
                              101: 'Quartas de Final',
                              102: 'Semi-Final',
                              103: 'Final'
                            };
                            return types[activeTournament.currentRound] || `Fase ${activeTournament.currentRound}`;
                          })()
                        ) : (
                          <>RODADA <span className="text-secondary">{activeTournament.currentRound}</span> DE <span className="text-secondary">{Math.max(...activeTournament.matches.map(m => m.round).filter(r => r < 100), 0) || activeTournament.totalRounds}</span></>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Navigation Tabs - Compact */}
              <div className="flex gap-2 p-1 bg-surface-container-low rounded-full max-w-xs mx-auto">
                <button 
                  onClick={() => setTournamentTab('MATCHES')}
                  className={cn(
                    "flex-1 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                    tournamentTab === 'MATCHES' ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/70 hover:bg-white/50"
                  )}
                >
                  Partidas
                </button>
                <button 
                  onClick={() => setTournamentTab('RANKING')}
                  className={cn(
                    "flex-1 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                    tournamentTab === 'RANKING' ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/70 hover:bg-white/50"
                  )}
                >
                  Ranking
                </button>
                <button 
                  onClick={() => setTournamentTab('ROUNDS')}
                  className={cn(
                    "flex-1 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                    tournamentTab === 'ROUNDS' ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/70 hover:bg-white/50"
                  )}
                >
                  Rodadas
                </button>
              </div>

              <div className="space-y-8">
                {tournamentTab === 'MATCHES' && (() => {
                  const currentViewRound = tournamentViewRound ?? activeTournament.currentRound;
                  const matchesByCourt: { [key: number]: Match[] } = {};
                  activeTournament.matches
                    .filter(m => m.round === currentViewRound)
                    .forEach(m => {
                      if (!matchesByCourt[m.table]) matchesByCourt[m.table] = [];
                      matchesByCourt[m.table].push(m);
                    });
                  
                  return Object.entries(matchesByCourt).sort(([a], [b]) => Number(a) - Number(b)).map(([court, matches]) => (
                    <section key={court}>
                      <div className="flex items-baseline gap-3 mb-3">
                        <h2 className="text-xs font-black text-on-surface font-display uppercase tracking-widest">QUADRA {court.padStart(2, '0')}</h2>
                        <div className="h-[1px] flex-grow bg-surface-container-highest opacity-50"></div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                          {matches.map((match) => {
                            const p1 = activeTournament.players.find(p => p.id === match.player1Id) || { id: match.player1Id, name: match.player1Id?.startsWith('TBD') ? 'A Definir' : match.player1Id };
                            const p2 = activeTournament.players.find(p => p.id === match.player2Id) || { id: match.player2Id, name: match.player2Id?.startsWith('TBD') ? 'A Definir' : match.player2Id };
                            const p1p = match.player1PartnerId ? (activeTournament.players.find(p => p.id === match.player1PartnerId) || { id: match.player1PartnerId, name: '' }) : null;
                            const p2p = match.player2PartnerId ? (activeTournament.players.find(p => p.id === match.player2PartnerId) || { id: match.player2PartnerId, name: '' }) : null;
                            const p1Games = match.isCompleted ? match.sets[0].player1 : match.currentSet.player1;
                            const p2Games = match.isCompleted ? match.sets[0].player2 : match.currentSet.player2;

                              return (
                                <div 
                                  key={match.id} 
                                  className={cn(
                                    "rounded-[2.5rem] p-6 shadow-sm relative overflow-hidden group transition-all border-2",
                                    match.isCompleted ? "bg-[#e8fbf4] border-[#d1f5e8]" : "bg-white border-surface-container/30"
                                  )}
                                >
                                  <div className="relative z-10">
                                    {/* Teams and VS - Horizontal Layout */}
                                    <div className="flex items-start justify-between gap-2 mb-4">
                                       <div className="flex-1 min-w-0 text-left">
                                         <span className="text-on-surface-variant/30 text-[7px] font-black uppercase tracking-widest block mb-0.5">Dupla A</span>
                                         <div className="text-[11px] font-black text-primary uppercase leading-tight font-display break-words">
                                           {p1.name}{p1p?.name ? ` / ${p1p.name}` : ''}
                                         </div>
                                       </div>
                                       
                                       <div className="shrink-0 flex items-center justify-center pt-2">
                                         <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                                           <span className="text-primary font-black italic text-[8px]">VS</span>
                                         </div>
                                       </div>

                                       <div className="flex-1 min-w-0 text-right">
                                         <span className="text-on-surface-variant/30 text-[7px] font-black uppercase tracking-widest block mb-0.5">Dupla B</span>
                                         <div className="text-[11px] font-black text-primary uppercase leading-tight font-display break-words">
                                           {p2.name}{p2p?.name ? ` / ${p2p.name}` : ''}
                                         </div>
                                       </div>
                                    </div>

                                    {/* Score Display (Pill) - Compact */}
                                  <div className="bg-white rounded-full px-4 py-1 flex items-center justify-around gap-2 shadow-inner border border-stone-100/50 mb-4">
                                    {/* Team 1 Area */}
                                    <div className="flex flex-1 items-center justify-center relative min-h-[3rem]">
                                      {!match.isCompleted && (
                                        <div className="absolute left-0 flex flex-col items-center justify-center gap-0.5 h-full">
                                          <button 
                                            onClick={() => updateMatchScore(match.id, 1, 1)} 
                                            className="text-primary hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
                                          >
                                            <Plus size={14} />
                                          </button>
                                          <button 
                                            onClick={() => updateMatchScore(match.id, 1, -1)} 
                                            className="text-on-surface-variant/20 hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
                                          >
                                            <Minus size={14} />
                                          </button>
                                        </div>
                                      )}
                                      <span className="text-3xl font-black text-on-surface font-display tracking-tighter">
                                        {p1Games}
                                      </span>
                                    </div>

                                    {/* Vertical Divider */}
                                    <div className="h-8 w-[1px] bg-surface-container-highest/20"></div>

                                    {/* Team 2 Area */}
                                    <div className="flex flex-1 items-center justify-center relative min-h-[3rem]">
                                      <span className="text-3xl font-black text-on-surface font-display tracking-tighter">
                                        {p2Games}
                                      </span>
                                      {!match.isCompleted && (
                                        <div className="absolute right-0 flex flex-col items-center justify-center gap-0.5 h-full text-right">
                                          <button 
                                            onClick={() => updateMatchScore(match.id, 2, 1)} 
                                            className="text-primary hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
                                          >
                                            <Plus size={14} />
                                          </button>
                                          <button 
                                            onClick={() => updateMatchScore(match.id, 2, -1)} 
                                            className="text-on-surface-variant/20 hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
                                          >
                                            <Minus size={14} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <button 
                                    onClick={() => match.isCompleted ? editMatch(match.id) : confirmSet(match.id)}
                                    className={cn(
                                      "w-full py-3 font-black rounded-full transition-all active:scale-[0.98] shadow-md uppercase tracking-widest text-[8px]",
                                      match.isCompleted 
                                        ? "bg-slate-200 text-slate-500 hover:bg-slate-300" 
                                        : "bg-primary text-on-primary hover:bg-primary-dim shadow-primary/10"
                                    )}
                                  >
                                    {match.isCompleted ? "Editar Resultado" : "Confirmar Resultado"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </section>
                  ));
                })()}

                {tournamentTab === 'MATCHES' && (
                  <div className="flex flex-col gap-4 max-w-xs mx-auto pb-10">
                    {(() => {
                      const currentViewRound = tournamentViewRound ?? activeTournament.currentRound;
                      const matchesInView = activeTournament.matches.filter(m => m.round === currentViewRound);
                      const allPlayedInView = matchesInView.every(m => m.isCompleted);
                      const isLastRound = currentViewRound === (Math.max(...activeTournament.matches.map(m => m.round)) || activeTournament.totalRounds);
                      
                      return (
                        <>
                          {currentViewRound === activeTournament.currentRound && allPlayedInView && (
                            <button 
                              onClick={nextRound}
                              className="btn-primary w-full shadow-xl shadow-primary/20 flex items-center justify-center gap-3 py-6"
                            >
                              <span className="text-xs font-black uppercase tracking-widest">
                                {isLastRound ? 'FINALIZAR TORNEIO' : 'PRÓXIMA RODADA'}
                              </span>
                              <ChevronRight size={18} />
                            </button>
                          )}
                          
                          {currentViewRound > Math.min(...activeTournament.matches.map(m => m.round)) && (
                            <button 
                              onClick={prevRound}
                              className="btn-outline w-full hover:bg-surface-container py-4 flex items-center justify-center gap-3"
                            >
                              <ChevronLeft size={16} className="text-on-surface-variant/40" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">RODADA ANTERIOR</span>
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {tournamentTab === 'RANKING' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {(() => {
                      const rankings = calculateRankings(activeTournament.players, activeTournament.matches, activeTournament.rankingCriteria);
                      const champion = rankings[0];
                      const totalGames = activeTournament.matches.reduce((acc, m) => acc + (m.sets[0]?.player1 || 0) + (m.sets[0]?.player2 || 0), 0);

                      return (
                        <>
                          <section>
                            <div className="relative bg-secondary-container rounded-[2rem] overflow-hidden p-8 flex items-center justify-between shadow-xl shadow-secondary/10 border border-secondary/20 min-h-[14rem]">
                              <div className="relative z-10 flex-1">
                                <div className="inline-flex items-center gap-2 bg-on-secondary-container/10 px-3 py-1 rounded-full mb-4">
                                  <TrophyIcon size={14} className="text-primary" />
                                  <span className="font-display font-black text-on-secondary-container text-[10px] uppercase tracking-tighter italic">LÍDER</span>
                                </div>
                                <h3 className="font-display text-4xl font-black text-on-secondary-container tracking-tighter mb-6 break-words">
                                  {champion.name}
                                </h3>
                                <div className="flex gap-6">
                                  <div>
                                    <p className="font-black text-[9px] uppercase text-on-secondary-container/40 tracking-widest">Vitórias</p>
                                    <p className="font-display text-xl font-black text-on-secondary-container">{champion.wins}</p>
                                  </div>
                                  <div>
                                    <p className="font-black text-[9px] uppercase text-on-secondary-container/40 tracking-widest">Saldo</p>
                                    <p className="font-display text-xl font-black text-on-secondary-container">{champion.gameBalance > 0 ? `+${champion.gameBalance}` : champion.gameBalance}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="relative z-10 w-24 h-24 flex items-center justify-center shrink-0">
                                <TrophyIcon size={48} className="text-primary/20" />
                              </div>
                            </div>
                          </section>

                          <div className="bg-surface-container-low rounded-[2rem] p-4 space-y-3">
                            {rankings.slice(1).map((p, idx) => (
                              <div key={p.id} className="bg-white p-4 rounded-xl flex items-center gap-4 border border-surface-container shadow-sm">
                                <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-surface-container-highest text-on-surface font-black rounded-full text-xs">
                                  {idx + 2}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="w-full font-black text-sm text-primary uppercase tracking-tight mb-1 break-words">
                                    {p.name}
                                  </div>
                                  <div className="flex gap-4">
                                    <div className="flex items-baseline gap-1">
                                      <span className="font-black text-[8px] uppercase text-on-surface-variant/40 tracking-widest">Vit:</span>
                                      <span className="font-black text-[10px] text-on-surface">{p.wins}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="font-black text-[8px] uppercase text-on-surface-variant/40 tracking-widest">Sal:</span>
                                      <span className="font-black text-[10px] text-on-surface">{p.gameBalance > 0 ? `+${p.gameBalance}` : p.gameBalance}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {tournamentTab === 'ROUNDS' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {Array.from(new Set(activeTournament.matches.map(m => m.round))).sort((a, b) => a - b).map((roundNum) => (
                      <div key={roundNum} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                            roundNum === activeTournament.currentRound ? "bg-primary text-on-primary" : "bg-primary/5 text-primary"
                          )}>
                            {(() => {
                              if (roundNum >= 100) {
                                const types: { [key: number]: string } = {
                                  100: 'Oitavas de Final',
                                  101: 'Quartas de Final',
                                  102: 'Semi-Final',
                                  103: 'Final'
                                };
                                return types[roundNum] || `Fase ${roundNum}`;
                              }
                              return `Rodada ${roundNum}`;
                            })()} {roundNum === activeTournament.currentRound && '(ATUAL)'}
                          </span>
                          <div className="h-[1px] flex-grow bg-surface-container-highest opacity-50"></div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {activeTournament.matches
                            .filter(m => m.round === roundNum)
                            .map((m) => {
                              const p1 = activeTournament.players.find(p => p.id === m.player1Id) || { id: m.player1Id, name: m.player1Id?.startsWith('TBD') ? 'A Definir' : m.player1Id };
                              const p2 = activeTournament.players.find(p => p.id === m.player2Id) || { id: m.player2Id, name: m.player2Id?.startsWith('TBD') ? 'A Definir' : m.player2Id };
                              const p1p = m.player1PartnerId ? (activeTournament.players.find(p => p.id === m.player1PartnerId) || { id: m.player1PartnerId, name: '' }) : null;
                              const p2p = m.player2PartnerId ? (activeTournament.players.find(p => p.id === m.player2PartnerId) || { id: m.player2PartnerId, name: '' }) : null;
                              const p1Games = m.isCompleted ? m.sets[0].player1 : m.currentSet.player1;
                              const p2Games = m.isCompleted ? m.sets[0].player2 : m.currentSet.player2;

                              return (
                                <div key={m.id} className="bg-white p-3 rounded-xl flex items-center justify-between gap-3 border border-surface-container/30">
                                  <div className="flex-1 text-right min-w-0">
                                    <div className="text-[9px] font-black text-primary uppercase leading-tight break-words">
                                      <p>{p1.name}{p1p ? ` / ${p1p.name}` : ''}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1 rounded-full border border-surface-container scale-90">
                                    <span className={cn("text-xs font-black font-display", m.isCompleted && p1Games < p2Games ? "text-on-surface-variant/20" : "text-primary")}>{p1Games}</span>
                                    <span className="text-on-surface-variant/20 font-black italic text-[7px] tracking-widest shrink-0">VS</span>
                                    <span className={cn("text-xs font-black font-display", m.isCompleted && p2Games < p1Games ? "text-on-surface-variant/20" : "text-primary")}>{p2Games}</span>
                                  </div>

                                  <div className="flex-1 text-left min-w-0">
                                    <div className="text-[9px] font-black text-primary uppercase leading-tight break-words">
                                      <p>{p2.name}{p2p ? ` / ${p2p.name}` : ''}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

                {/* Removed Bottom Actions as requested */}
            </motion.div>
          )}

          {step === 'ALL_ROUNDS' && activeTournament && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-2xl mx-auto space-y-6 pt-16"
            >
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <h2 className="text-[10px] font-black text-on-surface-variant/70 uppercase tracking-widest truncate">
                    {activeTournament.name}
                  </h2>
                  <h1 className="text-3xl font-extrabold text-on-surface tracking-tighter font-display">
                    Todas as Rodadas
                  </h1>
                </div>
              </div>

              <div className="space-y-8">
                {Array.from(new Set(activeTournament.matches.map(m => m.round))).sort((a, b) => a - b).map((roundNum) => (
                    <div key={roundNum} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full">
                          {(() => {
                            if (roundNum >= 100) {
                              const types: { [key: number]: string } = {
                                100: 'Oitavas de Final',
                                101: 'Quartas de Final',
                                102: 'Semi-Final',
                                103: 'Final'
                              };
                              return types[roundNum] || `Playoff ${roundNum}`;
                            }
                            return `Rodada ${roundNum}`;
                          })()}
                        </span>
                        <div className="h-[1px] flex-grow bg-surface-container-highest"></div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {activeTournament.matches
                          .filter(m => m.round === roundNum)
                          .map((m) => {
                            const fp1 = activeTournament.players.find(p => p.id === m.player1Id) || { id: m.player1Id, name: m.player1Id.startsWith('TBD') ? 'A Definir' : m.player1Id };
                            const fp2 = activeTournament.players.find(p => p.id === m.player2Id) || { id: m.player2Id, name: m.player2Id.startsWith('TBD') ? 'A Definir' : m.player2Id };
                            const fp1p = m.player1PartnerId ? (activeTournament.players.find(p => p.id === m.player1PartnerId) || { id: m.player1PartnerId, name: '' }) : null;
                            const fp2p = m.player2PartnerId ? (activeTournament.players.find(p => p.id === m.player2PartnerId) || { id: m.player2PartnerId, name: '' }) : null;
                            const p1Games = m.isCompleted ? m.sets[0].player1 : m.currentSet.player1;
                            const p2Games = m.isCompleted ? m.sets[0].player2 : m.currentSet.player2;

                            return (
                              <div key={m.id} className="bg-surface-container-low p-4 rounded-2xl shadow-sm flex items-center justify-between gap-4 border border-surface-container/50">
                                <div className="flex-1 text-right min-w-0">
                                    <div className="text-[10px] font-bold text-primary leading-tight break-words">
                                      {fp1.name}{fp1p?.name ? ` / ${fp1p.name}` : ''}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 bg-surface-container-lowest px-4 py-1.5 rounded-full border border-surface-container">
                                  <span className={cn(
                                    "text-lg font-black font-display",
                                    m.isCompleted && p1Games < p2Games ? "text-on-surface-variant/20" : "text-primary"
                                  )}>{p1Games}</span>
                                  <span className="text-on-surface-variant/40 font-black italic text-[8px] tracking-widest">VS</span>
                                  <span className={cn(
                                    "text-lg font-black font-display",
                                    m.isCompleted && p2Games < p1Games ? "text-on-surface-variant/20" : "text-primary"
                                  )}>{p2Games}</span>
                                </div>

                                <div className="flex-1 text-left min-w-0">
                                  <div className="text-[10px] font-bold text-primary leading-tight break-words">
                                    {fp2.name}{fp2p?.name ? ` / ${fp2p.name}` : ''}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                ))}
              </div>
            </motion.div>
          )}
               {step === 'FINISHED' && activeTournament && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-2xl mx-auto space-y-8 pt-4 px-2 flex flex-col justify-center min-h-[calc(100dvh-140px)]"
            >
              {/* Classification Header */}
              <div className="space-y-2">
                <span className="bg-tertiary-container text-on-tertiary-container px-4 py-1 rounded-full font-black text-[10px] tracking-widest uppercase">
                  {activeTournament.format === 'SUPER_8_INDIVIDUAL' ? 'SUPER 8' : 'TORNEIO'}
                </span>
                <h2 className="font-display text-4xl md:text-5xl font-black tracking-tighter text-on-surface">
                  Classificação Final
                </h2>
              </div>

              {/* Champion Spotlight */}
              {(() => {
                const rankings = calculateRankings(activeTournament.players, activeTournament.matches, activeTournament.rankingCriteria);
                const champion = rankings[0];
                const totalGames = activeTournament.matches.reduce((acc, m) => acc + (m.sets[0]?.player1 || 0) + (m.sets[0]?.player2 || 0), 0);

                return (
                  <>
                    <section>
                      <div className="relative arena-hero-bg rounded-[2rem] overflow-hidden p-6 flex items-center justify-between shadow-xl shadow-primary/20 border border-white/10">
                        <div className="relative z-10 flex-1">
                          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full mb-3">
                            <TrophyIcon size={12} className="text-secondary" />
                            <span className="font-display font-black text-white text-[9px] uppercase tracking-tighter italic">CAMPEÃO</span>
                          </div>
                          <h3 className="font-display text-2xl md:text-3xl font-black text-white tracking-tighter mb-4 break-words leading-tight uppercase italic">
                            {champion.name}
                          </h3>
                          <div className="flex gap-6">
                            <div>
                              <p className="font-black text-[9px] uppercase text-white/40 tracking-widest leading-none mb-1">Vitórias</p>
                              <p className="font-display text-xl font-black text-white">{champion.wins}</p>
                            </div>
                            <div>
                              <p className="font-black text-[9px] uppercase text-white/40 tracking-widest leading-none mb-1">Saldo</p>
                              <p className="font-display text-xl font-black text-white">{champion.gameBalance > 0 ? `+${champion.gameBalance}` : champion.gameBalance}</p>
                            </div>
                            <div>
                              <p className="font-black text-[9px] uppercase text-white/40 tracking-widest leading-none mb-1">Pró</p>
                              <p className="font-display text-xl font-black text-white">{champion.gamesWon}</p>
                            </div>
                          </div>
                        </div>
                        <div className="relative z-10 w-20 h-20 md:w-24 md:h-24 flex items-center justify-center shrink-0">
                          <div className="absolute inset-0 bg-secondary/20 rounded-full blur-2xl"></div>
                          <div className="w-full h-full bg-white/10 rounded-full border-2 border-white/30 shadow-lg flex items-center justify-center overflow-hidden">
                            <TrophyIcon size={36} className="text-secondary" />
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Leaderboard */}
                    <section className="bg-surface-container-low rounded-[2.5rem] p-4 md:p-6 mb-6">
                      <div className="flex flex-col gap-3">
                        {rankings.slice(1, 4).map((p, idx) => (
                          <div key={p.id} className="bg-white p-5 rounded-2xl flex items-center gap-5 border border-surface-container shadow-sm">
                            <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-surface-container-highest text-on-surface font-display font-black rounded-full text-lg">
                              {idx + 2}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="w-full font-display font-black text-xl text-on-surface tracking-tight mb-2 break-words leading-tight">
                                {p.name}
                              </div>
                              <div className="flex gap-6">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-black text-[9px] uppercase text-on-surface-variant/60 tracking-widest">Vit:</span>
                                  <span className="font-black text-xs text-on-surface">{p.wins}</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-black text-[9px] uppercase text-on-surface-variant/60 tracking-widest">Sal:</span>
                                  <span className="font-black text-xs text-on-surface">{p.gameBalance > 0 ? `+${p.gameBalance}` : p.gameBalance}</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-black text-[9px] uppercase text-on-surface-variant/60 tracking-widest">Pró:</span>
                                  <span className="font-black text-xs text-on-surface">{p.gamesWon}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                  </>
                );
              })()}

              {/* Bottom Actions */}
              <div className="flex flex-col gap-4 pt-8">
                <button 
                  onClick={() => {
                    deleteTournament(activeTournament.id);
                    setStep('HOME');
                  }}
                  className="w-full py-5 bg-primary text-on-primary rounded-full font-black text-sm uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3"
                >
                  FINALIZAR TORNEIO
                  <CheckCircle2 size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'PROFILE' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <div className="arena-hero-bg pt-4 pb-12 px-8 flex flex-col items-center text-center">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <div className="absolute inset-0 bg-white/10 rounded-[2rem] blur-2xl"></div>
                  {user?.photoURL ? (
                    <Image 
                      src={user.photoURL} 
                      alt={user.displayName || 'User'} 
                      width={96} 
                      height={96} 
                      className="rounded-[2rem] border-4 border-white shadow-xl relative z-10"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10 rounded-[2rem] flex items-center justify-center text-white relative z-10 border-4 border-white backdrop-blur-md shadow-xl">
                      <UserIcon size={36} />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter leading-none mb-2">
                    {user?.displayName || 'Aventureiro Beach'}
                  </h2>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="wave-container px-6 pt-10 pb-32">
                <div className="max-w-2xl mx-auto space-y-8">
                  <div className="bg-white rounded-[2.5rem] p-8 border border-surface-container shadow-sm space-y-6">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest border-b border-surface-container pb-4">Configurações da Conta</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Zap size={20} />
                          </div>
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Plano Atual</span>
                        </div>
                        <span className="px-3 py-1 bg-accent text-on-accent rounded-full text-[8px] font-black uppercase tracking-widest">
                          {isPremium ? 'PREMIUM' : 'FREE'}
                        </span>
                      </div>

                      {!isPremium && (
                        <button 
                          onClick={() => setShowUpgradeModal(true)}
                          className="w-full p-4 bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl flex items-center justify-between hover:bg-primary/10 transition-all group"
                        >
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Fazer Upgrade</span>
                          <ChevronRight size={18} className="text-primary group-hover:translate-x-1 transition-transform" />
                        </button>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => signOut(auth)}
                    className="w-full py-5 bg-red-50 text-red-500 rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100"
                  >
                    <LogOut size={18} />
                    Sair da Conta
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'TOURNAMENTS_LIST' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full md:pb-20"
            >
              <div className="arena-hero-bg pt-4 pb-12 px-8 flex flex-col items-center text-center">
                <div className="mb-2">
                  <div className="p-3 bg-white/10 rounded-2xl mb-4 inline-block backdrop-blur-sm border border-white/20">
                    <BarChart size={24} className="text-white" />
                  </div>
                  <h1 className="text-4xl font-display font-black text-white italic uppercase tracking-tighter leading-none mb-2">
                    Meus Torneios
                  </h1>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                    Gerencie o histórico e torneios ativos.
                  </p>
                </div>
              </div>

              <div className="wave-container px-6 pt-10 pb-32">
                <div className="max-w-2xl mx-auto space-y-4">
                  {tournaments.length > 0 ? (
                    tournaments.sort((a, b) => b.createdAt - a.createdAt).map(t => (
                      <div 
                        key={t.id} 
                        className="bg-white rounded-[2rem] p-6 border border-surface-container shadow-sm hover:shadow-md transition-all group"
                      >
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-display font-black text-primary uppercase italic leading-none break-words pr-4">
                                  {t.name}
                                </h3>
                                <button 
                                   onClick={() => setTournamentToDelete(t.id)}
                                   className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors flex items-center gap-1 shrink-0"
                                >
                                  <X size={12} />
                                  FINALIZAR
                                </button>
                              </div>

                              <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">
                                  {(t.athleteCount || t.players.length)} Atletas
                                </span>
                                <span className="w-1 h-1 bg-on-surface-variant/20 rounded-full" />
                                <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">
                                  {(() => {
                                    if (t.currentRound >= 100) {
                                      const types: { [key: number]: string } = {
                                        100: 'Oitavas',
                                        101: 'Quartas',
                                        102: 'Semi',
                                        103: 'Final'
                                      };
                                      return types[t.currentRound] || `Playoff ${t.currentRound}`;
                                    }
                                    const totalRegular = Math.max(...t.matches.map(m => m.round).filter(r => r < 100), 0) || t.totalRounds;
                                    return `Rodada ${t.currentRound}/${totalRegular}`;
                                  })()}
                                </span>
                              </div>

                              <div className="flex gap-2 mb-2">
                                <button 
                                  onClick={() => {
                                    setActiveTournamentId(t.id);
                                    setTournamentTab('MATCHES');
                                    setTournamentViewRound(null);
                                    setStep('TOURNAMENT');
                                  }}
                                  className="flex-1 py-3 bg-surface-container-low rounded-full font-black text-[9px] text-primary hover:bg-surface-container-high transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                  <Users size={14} />
                                  Partidas
                                </button>
                                <button 
                                  onClick={() => {
                                    setActiveTournamentId(t.id);
                                    setTournamentTab('ROUNDS');
                                    setTournamentViewRound(null);
                                    setStep('TOURNAMENT');
                                  }}
                                  className="flex-1 py-3 bg-surface-container-low rounded-full font-black text-[9px] text-primary hover:bg-surface-container-high transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                  <History size={14} />
                                  Rodadas
                                </button>
                                <button 
                                  onClick={() => {
                                    setActiveTournamentId(t.id);
                                    setTournamentTab('RANKING');
                                    setTournamentViewRound(null);
                                    setStep('TOURNAMENT');
                                  }}
                                  className="flex-1 py-3 bg-surface-container-low rounded-full font-black text-[9px] text-primary hover:bg-surface-container-high transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                  <BarChart size={14} />
                                  Ranking
                                </button>
                              </div>
                              <button 
                                onClick={() => {
                                  setActiveTournamentId(t.id);
                                  setTournamentTab('MATCHES');
                                  setTournamentViewRound(null);
                                  setStep(t.isFinished ? 'FINISHED' : 'TOURNAMENT');
                                }}
                                className="w-full py-3 border-2 border-black rounded-full font-black text-[10px] text-black hover:bg-black/5 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                              >
                                <Settings size={14} />
                                Gerenciar
                              </button>
                          </div>

                    ))
                  ) : (
                    <div className="text-center py-20 px-8 bg-surface-container-low rounded-[3rem] border-2 border-dashed border-surface-container">
                      <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-on-surface-variant/20 mx-auto mb-6 shadow-sm">
                        <TrophyIcon size={40} />
                      </div>
                      <p className="text-sm font-black text-on-surface-variant/30 uppercase tracking-widest leading-relaxed">
                        Você ainda não organizou nenhum torneio.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upgrade Modal */}
        <AnimatePresence>
          {showUpgradeModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[3rem] p-10 md:p-14 max-w-lg w-full shadow-2xl border border-surface-container relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8">
                  <button onClick={() => setShowUpgradeModal(false)} className="text-on-surface-variant/20 hover:text-primary transition-colors">
                    <X size={28} />
                  </button>
                </div>

                <div className="bg-accent/20 w-24 h-24 rounded-[2rem] flex items-center justify-center text-accent mb-10 mx-auto shadow-inner">
                  <Zap size={48} />
                </div>

                <div className="text-center space-y-4 mb-12">
                  <h3 className="text-4xl font-display font-black text-primary tracking-tight uppercase italic">
                    Seja <span className="text-accent">BeachPró Premium</span>
                  </h3>
                  <p className="text-on-surface-variant/60 text-sm font-black uppercase tracking-widest leading-relaxed">
                    Libere todos os formatos de torneio e organize eventos profissionais sem limites.
                  </p>
                </div>

                <div className="space-y-5 mb-12">
                  {[
                    'Torneios Mata-Mata Ilimitados',
                    'Configuração de Grupos Personalizada',
                    'Fases Eliminatórias (Oitavas a Final)',
                    'Suporte Prioritário',
                    'Sem Anúncios'
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-4 text-primary font-black text-[10px] uppercase tracking-widest">
                      <div className="bg-accent/20 p-1.5 rounded-full text-accent shadow-sm">
                        <CheckCircle2 size={18} />
                      </div>
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <button 
                    onClick={() => {
                      // In a real app, this would trigger the Google Play Billing flow
                      setShowUpgradeModal(false);
                    }}
                    className="w-full py-6 bg-primary text-on-primary rounded-full text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group hover:bg-primary-dim transition-all"
                  >
                    <span>ASSINAR AGORA</span>
                    <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="text-[10px] text-on-surface-variant/30 text-center font-black uppercase tracking-widest">
                    Apenas R$ 19,90 / mês
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Tournament Limit Popup */}
        <AnimatePresence>
          {showLimitPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-surface-container"
              >
                <div className="bg-red-50 w-20 h-20 rounded-[2rem] flex items-center justify-center text-red-500 mb-8 mx-auto shadow-sm">
                  <AlertCircle size={40} />
                </div>
                <h3 className="text-xs font-black text-primary text-center mb-2 uppercase tracking-widest">Limite Atingido</h3>
                <p className="text-[10px] font-black text-on-surface-variant/40 text-center mb-10 uppercase tracking-tight leading-relaxed">
                  O sistema permite até <span className="text-primary">4 torneios simultâneos</span>. 
                  Encerre um torneio antigo para criar um novo.
                </p>
                <button 
                  onClick={() => setShowLimitPopup(false)}
                  className="w-full py-4 bg-primary text-on-primary rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
                >
                  ENTENDI
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Popup */}
        <AnimatePresence>
          {tournamentToDelete && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-surface-container"
              >
                <div className="bg-red-50 w-20 h-20 rounded-[2rem] flex items-center justify-center text-red-500 mb-8 mx-auto shadow-sm">
                  <AlertCircle size={40} />
                </div>
                <h3 className="text-xs font-black text-primary text-center mb-2 uppercase tracking-widest">Encerrar Torneio?</h3>
                <p className="text-[10px] font-black text-on-surface-variant/40 text-center mb-10 uppercase tracking-tight leading-relaxed">
                  Tem certeza que deseja encerrar e apagar este torneio? <span className="text-red-500">Esta ação é irreversível e todas as informações serão apagadas permanentemente.</span>
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      deleteTournament(tournamentToDelete);
                      setTournamentToDelete(null);
                    }}
                    className="w-full py-5 bg-red-500 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                  >
                    SIM, ENCERRAR E APAGAR
                  </button>
                  <button 
                    onClick={() => setTournamentToDelete(null)}
                    className="w-full py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    CANCELAR
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>

    <BottomNav 
      activeStep={step} 
      setStep={setStep} 
      isVisible={!isKeyboardVisible && user !== null} 
      resetApp={resetApp}
    />
  </main>
  </ErrorBoundary>
);
}
