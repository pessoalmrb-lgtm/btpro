'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
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
  LogIn
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppStep, Player, TournamentState, Match, TournamentFormat, MatchFormat, TeamRegistrationType, RankingCriterion } from '../types';
import { generateRoundRobin, validateSetScore, calculateRankings, generateGroupStage, generateIndividualDoubles } from '../lib/tournament-logic';
import { cn } from '../lib/utils';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, User, handleFirestoreError, OperationType } from '../firebase';

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, errorInfo: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Ocorreu um erro inesperado.";
      try {
        const parsed = JSON.parse(this.state.errorInfo || "");
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          displayMessage = "Erro de permissão no banco de dados. Por favor, verifique se você está logado corretamente.";
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

const Header = ({ step, resetApp, user }: { step: AppStep, resetApp: () => void, user: User | null }) => (
  <div className="flex items-center justify-between mb-6 md:mb-8 w-full max-w-6xl">
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="flex items-center gap-2 md:gap-3"
    >
      <div className="bg-accent p-2 md:p-2.5 rounded-xl text-primary shadow-sm">
        <Waves size={20} className="md:w-6 md:h-6" />
      </div>
      <div>
        <h1 className="text-lg md:text-xl font-display font-bold text-primary leading-none">BeachPró</h1>
        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestão de Torneios</span>
      </div>
    </motion.div>
    
    <div className="flex items-center gap-2">
      {user && step !== 'HOME' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button 
            onClick={resetApp} 
            className="flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2.5 md:py-2.5 bg-primary text-white rounded-xl shadow-lg hover:bg-primary/90 hover:-translate-y-0.5 transition-all text-xs md:text-sm font-bold border-2 border-accent/20"
          >
            <Home size={14} className="md:w-4 md:h-4" />
            <span className="hidden sm:inline">Meus Torneios</span>
          </button>
        </motion.div>
      )}
      
      {user && (
        <div className="hidden sm:flex flex-col items-end mr-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logado como</span>
          <span className="text-xs font-bold text-primary truncate max-w-[150px]">{user.email}</span>
        </div>
      )}
      
      {user && (
        <button 
          onClick={() => signOut(auth)}
          className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
          title="Sair"
        >
          <LogOut size={18} />
        </button>
      )}
    </div>
  </div>
);

const StepContainer = ({ children, title, subtitle, currentStep }: { children: React.ReactNode, title: string, subtitle?: string, currentStep?: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="max-w-2xl mx-auto w-full px-2 md:px-0"
  >
    <div className="text-center mb-6 md:mb-8">
      {currentStep !== undefined && (
        <div className="flex justify-center gap-1.5 mb-4 md:mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <div 
              key={s} 
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                s === currentStep ? "w-8 bg-primary" : "w-2 bg-slate-200"
              )} 
            />
          ))}
        </div>
      )}
      <h2 className="text-2xl md:text-4xl font-display font-bold text-primary mb-2">{title}</h2>
      {subtitle && <p className="text-slate-500 font-medium text-sm md:text-base">{subtitle}</p>}
    </div>
    <div className="glass-card p-6 md:p-10">
      {children}
    </div>
  </motion.div>
);

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

  // Creation Flow State
  const [tournamentName, setTournamentName] = useState('');
  const [playerCount, setPlayerCount] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedCourts, setSelectedCourts] = useState<number[]>([]);
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('6_GAMES_TIEBREAK');
  const [registrationType, setRegistrationType] = useState<TeamRegistrationType>('RANDOM_DRAW');
  const [tournamentFormat, setTournamentFormat] = useState<TournamentFormat>('SUPER_8_INDIVIDUAL');
  const [rankingCriteria, setRankingCriteria] = useState<RankingCriterion[]>(['WINS', 'GAME_BALANCE', 'HEAD_TO_HEAD']);
  const [error, setError] = useState<string | null>(null);
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  const [, setIsDrawing] = useState(false);
  const [drawnTeams, setDrawnTeams] = useState<{p1: Player, p2: Player}[]>([]);
  const [courtWarning, setCourtWarning] = useState<{ court: number; tournamentName: string } | null>(null);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null);

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
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError("E-mail ou senha incorretos.");
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError("Este e-mail já está sendo usado.");
      } else if (err.code === 'auth/invalid-email') {
        setAuthError("E-mail inválido.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError("O login por e-mail/senha não está ativado no console do Firebase.");
      } else if (err.code === 'auth/weak-password') {
        setAuthError("A senha é muito fraca.");
      } else {
        setAuthError(`Erro: ${err.message || "Ocorreu um erro ao processar sua solicitação."}`);
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
    } catch (err: any) {
      console.error("Google login error:", err);
      if (err.code === 'auth/popup-blocked') {
        setAuthError("O popup de login foi bloqueado pelo seu navegador.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // User closed the popup, ignore
      } else if (err.code === 'auth/unauthorized-domain') {
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
    setStep('MATCH_FORMAT');
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
          await setDoc(doc(db, 'tournaments', tournamentId), { ...newTournament, uid: user.uid });
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
        if (tournamentFormat === 'GROUPS_MATA_MATA') {
          matches = generateGroupStage(finalTeams, selectedCourts, 2);
        } else {
          matches = generateRoundRobin(finalTeams, selectedCourts);
        }

        const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
        
        const tournamentId = `t-${Date.now()}`;
        const newTournament: TournamentState = {
          id: tournamentId,
          name: tournamentName,
          players: finalTeams,
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
          await setDoc(doc(db, 'tournaments', tournamentId), { ...newTournament, uid: user.uid });
          setActiveTournamentId(tournamentId);
          setStep('TOURNAMENT');
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `tournaments/${tournamentId}`);
        }
      }, 3000);
    } else {
      const finalTeams = [...players];
      let matches: Match[] = [];
      if (tournamentFormat === 'GROUPS_MATA_MATA') {
        matches = generateGroupStage(finalTeams, selectedCourts, 2);
      } else {
        matches = generateRoundRobin(finalTeams, selectedCourts);
      }

      const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
      
      const tournamentId = `t-${Date.now()}`;
      const newTournament: TournamentState = {
        id: tournamentId,
        name: tournamentName,
        players: finalTeams,
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
        await setDoc(doc(db, 'tournaments', tournamentId), { ...newTournament, uid: user.uid });
        setActiveTournamentId(tournamentId);
        setStep('TOURNAMENT');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tournaments/${tournamentId}`);
      }
    }
  };

  const handleRankingCriteriaConfirm = () => {
    setStep('TABLE_COUNT');
  };

  const handleTableCountConfirm = () => {
    if (selectedCourts.length === 0) {
      setError("Selecione pelo menos uma quadra.");
      return;
    }
    setError(null);

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
    
    const newMatches = activeTournament.matches.map(m => {
        if (m.id !== matchId) return m;
        return { 
          ...m, 
          sets: [set], 
          isCompleted: true, 
          winnerId,
          currentSet: set
        };
    });

    try {
      await updateDoc(doc(db, 'tournaments', activeTournament.id), { matches: newMatches });
      setError(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tournaments/${activeTournament.id}`);
    }
  };

  const nextRound = async () => {
    if (!activeTournament) return;
    if (activeTournament.currentRound < activeTournament.totalRounds) {
      try {
        await updateDoc(doc(db, 'tournaments', activeTournament.id), { currentRound: activeTournament.currentRound + 1 });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tournaments/${activeTournament.id}`);
      }
    } else {
      try {
        await updateDoc(doc(db, 'tournaments', activeTournament.id), { isFinished: true });
        setStep('FINISHED');
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
    if (activeTournament.currentRound > 1) {
      try {
        await updateDoc(doc(db, 'tournaments', activeTournament.id), { currentRound: activeTournament.currentRound - 1 });
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
      if (activeTournamentId === id) setActiveTournamentId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tournaments/${id}`);
    }
  };

  return (
    <ErrorBoundary>
      <main className="min-h-[100dvh] p-4 md:p-8 flex flex-col items-center pb-40 md:pb-8">
        <Header step={step} resetApp={resetApp} user={user} />

      <div className="w-full max-w-6xl">
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-6 md:py-10 text-center w-full max-w-lg mx-auto"
            >
              <div className="space-y-4 mb-8">
                <div className="bg-accent/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 text-accent shadow-inner">
                  <Trophy size={40} />
                </div>
                <h2 className="text-4xl md:text-5xl font-display font-black text-primary tracking-tight">
                  Arena <span className="text-accent italic">BeachPró</span>
                </h2>
                <p className="text-slate-500 font-medium">
                  {authMode === 'LOGIN' ? 'Bem-vindo de volta à arena!' : 'Crie sua conta e comece a jogar'}
                </p>
              </div>

              <div className="w-full bg-white p-2 rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                {/* Tab Switcher */}
                <div className="flex p-1.5 bg-slate-50 rounded-[2rem] mb-6">
                  <button 
                    onClick={() => setAuthMode('LOGIN')}
                    className={cn(
                      "flex-1 py-4 rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all",
                      authMode === 'LOGIN' ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Entrar
                  </button>
                  <button 
                    onClick={() => setAuthMode('REGISTER')}
                    className={cn(
                      "flex-1 py-4 rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all",
                      authMode === 'REGISTER' ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Cadastrar
                  </button>
                </div>

                <div className="px-6 pb-8 space-y-6">
                  <form onSubmit={handleAuth} className="space-y-5">
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seu E-mail</label>
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-primary focus:outline-none transition-all font-bold text-primary"
                        placeholder="exemplo@email.com"
                        required
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sua Senha</label>
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-primary focus:outline-none transition-all font-bold text-primary"
                        placeholder="Mínimo 6 caracteres"
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
                      className="w-full btn-primary py-5 text-lg shadow-lg flex items-center justify-center gap-3 group"
                    >
                      {isAuthLoading ? (
                        <RefreshCw size={20} className="animate-spin" />
                      ) : (
                        <>
                          <span>{authMode === 'LOGIN' ? 'ENTRAR NA ARENA' : 'CRIAR MINHA CONTA'}</span>
                          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300 bg-white px-4">Ou continue com</div>
                  </div>

                  <button 
                    type="button" 
                    onClick={handleGoogleLogin} 
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all font-bold text-slate-600 shadow-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Google</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 'HOME' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-8"
            >
              {tournaments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-10">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-4"
                  >
                    <div className="bg-accent/20 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 text-accent shadow-inner">
                      <Trophy size={48} />
                    </div>
                    <h2 className="text-5xl md:text-6xl font-display font-black text-primary tracking-tight">
                      Arena <span className="text-accent italic">BeachPró</span>
                    </h2>
                    <p className="text-slate-500 text-xl font-medium max-w-md mx-auto">
                      A plataforma definitiva para organizar seus torneios de Beach Tennis com profissionalismo.
                    </p>
                  </motion.div>

                  <button 
                    onClick={startNewTournament} 
                    className="btn-primary flex items-center justify-center gap-3 md:gap-4 px-8 md:px-12 py-5 md:py-6 text-xl md:text-2xl shadow-2xl group"
                  >
                    <Plus size={28} className="md:w-8 md:h-8 group-hover:rotate-90 transition-transform duration-300" />
                    NOVO TORNEIO
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h2 className="text-4xl font-display font-black text-primary tracking-tight">
                        Arena <span className="text-accent italic">BeachPró</span>
                      </h2>
                      <p className="text-slate-500 font-medium">Gerencie seus torneios simultâneos.</p>
                    </div>
                    
                    <button 
                      onClick={startNewTournament} 
                      className="btn-primary flex items-center justify-center gap-3 px-8 py-4 text-lg"
                    >
                      <Plus size={24} />
                      NOVO TORNEIO
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tournaments.map((t) => {
                      const rankings = calculateRankings(t.players, t.matches, t.rankingCriteria);
                      const leader = rankings[0];
                      const progress = Math.round((t.matches.filter(m => m.isCompleted).length / t.matches.length) * 100);

                      return (
                        <div 
                          key={t.id}
                          className="glass-card p-6 hover:shadow-xl transition-all group relative overflow-hidden"
                        >
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <span className="text-[10px] font-black text-accent bg-primary px-2 py-1 rounded mb-2 inline-block uppercase tracking-widest">
                                {t.format.replace('_', ' ')}
                              </span>
                              <h3 className="text-2xl font-display font-bold text-primary truncate max-w-[200px]">{t.name}</h3>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setTournamentToDelete(t.id);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg font-bold text-[10px] hover:bg-red-100 transition-all uppercase tracking-widest border border-red-100"
                            >
                              <AlertCircle size={14} />
                              EXCLUIR TORNEIO
                            </button>
                          </div>

                          <div className="space-y-4 mb-6">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Líder Atual</span>
                              <span className="text-primary font-bold">{leader?.name || '---'}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-accent h-full transition-all duration-1000" 
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <span>Progresso</span>
                              <span>{progress}%</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setActiveTournamentId(t.id);
                                setStep('FINISHED'); // Show classification
                              }}
                              className="flex-1 py-4 bg-slate-50 rounded-xl font-bold text-xs md:text-sm text-primary hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                            >
                              <BarChart size={16} />
                              RANKING
                            </button>
                            <button 
                              onClick={() => {
                                setActiveTournamentId(t.id);
                                setStep(t.isFinished ? 'FINISHED' : 'TOURNAMENT');
                              }}
                              className="flex-[2] py-4 bg-primary text-accent rounded-xl font-bold text-xs md:text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                            >
                              GERENCIAR
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Tournament Limit Popup */}
              <AnimatePresence>
                {showLimitPopup && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100"
                    >
                      <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
                        <AlertCircle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-primary text-center mb-2">Limite Atingido</h3>
                      <p className="text-slate-500 text-center mb-8 text-sm leading-relaxed">
                        O sistema permite até <span className="font-bold text-primary">4 torneios simultâneos</span>. 
                        Finalize um torneio ativo para poder iniciar um novo.
                      </p>
                      <button 
                        onClick={() => setShowLimitPopup(false)}
                        className="btn-primary py-4 w-full"
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
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100"
                    >
                      <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
                        <AlertCircle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-primary text-center mb-2">Excluir Torneio?</h3>
                      <p className="text-slate-500 text-center mb-8 text-sm leading-relaxed">
                        Tem certeza que deseja excluir este torneio? <span className="font-bold text-red-500">Esta ação é irreversível e todos os dados serão apagados permanentemente.</span>
                      </p>
                      <div className="flex flex-col gap-3">
                        <button 
                          onClick={() => {
                            deleteTournament(tournamentToDelete);
                            setTournamentToDelete(null);
                          }}
                          className="btn-primary bg-red-500 hover:bg-red-600 border-red-600 py-4 w-full"
                        >
                          SIM, EXCLUIR TUDO
                        </button>
                        <button 
                          onClick={() => setTournamentToDelete(null)}
                          className="btn-outline py-4 w-full"
                        >
                          CANCELAR
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {step === 'TOURNAMENT_NAME' && (
            <StepContainer 
              key="tournament-name"
              title="Nome do Torneio"
              subtitle="Como se chama esta competição?"
              currentStep={1}
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome da Categoria / Torneio</label>
                  <input 
                    type="text"
                    placeholder="Ex: Categoria C Masculina"
                    className="input-field text-xl py-6"
                    value={tournamentName}
                    onFocus={(e) => {
                      setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 300);
                    }}
                    onChange={(e) => setTournamentName(e.target.value)}
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-error text-sm font-bold flex items-center gap-2 bg-red-50 p-3 rounded-xl border border-red-100">
                    <AlertCircle size={18} /> {error}
                  </p>
                )}
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setStep('HOME')} className="btn-outline flex-[2] py-4 md:py-5 text-sm md:text-base">CANCELAR</button>
                  <button onClick={handleNameConfirm} className="btn-primary flex-[3] py-4 md:py-5 text-lg md:text-xl">AVANÇAR</button>
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
              <div className="flex flex-col items-center gap-6 md:gap-10">
                <div className="flex items-center gap-4 md:gap-8">
                  <button 
                    onClick={() => setPlayerCount(Math.max(0, playerCount - 2))}
                    className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all text-slate-600"
                  >
                    <Minus size={24} className="md:w-8 md:h-8" />
                  </button>
                  <div className="text-center min-w-[80px] md:min-w-[120px]">
                    <span className="score-display block text-5xl md:text-8xl">
                      {playerCount}
                    </span>
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Atletas</span>
                  </div>
                  <button 
                    onClick={() => setPlayerCount(Math.min(60, playerCount + 2))}
                    className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all text-slate-600"
                  >
                    <Plus size={24} className="md:w-8 md:h-8" />
                  </button>
                </div>
                {error && (
                  <p className="text-error text-sm font-bold flex items-center gap-2 bg-red-50 p-3 rounded-xl border border-red-100 w-full">
                    <AlertCircle size={18} /> {error}
                  </p>
                )}
                <div className="flex gap-4 w-full pt-4">
                  <button onClick={() => setStep('TOURNAMENT_NAME')} className="btn-outline flex-[2] py-4 md:py-5 text-sm md:text-base">VOLTAR</button>
                  <button 
                    onClick={handlePlayerCountConfirm} 
                    className="btn-primary flex-[3] py-4 md:py-5 text-lg md:text-xl"
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
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {[
                  { id: 'REI_DA_QUADRA', title: 'REI DA QUADRA (4 Atletas)', desc: 'Formato individual: 3 rodadas onde cada atleta joga com um parceiro diferente a cada jogo. Todos jogam com todos.', icon: Trophy, req: 4 },
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
                    onClick={() => handleFormatConfirm(f.id as TournamentFormat)}
                    className={cn(
                      "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group",
                      tournamentFormat === f.id ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2.5 rounded-xl",
                        tournamentFormat === f.id ? "bg-primary text-accent" : "bg-slate-50 text-slate-400"
                      )}>
                        <f.icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary">{f.title}</h3>
                        <p className="text-slate-500 text-xs">{f.desc}</p>
                      </div>
                    </div>
                    {tournamentFormat === f.id && <CheckCircle2 className="text-primary" size={20} />}
                  </div>
                ))}

                {playerCount !== 12 && playerCount !== 16 && playerCount !== 20 && playerCount !== 24 && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-xs text-center">
                    Formatos &quot;SUPER&quot; exigem quantidades específicas de atletas (12, 16, 20 ou 24).
                  </div>
                )}

                <div className="pt-4">
                  <button onClick={() => setStep('PLAYER_COUNT')} className="btn-outline w-full py-4">
                    VOLTAR
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
              <div className="space-y-3">
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
                      "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group",
                      matchFormat === f.id ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div>
                      <h3 className="font-bold text-primary">{f.title}</h3>
                      <p className="text-slate-500 text-xs">{f.desc}</p>
                    </div>
                    {matchFormat === f.id && <CheckCircle2 className="text-primary" size={20} />}
                  </div>
                ))}

                <div className="pt-4">
                  <button onClick={() => setStep('FORMAT_SELECTION')} className="btn-outline w-full py-4">
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
                    "p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group",
                    registrationType === 'RANDOM_DRAW' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                  )}
                  onClick={() => handleRegistrationTypeConfirm('RANDOM_DRAW')}
                >
                  <div>
                    <h3 className="font-bold text-primary">Sorteio de Duplas</h3>
                    <p className="text-slate-500 text-sm">O sistema sorteará aleatoriamente as duplas entre os atletas.</p>
                  </div>
                  {registrationType === 'RANDOM_DRAW' && <CheckCircle2 className="text-primary" size={20} />}
                </div>

                <div 
                  className={cn(
                    "p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group",
                    registrationType === 'DEFINED_TEAMS' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                  )}
                  onClick={() => handleRegistrationTypeConfirm('DEFINED_TEAMS')}
                >
                  <div>
                    <h3 className="font-bold text-primary">Duplas Definidas</h3>
                    <p className="text-slate-500 text-sm">Você preencherá o nome de cada dupla já formada.</p>
                  </div>
                  {registrationType === 'DEFINED_TEAMS' && <CheckCircle2 className="text-primary" size={20} />}
                </div>

                <div className="pt-4">
                  <button onClick={() => setStep('TABLE_COUNT')} className="btn-outline w-full py-4">
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
              <div className="space-y-4 max-h-[60vh] md:max-h-[400px] overflow-y-auto pr-2 mb-6 custom-scrollbar">
                {players.map((player, idx) => (
                  <div key={player.id} className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {registrationType === 'RANDOM_DRAW' ? `Atleta ${idx + 1}` : `Dupla ${idx + 1}`}
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder={registrationType === 'RANDOM_DRAW' ? "Nome do atleta" : "Nome da dupla (Ex: João/Maria)"}
                        className="input-field"
                        value={player.name}
                        onFocus={(e) => {
                          setTimeout(() => {
                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 300);
                        }}
                        onChange={(e) => {
                          const newPlayers = [...players];
                          newPlayers[idx].name = e.target.value;
                          setPlayers(newPlayers);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {error && (
                <p className="text-error text-sm mb-4 font-bold flex items-center gap-2 bg-red-50 p-3 rounded-xl border border-red-100">
                  <AlertCircle size={18} /> {error}
                </p>
              )}
              <div className="flex gap-4 pt-4">
                <button onClick={() => setStep('REGISTRATION_TYPE')} className="btn-outline flex-[2] py-4 md:py-5 text-sm md:text-base">VOLTAR</button>
                <button onClick={handleAthletesConfirm} className="btn-primary flex-[3] py-4 md:py-5 text-lg md:text-xl">AVANÇAR</button>
              </div>
            </StepContainer>
          )}

          {step === 'DRAWING' && (
            <StepContainer 
              key="drawing"
              title="Sorteando Duplas"
              subtitle="Aguarde enquanto o sistema define as parcerias..."
            >
              <div className="flex flex-col items-center py-10 space-y-8">
                <div className="relative w-32 h-32">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-accent">
                    <RefreshCw size={48} className="animate-pulse" />
                  </div>
                </div>
                
                <div className="w-full space-y-3">
                  {drawnTeams.slice(0, 3).map((team, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.5 }}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center"
                    >
                      <span className="font-bold text-primary">{team.p1.name}</span>
                      <span className="text-accent italic font-black">X</span>
                      <span className="font-bold text-primary">{team.p2.name}</span>
                    </motion.div>
                  ))}
                  <p className="text-center text-slate-400 text-sm animate-bounce pt-4">Finalizando sorteio...</p>
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
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Ordem Selecionada</p>
                  <div className="flex flex-wrap gap-2">
                    {rankingCriteria.map((c, idx) => (
                      <div key={c} className="bg-primary text-accent px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                        <span>{idx + 1}º {c === 'WINS' ? 'Vitórias' : c === 'GAME_BALANCE' ? 'Saldo de Games' : c === 'HEAD_TO_HEAD' ? 'Confronto Direto' : 'Games Pró'}</span>
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
                        "p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group",
                        rankingCriteria.includes(c.id as RankingCriterion) ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div>
                        <h3 className="font-bold text-primary">{c.title}</h3>
                        <p className="text-slate-500 text-xs">{c.desc}</p>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        rankingCriteria.includes(c.id as RankingCriterion) ? "bg-primary border-primary text-accent" : "border-slate-200"
                      )}>
                        {rankingCriteria.includes(c.id as RankingCriterion) && <span className="text-[10px] font-black">{rankingCriteria.indexOf(c.id as RankingCriterion) + 1}</span>}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-6 flex gap-4">
                  <button onClick={() => setStep('MATCH_FORMAT')} className="btn-outline flex-[2] py-5 text-base">VOLTAR</button>
                  <button 
                    onClick={handleRankingCriteriaConfirm} 
                    disabled={rankingCriteria.length === 0}
                    className="btn-primary flex-[3] py-5 text-xl"
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
                <div className="grid grid-cols-4 gap-3 w-full">
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
                        "aspect-square flex items-center justify-center rounded-xl font-bold text-lg transition-all border-2",
                        selectedCourts.includes(num) 
                          ? "bg-primary border-primary text-accent shadow-md" 
                          : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="text-error text-sm font-bold flex items-center gap-2 bg-red-50 p-3 rounded-xl border border-red-100 w-full">
                    <AlertCircle size={18} /> {error}
                  </p>
                )}

                <div className="w-full flex gap-4 pt-4">
                  <button onClick={() => setStep('RANKING_CRITERIA')} className="btn-outline flex-[2] py-5 text-base">VOLTAR</button>
                  <button onClick={handleTableCountConfirm} className="btn-primary flex-[3] py-5 text-xl">
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
              className="w-full space-y-4"
            >
              {/* Tournament Switcher */}
              {tournaments.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {tournaments.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveTournamentId(t.id);
                        setStep(t.isFinished ? 'FINISHED' : 'TOURNAMENT');
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                        activeTournamentId === t.id 
                          ? "bg-primary text-accent border-primary shadow-sm" 
                          : "bg-white text-slate-400 border-slate-200 hover:border-primary/30"
                      )}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest shrink-0">Em Andamento</span>
                    <span className="text-slate-500 text-[10px] font-bold uppercase truncate">{activeTournament.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-display font-bold text-primary leading-tight">
                      Rodada {activeTournament.currentRound} <span className="text-slate-300 font-normal">de {activeTournament.totalRounds}</span>
                    </h2>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-3 py-1.5 bg-slate-50 rounded-lg text-slate-400 font-bold text-[10px] md:text-[11px] flex items-center gap-1.5 border border-slate-100">
                    {activeTournament.matches.filter(m => m.round === activeTournament.currentRound).every(m => m.isCompleted) ? (
                      <>
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span className="text-emerald-600">Rodada Concluída</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Em andamento</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeTournament.matches
                  .filter(m => m.round === activeTournament.currentRound)
                  .map((match) => {
                    const p1 = activeTournament.players.find(p => p.id === match.player1Id)!;
                    const p2 = activeTournament.players.find(p => p.id === match.player2Id)!;
                    const p1Games = match.isCompleted ? match.sets[0].player1 : match.currentSet.player1;
                    const p2Games = match.isCompleted ? match.sets[0].player2 : match.currentSet.player2;

                    return (
                      <div 
                        key={match.id} 
                        className={cn(
                          "glass-card p-4 md:p-5 transition-all duration-300",
                          match.isCompleted ? "match-finished" : "match-pending"
                        )}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 bg-slate-100 px-2 py-0.5 rounded-md text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            <Waves size={12} />
                            Quadra {match.table}
                            {match.groupId && <span className="ml-2 border-l border-slate-300 pl-2">Grupo {match.groupId}</span>}
                          </div>
                          {match.isCompleted && (
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => editMatch(match.id)}
                                className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-bold text-slate-500 transition-colors"
                              >
                                <RefreshCw size={10} />
                                EDITAR
                              </button>
                              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-widest">
                                <CheckCircle2 size={14} />
                                Concluído
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Match Players Display */}
                        <div className="flex items-center justify-between gap-1 md:gap-2 mb-6">
                          <div className="flex-1 text-center min-w-0">
                            <div className="flex flex-col items-center gap-0.5 md:gap-1">
                              <div className="text-[11px] sm:text-sm md:text-base font-black text-indigo-600 uppercase tracking-tight leading-tight px-1 break-words w-full">
                                {p1.name}
                              </div>
                              {match.player1PartnerId && (
                                <div className="text-[11px] sm:text-sm md:text-base font-black text-indigo-600 uppercase tracking-tight leading-tight px-1 break-words w-full">
                                  {activeTournament.players.find(p => p.id === match.player1PartnerId)?.name}
                                </div>
                              )}
                            </div>
                            <div className={cn(
                              "mt-2 text-4xl sm:text-5xl md:text-6xl font-display font-black transition-colors leading-none",
                              match.isCompleted && p1Games < p2Games ? "text-primary/30" : "text-primary"
                            )}>
                              {p1Games}
                            </div>
                            {match.isCompleted && (
                              <div className={cn(
                                "mt-2 inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                p1Games > p2Games ? "bg-accent text-primary shadow-sm" : "bg-slate-100 text-slate-400"
                              )}>
                                {p1Games > p2Games ? 'Vencedor' : 'Perdedor'}
                              </div>
                            )}
                          </div>
                          <div className="text-primary/40 font-display font-black text-lg sm:text-xl italic shrink-0 px-1 sm:px-2">VS</div>
                          <div className="flex-1 text-center min-w-0">
                            <div className="flex flex-col items-center gap-0.5 md:gap-1">
                              <div className="text-[11px] sm:text-sm md:text-base font-black text-orange-600 uppercase tracking-tight leading-tight px-1 break-words w-full">
                                {p2.name}
                              </div>
                              {match.player2PartnerId && (
                                <div className="text-[11px] sm:text-sm md:text-base font-black text-orange-600 uppercase tracking-tight leading-tight px-1 break-words w-full">
                                  {activeTournament.players.find(p => p.id === match.player2PartnerId)?.name}
                                </div>
                              )}
                            </div>
                            <div className={cn(
                              "mt-2 text-4xl sm:text-5xl md:text-6xl font-display font-black transition-colors leading-none",
                              match.isCompleted && p2Games < p1Games ? "text-primary/30" : "text-primary"
                            )}>
                              {p2Games}
                            </div>
                            {match.isCompleted && (
                              <div className={cn(
                                "mt-2 inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                p2Games > p1Games ? "bg-accent text-primary shadow-sm" : "bg-slate-100 text-slate-400"
                              )}>
                                {p2Games > p1Games ? 'Vencedor' : 'Perdedor'}
                              </div>
                            )}
                          </div>
                        </div>

                        {!match.isCompleted && (
                          <div className="space-y-4 bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Placar</span>
                              {error && <span className="text-[9px] text-error font-bold uppercase text-right leading-tight">{error}</span>}
                            </div>
                            
                            <div className="flex items-center justify-between gap-1 md:gap-4">
                              {/* Player 1 Points */}
                              <div className="flex-1 flex flex-col items-center gap-2">
                                <div className="flex items-center gap-1 md:gap-2">
                                  <button 
                                    onClick={() => updateMatchScore(match.id, 1, -1)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 text-slate-400"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-primary w-8 sm:w-10 md:w-12 text-center">
                                    {match.currentSet.player1}
                                  </span>
                                  <button 
                                    onClick={() => updateMatchScore(match.id, 1, 1)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center bg-primary text-white rounded-lg shadow-md hover:bg-primary/90"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className="h-8 w-px bg-slate-200" />

                              {/* Player 2 Points */}
                              <div className="flex-1 flex flex-col items-center gap-2">
                                <div className="flex items-center gap-1 md:gap-2">
                                  <button 
                                    onClick={() => updateMatchScore(match.id, 2, -1)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 text-slate-400"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-primary w-8 sm:w-10 md:w-12 text-center">
                                    {match.currentSet.player2}
                                  </span>
                                  <button 
                                    onClick={() => updateMatchScore(match.id, 2, 1)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center bg-primary text-white rounded-lg shadow-md hover:bg-primary/90"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => confirmSet(match.id)}
                              className="w-full py-2.5 bg-secondary text-white rounded-lg font-bold text-[10px] hover:bg-secondary/90 transition-all shadow-md uppercase tracking-widest"
                            >
                              Confirmar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

                {/* Bottom Navigation */}
                {(activeTournament.currentRound > 1 || activeTournament.matches.filter(m => m.round === activeTournament.currentRound).every(m => m.isCompleted)) && (
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="pt-4 flex flex-col sm:flex-row justify-center gap-4"
                  >
                    {activeTournament.matches.filter(m => m.round === activeTournament.currentRound).every(m => m.isCompleted) && (
                      <button 
                        onClick={nextRound} 
                        className="flex-1 sm:flex-none btn-primary bg-accent text-primary border-accent hover:bg-accent/90 py-4 px-10 flex items-center justify-center gap-3 text-sm shadow-xl"
                      >
                        <span className="font-black tracking-widest">
                          {activeTournament.currentRound === activeTournament.totalRounds ? 'FINALIZAR TORNEIO' : 'PRÓXIMA RODADA'}
                        </span>
                        <ChevronRight size={20} className="animate-pulse" />
                      </button>
                    )}

                    {activeTournament.currentRound > 1 && (
                      <button 
                        onClick={prevRound} 
                        className="flex-1 sm:flex-none btn-outline py-4 px-8 flex items-center justify-center gap-3 text-sm shadow-sm border-slate-300 bg-white group"
                      >
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-black tracking-widest">VOLTAR RODADA</span>
                      </button>
                    )}
                  </motion.div>
                )}
            </motion.div>
          )}

          {step === 'FINISHED' && activeTournament && (
            <StepContainer 
              key="finished"
              title="Classificação"
              subtitle={activeTournament.name}
            >
              <div className="flex flex-col items-center">
                {(() => {
                  const rankings = calculateRankings(activeTournament.players, activeTournament.matches, activeTournament.rankingCriteria);
                  const champion = rankings[0];
                  return (
                    <>
                      {!activeTournament.isFinished ? (
                        <div className="w-full flex justify-end mb-4">
                           <button 
                            onClick={() => setStep('TOURNAMENT')}
                            className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                          >
                            <ChevronLeft size={14} /> VOLTAR AO TORNEIO
                          </button>
                        </div>
                      ) : (
                        <div className="relative mb-12">
                          <div className="bg-white p-10 rounded-full shadow-2xl border-4 border-amber-400">
                            <Trophy size={80} className="text-amber-400" />
                          </div>
                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-amber-400 text-white px-8 py-2 rounded-full font-black text-xl shadow-lg whitespace-nowrap">
                            CAMPEÃO
                          </div>
                        </div>
                      )}
                      
                      {activeTournament.isFinished && (
                        <h3 className="text-3xl md:text-4xl font-display font-black text-primary mb-10 text-center">{champion.name}</h3>
                      )}
                      
                      {/* Ranking Table Header */}
                      <div className="w-full grid grid-cols-[40px_1fr_45px_45px_45px] md:grid-cols-[60px_1fr_80px_80px_80px_80px] gap-2 px-4 py-3 bg-slate-100 rounded-t-2xl text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest border-x border-t border-slate-200">
                        <span className="text-center">Pos</span>
                        <span>Atleta / Dupla</span>
                        <span className="text-center">Vit</span>
                        <span className="text-center">Sal</span>
                        <span className="text-center">Pró</span>
                        <span className="text-center hidden md:block">Con</span>
                      </div>

                      <div className="w-full border-x border-b border-slate-200 rounded-b-2xl overflow-hidden mb-8 bg-white shadow-sm">
                        {rankings.map((p, idx) => (
                          <div 
                            key={p.id} 
                            className={cn(
                              "grid grid-cols-[40px_1fr_45px_45px_45px] md:grid-cols-[60px_1fr_80px_80px_80px_80px] gap-2 px-4 py-4 items-center border-t border-slate-100 transition-colors",
                              idx === 0 && activeTournament.isFinished ? "bg-amber-50/50" : "hover:bg-slate-50"
                            )}
                          >
                            <div className="flex justify-center">
                              <span className={cn(
                                "w-7 h-7 md:w-9 md:h-9 flex items-center justify-center rounded-lg font-black text-[10px] md:text-xs",
                                idx === 0 ? "bg-amber-400 text-white shadow-sm" : 
                                idx === 1 ? "bg-slate-300 text-white" :
                                idx === 2 ? "bg-amber-700/60 text-white" : "text-slate-400"
                              )}>
                                {idx + 1}º
                              </span>
                            </div>
                            
                            <div className="min-w-0">
                              <span className="font-bold text-primary text-xs md:text-sm block truncate">{p.name}</span>
                            </div>

                            <div className="text-center font-display font-black text-sm md:text-lg text-primary">
                              {p.wins}
                            </div>

                            <div className={cn(
                              "text-center font-display font-bold text-sm md:text-lg",
                              p.gameBalance > 0 ? "text-emerald-500" : p.gameBalance < 0 ? "text-error" : "text-slate-400"
                            )}>
                              {p.gameBalance > 0 ? `+${p.gameBalance}` : p.gameBalance}
                            </div>

                            <div className="text-center font-display font-medium text-xs md:text-base text-slate-400">
                              {p.gamesWon}
                            </div>

                            <div className="text-center font-display font-medium text-xs md:text-base text-slate-300 hidden md:block">
                              {p.gamesLost}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8">
                        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <AlertCircle size={12} /> Critérios de Desempate (Ordem)
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {activeTournament.rankingCriteria.map((c, i) => (
                            <div key={c} className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-[9px] font-bold text-slate-600">
                              {i + 1}. {c === 'WINS' ? 'Vitórias' : c === 'GAME_BALANCE' ? 'Saldo' : c === 'GAMES_WON' ? 'Games Pró' : 'Confronto Direto'}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="w-full mb-8">
                        <button 
                          onClick={() => setShowMatchHistory(!showMatchHistory)}
                          className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-xl shadow-sm">
                              <BarChart size={18} className="text-primary" />
                            </div>
                            <span className="font-bold text-slate-600 text-sm">Ver Histórico de Partidas</span>
                          </div>
                          <ChevronRight size={18} className={cn("text-slate-400 transition-transform", showMatchHistory && "rotate-90")} />
                        </button>

                        <AnimatePresence>
                          {showMatchHistory && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-4 space-y-3">
                                {activeTournament.matches.filter(m => m.isCompleted).map((m) => {
                                  const p1 = activeTournament.players.find(p => p.id === m.player1Id)!;
                                  const p2 = activeTournament.players.find(p => p.id === m.player2Id)!;
                                  const p1p = m.player1PartnerId ? activeTournament.players.find(p => p.id === m.player1PartnerId) : null;
                                  const p2p = m.player2PartnerId ? activeTournament.players.find(p => p.id === m.player2PartnerId) : null;
                                  const p1Games = m.sets.reduce((acc, s) => acc + s.player1, 0);
                                  const p2Games = m.sets.reduce((acc, s) => acc + s.player2, 0);

                                  return (
                                    <div key={m.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                                      <div className="flex items-center justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">
                                        <span>Rodada {m.round}</span>
                                        <span>Quadra {m.table}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 text-center">
                                          <div className="text-[10px] font-black text-indigo-600 uppercase leading-tight">
                                            {p1.name} {p1p && `/ ${p1p.name}`}
                                          </div>
                                          <div className={cn(
                                            "text-xl font-display font-black mt-1",
                                            p1Games < p2Games ? "text-primary/30" : "text-primary"
                                          )}>
                                            {p1Games}
                                          </div>
                                          <div className={cn(
                                            "mt-1 inline-block px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest",
                                            p1Games > p2Games ? "bg-accent text-primary" : "bg-slate-100 text-slate-400"
                                          )}>
                                            {p1Games > p2Games ? 'Vencedor' : 'Perdedor'}
                                          </div>
                                        </div>
                                        <div className="text-[10px] font-black text-slate-300 italic">VS</div>
                                        <div className="flex-1 text-center">
                                          <div className="text-[10px] font-black text-orange-600 uppercase leading-tight">
                                            {p2.name} {p2p && `/ ${p2p.name}`}
                                          </div>
                                          <div className={cn(
                                            "text-xl font-display font-black mt-1",
                                            p2Games < p1Games ? "text-primary/30" : "text-primary"
                                          )}>
                                            {p2Games}
                                          </div>
                                          <div className={cn(
                                            "mt-1 inline-block px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest",
                                            p2Games > p1Games ? "bg-accent text-primary" : "bg-slate-100 text-slate-400"
                                          )}>
                                            {p2Games > p1Games ? 'Vencedor' : 'Perdedor'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  );
                })()}

                <button 
                  onClick={() => {
                    if (activeTournament) {
                      deleteTournament(activeTournament.id);
                    }
                    setStep('HOME');
                  }} 
                  className="btn-primary w-full py-5"
                >
                  <CheckCircle2 size={20} className="mr-2" />
                  FINALIZAR TORNEIO
                </button>
              </div>
            </StepContainer>
          )}
        </AnimatePresence>
      </div>
    </main>
    </ErrorBoundary>
  );
}
