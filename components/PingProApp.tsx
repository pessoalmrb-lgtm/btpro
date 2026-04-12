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
  BarChart
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppStep, Player, TournamentState, Match, TournamentFormat, MatchFormat, TeamRegistrationType, RankingCriterion } from '@/types';
import { generateRoundRobin, validateSetScore, calculateRankings, generateGroupStage, generateIndividualDoubles } from '@/lib/tournament-logic';
import { cn } from '@/lib/utils';

const Header = ({ step, resetApp }: { step: AppStep, resetApp: () => void }) => (
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
    
    {step !== 'HOME' && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button 
          onClick={resetApp} 
          className="flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2.5 md:py-2.5 bg-primary text-white rounded-xl shadow-lg hover:bg-primary/90 hover:-translate-y-0.5 transition-all text-xs md:text-sm font-bold border-2 border-accent/20"
        >
          <Home size={14} className="md:w-4 md:h-4" />
          <span>Meus Torneios</span>
        </button>
      </motion.div>
    )}
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
  const [step, setStep] = useState<AppStep>('HOME');
  const [tournaments, setTournaments] = useState<TournamentState[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  
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
  const [, setIsDrawing] = useState(false);
  const [drawnTeams, setDrawnTeams] = useState<{p1: Player, p2: Player}[]>([]);
  const [courtWarning, setCourtWarning] = useState<{ court: number; tournamentName: string } | null>(null);
  const [showLimitPopup, setShowLimitPopup] = useState(false);

  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  // --- Actions ---

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

  const handleAthletesConfirm = () => {
    const emptyIndex = players.findIndex(p => !p.name.trim());
    if (emptyIndex !== -1) {
      const label = registrationType === 'RANDOM_DRAW' ? `Atleta ${emptyIndex + 1}` : `Dupla ${emptyIndex + 1}`;
      setError(`O campo "${label}" é obrigatório.`);
      return;
    }
    setError(null);
    
    const isIndividual = tournamentFormat.includes('INDIVIDUAL') || tournamentFormat === 'REI_DA_QUADRA';
    
    if (isIndividual) {
      setStep('DRAWING');
      setIsDrawing(true);
      
      // For individual formats, we don't draw teams yet, we just start the tournament with individual players
      // But we show a "sorting" animation for partners
      setTimeout(() => {
        setIsDrawing(false);
        
        const matches = generateIndividualDoubles(players, selectedCourts);
        const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
        
        const newTournament: TournamentState = {
          id: `t-${Date.now()}`,
          name: tournamentName,
          players: players, // Individual athletes
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
        
        setTournaments([...tournaments, newTournament]);
        setActiveTournamentId(newTournament.id);
        setStep('TOURNAMENT');
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

      setTimeout(() => {
        setIsDrawing(false);
        
        // Finalize drawing and start tournament
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
        
        const newTournament: TournamentState = {
          id: `t-${Date.now()}`,
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
        
        setTournaments([...tournaments, newTournament]);
        setActiveTournamentId(newTournament.id);
        setStep('TOURNAMENT');
      }, 3000);
    } else {
      // Fixed teams - start tournament directly
      const finalTeams = [...players];
      let matches: Match[] = [];
      if (tournamentFormat === 'GROUPS_MATA_MATA') {
        matches = generateGroupStage(finalTeams, selectedCourts, 2);
      } else {
        matches = generateRoundRobin(finalTeams, selectedCourts);
      }

      const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
      
      const newTournament: TournamentState = {
        id: `t-${Date.now()}`,
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
      
      setTournaments([...tournaments, newTournament]);
      setActiveTournamentId(newTournament.id);
      setStep('TOURNAMENT');
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

  const updateMatchScore = (matchId: string, player: 1 | 2, value: number) => {
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
      } else if (activeTournament.matchFormat === 'SUM_5_GAMES') {
        if (sum > 5) return m;
      }

      if (player === 1) currentSet.player1 = newValue;
      else currentSet.player2 = newValue;
      
      return { ...m, currentSet };
    });

    setTournaments(tournaments.map(t => t.id === activeTournamentId ? { ...t, matches: newMatches } : t));
  };

  const confirmSet = (matchId: string) => {
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

    setTournaments(tournaments.map(t => t.id === activeTournamentId ? { ...t, matches: newMatches } : t));
    setError(null);
  };

  const nextRound = () => {
    if (!activeTournament) return;
    if (activeTournament.currentRound < activeTournament.totalRounds) {
      setTournaments(tournaments.map(t => t.id === activeTournamentId ? { ...t, currentRound: t.currentRound + 1 } : t));
    } else {
      setTournaments(tournaments.map(t => t.id === activeTournamentId ? { ...t, isFinished: true } : t));
      setStep('FINISHED');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0f172a', '#bef264', '#000000']
      });
    }
  };

  const prevRound = () => {
    if (!activeTournament) return;
    if (activeTournament.currentRound > 1) {
      setTournaments(tournaments.map(t => t.id === activeTournamentId ? { ...t, currentRound: t.currentRound - 1 } : t));
    }
  };

  const editMatch = (matchId: string) => {
    if (!activeTournament) return;
    const newMatches = activeTournament.matches.map(m => {
      if (m.id !== matchId) return m;
      return { ...m, isCompleted: false };
    });
    setTournaments(tournaments.map(t => t.id === activeTournamentId ? { ...t, matches: newMatches } : t));
  };

  const resetApp = () => {
    setStep('HOME');
    setActiveTournamentId(null);
    setPlayers([]);
    setPlayerCount(8);
    setSelectedCourts([]);
    setError(null);
  };

  const deleteTournament = (id: string) => {
    setTournaments(tournaments.filter(t => t.id !== id));
    if (activeTournamentId === id) setActiveTournamentId(null);
  };

  return (
    <main className="min-h-[100dvh] p-4 md:p-8 flex flex-col items-center pb-40 md:pb-8">
      <Header step={step} resetApp={resetApp} />

      <div className="w-full max-w-6xl">
        <AnimatePresence mode="wait">
          {step === 'HOME' && (
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
                                deleteTournament(t.id);
                              }}
                              className="p-2 text-slate-300 hover:text-error transition-colors"
                            >
                              <AlertCircle size={20} />
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
                    <button 
                      onClick={nextRound}
                      disabled={!activeTournament.matches.filter(m => m.round === activeTournament.currentRound).every(m => m.isCompleted)}
                      className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight size={20} className="text-primary" />
                    </button>
                    <h2 className="text-xl font-display font-bold text-primary leading-tight">
                      Rodada {activeTournament.currentRound} <span className="text-slate-300 font-normal">de {activeTournament.totalRounds}</span>
                    </h2>
                    <button 
                      onClick={prevRound}
                      disabled={activeTournament.currentRound === 1}
                      className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft size={20} className="text-primary" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {activeTournament.matches.filter(m => m.round === activeTournament.currentRound).every(m => m.isCompleted) ? (
                    <button 
                      onClick={nextRound} 
                      className="px-4 py-2 bg-primary rounded-lg text-white font-bold text-[10px] md:text-[11px] flex items-center gap-1.5 hover:bg-primary/90 transition-all shadow-md animate-pulse uppercase tracking-widest"
                    >
                      <ChevronRight size={12} />
                      <span>{activeTournament.currentRound === activeTournament.totalRounds ? 'Finalizar' : 'Próxima Rodada'}</span>
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 bg-slate-50 rounded-lg text-slate-400 font-bold text-[10px] md:text-[11px] flex items-center gap-1.5 border border-slate-100">
                      <RefreshCw size={12} className="animate-spin" />
                      Aguardando...
                    </div>
                  )}
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
                        <div className="flex items-center justify-between gap-2 mb-6">
                          <div className="flex-1 text-center min-w-0">
                            <div className="flex flex-col items-center gap-1">
                              <div className="text-sm md:text-base font-black text-indigo-600 uppercase tracking-tight leading-tight px-1 break-words w-full">
                                {p1.name}
                              </div>
                              {match.player1PartnerId && (
                                <div className="text-sm md:text-base font-black text-indigo-600 uppercase tracking-tight leading-tight px-1 break-words w-full">
                                  {activeTournament.players.find(p => p.id === match.player1PartnerId)?.name}
                                </div>
                              )}
                            </div>
                            <div className={cn(
                              "mt-2 text-3xl md:text-4xl font-display font-black transition-colors",
                              p1Games > p2Games ? "text-accent" : "text-slate-300"
                            )}>
                              {p1Games}
                            </div>
                          </div>
                          <div className="text-primary/60 font-display font-black text-xl italic shrink-0 px-2">VS</div>
                          <div className="flex-1 text-center min-w-0">
                            <div className="flex flex-col items-center gap-1">
                              <div className="text-sm md:text-base font-black text-orange-600 uppercase tracking-tight leading-tight px-1 break-words w-full">
                                {p2.name}
                              </div>
                              {match.player2PartnerId && (
                                <div className="text-sm md:text-base font-black text-orange-600 uppercase tracking-tight leading-tight px-1 break-words w-full">
                                  {activeTournament.players.find(p => p.id === match.player2PartnerId)?.name}
                                </div>
                              )}
                            </div>
                            <div className={cn(
                              "mt-2 text-3xl md:text-4xl font-display font-black transition-colors",
                              p2Games > p1Games ? "text-accent" : "text-slate-300"
                            )}>
                              {p2Games}
                            </div>
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
                                <div className="flex items-center gap-1.5 md:gap-2">
                                  <button 
                                    onClick={() => updateMatchScore(match.id, 1, -1)}
                                    className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 text-slate-400"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="text-xl md:text-3xl font-display font-black text-primary w-6 md:w-10 text-center">
                                    {match.currentSet.player1}
                                  </span>
                                  <button 
                                    onClick={() => updateMatchScore(match.id, 1, 1)}
                                    className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center bg-primary text-white rounded-lg shadow-md hover:bg-primary/90"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className="h-6 w-px bg-slate-200" />

                              {/* Player 2 Points */}
                              <div className="flex-1 flex flex-col items-center gap-2">
                                <div className="flex items-center gap-1.5 md:gap-2">
                                  <button 
                                    onClick={() => updateMatchScore(match.id, 2, -1)}
                                    className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 text-slate-400"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="text-xl md:text-3xl font-display font-black text-primary w-6 md:w-10 text-center">
                                    {match.currentSet.player2}
                                  </span>
                                  <button 
                                    onClick={() => updateMatchScore(match.id, 2, 1)}
                                    className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center bg-primary text-white rounded-lg shadow-md hover:bg-primary/90"
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
                  className="pt-4 pb-10 flex flex-col sm:flex-row justify-center gap-4 px-4"
                >
                  {activeTournament.matches.filter(m => m.round === activeTournament.currentRound).every(m => m.isCompleted) && (
                    <button 
                      onClick={nextRound} 
                      className="flex-1 sm:flex-none btn-primary py-4 px-10 flex items-center justify-center gap-3 text-sm shadow-xl"
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
                        <h3 className="text-4xl font-display font-black text-primary mb-10 text-center">{champion.name}</h3>
                      )}

                      <div className="w-full space-y-3 mb-10">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Ranking Geral</h4>
                        {rankings.map((p, idx) => (
                          <div 
                            key={p.id} 
                            className={cn(
                              "flex items-center justify-between p-5 rounded-2xl border transition-all",
                              idx === 0 && activeTournament.isFinished ? "bg-amber-50 border-amber-200" : "bg-white border-slate-100"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <span className={cn(
                                "w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm",
                                idx === 0 ? "bg-amber-400 text-white" : 
                                idx === 1 ? "bg-slate-300 text-white" :
                                idx === 2 ? "bg-amber-700 text-white" : "bg-slate-50 text-slate-400"
                              )}>
                                {idx + 1}º
                              </span>
                              <div>
                                <span className="font-bold text-primary block leading-none mb-1">{p.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.wins} Vitórias</span>
                              </div>
                            </div>
                            <div className="flex gap-6">
                              <div className="text-center">
                                <div className="text-emerald-500 font-display font-bold text-xl leading-none">{p.gamesWon}</div>
                                <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">G. Pró</div>
                              </div>
                              <div className="text-center">
                                <div className="text-slate-300 font-display font-bold text-xl leading-none">{p.gamesLost}</div>
                                <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">G. Contra</div>
                              </div>
                              <div className="text-center">
                                <div className={cn(
                                  "font-display font-bold text-xl leading-none",
                                  p.gameBalance >= 0 ? "text-primary" : "text-error"
                                )}>{p.gameBalance > 0 ? `+${p.gameBalance}` : p.gameBalance}</div>
                                <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Saldo</div>
                              </div>
                            </div>
                          </div>
                        ))}
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
  );
}
