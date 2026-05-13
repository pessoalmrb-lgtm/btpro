'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  AlertTriangle,
  RefreshCw, 
  Home, 
  BarChart, 
  LogOut, 
  Lock, 
  Zap, 
  X, 
  Settings, 
  History, 
  Trash2,
  ChevronDown, 
  ChevronUp, 
  Info,
  Check,
  Grid,
  Lightbulb,
  ArrowRightLeft,
  Sparkles,
  Camera,
  Eye,
  EyeOff,
  Pencil,
  MoreHorizontal,
  Trophy as TrophyIcon,
  User as UserIcon,
  MapPin,
  ClipboardList
} from 'lucide-react';
import Image from 'next/image';
import { AppStep, Player, TournamentState, Match, TournamentFormat, MatchFormat, TeamRegistrationType, RankingCriterion, PlayoffRound, Ranking, PlayerStats, Address, LeagueAthlete } from '../types';
import { generateRoundRobin, validateSetScore, calculateRankings, generateGroupStage, generateIndividualDoubles, getPossibleGroupStructures, checkPlayoffPossibility, generatePlayoffs, getKnockoutQualifiedTeams, canIncrementScore, calculateTournamentPoints, FinalRankingResult } from '../lib/tournament-logic';
import { cn } from '../lib/utils';
import { auth, db, getGoogleProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, collection, query, where, onSnapshot, doc, setDoc, getDoc, deleteDoc, updateDoc, handleFirestoreError, OperationType, cleanData, getDocs, or, testConnection } from '../firebase';
import { generateUniqueUserTag, generateUniqueNumericId } from '../lib/user-utils';
import type { User } from '../firebase';

import { ErrorBoundary } from './ErrorBoundary';
import { Header } from './Header';
import { StepContainer } from './StepContainer';
import { BottomNav } from './BottomNav';
import { PremiumUpgrade } from './PremiumUpgrade';

export default function BeachProApp() {

  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [step, setStep] = useState<AppStep>('HOME');
  const [tournaments, setTournaments] = useState<TournamentState[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [pendingRankingId, setPendingRankingId] = useState<string | null>(null);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'TOURNAMENT_LIMIT' | 'RANKING_LIMIT' | 'ATHLETE_LIMIT' | 'FORMAT_LIMIT' | 'GENERIC' | 'VERIFIED_BADGE'>('GENERIC');

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
  const [showFinishConfirmPopup, setShowFinishConfirmPopup] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null);
  const [leagueToDelete, setLeagueToDelete] = useState<string | null>(null);
  const [leagueToExit, setLeagueToExit] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleRankingPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRanking) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        // Use a temporary image to compress
        const img = document.createElement('img');
        img.src = base64;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const maxDim = 800;
          if (width > height && width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          } else if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          
          await updateDoc(doc(db, 'rankings', activeRanking.id), {
            logoUrl: compressedBase64,
            coverUrl: compressedBase64
          });
          
          setSnackMessage("Foto da liga atualizada!");
          setTimeout(() => setSnackMessage(null), 3000);
        };
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading photo:", error);
      setSnackMessage("Erro ao atualizar foto.");
      setTimeout(() => setSnackMessage(null), 3000);
    }
  };
  const [tournamentTab, setTournamentTab] = useState<'MATCHES' | 'RANKING' | 'ROUNDS'>('MATCHES');
  const [tournamentViewRound, setTournamentViewRound] = useState<number | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // --- Profile Editing State ---
  const [editName, setEditName] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [snackMessage, setSnackMessage] = useState<string | null>(null);
  
  // Rankings State
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [activeRankingId, setActiveRankingId] = useState<string | null>(null);
  const [rankingStats, setRankingStats] = useState<PlayerStats[]>([]);
  
  // Creation Flow State for Rankings
  const [rankingName, setRankingName] = useState('');
  const [rankingDescription, setRankingDescription] = useState('');
  const [arenaName, setArenaName] = useState('');
  const [arenaAddress, setArenaAddress] = useState<Address>({
    street: '',
    neighborhood: '',
    city: '',
    state: ''
  });
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [pPoints, setPPoints] = useState(0);
  const [pneuBonus, setPneuBonus] = useState(0);
  const [placementPoints, setPlacementPoints] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });
  const [positionsThatScore, setPositionsThatScore] = useState(3);
  const [isCreatingRanking, setIsCreatingRanking] = useState(false);
  
  // Admin Management State
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [selectedAthleteStats, setSelectedAthleteStats] = useState<PlayerStats | null>(null);

  const [rankingTab, setRankingTab] = useState<'RANKING' | 'PLAYERS' | 'HISTORY' | 'CONFIG'>('RANKING');
  const [athleteSearch, setAthleteSearch] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingAthlete, setIsAddingAthlete] = useState(false);
  const [athleteToRemove, setAthleteToRemove] = useState<string | null>(null);
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);
  const [showHistoryDetail, setShowHistoryDetail] = useState<string | null>(null);
  const [historyDetailTab, setHistoryDetailTab] = useState<'RESULTS' | 'MATCHES'>('RESULTS');

  const activeTournament = tournaments.find(t => t.id === activeTournamentId);
  const activeRanking = rankings.find(r => r.id === activeRankingId);

  // --- Navigation Helper ---
  const navigateTo = (newStep: AppStep, options: { 
    tournamentId?: string | null, 
    rankingId?: string | null,
    matchHistory?: boolean, 
    replace?: boolean,
    tab?: 'MATCHES' | 'RANKING' | 'ROUNDS',
    round?: number | null
  } = {}) => {
    const nextStep = newStep;
    const nextTournamentId = options.tournamentId !== undefined ? options.tournamentId : activeTournamentId;
    const nextRankingId = options.rankingId !== undefined ? options.rankingId : activeRankingId;
    const nextMatchHistory = options.matchHistory !== undefined ? options.matchHistory : showMatchHistory;
    const nextTab = options.tab !== undefined ? options.tab : tournamentTab;
    const nextRound = options.round !== undefined ? options.round : tournamentViewRound;

    const state = { 
      step: nextStep, 
      activeTournamentId: nextTournamentId, 
      activeRankingId: nextRankingId,
      showMatchHistory: nextMatchHistory,
      tournamentTab: nextTab,
      tournamentViewRound: nextRound
    };

    if (options.replace) {
      window.history.replaceState(state, '');
    } else {
      window.history.pushState(state, '');
    }
    
    setStep(nextStep);
    setActiveTournamentId(nextTournamentId || null);
    setActiveRankingId(nextRankingId || null);
    setShowMatchHistory(nextMatchHistory || false);
    setTournamentTab(nextTab);
    setTournamentViewRound(nextRound);
    
    // Reset scroll on navigation
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setStep('HOME');
      setActiveTournamentId(null);
      setShowMatchHistory(false);
    }
  };

  // --- Helper to get player/team name ---
  const getPlayerName = (id: string | undefined) => {
    if (!id || id.startsWith('TBD')) return 'A Definir';
    const player = activeTournament?.players.find(p => p.id === id);
    if (player) return player.name;
    return id; // Fallback to ID if not found but not TBD
  };

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
  const [adminProfiles, setAdminProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    if (activeRankingId && rankings.length > 0) {
      const currentRanking = rankings.find(r => r.id === activeRankingId);
      if (currentRanking) {
        const fetchAdminProfiles = async () => {
          const profiles = { ...adminProfiles };
          let updated = false;
          for (const uid of currentRanking.adminIds) {
            if (!profiles[uid]) {
              const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
              if (!userSnap.empty) {
                 profiles[uid] = userSnap.docs[0].data();
                 updated = true;
              }
            }
          }
          if (updated) setAdminProfiles(profiles);
        };
        fetchAdminProfiles();
      }
    }
  }, [activeRankingId, rankings]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (!u) {
        setStep('HOME');
      }
    });

    // Verify Firestore connection on boot
    testConnection();

    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!user) {
      setTournaments([]);
      return;
    }

    // Default: My created tournaments
    const q1 = query(collection(db, 'tournaments'), where('uid', '==', user.uid));
    const unsub1 = onSnapshot(q1, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TournamentState));
      setTournaments(prev => {
        // Keep tournaments that were NOT fetched by this query (e.g. from activeRankingId listener)
        const other = prev.filter(p => p.uid !== user.uid);
        const combined = [...other, ...docs];
        // Deduplicate by ID
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return unique.sort((a, b) => b.createdAt - a.createdAt);
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tournaments-user');
    });

    // Additional: Active ranking tournaments (to see tournaments created by other admins)
    let unsub2 = () => {};
    if (activeRankingId) {
      const q2 = query(collection(db, 'tournaments'), where('rankingId', '==', activeRankingId));
      unsub2 = onSnapshot(q2, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TournamentState));
        setTournaments(prev => {
          const other = prev.filter(p => p.rankingId !== activeRankingId);
          const combined = [...other, ...docs];
          const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
          return unique.sort((a, b) => b.createdAt - a.createdAt);
        });
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `tournaments-ranking-${activeRankingId}`);
      });
    }

    return () => {
      unsub1();
      unsub2();
    };
  }, [user, activeRankingId]);

  React.useEffect(() => {
    if (!user) {
      setRankings([]);
      return;
    }

    // Load rankings where user is admin, owner or athlete
    const q = query(
      collection(db, 'rankings'), 
      or(
        where('adminIds', 'array-contains', user.uid),
        where('athleteIds', 'array-contains', user.uid)
      )
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ranking));
      setRankings(docs.sort((a, b) => b.createdAt - a.createdAt));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'rankings');
    });

    return () => unsubscribe();
  }, [user]);

  React.useEffect(() => {
    if (!activeRankingId) {
      setRankingStats([]);
      return;
    }

    // Sync specific ranking stats if needed
    // For simplicity, we'll listen to the playerStats subcollection
    const q = query(collection(db, `rankings/${activeRankingId}/players`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stats = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PlayerStats));
      setRankingStats(stats.sort((a, b) => b.totalPoints - a.totalPoints));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `rankings/${activeRankingId}/players`);
    });

    return () => unsubscribe();
  }, [activeRankingId]);

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
        
        // If user document exists but doesn't have numericId, generate one (for legacy users)
        if (!userData.userNumericId) {
          const numericId = await generateUniqueNumericId(db);
          await updateDoc(userDocRef, { userNumericId: numericId });
        } else {
          setUserProfile(userData);
        }
      } else {
        // Create user profile if it doesn't exist
        try {
          const userTag = await generateUniqueUserTag(db);
          const userNumericId = await generateUniqueNumericId(db);
          const userData = cleanData({
            uid: user.uid,
            email: user.email,
            userTag: userTag,
            userNumericId: userNumericId,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isPremium: false,
            createdAt: Date.now()
          });
          await setDoc(userDocRef, userData);
          setUserProfile(userData);
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
        setActiveTournamentId(event.state.activeTournamentId ?? null);
        setActiveRankingId(event.state.activeRankingId ?? null);
        setShowMatchHistory(event.state.showMatchHistory ?? false);
        setTournamentToDelete(event.state.tournamentToDelete ?? null);
        setShowUpgradeModal(event.state.showUpgradeModal ?? false);
        setShowLimitPopup(event.state.showLimitPopup ?? false);
        setCourtWarning(event.state.courtWarning ?? null);
        if (event.state.tournamentTab) setTournamentTab(event.state.tournamentTab);
        setTournamentViewRound(event.state.tournamentViewRound ?? null);
      } else {
        setStep('HOME');
        setActiveTournamentId(null);
        setShowMatchHistory(false);
        setTournamentToDelete(null);
        setShowUpgradeModal(false);
        setShowLimitPopup(false);
        setCourtWarning(null);
        setTournamentTab('MATCHES');
        setTournamentViewRound(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTournamentId, showMatchHistory, tournamentTab, tournamentViewRound, tournaments]);

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

  const handleSaveProfile = async (retryWithReauth = false) => {
    if (!user) return;
    setIsProfileUpdating(true);
    setAuthError(null);

    try {
      // 1. Reauthentication if needed
      if (retryWithReauth && reauthPassword) {
        const credential = EmailAuthProvider.credential(user.email!, reauthPassword);
        await reauthenticateWithCredential(user, credential);
        setShowReauthModal(false);
        setReauthPassword('');
      }

      // 2. Update Name in Auth Profile
      if (editName !== user.displayName) {
        await updateProfile(user, { displayName: editName });
        // Also update in Firestore
        await updateDoc(doc(db, 'users', user.uid), { displayName: editName });
      }

      // 3. Update Email
      if (editEmail !== user.email) {
        await updateEmail(user, editEmail);
        // Also update in Firestore
        await updateDoc(doc(db, 'users', user.uid), { email: editEmail });
      }

      // 4. Update Password
      if (newPassword) {
        await updatePassword(user, newPassword);
      }

      setSnackMessage("Dados atualizados com sucesso");
      setTimeout(() => setSnackMessage(null), 3000);
      goBack();

    } catch (err: any) {
      console.error("Profile update error:", err);
      if (err.code === 'auth/requires-recent-login') {
        setShowReauthModal(true);
      } else {
        const error = err as { code?: string; message?: string };
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          setAuthError("Senha atual incorreta.");
        } else if (error.code === 'auth/email-already-in-use') {
          setAuthError("Este e-mail já está sendo usado.");
        } else {
          setAuthError(err.message || "Erro ao atualizar perfil.");
        }
      }
    } finally {
      setIsProfileUpdating(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      await signInWithPopup(auth, getGoogleProvider());
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

  const searchAthlete = async () => {
    if (!athleteSearch.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    setError(null);

    let term = athleteSearch.trim();

    try {
      let q;
      if (/^\d+$/.test(term)) {
        // Purely numeric search
        q = query(collection(db, 'users'), where('userNumericId', '==', term));
      } else if (term.startsWith('#')) {
        // Tag with # might be meant as numeric ID (common user behavior)
        const possibleId = term.substring(1);
        if (/^\d+$/.test(possibleId)) {
          q = query(collection(db, 'users'), where('userNumericId', '==', possibleId));
        } else {
          // If it's #something but not digits, could be a tag (though usually tags start with @)
          q = query(collection(db, 'users'), where('userTag', '==', term));
        }
      } else if (term.startsWith('@')) {
        // Explicit user tag
        q = query(collection(db, 'users'), where('userTag', '==', term));
      } else {
        // Default to email
        q = query(collection(db, 'users'), where('email', '==', term.toLowerCase()));
      }

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        // If not found by ID/Email, allow manual addition by name if the term looks like a name
        if (term.length > 2 && !term.includes('@')) {
           setSearchResult({
             displayName: term,
             uid: `manual-${Date.now()}`,
             photoURL: "",
             userTag: "ATLETA MANUAL",
             isManual: true
           });
        } else {
           setError("Atleta não encontrado. Verifique o E-mail ou ID.");
        }
      } else {
        const userData = snapshot.docs[0].data();
        setSearchResult({ ...userData, uid: snapshot.docs[0].id });
      }
    } catch (err) {
      console.error("Search error:", err);
      handleFirestoreError(err, OperationType.GET, `users-search-${term}`);
      setError("Erro ao buscar atleta.");
    } finally {
      setIsSearching(false);
    }
  };

  const addAthleteToLeague = async () => {
    if (!activeRanking || !searchResult) return;
    setIsAddingAthlete(true);

    try {
      // Garantir que estamos pegando o UID correto
      const athleteUid = searchResult.uid;
      
      if (!athleteUid) {
        setError("Erro ao identificar atleta. Tente novamente.");
        setIsAddingAthlete(false);
        return;
      }
      
      const alreadyIn = activeRanking.leagueAthletes?.some(a => a.id === athleteUid);
      if (alreadyIn) {
        setShowDuplicatePopup(true);
        setIsAddingAthlete(false);
        setSearchResult(null);
        setAthleteSearch('');
        return;
      }

      if (searchResult.isManual) {
        if (!confirm("AVISO: Este atleta não possui cadastro oficial no Beach Pró. Ele poderá participar do torneio, mas seus resultados NÃO contarão pontos para o ranking geral da liga. Deseja adicionar assim mesmo?")) {
           setIsAddingAthlete(false);
           return;
        }
      }

      const newAthlete: LeagueAthlete = {
        id: athleteUid,
        name: searchResult.displayName || searchResult.email?.split('@')[0] || "Atleta",
        email: searchResult.email || "",
        userTag: searchResult.userTag || "",
        photo: searchResult.photoURL || "",
        isManual: !!searchResult.isManual
      };

      const updatedAthletes = [...(activeRanking.leagueAthletes || []), newAthlete];
      const updatedAthleteIds = [...(activeRanking.athleteIds || []), athleteUid];
      
      const updateData = cleanData({
        leagueAthletes: updatedAthletes,
        athleteIds: updatedAthleteIds
      });

      await updateDoc(doc(db, 'rankings', activeRanking.id), updateData);

      setSearchResult(null);
      setAthleteSearch('');
      setSnackMessage("Atleta adicionado com sucesso!");
      setTimeout(() => setSnackMessage(null), 3000);
    } catch (err) {
      console.error("Add athlete error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `rankings/${activeRanking.id}`);
      setError("Erro ao adicionar atleta à liga. Verifique sua conexão.");
    } finally {
      setIsAddingAthlete(false);
    }
  };

  useEffect(() => {
    if (activeRanking) {
      setRankingName(activeRanking.name);
      setRankingDescription(activeRanking.description || '');
      setArenaName(activeRanking.arenaName || '');
      setArenaAddress(activeRanking.address || { street: '', neighborhood: '', city: '', state: '' });
      setPPoints(activeRanking.pointsConfig?.participation || 0);
      setPneuBonus(activeRanking.pointsConfig?.pneu || 0);
      setPositionsThatScore(activeRanking.pointsConfig?.positionsThatScore || 3);
      setPlacementPoints(activeRanking.pointsConfig?.placementPoints || { 1: 0, 2: 0, 3: 0 });
      setEditLogoUrl(activeRanking.logoUrl || '');
      setEditCoverUrl(activeRanking.coverUrl || '');
    }
  }, [activeRankingId, rankings, activeRanking]); // Added rankings and activeRanking to sync on update

  const updateRankingGeneral = async () => {
    if (!activeRanking) return;
    try {
      const updateData = cleanData({
        name: rankingName,
        description: rankingDescription,
        arenaName: arenaName,
        address: arenaAddress,
        logoUrl: editLogoUrl,
        coverUrl: editCoverUrl,
        pointsConfig: {
          pneu: pneuBonus,
          participation: pPoints,
          placementPoints: placementPoints,
          positionsThatScore: positionsThatScore
        }
      });
      await updateDoc(doc(db, 'rankings', activeRanking.id), updateData);
      setSnackMessage("Liga atualizada com sucesso!");
      setTimeout(() => setSnackMessage(null), 3000);
    } catch (err) {
      console.error("Update ranking error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `rankings/${activeRanking.id}`);
    }
  };

  const removeAthleteFromLeague = async (athleteId: string) => {
    if (!activeRanking || !activeRanking.leagueAthletes) return;
    
    try {
      const updatedAthletes = activeRanking.leagueAthletes.filter(a => a.id !== athleteId);
      const updatedAthleteIds = (activeRanking.athleteIds || []).filter(id => id !== athleteId);
      
      const updateData = cleanData({
        leagueAthletes: updatedAthletes,
        athleteIds: updatedAthleteIds
      });
      await updateDoc(doc(db, 'rankings', activeRanking.id), updateData);
      setSnackMessage("Atleta removido com sucesso!");
      setTimeout(() => setSnackMessage(null), 3000);
      setAthleteToRemove(null);
    } catch (err) {
      console.error("Remove athlete error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `rankings/${activeRanking.id}`);
      setError("Erro ao remover atleta.");
    }
  };

  const startNewTournament = () => {
    const limit = isPremium ? 100 : 1;
    if (tournaments.length >= limit) {
      setUpgradeReason('TOURNAMENT_LIMIT');
      setShowUpgradeModal(true);
      return;
    }
    setTournamentName('');
    navigateTo('TOURNAMENT_NAME');
  };

  const handleNameConfirm = () => {
    if (!tournamentName.trim()) {
      setError("O nome do torneio é obrigatório.");
      return;
    }
    setError(null);
    navigateTo('PLAYER_COUNT', { replace: true });
  };

  const handleFormatConfirm = (format: TournamentFormat) => {
    if (format === 'GROUPS_MATA_MATA' && !isPremium) {
      setUpgradeReason('FORMAT_LIMIT');
      setShowUpgradeModal(true);
      return;
    }
    setTournamentFormat(format);
    if (format === 'GROUPS_MATA_MATA' || format === 'GROUPS') {
      navigateTo('GROUP_CONFIG', { replace: true });
    } else {
      navigateTo('MATCH_FORMAT', { replace: true });
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
    if (playerCount > 8 && !isPremium) {
      setUpgradeReason('ATHLETE_LIMIT');
      setShowUpgradeModal(true);
      return;
    }
    setError(null);
    navigateTo('FORMAT_SELECTION', { replace: true });
  };

  const handleMatchFormatConfirm = (format: MatchFormat) => {
    setMatchFormat(format);
    navigateTo('RANKING_CRITERIA', { replace: true });
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
    navigateTo('ATHLETE_REGISTRATION', { replace: true });
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
      navigateTo('DRAWING', { replace: true });
      setIsDrawing(true);
      
      setTimeout(() => {
        try {
          setIsDrawing(false);
          let teamsToGroup: Player[] = [];
          if (registrationType === 'RANDOM_DRAW') {
            const shuffled = [...players].sort(() => Math.random() - 0.5);
            for (let i = 0; i < shuffled.length; i += 2) {
              const p1 = shuffled[i];
              const p2 = shuffled[i+1];
              if (p1 && p2) {
                teamsToGroup.push({
                  id: `team-${p1.id}-${p2.id}`,
                  name: `${p1.name} / ${p2.name}`
                });
              }
            }
          } else {
            teamsToGroup = players;
          }

          const groupsCount = Math.ceil(teamsToGroup.length / teamsPerGroup);
          const { groups } = generateGroupStage(teamsToGroup, selectedCourts, { groupsCount, teamsPerGroup, type: groupsMatchPlay });
          setDrawnGroups(groups);
          navigateTo('GROUPS_DISPLAY', { replace: true });
        } catch (err) {
          setIsDrawing(false);
          setError("Erro ao gerar grupos. Verifique os dados.");
          setStep('PLAYER_COUNT');
          console.error(err);
        }
      }, 2000);
      return;
    }

    if (isIndividual) {
      navigateTo('DRAWING', { replace: true });
      setIsDrawing(true);
      
      setTimeout(async () => {
        try {
          setIsDrawing(false);
          
          const matches = generateIndividualDoubles(players, selectedCourts);
          const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
          
          if (matches.length === 0) {
            setError("Não foi possível gerar partidas. Verifique o número de atletas selecionados.");
            setStep('PLAYER_COUNT');
            return;
          }

          const tournamentId = `t-${Date.now()}`;
          const newTournament: TournamentState = {
            id: tournamentId,
            name: tournamentName,
            players: players,
            athleteCount: playerCount,
            matches,
            matches_group_stage: [],
            matches_knockout_stage: [],
            currentRound: 1,
            totalRounds,
            tables: selectedCourts,
            format: tournamentFormat,
            matchFormat,
            registrationType,
            rankingCriteria,
            isFinished: false,
            createdAt: Date.now(),
            rankingId: pendingRankingId || undefined
          };
          
          const tournamentData = cleanData({ ...newTournament, uid: user.uid });
          await setDoc(doc(db, 'tournaments', tournamentId), tournamentData);
          setPendingRankingId(null);
          navigateTo('TOURNAMENT', { tournamentId, replace: true });
        } catch (err) {
          setIsDrawing(false);
          const errorMsg = err instanceof Error ? err.message : "Erro ao salvar torneio.";
          setError(errorMsg);
          setStep('PLAYER_COUNT');
          console.error("Firestore error:", err);
        }
      }, 2000);
    } else if (registrationType === 'RANDOM_DRAW') {
      navigateTo('DRAWING', { replace: true });
      setIsDrawing(true);
      
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      const teams: {p1: Player, p2: Player}[] = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        teams.push({ p1: shuffled[i], p2: shuffled[i+1] });
      }
      setDrawnTeams(teams);

      setTimeout(async () => {
        try {
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
            matches_group_stage: [],
            matches_knockout_stage: [],
            currentRound: 1,
            totalRounds,
            tables: selectedCourts,
            format: tournamentFormat,
            matchFormat,
            registrationType,
            rankingCriteria,
            isFinished: false,
            createdAt: Date.now(),
            rankingId: pendingRankingId || undefined
          };
          
          const tournamentData2 = cleanData({ ...newTournament, uid: user.uid });
          await setDoc(doc(db, 'tournaments', tournamentId), tournamentData2);
          setPendingRankingId(null);
          navigateTo('TOURNAMENT', { tournamentId, replace: true });
        } catch (err) {
          setIsDrawing(false);
          const errorMsg = err instanceof Error ? err.message : "Erro ao salvar torneio";
          setError(errorMsg);
          setStep('PLAYER_COUNT');
          console.error("Firestore error:", err);
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
        matches_group_stage: [],
        matches_knockout_stage: [],
        currentRound: 1,
        totalRounds,
        tables: selectedCourts,
        format: tournamentFormat,
        matchFormat,
        registrationType,
        rankingCriteria,
        isFinished: false,
        createdAt: Date.now(),
        rankingId: pendingRankingId || undefined
      };
      
      try {
        const tournamentData3 = cleanData({ ...newTournament, uid: user.uid });
        await setDoc(doc(db, 'tournaments', tournamentId), tournamentData3);
        setPendingRankingId(null);
        navigateTo('TOURNAMENT', { tournamentId, replace: true });
      } catch (err) {
        setIsDrawing(false);
        const errorMsg = err instanceof Error ? err.message : "Erro ao salvar torneio.";
        setError(errorMsg);
        setStep('PLAYER_COUNT');
        console.error("Firestore error:", err);
      }
    }
  };

  const handleRankingCriteriaConfirm = () => {
    if (rankingCriteria.length === 0) {
      setError("Selecione ao menos um critério.");
      return;
    }
    setError(null);
    navigateTo('TABLE_COUNT', { replace: true });
  };

  const handleTableCountConfirm = () => {
    if (selectedCourts.length === 0) {
      setError("Selecione pelo menos uma quadra.");
      return;
    }
    setError(null);

    const isGroupFormat = tournamentFormat === 'GROUPS' || tournamentFormat === 'GROUPS_MATA_MATA';
    
    if (isGroupFormat) {
      navigateTo('REGISTRATION_TYPE', { replace: true });
    } else {
      const isIndividual = tournamentFormat.includes('INDIVIDUAL') || tournamentFormat === 'REI_DA_QUADRA';
      if (isIndividual) {
        setRegistrationType('RANDOM_DRAW');
        const initialPlayers = Array.from({ length: playerCount }, (_, i) => ({
          id: `p-${Date.now()}-${i}`,
          name: ''
        }));
        setPlayers(initialPlayers);
        navigateTo('ATHLETE_REGISTRATION', { replace: true });
      } else {
        navigateTo('REGISTRATION_TYPE', { replace: true });
      }
    }
  };

  const finishTournament = async () => {
    if (!activeTournament) return;

    try {
      let finalResults: FinalRankingResult[] = [];
      
      // If linked to a ranking, calculate points
      if (activeTournament.rankingId) {
        const ranking = rankings.find(r => r.id === activeTournament.rankingId);
        if (ranking) {
          finalResults = calculateTournamentPoints(activeTournament, ranking);
          
          // Update Ranking Stats
          for (const res of finalResults) {
            // Check if this result is for a team
            const playerIds = res.playerId.startsWith('team-') 
              ? res.playerId.replace('team-', '').split('-') 
              : [res.playerId];

            for (const individualId of playerIds) {
              // Skip non-registered athletes for ranking statistics
              const athlete = ranking.leagueAthletes?.find(a => a.id === individualId);
              if (!athlete || athlete.isManual) continue;

              const playerRef = doc(db, `rankings/${ranking.id}/players`, individualId);
              const currentStats = rankingStats.find(s => s.id === individualId);
              
              const newStats = {
                id: individualId,
                name: athlete.name,
                photo: athlete.photo || null,
                userTag: athlete.userTag || null,
                totalPoints: (currentStats?.totalPoints || 0) + res.points,
                victories: (currentStats?.victories || 0) + (res.placement === 1 ? 1 : 0),
                pneus: (currentStats?.pneus || 0) + (res.hadPneu ? 1 : 0),
                participations: (currentStats?.participations || 0) + 1,
                tournamentHistory: [
                  ...(currentStats?.tournamentHistory || []),
                  {
                    tournamentId: activeTournament.id,
                    tournamentName: activeTournament.name,
                    placement: res.placement,
                    pointsEarned: res.points,
                    hasPneu: res.hadPneu,
                    date: Date.now()
                  }
                ]
              };
              
              await setDoc(playerRef, cleanData(newStats));
            }
          }
        }
      }

      await updateDoc(doc(db, 'tournaments', activeTournament.id), { 
        isFinished: true,
        finalResults: finalResults.length > 0 ? finalResults : null
      });

      navigateTo('FINISHED');
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0f172a', '#bef264', '#000000']
      });
    } catch (err) {
      console.error("Error finishing tournament:", err);
      handleFirestoreError(err, OperationType.UPDATE, `tournaments/${activeTournament.id}`);
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

      // ATENÇÃO: HARD LOCK (TRAVA RÍGIDA)
      if (value > 0 && !canIncrementScore(currentSet.player1, currentSet.player2, player, activeTournament.matchFormat)) {
        return m;
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

  const addAdminToRanking = async (rankingId: string, email: string) => {
    if (!user) return;
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setSnackMessage("Usuário não encontrado.");
        setTimeout(() => setSnackMessage(null), 3000);
        return;
      }
      const targetUser = snap.docs[0].data();
      const ranking = rankings.find(r => r.id === rankingId);
      if (!ranking) return;

      if (ranking.adminIds.includes(targetUser.uid)) {
        setSnackMessage("Usuário já é administrador.");
        setTimeout(() => setSnackMessage(null), 3000);
        return;
      }

      await updateDoc(doc(db, 'rankings', rankingId), {
        adminIds: [...ranking.adminIds, targetUser.uid]
      });
      setSnackMessage("Administrador adicionado com sucesso!");
      setNewAdminEmail('');
      setTimeout(() => setSnackMessage(null), 3000);
    } catch (err) {
      console.error("Error adding admin:", err);
      handleFirestoreError(err, OperationType.UPDATE, `rankings/${rankingId}`);
      setSnackMessage("Erro ao adicionar administrador.");
      setTimeout(() => setSnackMessage(null), 3000);
    }
  };

  const resetRankingForm = () => {
    setRankingName('');
    setRankingDescription('');
    setArenaName('');
    setArenaAddress({ street: '', neighborhood: '', city: '', state: '' });
    setPlacementPoints({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 });
    setPositionsThatScore(3);
    setPPoints(0);
    setPneuBonus(0);
    setEditLogoUrl('');
    setEditCoverUrl('');
  };

  const createRanking = async () => {
    if (!user || isCreatingRanking) return;

    if (!isPremium && rankings.length >= 1) {
      setUpgradeReason('RANKING_LIMIT');
      setShowUpgradeModal(true);
      return;
    }

    if (!rankingName.trim()) {
      setError("O nome da liga é obrigatório.");
      return;
    }
    setError(null);
    setSnackMessage("Criando liga...");
    setIsCreatingRanking(true);

    try {
      const rankingId = `ranking-${Date.now()}`;
      
      // Owner should be an official athlete by default
      const ownerAthlete: LeagueAthlete = {
        id: user.uid,
        name: userProfile?.displayName || user.displayName || user.email?.split('@')[0] || "Administrador",
        email: user.email || "",
        userTag: userProfile?.userTag || "@admin",
        photo: userProfile?.photoURL || user.photoURL || "",
        isManual: false
      };

      const newRanking: Ranking = {
        id: rankingId,
        name: rankingName,
        description: rankingDescription,
        arenaName: arenaName,
        address: arenaAddress,
        ownerId: user.uid,
        adminIds: [user.uid],
        pointsConfig: {
          pneu: pneuBonus,
          participation: pPoints,
          placementPoints: placementPoints,
          positionsThatScore: positionsThatScore
        },
        leagueAthletes: [ownerAthlete],
        athleteIds: [user.uid],
        logoUrl: "/capa-padrao.png", 
        coverUrl: "/capa-padrao.png", // Brand-aligned sports background
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'rankings', rankingId), cleanData(newRanking));
      
      resetRankingForm();
      
      setSnackMessage("Liga criada com sucesso!");
      setTimeout(() => setSnackMessage(null), 3000);
      setIsCreatingRanking(false);
      navigateTo('MY_RANKINGS', { replace: true, rankingId: null });
    } catch (err) {
      console.error("Create ranking error:", err);
      setError("Erro ao criar liga. Verifique sua permissão ou conexão.");
      setSnackMessage(null);
      setIsCreatingRanking(false);
    }
  };

  const deleteRanking = async (rankingId: string) => {
    try {
      await deleteDoc(doc(db, 'rankings', rankingId));
      setSnackMessage("Liga excluída com sucesso.");
      setTimeout(() => setSnackMessage(null), 3000);
      
      if (activeRankingId === rankingId) {
        setActiveRankingId(null);
      }
      
      navigateTo('MY_RANKINGS', { rankingId: null, replace: true });
    } catch (err) {
      console.error("Delete ranking error:", err);
      handleFirestoreError(err, OperationType.DELETE, `rankings/${rankingId}`);
      setError("Erro ao excluir liga.");
    }
  };

  const exitRanking = async (rankingId: string) => {
    if (!user) return;
    try {
      const ranking = rankings.find(r => r.id === rankingId);
      if (!ranking) throw new Error("Liga não encontrada.");
      
      const isOwner = ranking.ownerId === user.uid;
      if (isOwner) {
        throw new Error("O proprietário da liga não pode sair. Você deve excluir a liga ou transferir a propriedade antes.");
      }

      const updatedAdminIds = (ranking.adminIds || []).filter(id => id !== user.uid);
      const updatedAthletes = (ranking.leagueAthletes || []).filter(a => a.id !== user.uid);
      const updatedAthleteIds = (ranking.athleteIds || []).filter(id => id !== user.uid);
      
      console.log(`User ${user.uid} attempting to exit ranking ${rankingId}`);
      
      // Update the ranking document
      await updateDoc(doc(db, 'rankings', rankingId), {
        adminIds: updatedAdminIds,
        leagueAthletes: updatedAthletes,
        athleteIds: updatedAthleteIds
      });
      
      // Try to delete their stats document
      const playerStatsRef = doc(db, `rankings/${rankingId}/players`, user.uid);
      try {
        await deleteDoc(playerStatsRef);
        console.log("Stats document deleted successfully");
      } catch (e) {
        console.warn("Could not delete stats document (maybe it didn't exist or permission was denied):", e);
      }
      
      setSnackMessage("Você saiu da liga com sucesso.");
      setTimeout(() => setSnackMessage(null), 3000);
      setLeagueToExit(null);
      navigateTo('MY_RANKINGS');
    } catch (err) {
      console.error("Exit ranking error details:", err);
      handleFirestoreError(err, OperationType.UPDATE, `rankings/${rankingId}`);
      setError("Erro ao sair da liga. Se você for o administrador único, não poderá sair sem remover a liga.");
    }
  };

  const confirmSet = async (matchId: string) => {
    if (!activeTournament) return;
    const match = activeTournament.matches.find(m => m.id === matchId)!;
    const set = match.currentSet;
    
    const validation = validateSetScore(set.player1, set.player2, activeTournament.matchFormat);
    if (!validation.isValid) {
      setError(validation.error || "Placar inválido para este formato de disputa");
      setTimeout(() => setError(null), 4000);
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
      const distinctGroupIds = new Set<string>();
      activeTournament.matches.forEach(m => {
        if (m.groupId && !m.groupId.includes('playoff')) {
          // For INTER-GROUP formats (e.g. "AB"), we need to extract both "A" and "B"
          if (m.groupId.length > 1 && /^[A-Z]+$/.test(m.groupId)) {
            for (const char of m.groupId) distinctGroupIds.add(char);
          } else {
            distinctGroupIds.add(m.groupId);
          }
        }
      });

      const groupIds = Array.from(distinctGroupIds).sort();
      const numGroups = groupIds.length;
      const isInterGroup = activeTournament.matches.some(m => m.groupId && m.groupId.length > 1 && !m.groupId.includes('playoff'));
      
      if (numGroups > 0) {
        // Collect all ranked teams from all groups
        const groups: {id: string, teams: Player[]}[] = [];
        
        // If it's intergroup, the standings are often calculated within the composite groups (e.g. "AB")
        // But for qualified teams logic, let's stick to the IDs present in the matches
        const actualStandingGroupIds = Array.from(new Set(activeTournament.matches.map(m => m.groupId).filter((id): id is string => !!id && !id.includes('playoff')))).sort();

        actualStandingGroupIds.forEach(gid => {
          const groupMatches = activeTournament.matches.filter(m => m.groupId === gid);
          const groupTeamsIds = new Set(groupMatches.flatMap(m => [m.player1Id, m.player2Id]));
          const groupPlayers = activeTournament.players.filter(p => groupTeamsIds.has(p.id));
          groups.push({ id: gid, teams: groupPlayers });
        });

        const roundsOrder: PlayoffRound[] = ['ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
        const selectedPlayoffRounds = activeTournament.playoffRounds || [];
        const currentKnockoutRounds = roundsOrder.filter(r => selectedPlayoffRounds.includes(r));
        
        if (currentKnockoutRounds.length === 0) {
          await finishTournament();
          return;
        }

        const qualifiedTeams = getKnockoutQualifiedTeams(
          activeTournament.players,
          activeTournament.matches,
          activeTournament.rankingCriteria,
          groups,
          currentKnockoutRounds
        );

        let knockoutMatches: Match[] = [];
        const firstRound = currentKnockoutRounds[0];

        // Scenario A: 2 standing groups (or 1 inter-group pair) -> Semi Finals (4 teams)
        const isTwoGroupSemi = actualStandingGroupIds.length === 2 && 
                               firstRound === 'SEMI_FINALS' && 
                               qualifiedTeams.length === 4;

        if (isTwoGroupSemi) {
          // SF1: 1º G1 x 2º G2
          // SF2: 1º G2 x 2º G1
          const g1Id = actualStandingGroupIds[0];
          const g2Id = actualStandingGroupIds[1];

          const getRankedFromGroup = (gid: string, rank: number) => {
             const gMatches = activeTournament.matches.filter(m => m.groupId === gid);
             const gTeams = groups.find(g => g.id === gid)?.teams || [];
             const rankings = calculateRankings(gTeams, gMatches, activeTournament.rankingCriteria);
             return rankings[rank - 1];
          };

          const p1 = getRankedFromGroup(g1Id, 1);
          const p2 = getRankedFromGroup(g2Id, 2);
          const p3 = getRankedFromGroup(g2Id, 1);
          const p4 = getRankedFromGroup(g1Id, 2);

          knockoutMatches.push({
            id: 'playoff-SEMI_FINALS-0',
            player1Id: p1?.id || 'TBD',
            player2Id: p2?.id || 'TBD',
            table: selectedCourts[0] || 1,
            sets: [],
            currentSet: { player1: 0, player2: 0 },
            isCompleted: false,
            round: 102
          });
          knockoutMatches.push({
            id: 'playoff-SEMI_FINALS-1',
            player1Id: p3?.id || 'TBD',
            player2Id: p4?.id || 'TBD',
            table: selectedCourts[1] || selectedCourts[0] || 2,
            sets: [],
            currentSet: { player1: 0, player2: 0 },
            isCompleted: false,
            round: 102
          });

          // Generate Final as TBD
          const finalMatches = generatePlayoffs([], selectedCourts, ['FINAL']);
          knockoutMatches = [...knockoutMatches, ...finalMatches];

        } else if (actualStandingGroupIds.length === 4 && firstRound === 'QUARTER_FINALS' && qualifiedTeams.length === 8) {
          // Scenario B: 4 standing groups -> Quarter Finals (8 teams)
          // Q1: 1ºA x 2ºC
          // Q2: 1ºB x 2ºD
          // Q3: 1ºC x 2ºA
          // Q4: 1ºD x 2ºB
          const getRankedFromGroup = (gid: string, rank: number) => {
             const gMatches = activeTournament.matches.filter(m => m.groupId === gid);
             const gTeams = groups.find(g => g.id === gid)?.teams || [];
             const rankings = calculateRankings(gTeams, gMatches, activeTournament.rankingCriteria);
             return rankings[rank - 1];
          };

          const p1 = getRankedFromGroup('A', 1);
          const p2 = getRankedFromGroup('C', 2);
          const p3 = getRankedFromGroup('B', 1);
          const p4 = getRankedFromGroup('D', 2);
          const p5 = getRankedFromGroup('C', 1);
          const p6 = getRankedFromGroup('A', 2);
          const p7 = getRankedFromGroup('D', 1);
          const p8 = getRankedFromGroup('B', 2);

          const qMatches = [
            { t1: p1, t2: p2, id: 'playoff-QUARTER_FINALS-0' },
            { t1: p3, t2: p4, id: 'playoff-QUARTER_FINALS-1' },
            { t1: p5, t2: p6, id: 'playoff-QUARTER_FINALS-2' },
            { t1: p7, t2: p8, id: 'playoff-QUARTER_FINALS-3' },
          ];

          qMatches.forEach((qm, idx) => {
            const table = selectedCourts[idx % selectedCourts.length];
            knockoutMatches.push({
              id: qm.id,
              player1Id: qm.t1?.id || 'TBD',
              player2Id: qm.t2?.id || 'TBD',
              table,
              sets: [],
              currentSet: { player1: 0, player2: 0 },
              isCompleted: false,
              round: 101
            });
          });

          // Generate remaining rounds as TBDs
          const semiMatches = generatePlayoffs([], selectedCourts, ['SEMI_FINALS']);
          const finalMatches = generatePlayoffs([], selectedCourts, ['FINAL']);
          knockoutMatches = [...knockoutMatches, ...semiMatches, ...finalMatches];

        } else if (actualStandingGroupIds.length === 2 && firstRound === 'QUARTER_FINALS' && qualifiedTeams.length === 8) {
          // Scenario INTER-GROUP: 2 composite groups -> Quarter Finals (8 teams)
          // Taking top 4 from each composite group (often 'AB' and 'CD')
          // Q1: 1ºG1 x 4ºG2
          // Q2: 2ºG1 x 3ºG2
          // Q3: 1ºG2 x 4ºG1
          // Q4: 2ºG2 x 3ºG1
          const g1Id = actualStandingGroupIds[0];
          const g2Id = actualStandingGroupIds[1];

          const getRankedFromGroup = (gid: string, rank: number) => {
             const gMatches = activeTournament.matches.filter(m => m.groupId === gid);
             const gTeams = groups.find(g => g.id === gid)?.teams || [];
             const rankings = calculateRankings(gTeams, gMatches, activeTournament.rankingCriteria);
             return rankings[rank - 1];
          };

          const p1 = getRankedFromGroup(g1Id, 1);
          const p4_g2 = getRankedFromGroup(g2Id, 4);
          const p2 = getRankedFromGroup(g1Id, 2);
          const p3_g2 = getRankedFromGroup(g2Id, 3);
          const p1_g2 = getRankedFromGroup(g2Id, 1);
          const p4 = getRankedFromGroup(g1Id, 4);
          const p2_g2 = getRankedFromGroup(g2Id, 2);
          const p3 = getRankedFromGroup(g1Id, 3);

          const qMatches = [
            { t1: p1, t2: p4_g2, id: 'playoff-QUARTER_FINALS-0' },
            { t1: p2, t2: p3_g2, id: 'playoff-QUARTER_FINALS-1' },
            { t1: p1_g2, t2: p4, id: 'playoff-QUARTER_FINALS-2' },
            { t1: p2_g2, t2: p3, id: 'playoff-QUARTER_FINALS-3' },
          ];

          qMatches.forEach((qm, idx) => {
            const table = selectedCourts[idx % selectedCourts.length];
            knockoutMatches.push({
              id: qm.id,
              player1Id: qm.t1?.id || 'TBD',
              player2Id: qm.t2?.id || 'TBD',
              table,
              sets: [],
              currentSet: { player1: 0, player2: 0 },
              isCompleted: false,
              round: 101
            });
          });

          const semiMatches = generatePlayoffs([], selectedCourts, ['SEMI_FINALS']);
          const finalMatches = generatePlayoffs([], selectedCourts, ['FINAL']);
          knockoutMatches = [...knockoutMatches, ...semiMatches, ...finalMatches];
        } else {
          // General Seeding Logic
          knockoutMatches = generatePlayoffs(qualifiedTeams, selectedCourts, currentKnockoutRounds);
        }

        const nextRoundNum = 100 + roundsOrder.indexOf(firstRound);

        try {
          await updateDoc(doc(db, 'tournaments', activeTournament.id), { 
            matches: [...activeTournament.matches, ...knockoutMatches],
            matches_knockout_stage: knockoutMatches,
            currentRound: nextRoundNum
          });
          navigateTo('TOURNAMENT', { round: nextRoundNum });
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
      await finishTournament();
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
    navigateTo('HOME', { tournamentId: null, rankingId: null });
    setPlayers([]);
    setPlayerCount(8);
    setSelectedCourts([]);
    setError(null);
    setPendingRankingId(null);
  };

  const deleteTournament = async (id: string) => {
    const tournament = tournaments.find(t => t.id === id);
    
    // Se o torneio já estiver finalizado, apenas ocultamos da Home e Lista Global, 
    // preservando-o para o histórico da liga, conforme solicitado pelo usuário.
    if (tournament?.isFinished) {
      try {
        await updateDoc(doc(db, 'tournaments', id), { isHidden: true });
        setSnackMessage("Torneio movido para o histórico da liga.");
        setTimeout(() => setSnackMessage(null), 3000);
        
        if (activeTournamentId === id) {
          navigateTo('HOME', { tournamentId: null });
        }
        return;
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tournaments/${id}`);
        return;
      }
    }

    if (!tournament) {
      try {
        await deleteDoc(doc(db, 'tournaments', id));
        setSnackMessage("Torneio excluído com sucesso.");
        setTimeout(() => setSnackMessage(null), 3000);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tournaments/${id}`);
      }
      return;
    }

    try {
      console.log(`Deleting tournament ${id} and reverting points...`);
      const rankingId = tournament.rankingId;
      if (rankingId) {
        const ranking = rankings.find(r => r.id === rankingId);
        if (ranking) {
          // Revert points from each player
          const results = tournament.finalResults || [];
          for (const res of results) {
            const playerIds = res.playerId.startsWith('team-') 
              ? res.playerId.replace('team-', '').split('-') 
              : [res.playerId];

            for (const individualId of playerIds) {
              const playerStatsRef = doc(db, `rankings/${rankingId}/players`, individualId);
              const currentStats = (await getDoc(playerStatsRef)).data() as PlayerStats | undefined;
              
              if (currentStats) {
                const updatedStats: PlayerStats = {
                  ...currentStats,
                  totalPoints: Math.max(0, (currentStats.totalPoints || 0) - res.points),
                  victories: Math.max(0, (currentStats.victories || 0) - (tournament.matches.filter(m => (m.player1Id === res.playerId || m.player2Id === res.playerId) && m.winnerId === res.playerId).length)),
                  participations: Math.max(0, (currentStats.participations || 0) - 1),
                  pneus: Math.max(0, (currentStats.pneus || 0) - (res.hadPneu ? 1 : 0))
                };
                await setDoc(playerStatsRef, updatedStats);
              }
            }
          }
        }
      }

      await deleteDoc(doc(db, 'tournaments', id));
      setSnackMessage("Torneio excluído com sucesso.");
      setTimeout(() => setSnackMessage(null), 3000);
      
      if (activeTournamentId === id) {
        navigateTo('HOME', { tournamentId: null });
      }
    } catch (err) {
      console.error("Error deleting tournament:", err);
      handleFirestoreError(err, OperationType.DELETE, `tournaments/${id}`);
    }
  };

  const whiteBackSteps: AppStep[] = [
      'TOURNAMENT_NAME', 'PLAYER_COUNT', 'FORMAT_SELECTION', 'GROUP_CONFIG', 
      'PLAYOFF_CONFIG', 'MATCH_FORMAT', 'REGISTRATION_TYPE', 'ATHLETE_REGISTRATION', 
      'DRAWING', 'GROUPS_DISPLAY', 'RANKING_CRITERIA', 'TABLE_COUNT', 'CREATE_RANKING',
      'EDIT_PROFILE', 'TOURNAMENTS_LIST'
    ];
    const isDarkStep = step === 'HOME' || !user || step === 'PROFILE' || step === 'MY_RANKINGS';
    const bgColor = isDarkStep ? "bg-[#004a8c]" : "bg-slate-50";

    return (
      <main className={cn(
        "min-h-[100dvh] flex flex-col items-center overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+5rem)] transition-colors duration-500",
        bgColor
      )}>
        <div className="w-full flex-grow">
          <AnimatePresence mode="wait">
            {!isAuthReady && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
              <RefreshCw size={48} className="animate-spin text-primary mb-4" />
              <p className="text-slate-500 font-medium">Carregando...</p>
            </motion.div>
          )}
          {isAuthReady && !user && (
            <motion.div 
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <div className="arena-hero-bg pt-12 pb-20 px-8 flex flex-col items-center text-center">
                <div className="mb-8">
                  <div className="brand-glass inline-block mb-4">
                    <h1 className="brand-text text-white text-4xl md:text-5xl leading-none">
                      BEACH<span className="text-accent">PRÓ</span>
                    </h1>
                  </div>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">
                    O play na palma da mão!
                  </p>
                </div>

                <div className="text-center space-y-2 max-w-xs mx-auto">
                </div>
              </div>

              <div className="wave-container px-6 pt-10 pb-32">
                <div className="max-w-md mx-auto">
                  <div className="w-full bg-surface-container-low p-2 rounded-[2rem] shadow-xl space-y-4">
                    {/* Segmented Control (Tabs) */}
                    <div className="grid grid-cols-2 bg-surface-container gap-1 p-1 rounded-full">
                      <button 
                        onClick={() => setAuthMode('LOGIN')}
                        className={cn(
                          "py-4 px-6 rounded-full text-[10px] font-black font-display transition-all duration-200 uppercase tracking-widest",
                          authMode === 'LOGIN' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                        )}
                      >
                        ENTRAR
                      </button>
                      <button 
                        onClick={() => setAuthMode('REGISTER')}
                        className={cn(
                          "py-4 px-6 rounded-full text-[10px] font-black font-display transition-all duration-200 uppercase tracking-widest",
                          authMode === 'REGISTER' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                        )}
                      >
                        CADASTRAR
                      </button>
                    </div>

                    {/* Form Section */}
                    <div className="bg-surface-container-lowest p-8 rounded-[2rem] space-y-6">
                      <form onSubmit={handleAuth} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black font-display uppercase tracking-widest text-on-surface-variant ml-4">E-mail de Acesso</label>
                          <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field py-5"
                            placeholder="seu@email.com"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-4">
                            <label className="text-[9px] font-black font-display uppercase tracking-widest text-on-surface-variant">Senha</label>
                            <button type="button" className="text-[9px] font-black text-primary hover:text-primary-dim transition-colors uppercase tracking-widest">Esqueceu?</button>
                          </div>
                          <input 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field py-5"
                            placeholder="••••••••"
                            required
                          />
                        </div>

                        {authError && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 bg-error/5 text-error rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 border border-error/10 leading-relaxed"
                          >
                            <AlertCircle size={16} />
                            {authError}
                          </motion.div>
                        )}

                        <button 
                          type="submit"
                          disabled={isAuthLoading}
                          className="w-full py-5 bg-primary text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
                        >
                          {isAuthLoading ? (
                            <RefreshCw size={20} className="animate-spin" />
                          ) : (
                            <>
                              <span>{authMode === 'LOGIN' ? 'ENTRAR NA ARENA' : 'CADASTRAR CONTA'}</span>
                              <ChevronRight size={18} />
                            </>
                          )}
                        </button>
                      </form>

                      <div className="flex items-center gap-4 py-2">
                        <div className="h-[1px] flex-grow bg-surface-container-highest/50"></div>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-outline-variant">ou</span>
                        <div className="h-[1px] flex-grow bg-surface-container-highest/50"></div>
                      </div>

                      <button 
                        type="button" 
                        onClick={handleGoogleLogin} 
                        className="w-full py-5 border-2 border-surface-container hover:bg-surface-container-low text-on-surface rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95"
                      >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>ACESSO COM GOOGLE</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-center text-[10px] text-on-surface-variant font-black uppercase tracking-widest mt-10 px-8 leading-relaxed opacity-40">
                    Ao entrar, você concorda com nossos <br/> <a className="underline decoration-primary/30" href="#">Termos</a> e <a className="underline decoration-primary/30" href="#">Privacidade</a>.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {isAuthReady && user && step === 'HOME' && (
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
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-sm border border-white/20 overflow-hidden">
                      {(userProfile?.photoURL || user?.photoURL) ? (
                        <div className="relative w-full h-full">
                          <Image src={userProfile?.photoURL || user?.photoURL} alt="Profile" fill className="object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <UserIcon size={20} />
                      )}
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
                    O play na palma da mão!
                  </p>
                </div>
                
                <div className="flex flex-col w-full gap-4 max-w-[340px]">
                  <button 
                    onClick={() => {
                      const limit = isPremium ? 100 : 1;
                      if (tournaments.length >= limit) {
                        setUpgradeReason('TOURNAMENT_LIMIT');
                        setShowUpgradeModal(true);
                      } else {
                        navigateTo('TOURNAMENT_NAME');
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
                    onClick={() => navigateTo('MY_RANKINGS', { rankingId: null })}
                    className="btn-hero-secondary group h-20"
                  >
                    <div className="bg-white/20 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg">
                      <LayoutGrid size={24} />
                    </div>
                    <span className="text-white font-black text-sm uppercase tracking-widest flex-1">
                      MINHAS LIGAS
                    </span>
                    <div className="w-14 h-14 flex items-center justify-center bg-black/5 rounded-full mr-1">
                      <ChevronRight size={22} className="text-white group-hover:translate-x-1 transition-transform" />
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
                        onClick={() => navigateTo('TOURNAMENTS_LIST')}
                        className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-4 py-2 rounded-full border border-primary/10 hover:bg-primary/10 transition-colors"
                      >
                        Ver Todos
                      </button>
                    )}
                  </div>
                  {tournaments.filter(t => !t.isHidden).length > 0 ? (
                    <div className="grid gap-5">
                      {tournaments.filter(t => !t.isHidden).map((t) => {
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
                              navigateTo(t.isFinished ? 'FINISHED' : 'TOURNAMENT', { tournamentId: t.id, tab: 'MATCHES', round: null });
                            }}
                            className="bg-white rounded-[1.5rem] p-4 border border-surface-container shadow-sm hover:shadow-md hover:border-primary/20 transition-all group w-full text-left flex items-center justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2 mb-1">
                                 <span className={cn(
                                   "w-1.5 h-1.5 rounded-full",
                                   t.isFinished ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "bg-emerald-500 animate-pulse"
                                 )} />
                                 <h4 className="text-xs font-black text-primary uppercase italic truncate font-display tracking-tight group-hover:text-primary flex items-center gap-2">
                                  {t.name}
                                  {t.isFinished && (
                                    <span className="bg-primary/10 text-primary text-[8px] px-2 py-0.5 rounded-full not-italic">FINALIZADO</span>
                                  )}
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
                        onClick={() => startNewTournament()}
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

          {step === 'MY_RANKINGS' && (
            <motion.div 
              key="step-my-rankings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full min-h-screen bg-[#004a8c]"
            >
              <div className="arena-hero-bg pt-4 pb-12 px-8 flex flex-col items-center text-center relative">
                <button onClick={goBack} className="absolute left-6 top-6 p-3 bg-white/10 rounded-2xl text-white backdrop-blur-sm border border-white/20 active:scale-95 transition-all">
                  <ChevronLeft size={20} />
                </button>
                
                <div className="mb-2">
                  <div className="p-3 bg-white/10 rounded-2xl mb-4 inline-block backdrop-blur-sm border border-white/20">
                    <LayoutGrid size={24} className="text-white" />
                  </div>
                  <h1 className="text-4xl font-display font-black text-white italic uppercase tracking-tighter leading-none mb-2">
                    Minhas Ligas
                  </h1>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                    Gerencie suas ligas e rankings exclusivos.
                  </p>
                </div>
              </div>

              <div className="wave-container px-6 pt-10 pb-32">
                <div className="max-w-2xl mx-auto space-y-4">
                  <button 
                    onClick={() => {
                      if (!isPremium && rankings.length >= 1) {
                        setUpgradeReason('RANKING_LIMIT');
                        setShowUpgradeModal(true);
                        return;
                      }
                      resetRankingForm();
                      navigateTo('CREATE_RANKING', { rankingId: null });
                    }}
                    className="w-full py-5 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:bg-primary-dim transition-all mb-6"
                  >
                    <Plus size={18} strokeWidth={3} />
                    NOVA LIGA
                  </button>

                  {rankings.length > 0 ? (
                    rankings.map((r, idx) => (
                            <div
                              key={`ranking-item-${r.id || idx}`}
                              className="w-full bg-white p-6 rounded-[2rem] border border-surface-container shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all"
                            >
                      <div 
                        className="flex items-center gap-5 flex-1 cursor-pointer"
                        onClick={() => navigateTo('RANKING_DETAILS', { rankingId: r.id })}
                      >
                        <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all overflow-hidden relative">
                          {r.coverUrl ? (
                            <Image src={r.coverUrl} alt={r.name} fill className="object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <LayoutGrid size={24} />
                          )}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <h4 className="text-base font-black text-on-surface uppercase italic truncate mb-1">{r.name}</h4>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                              {r.ownerId === user?.uid ? "ADMINISTRADOR" : (r.adminIds.includes(user?.uid || '') ? "ADMINISTRADOR" : "ATLETA")}
                            </span>
                            {r.arenaName && (
                              <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase truncate">
                                Arena: {r.arenaName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                         {r.ownerId === user?.uid ? (
                           <button 
                             onClick={(e) => { e.stopPropagation(); setLeagueToDelete(r.id); }}
                             className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                           >
                             <Trash2 size={20} />
                           </button>
                         ) : (
                           <button 
                             onClick={() => exitRanking(r.id)}
                             className="p-3 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"
                           >
                             <LogOut size={20} />
                           </button>
                         )}
                         <ChevronRight size={20} className="text-on-surface-variant/20 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 opacity-30 select-none">
                    <TrophyIcon size={64} className="mx-auto mb-4 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-loose">Nenhum ranking criado ainda.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

          {step === 'CREATE_RANKING' && (
            <StepContainer 
              key="step-create-ranking"
              title="Nova Liga"
              subtitle="Configurações e Regras de Pontuação"
              currentStep={1}
            >
              <div className="space-y-8 pb-10">
                {/* 1. Nome e Descrição da Liga */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-2">Nome da Liga</label>
                    <input 
                      type="text"
                      placeholder="Ex: Liga Beach BT 2024"
                      className="w-full bg-surface-container-low border-none rounded-[2rem] p-6 text-lg font-black text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      value={rankingName}
                      onChange={(e) => setRankingName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-2">Descrição Breve</label>
                    <input 
                      type="text"
                      placeholder="Ex: Ranking categoria C Masculino"
                      className="w-full bg-surface-container-low border-none rounded-[2rem] p-6 text-sm font-black text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                      value={rankingDescription}
                      onChange={(e) => setRankingDescription(e.target.value)}
                    />
                  </div>
                </div>

                {/* Arena Info */}
                <div className="bg-white rounded-[2rem] p-6 border border-surface-container shadow-sm space-y-4">
                  <h4 className="text-[10px] font-black text-on-surface uppercase tracking-widest">Localização (Arena)</h4>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Nome da Arena"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                      value={arenaName}
                      onChange={(e) => setArenaName(e.target.value)}
                    />
                    <button 
                      onClick={() => setShowAddressPopup(true)}
                      className="w-full py-4 px-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex items-center justify-between group"
                    >
                      <span className="text-[10px] font-black text-slate-400 group-hover:text-primary transition-colors">
                        {arenaAddress.street ? `${arenaAddress.street}, ${arenaAddress.neighborhood}` : "CADASTRAR ENDEREÇO DA ARENA"}
                      </span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </button>
                  </div>
                </div>

                {/* CONFIGURAÇÃO DE PONTUAÇÃO */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-surface-container shadow-sm space-y-8">
                  <div className="text-center space-y-1">
                    <h4 className="text-[12px] font-black text-primary uppercase italic tracking-wider">CONFIGURAÇÃO DE PONTUAÇÃO</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">quantos atletas pontuam por torneio?</p>
                  </div>
                  
                  {/* Top X Pontuam Seleto */}
                  <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div>
                      <h5 className="text-[10px] font-black text-on-surface uppercase tracking-widest">Limite de Pontuação</h5>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Até qual lugar pontua?</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setPositionsThatScore(Math.max(1, positionsThatScore - 1))} className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-900 border border-slate-200 shadow-sm active:scale-90 transition-all font-display"><Minus size={18}/></button>
                      <span className="text-xl font-black text-slate-900 w-8 text-center italic">{positionsThatScore}</span>
                      <button onClick={() => setPositionsThatScore(Math.min(16, positionsThatScore + 1))} className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-900 border border-slate-200 shadow-sm active:scale-90 transition-all font-display"><Plus size={18}/></button>
                    </div>
                  </div>

                  {/* Lista de Pontos por Colocação */}
                  <div className="space-y-3">
                    {Array.from({ length: positionsThatScore }).map((_, idx) => {
                      const pos = idx + 1;
                      const currentPoints = placementPoints[pos] || 0;
                      return (
                        <div key={pos} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-300 italic font-display">{pos}º</span>
                            <span className="text-[10px] font-black text-slate-900 uppercase italic">Lugar</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => {
                              const val = Math.max(0, currentPoints - 1);
                              setPlacementPoints(prev => ({ ...prev, [pos]: val }));
                            }} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-200 active:scale-90 transition-all">
                              <Minus size={14}/>
                            </button>
                            <span className="text-sm font-black text-primary w-6 text-center italic">{currentPoints}</span>
                            <button onClick={() => {
                              const val = Math.min(30, currentPoints + 1);
                              setPlacementPoints(prev => ({ ...prev, [pos]: val }));
                            }} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-200 active:scale-90 transition-all">
                              <Plus size={14}/>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Extras: Participação e Pneu */}
                  <div className="pt-6 border-t border-slate-50 space-y-4">
                    {/* Participação */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Participação</h5>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pts por presença</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setPPoints(Math.max(0, pPoints - 1))} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-200 shadow-sm active:scale-90 transition-all"><Minus size={18}/></button>
                        <span className="text-xl font-black text-slate-900 w-8 text-center italic">{pPoints}</span>
                        <button onClick={() => setPPoints(Math.min(30, pPoints + 1))} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-200 shadow-sm active:scale-90 transition-all"><Plus size={18}/></button>
                      </div>
                    </div>

                    {/* Pneu */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Penalidade Pneu</h5>
                        <p className="text-[8px] font-black text-rose-300 uppercase tracking-widest">Escala 0 a -10</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setPneuBonus(Math.min(0, pneuBonus + 1))} className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-sm active:scale-90 transition-all"><Plus size={18}/></button>
                        <span className="text-xl font-black text-rose-500 w-8 text-center italic">{pneuBonus}</span>
                        <button onClick={() => setPneuBonus(Math.max(-10, pneuBonus - 1))} className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-sm active:scale-90 transition-all"><Minus size={18}/></button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 pb-10">
                  <button onClick={goBack} disabled={isCreatingRanking} className="flex-1 py-5 bg-surface-container rounded-full font-black text-[10px] uppercase tracking-widest text-on-surface-variant disabled:opacity-50">CANCELAR</button>
                  <button onClick={createRanking} disabled={isCreatingRanking} className="flex-1 py-5 bg-primary text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50">
                    {isCreatingRanking ? "CRIANDO..." : "CRIAR LIGA"}
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {/* Address Modal */}
          <AnimatePresence>
            {showAddressPopup && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                <motion.div 
                  key="address-modal-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAddressPopup(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div 
                  key="address-modal-content"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white w-full max-w-md rounded-[2.5rem] p-8 relative z-10 shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black text-primary uppercase italic">Endereço da Arena</h3>
                    <button onClick={() => setShowAddressPopup(false)} className="p-2 bg-slate-100 rounded-xl text-slate-400">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Rua / Número</label>
                      <input 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-black outline-none focus:ring-2 focus:ring-primary/20"
                        value={arenaAddress.street}
                        onChange={(e) => setArenaAddress(prev => ({ ...prev, street: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Bairro</label>
                      <input 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-black outline-none focus:ring-2 focus:ring-primary/20"
                        value={arenaAddress.neighborhood}
                        onChange={(e) => setArenaAddress(prev => ({ ...prev, neighborhood: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Cidade</label>
                        <input 
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-black outline-none focus:ring-2 focus:ring-primary/20"
                          value={arenaAddress.city}
                          onChange={(e) => setArenaAddress(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Estado</label>
                        <input 
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-black outline-none focus:ring-2 focus:ring-primary/20"
                          value={arenaAddress.state}
                          onChange={(e) => setArenaAddress(prev => ({ ...prev, state: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowAddressPopup(false)}
                    className="w-full py-5 bg-primary text-white rounded-full font-black text-xs uppercase tracking-widest mt-8 shadow-lg active:scale-95 transition-all"
                  >
                    CONFIRMAR ENDEREÇO
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

            {isAuthReady && user && step === 'RANKING_DETAILS' && (
              <motion.div 
                key={`ranking-details-${activeRankingId || 'none'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full px-4 pb-10"
              >
                {!activeRanking ? (
                  <div className="flex flex-col items-center justify-center py-20 px-8">
                    <AlertCircle size={48} className="text-secondary mb-4 opacity-20" />
                    <p className="text-slate-500 font-medium italic">Liga não encontrada</p>
                    <button onClick={goBack} className="btn-secondary mt-6">Voltar</button>
                  </div>
                ) : (
                  <>
                    {/* Header New Design */}
                    <div className="flex items-center justify-between py-6 mb-2">
                       <button onClick={goBack} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-600 active:scale-95 transition-all">
                         <ChevronLeft size={24} />
                       </button>
                       <div className="flex flex-col items-center text-center">
                          <div className="flex items-center gap-1">
                             <h2 className="text-xl font-display font-black text-slate-800 uppercase italic tracking-tighter leading-none">
                               {activeRanking.name.split(' ').filter(w => w.length > 0).map((word, i, arr) => (
                                 <span key={`ranking-name-${word || i}-${i}`} className={i === arr.length - 1 ? "text-[#bef264]" : ""}>{word}{i < arr.length - 1 ? ' ' : ''}</span>
                               ))}
                             </h2>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Classificação Geral</span>
                       </div>
                       <div className="flex items-center gap-2">
                          {/* Buttons removed per request */}
                       </div>
                    </div>

                    {/* Hero Cover Card */}
                    <div className="relative w-full h-48 rounded-[2.5rem] bg-slate-200 overflow-hidden shadow-xl mb-6 group border-4 border-white">
                      {activeRanking.coverUrl ? (
                         <Image src={activeRanking.coverUrl} alt="Cover" fill className="object-cover" referrerPolicy="no-referrer" />
                      ) : (
                         <Image src="/capa-padrao.png" alt="Default League Cover" fill className="object-cover opacity-80" referrerPolicy="no-referrer" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                       <input 
                         type="file" 
                         className="hidden" 
                         ref={coverInputRef} 
                         accept="image/*"
                         capture="environment"
                         onChange={handleRankingPhotoUpload}
                       />
                       {activeRanking.adminIds.includes(user?.uid || '') && (
                        <button 
                          onClick={() => coverInputRef.current?.click()}
                          className="absolute bottom-6 left-6 flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-xl text-white rounded-xl border border-white/20 active:scale-95 transition-all text-[9px] font-black uppercase tracking-widest shadow-lg"
                        >
                          <Camera size={14} />
                          ALTERAR CAPA
                        </button>
                      )}
                    </div>

                    {/* Action Buttons Side-by-Side (almost) */}
                    <div className="flex gap-4 mb-8">
                       {activeRanking.adminIds.includes(user?.uid || '') && (
                         <button 
                           onClick={() => {
                             setPendingRankingId(activeRanking.id);
                             setTournamentName(activeRanking.name);
                             navigateTo('PLAYER_COUNT');
                           }}
                           className="w-full bg-[#bef264] p-5 rounded-[2.5rem] flex items-center justify-between group shadow-xl shadow-[#bef264]/20 active:scale-[0.98] transition-all"
                         >
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#bef264] shadow-sm">
                                 <Plus size={24} strokeWidth={4} />
                              </div>
                              <div className="text-left">
                                 <h4 className="text-[11px] font-black text-slate-900 uppercase italic leading-none mb-1">Novo Torneio</h4>
                                 <p className="text-[11px] font-black text-slate-900 uppercase italic">Ranqueado</p>
                              </div>
                           </div>
                           <ChevronRight size={20} className="text-slate-900/30 group-hover:translate-x-1 transition-all" />
                         </button>
                       )}
                    </div>

                       {/* "Minhas Ligas" button removed per request */}

                    {/* Tab Navigation Pill */}
                    <div className="bg-white/60 backdrop-blur-xl border border-slate-200/50 p-2 rounded-[2.5rem] flex items-center justify-between mb-8 shadow-xl">
                      {[
                        { id: 'RANKING', label: 'Tabela', icon: TrophyIcon },
                        { id: 'PLAYERS', label: 'Atletas', icon: Users },
                        { id: 'HISTORY', label: 'Torneios', icon: History },
                        { id: 'CONFIG', label: 'A Liga', icon: Settings }
                      ].map((tab) => (
                        <button 
                          key={`ranking-tab-${tab.id}`}
                          onClick={() => setRankingTab(tab.id as any)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-full transition-all text-[9.5px] font-black uppercase tracking-widest italic font-display",
                            rankingTab === tab.id 
                              ? "bg-[#004a8c] text-white shadow-lg shadow-[#004a8c]/20" 
                              : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <tab.icon size={16} />
                          <span className={rankingTab === tab.id ? "block" : "hidden sm:block"}>
                            {tab.label}
                          </span>
                        </button>
                      ))}
                    </div>

                {/* Tab Contents */}
                <div className="relative z-10">
                {rankingTab === 'RANKING' && (
                  <div className="space-y-6 pb-20">
                    <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#bef264]/5 rounded-full blur-3xl -mr-16 -mt-16" />
                      
                      <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-[#004a8c]/5 flex items-center justify-center text-[#004a8c] border border-[#004a8c]/10">
                              <BarChart size={24} />
                           </div>
                           <h3 className="text-sm font-black text-slate-800 uppercase italic">Tabela de Classificação</h3>
                        </div>
                        <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {rankingStats.length} Atletas
                        </div>
                      </div>

                      {rankingStats.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic border-b border-slate-50">
                                <th className="pb-4 px-2">Pos</th>
                                <th className="pb-4 px-2 text-center">Atleta</th>
                                <th className="pb-4 px-2 text-center">Pontos</th>
                                <th className="pb-4 px-2 text-center">V</th>
                                <th className="pb-4 px-2 text-center">D</th>
                                <th className="pb-4 px-4 text-right">Part</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {rankingStats.sort((a,b) => b.totalPoints - a.totalPoints).map((stat, idx) => (
                                <tr key={`stat-${stat.id || idx}`} onClick={() => setSelectedAthleteStats(stat)} className="group cursor-pointer hover:bg-slate-50/50 transition-all rounded-3xl">
                                  <td className="py-5 px-2">
                                     <div className={cn(
                                       "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black italic",
                                       idx === 0 ? "bg-[#bef264] text-slate-900 shadow-md" : 
                                       idx === 1 ? "bg-slate-200 text-slate-600" :
                                       idx === 2 ? "bg-amber-100 text-amber-700" : "text-slate-400"
                                     )}>
                                       {idx + 1}º
                                     </div>
                                  </td>
                                  <td className="py-5 px-2">
                                    <div className="flex items-center gap-3">
                                       <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden relative shadow-sm">
                                         {stat.photo ? (
                                           <Image src={stat.photo} alt="" fill className="object-cover" referrerPolicy="no-referrer" />
                                         ) : (
                                           <UserIcon size={14} className="text-slate-300" />
                                         )}
                                       </div>
                                       <div>
                                          <p className="text-xs font-black text-slate-700 uppercase italic leading-none">{stat.name}</p>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-50">{stat.userTag || `#${stat.id.slice(-4)}`}</p>
                                       </div>
                                    </div>
                                  </td>
                                  <td className="py-5 px-2 text-center">
                                    <span className="text-xs font-black text-slate-800 italic">{stat.totalPoints}</span>
                                  </td>
                                  <td className="py-5 px-2 text-center">
                                    <span className="text-xs font-bold text-slate-500">{stat.victories}</span>
                                  </td>
                                  <td className="py-5 px-2 text-center">
                                    <span className="text-xs font-bold text-slate-300">{stat.participations - stat.victories}</span>
                                  </td>
                                  <td className="py-5 px-4 text-right">
                                    <span className="text-xs font-black text-slate-400 italic">{stat.participations}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-24 flex flex-col items-center justify-center text-center">
                          <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-6 border border-slate-100 shadow-inner">
                            <TrophyIcon size={48} strokeWidth={1.5} />
                          </div>
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic mb-2">Aguardando Resultados</h4>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Do primeiro torneio...</p>
                        </div>
                      )}
                    </div>

                    {/* Information Card at bottom */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex items-center justify-between group active:scale-[0.98] transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#004a8c]/5 rounded-2xl flex items-center justify-center text-[#004a8c] shadow-sm border border-[#004a8c]/10">
                             <Info size={24} />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-800 italic leading-snug">A tabela será atualizada automaticamente</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">após os resultados das partidas.</p>
                          </div>
                       </div>
                       <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                )}

                {rankingTab === 'PLAYERS' && (
                  <div className="space-y-6">
                    {/* Add Athlete Section (Admin Only) */}
                    {activeRanking.adminIds.includes(user?.uid || '') && (
                      <div className="bg-white rounded-[2.5rem] p-6 border border-surface-container shadow-xl">
                        <h3 className="text-xs font-black text-on-surface uppercase italic mb-4">Adicionar Atleta à Liga</h3>
                        <div className="flex gap-2 mb-4">
                          <div className="relative flex-1">
                            <input 
                              type="text" 
                              placeholder="E-mail ou ID (#12345)" 
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black outline-none focus:ring-2 focus:ring-primary/20"
                              value={athleteSearch}
                              onChange={(e) => setAthleteSearch(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  searchAthlete();
                                }
                              }}
                            />
                            {isSearching && <div className="absolute right-4 top-4 animate-spin"><Settings size={16} className="text-primary" /></div>}
                          </div>
                          <button 
                            onClick={searchAthlete}
                            className="bg-primary text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-primary/20"
                          >
                            BUSCAR
                          </button>
                        </div>

                        {searchResult && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 overflow-hidden relative">
                                {searchResult.photoURL ? <Image src={searchResult.photoURL} alt="" fill className="object-cover" /> : <UserIcon size={16} />}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-900 uppercase italic leading-tight">{searchResult.displayName}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{searchResult.userTag}</p>
                              </div>
                              {searchResult.uid?.startsWith('manual-') ? (
                                <div className="space-y-1">
                                  <div className="px-3 py-1 bg-amber-100 text-amber-700 text-[8px] font-black rounded-lg uppercase inline-block">Manual</div>
                                  <p className="text-[7px] font-black text-amber-600 uppercase italic">Não contará para o ranking</p>
                                </div>
                              ) : (
                                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded-lg uppercase">Oficial</div>
                              )}
                            </div>
                            <button 
                              onClick={addAthleteToLeague}
                              disabled={isAddingAthlete}
                              className={cn(
                                "px-4 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest active:scale-95 disabled:opacity-50",
                                searchResult.uid?.startsWith('manual-') ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                              )}
                            >
                              {isAddingAthlete ? 'ADICIONANDO...' : 'ADICIONAR'}
                            </button>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Atletas da Liga */}
                    <div className="bg-white rounded-[2.5rem] border border-surface-container shadow-xl overflow-hidden">
                      <div className="px-8 py-6 border-b border-surface-container flex items-center justify-between">
                        <h3 className="text-xs font-black text-on-surface uppercase italic">Atletas da Liga</h3>
                        <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">
                          {(activeRanking.leagueAthletes?.length || 0)} Atletas Oficiais
                        </span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {activeRanking.leagueAthletes && activeRanking.leagueAthletes.length > 0 ? activeRanking.leagueAthletes.map((athlete, idx) => (
                          <div key={`athlete-${athlete.id || idx}-${idx}`} className="px-8 py-4 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 overflow-hidden shrink-0 relative">
                                {athlete.photo ? <Image src={athlete.photo} alt="" fill className="object-cover" referrerPolicy="no-referrer" /> : <UserIcon size={16} />}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-700 uppercase italic leading-tight">{athlete.name}</p>
                                <p className="text-[8px] font-bold text-primary italic">{athlete.userTag}</p>
                                {athlete.isManual && (
                                  <p className="text-[7px] font-black text-amber-600 uppercase italic mt-0.5">Manual - Não pontua</p>
                                )}
                              </div>
                            </div>
                            {activeRanking.adminIds.includes(user?.uid || '') && (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setAthleteToRemove(athlete.id);
                                }}
                                className="relative z-50 p-3 -m-2 text-slate-400 hover:text-rose-500 transition-colors md:opacity-0 md:group-hover:opacity-100 opacity-100 cursor-pointer"
                                title="Remover Atleta"
                              >
                                <X size={20} />
                              </button>
                            )}
                          </div>
                        )) : (
                          <div className="py-20 text-center opacity-30 text-[9px] font-black uppercase tracking-widest italic px-10">
                            Nenhum atleta registrado no atletas da liga. Adicione atletas pesquisando por E-mail ou ID.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {rankingTab === 'HISTORY' && (
                  <div className="space-y-4">
                    {/* Filter local tournaments state properly */}
                    {(() => {
                      const historyTournaments = tournaments
                        .filter(t => t.rankingId === activeRanking.id && (t.isFinished || (t.finalResults && t.finalResults.length > 0)))
                        .filter(t => !t.createdAt || (Date.now() - t.createdAt) < 365 * 24 * 60 * 60 * 1000)
                        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

                      if (historyTournaments.length === 0) {
                        return (
                          <div className="py-20 text-center opacity-30 text-[10px] font-black uppercase tracking-widest italic px-10">
                            Histórico vazio (ou torneios expirados).
                          </div>
                        );
                      }

                      return historyTournaments.map(t => (
                        <div key={t.id} className="bg-white rounded-[2rem] border border-surface-container shadow-xl overflow-hidden transition-all duration-300">
                          {/* Compact History Header */}

                            <div className="p-4 flex items-center justify-between group">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-100 italic">
                                  <span className="text-[10px] font-black leading-none text-slate-800">{new Date(t.createdAt || 0).getDate()}</span>
                                  <span className="text-[7px] font-black uppercase text-slate-400">
                                    {new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(t.createdAt || 0)).replace('.', '')}
                                  </span>
                                </div>
                                <div className="max-w-[140px] xs:max-w-[200px]">
                                  <h4 className="text-xs font-black text-slate-900 uppercase italic truncate">{t.name}</h4>
                                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-0.5">
                                    {t.athleteCount} ATLETAS • {t.matches.length} PARTIDAS
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                {t.finalResults && (
                                  <div className="flex -space-x-2">
                                    {t.finalResults.filter(r => r.placement === 1).slice(0, 1).map((champion, i) => (
                                      <div key={`champ-circle-${i}`} className="w-8 h-8 rounded-full bg-primary/10 border-2 border-white shadow-sm flex items-center justify-center text-primary overflow-hidden relative z-[10]">
                                        <UserIcon size={12} strokeWidth={3} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => setShowHistoryDetail(showHistoryDetail === t.id ? null : t.id)}
                                    className={cn(
                                      "p-2 rounded-xl transition-all",
                                      showHistoryDetail === t.id ? "bg-slate-100 text-slate-800" : "text-slate-300 hover:bg-slate-50"
                                    )}
                                  >
                                    {showHistoryDetail === t.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                  </button>
                                  {activeRanking.adminIds.includes(user?.uid || '') && (
                                    <button 
                                      onClick={() => setTournamentToDelete(t.id)}
                                      className="p-2 text-rose-500/20 hover:text-rose-500 transition-colors"
                                      title="Excluir do Histórico"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* History Details (Matches & Results) */}
                            {showHistoryDetail === t.id && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="border-t border-slate-50 bg-slate-50/30"
                              >
                                {/* Results vs Matches Tabs */}
                                <div className="flex border-b border-slate-50">
                                  <button 
                                    onClick={() => setHistoryDetailTab('RESULTS')}
                                    className={cn(
                                      "flex-1 py-3 text-[9px] font-black uppercase tracking-widest italic transition-all",
                                      historyDetailTab === 'RESULTS' ? "bg-white text-slate-900 border-b-2 border-primary" : "text-slate-400"
                                    )}
                                  >
                                    Resultados
                                  </button>
                                  <button 
                                    onClick={() => setHistoryDetailTab('MATCHES')}
                                    className={cn(
                                      "flex-1 py-3 text-[9px] font-black uppercase tracking-widest italic transition-all",
                                      historyDetailTab === 'MATCHES' ? "bg-white text-slate-900 border-b-2 border-primary" : "text-slate-400"
                                    )}
                                  >
                                    Partidas
                                  </button>
                                </div>

                                <div className="p-4 overflow-y-auto max-h-[400px]">
                                  {historyDetailTab === 'RESULTS' && t.finalResults && (
                                    <div className="space-y-1.5">
                                      {t.finalResults.sort((a, b) => a.placement - b.placement).map((res, idx) => (
                                        <div key={`hist-res-${idx}`} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                          <div className="flex items-center gap-3">
                                            <div className={cn(
                                              "w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black italic",
                                              res.placement === 1 ? "bg-amber-100 text-amber-700" : "bg-slate-50 text-slate-400"
                                            )}>
                                              {res.placement}º
                                            </div>
                                            <span className="text-[10px] font-black text-slate-700 uppercase italic truncate max-w-[140px]">{res.playerName}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {res.hadPneu && (
                                              <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[7px] font-black uppercase rounded-md border border-rose-100">PNEU</span>
                                            )}
                                            <span className="text-[10px] font-black text-primary italic">+{res.points} PTS</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {historyDetailTab === 'MATCHES' && (
                                    <div className="space-y-1.5">
                                      {t.matches.filter(m => m.isCompleted).map((m, idx) => {
                                        const p1Name = t.players.find(p => p.id === m.player1Id)?.name || m.player1Id;
                                        const p1pName = m.player1PartnerId ? t.players.find(p => p.id === m.player1PartnerId)?.name : null;
                                        const p2Name = t.players.find(p => p.id === m.player2Id)?.name || m.player2Id;
                                        const p2pName = m.player2PartnerId ? t.players.find(p => p.id === m.player2PartnerId)?.name : null;
                                        const s1 = m.sets[0]?.player1 ?? 0;
                                        const s2 = m.sets[0]?.player2 ?? 0;
                                        
                                        return (
                                          <div key={`hist-match-${idx}`} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                                            <div className="flex flex-col gap-0.5 flex-1 pr-4">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black text-slate-700 uppercase italic truncate">
                                                  {p1Name}{p1pName ? ` / ${p1pName}` : ''}
                                                </span>
                                                <span className={cn("text-[9px] font-black ml-2", s1 > s2 ? "text-primary" : "text-slate-400")}>{s1}</span>
                                              </div>
                                              <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black text-slate-700 uppercase italic truncate">
                                                  {p2Name}{p2pName ? ` / ${p2pName}` : ''}
                                                </span>
                                                <span className={cn("text-[9px] font-black ml-2", s2 > s1 ? "text-primary" : "text-slate-400")}>{s2}</span>
                                              </div>
                                            </div>
                                            <div className="pl-3 border-l border-slate-50 flex flex-col items-center justify-center min-w-[50px]">
                                              <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-0.5">MESA</span>
                                              <span className="text-[10px] font-black text-slate-500 italic">{m.table}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {t.matches.filter(m => m.isCompleted).length === 0 && (
                                        <p className="text-center py-10 text-[9px] font-black text-slate-300 uppercase italic">Nenhuma partida finalizada encontrada.</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </div>
                        ))
                    })()}
                  </div>
                )}

                {rankingTab === 'CONFIG' && (
                  <div className="space-y-6 pb-20">
                    {/* Editar Informações da Liga (Admin Only) */}
                    {activeRanking.adminIds.includes(user?.uid || '') && (
                      <div className="bg-white rounded-[2.5rem] p-8 border border-surface-container shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Camera size={20} />
                          </div>
                          <h3 className="text-xs font-black text-on-surface uppercase italic">Editar Dados da Liga</h3>
                        </div>

                        <div className="space-y-6">
                           <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Nome da Liga</label>
                             <input 
                               type="text"
                               className="input-field py-4 text-xs font-bold"
                               placeholder="Nome da Liga"
                               value={rankingName}
                               onChange={(e) => setRankingName(e.target.value)}
                             />
                           </div>

                           <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Descrição</label>
                             <textarea 
                               className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs font-medium italic focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px]"
                               placeholder="Descreva sua liga..."
                               value={rankingDescription}
                               onChange={(e) => setRankingDescription(e.target.value)}
                             />
                           </div>

                           <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Nome da Arena</label>
                             <input 
                               type="text"
                               className="input-field py-4 text-xs font-bold"
                               placeholder="Ex: Arena Beach Tennis"
                               value={arenaName}
                               onChange={(e) => setArenaName(e.target.value)}
                             />
                           </div>

                           <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Endereço da Arena</label>
                             <button 
                               onClick={() => setShowAddressPopup(true)}
                               className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left"
                             >
                                <span className="text-xs font-medium text-slate-600 truncate">
                                  {arenaAddress.street ? `${arenaAddress.street}, ${arenaAddress.city}` : "Definir endereço..."}
                                </span>
                                <ChevronRight size={16} className="text-slate-400" />
                             </button>
                           </div>

                           <div className="pt-4 border-t border-slate-50">
                             <h4 className="text-[10px] font-black text-slate-900 uppercase italic mb-4">Regras de Pontuação</h4>
                             
                             <div className="grid grid-cols-2 gap-3 mb-6">
                               <div className="space-y-2">
                                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Partic.</label>
                                 <div className="flex items-center gap-2">
                                   <button onClick={() => setPPoints(Math.max(0, pPoints - 1))} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">-</button>
                                   <span className="text-xs font-black w-6 text-center">{pPoints}</span>
                                   <button onClick={() => setPPoints(pPoints + 1)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">+</button>
                                 </div>
                               </div>
                             </div>

                             <div className="space-y-2 mb-6">
                               <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Posições que Pontuam (Top X)</label>
                               <div className="flex items-center gap-3">
                                 <button onClick={() => setPositionsThatScore(Math.max(1, positionsThatScore - 1))} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">-</button>
                                 <span className="text-xs font-black w-10 text-center">Top {positionsThatScore}</span>
                                 <button onClick={() => setPositionsThatScore(Math.min(10, positionsThatScore + 1))} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">+</button>
                               </div>
                             </div>

                             <div className="space-y-2">
                               <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Pontos por Posição</label>
                               <div className="grid grid-cols-2 gap-2">
                                 {Array.from({ length: positionsThatScore }).map((_, idx) => {
                                   const pos = idx + 1;
                                   return (
                                     <div key={`edit-pts-${pos}`} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                                       <span className="text-[9px] font-black text-slate-400">#{pos}</span>
                                       <input 
                                         type="number"
                                         value={placementPoints[pos] || 0}
                                         onChange={(e) => setPlacementPoints(prev => ({ ...prev, [pos]: parseInt(e.target.value) || 0 }))}
                                         className="w-12 bg-transparent text-right text-[10px] font-black text-primary outline-none"
                                       />
                                     </div>
                                   );
                                 })}
                               </div>
                             </div>
                           </div>

                           <button 
                             onClick={updateRankingGeneral}
                             className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all mt-4"
                           >
                             SALVAR CONFIGURAÇÕES
                           </button>
                        </div>
                      </div>
                    )}

                    {/* Sobre a Liga */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-surface-container shadow-xl">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                          <Info size={20} />
                        </div>
                        <h3 className="text-xs font-black text-on-surface uppercase italic">Sobre a Liga</h3>
                      </div>

                      <div className="space-y-6">
                        {activeRanking.description && (
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Descrição</label>
                             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                               <p className="text-xs font-medium text-slate-600 leading-relaxed italic">{activeRanking.description}</p>
                             </div>
                          </div>
                        )}

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                           <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm shrink-0">
                             <MapPin size={18} />
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Localização / Arena</p>
                              <p className="text-sm font-black text-slate-900 uppercase italic">{activeRanking.arenaName || "Arena não informada"}</p>
                              {activeRanking.address && (activeRanking.address.street || activeRanking.address.city) && (
                                <p className="text-[9px] font-medium text-slate-400 uppercase mt-1">
                                  {[activeRanking.address.street, activeRanking.address.neighborhood, activeRanking.address.city, activeRanking.address.state].filter(Boolean).join(', ')}
                                </p>
                              )}
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 border border-surface-container shadow-xl">
                      <div className="flex items-center gap-3 mb-6">
                         <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                            <ClipboardList size={20} />
                         </div>
                         <h3 className="text-xs font-black text-on-surface uppercase italic">Regras de Pontuação</h3>
                      </div>

                      <div className="space-y-3 mb-8">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Participação</span>
                          <span className="text-sm font-black text-slate-500 italic">+{activeRanking.pointsConfig.participation || 0} Pts</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100">
                          <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest italic">Penalidade Pneu</span>
                          <span className="text-sm font-black text-rose-500 italic">{activeRanking.pointsConfig.pneu || 0} Pts</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Pontua até:</span>
                          <span className="text-sm font-black text-slate-900 italic">Top {activeRanking.pointsConfig.positionsThatScore}</span>
                        </div>
                      </div>
                      
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2 italic">Bônus por Colocação</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(activeRanking.pointsConfig.placementPoints || {}).sort((a, b) => Number(a[0]) - Number(b[0])).map(([pos, pts]) => (
                          <div key={pos} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 italic">#{pos} LUGAR</span>
                            <span className="text-xs font-black text-primary">{pts as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {activeRanking.adminIds.includes(user?.uid || '') && (
                      <div className="bg-white rounded-[2.5rem] p-8 border border-surface-container shadow-xl">
                        <h3 className="text-xs font-black text-on-surface uppercase italic mb-6">Administradores da Liga</h3>
                        <div className="flex gap-2 mb-6">
                           <input 
                             type="email" 
                             placeholder="E-mail do novo ADM" 
                             className="flex-1 bg-slate-50 border-none rounded-2xl p-4 text-xs font-black placeholder:text-on-surface-variant/20 outline-none"
                             value={newAdminEmail}
                             onChange={(e) => setNewAdminEmail(e.target.value)}
                           />
                           <button 
                             onClick={() => addAdminToRanking(activeRanking.id, newAdminEmail)}
                             className="bg-primary text-white px-5 rounded-2xl active:scale-95 transition-all shadow-lg"
                           >
                             <Check size={20} />
                           </button>
                        </div>

                        <div className="space-y-3">
                          {activeRanking.adminIds.map((aid, idx) => {
                            const profile = adminProfiles[aid];
                            return (
                              <div key={`admin-item-${aid || idx}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3 min-w-0">
                                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 overflow-hidden relative">
                                     {profile?.photoURL ? (
                                       <Image src={profile.photoURL} alt="" fill className="object-cover" referrerPolicy="no-referrer" />
                                     ) : (
                                       <UserIcon size={14} />
                                     )}
                                   </div>
                                   <div className="min-w-0">
                                      <p className="text-[10px] font-black text-slate-700 uppercase italic truncate">{profile?.displayName || aid}</p>
                                      <p className="text-[8px] font-medium text-slate-400 truncate">{profile?.email || profile?.userTag || "ADM"}</p>
                                   </div>
                                </div>
                                {aid === activeRanking.ownerId && (
                                   <span className="text-[8px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg uppercase italic whitespace-nowrap">Fundador</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-[2.5rem] p-8 border-2 border-rose-100 shadow-xl shadow-rose-500/5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
                                {activeRanking.ownerId === user?.uid ? <Trash2 size={20} /> : <LogOut size={20} />}
                            </div>
                            <h3 className="text-xs font-black text-on-surface uppercase italic">
                              {activeRanking.ownerId === user?.uid ? "Zona de Perigo" : "Sair da Liga"}
                            </h3>
                        </div>
                        <p className="text-[10px] font-black text-on-surface-variant/40 mb-8 uppercase tracking-tight leading-relaxed">
                          {activeRanking.ownerId === user?.uid 
                            ? "A exclusão da liga é permanente. Todos os rankings, torneios e históricos vinculados serão perdidos."
                            : "Você deixará de fazer parte desta liga. Aviso: Todos os seus pontos acumulados no ranking serão permanentemente perdidos."
                          }
                        </p>
                        <button 
                          onClick={() => {
                            if (activeRanking.ownerId === user?.uid) {
                              setLeagueToDelete(activeRanking.id);
                            } else {
                              setLeagueToExit(activeRanking.id);
                            }
                          }}
                          className="w-full py-6 bg-rose-500 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-lg shadow-rose-500/20"
                        >
                          {activeRanking.ownerId === user?.uid ? "EXCLUIR LIGA PERMANENTEMENTE" : "SAIR DA LIGA"}
                        </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

              {/* Athlete Detail Modal */}
              <AnimatePresence>
                {selectedAthleteStats && (
                  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                    <motion.div 
                      key="athlete-stats-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedAthleteStats(null)}
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div 
                      key="athlete-stats-content"
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-10 relative z-10 shadow-2xl"
                    >
                      <button 
                        onClick={() => setSelectedAthleteStats(null)}
                        className="absolute top-6 right-6 w-10 h-10 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant"
                      >
                        <X size={20} />
                      </button>

                      <div className="flex flex-col items-center text-center mb-10">
                        <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-6 border-4 border-white shadow-xl overflow-hidden relative">
                           {selectedAthleteStats.photo ? (
                             <Image src={selectedAthleteStats.photo} alt={selectedAthleteStats.name} fill className="object-cover" referrerPolicy="no-referrer" />
                           ) : (
                             <UserIcon size={32}/>
                           )}
                        </div>
                        <h3 className="text-xl font-black text-on-surface uppercase italic font-display tracking-tight">{selectedAthleteStats.name}</h3>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-1">Estatísticas Detalhadas</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-surface-container flex flex-col items-center">
                          <span className="text-2xl font-black text-on-surface font-display">{selectedAthleteStats.totalPoints}</span>
                          <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1">Pontos Totais</span>
                        </div>
                        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-surface-container flex flex-col items-center">
                          <span className="text-2xl font-black text-on-surface font-display">{selectedAthleteStats.victories}</span>
                          <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1">Vitórias</span>
                        </div>
                        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-surface-container flex flex-col items-center">
                          <span className="text-2xl font-black text-on-surface font-display">{selectedAthleteStats.participations}</span>
                          <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1">Jogos</span>
                        </div>
                        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-surface-container flex flex-col items-center">
                          <span className="text-2xl font-black text-on-surface font-display">{selectedAthleteStats.pneus}</span>
                          <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1">Pneus (6-0)</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => setSelectedAthleteStats(null)}
                        className="w-full py-5 bg-surface-container rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-on-surface-variant mt-10 hover:bg-surface-container-high transition-all"
                      >
                        FECHAR
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {isAuthReady && user && step === 'TOURNAMENT_NAME' && (
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
                    onClick={() => navigateTo('HOME', { tournamentId: null })}
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

          {isAuthReady && user && step === 'PLAYER_COUNT' && (
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
                    onClick={() => navigateTo('TOURNAMENT_NAME', { replace: true })}
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

          {isAuthReady && user && step === 'FORMAT_SELECTION' && (
            <StepContainer 
              key="format"
              title="Formato do Torneio"
              subtitle={`Opções para ${playerCount} atletas.`}
              currentStep={3}
            >
              <div className="space-y-4 pr-2 custom-scrollbar">
                {[
                  { id: 'REI_DA_QUADRA', title: 'REI DA QUADRA (4 Atletas)', desc: 'Formato individual: 3 rodadas onde cada atleta joga com um parceiro diferente. 4 atletas necessários.', icon: TrophyIcon, req: 4 },
                  { id: 'SUPER_6_INDIVIDUAL', title: 'SUPER 6 INDIVIDUAL (6 Atletas)', desc: 'Formato individual: 5 rodadas. Você joga uma vez com cada um dos outros 5 atletas. 6 atletas necessários.', icon: Users, req: 6 },
                  { id: 'SUPER_3_FIXED', title: 'SUPER 3 DUPLAS FIXAS (6 Atletas)', desc: '3 duplas fixas (6 atletas) em formato todos contra todos.', icon: Users, req: 6 },
                  { id: 'SUPER_4_FIXED', title: 'SUPER 4 DUPLAS FIXAS (8 Atletas)', desc: '4 duplas fixas (8 atletas) em Round Robin completo.', icon: Users, req: 8 },
                  { id: 'SUPER_8_INDIVIDUAL', title: 'SUPER 8 INDIVIDUAL (8 Atletas)', desc: 'Formato individual: 7 rodadas. Rotação completa de parceiros. 8 atletas necessários.', icon: Users, req: 8 },
                  { id: 'SUPER_5_FIXED', title: 'SUPER 5 DUPLAS FIXAS (10 Atletas)', desc: '5 duplas fixas (10 atletas) em formato todos contra todos.', icon: Users, req: 10 },
                  { id: 'SUPER_10_INDIVIDUAL', title: 'SUPER 10 INDIVIDUAL (10 Atletas)', desc: 'Formato individual: 9 rodadas. Rotação completa entre 10 atletas.', icon: Users, req: 10 },
                  { id: 'SUPER_12_INDIVIDUAL', title: 'SUPER 12 INDIVIDUAL (12 Atletas)', desc: 'Formato individual: 11 rodadas. Rotação completa entre 12 atletas.', icon: Users, req: 12 },
                  { id: 'SUPER_6_FIXED', title: 'SUPER 6 DUPLAS FIXAS (12 Atletas)', desc: '6 duplas fixas (12 atletas) em formato todos contra todos.', icon: Users, req: 12 },
                  { id: 'SUPER_8_FIXED', title: 'SUPER 8 DUPLAS FIXAS (16 Atletas)', desc: '8 duplas fixas (16 atletas). Disputa intensa de Round Robin.', icon: Users, req: 16 },
                  { id: 'SUPER_10_FIXED', title: 'SUPER 10 DUPLAS FIXAS (20 Atletas)', desc: '10 duplas fixas (20 atletas). Formato de liga longa.', icon: Users, req: 20 },
                  { id: 'SUPER_12_FIXED', title: 'SUPER 12 DUPLAS FIXAS (24 Atletas)', desc: '12 duplas fixas (24 atletas). O desafio máximo.', icon: Users, req: 24, premium: false },
                  { id: 'GROUPS_MATA_MATA', title: 'GRUPOS + MATA-MATA', desc: 'Torneio clássico: fase de grupos seguida de eliminatórias.', icon: LayoutGrid, req: 4, premium: true },
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
                      tournamentFormat === f.id ? "border-primary bg-primary/5" : "border-surface-container hover:border-primary/20",
                      f.premium && !isPremium && "opacity-60 grayscale-[0.5]"
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
                          {f.premium && !isPremium && (
                            <span className="bg-amber-400 text-slate-900 text-[8px] px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                              PREMIUM <Lock size={8} />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-tight mt-1">{f.desc}</p>
                      </div>
                    </div>
                    {tournamentFormat === f.id && <CheckCircle2 size={24} className="text-primary" />}
                    {f.premium && !isPremium && <Zap size={20} className="text-amber-500 fill-amber-500" />}
                  </div>
                ))}

                {playerCount !== 12 && playerCount !== 16 && playerCount !== 20 && playerCount !== 24 && (
                  <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/10 text-primary text-[10px] font-black text-center uppercase tracking-widest leading-relaxed">
                    Formatos &quot;SUPER&quot; exigem quantidades específicas de atletas.
                  </div>
                )}

                <div className="pt-4">
                  <button 
                    onClick={() => navigateTo('PLAYER_COUNT', { replace: true })}
                    className="w-full py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    VOLTAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {isAuthReady && user && step === 'GROUP_CONFIG' && (
            <StepContainer 
              key="group-config"
              title="Estrutura de Grupos"
              subtitle="Escolha a melhor distribuição para o seu torneio."
              currentStep={3}
            >
              <div className="space-y-6">
                <div className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10 flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-on-secondary-container uppercase tracking-widest mb-1">Logística de Quadras</h4>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-tight leading-relaxed">
                      {teamsPerGroup === 4 ? 
                        "Dica: Para grupos de 4 duplas, recomendamos reservar ao menos 2 quadras por grupo para evitar filas e agilizar o torneio." : 
                        "Organize seu torneio definindo o tamanho dos grupos para equilibrar tempo de jogo e descanso."}
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
                    onClick={() => navigateTo('FORMAT_SELECTION', { replace: true })}
                    className="flex-1 py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    VOLTAR
                  </button>
                  <button 
                    onClick={() => navigateTo('PLAYOFF_CONFIG', { replace: true })}
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
                    onClick={() => navigateTo('GROUP_CONFIG', { replace: true })}
                    className="flex-1 py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    VOLTAR
                  </button>
                  <button 
                    onClick={() => {
                      navigateTo('MATCH_FORMAT', { replace: true });
                    }}
                    className="flex-1 py-4 bg-primary text-on-primary rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
                  >
                    PRÓXIMO
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {isAuthReady && user && step === 'MATCH_FORMAT' && (
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
                    onClick={() => navigateTo('FORMAT_SELECTION', { replace: true })}
                    className="w-full py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    VOLTAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {isAuthReady && user && step === 'REGISTRATION_TYPE' && (
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
                    onClick={() => navigateTo('TABLE_COUNT', { replace: true })}
                    className="w-full py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    VOLTAR
                  </button>
                </div>
              </div>
            </StepContainer>
          )}

          {isAuthReady && user && step === 'ATHLETE_REGISTRATION' && (
            <StepContainer 
              key="athletes"
              title={registrationType === 'RANDOM_DRAW' ? "Seleção de Atletas" : "Cadastro de Duplas"}
              subtitle={registrationType === 'RANDOM_DRAW' ? "Selecione os atletas da liga ou insira os nomes manualmente." : "Insira o nome de cada dupla."}
              currentStep={6}
            >
              <div className="space-y-4 mb-6">
                {pendingRankingId && (
                  <div className="bg-white border-4 border-amber-400 p-6 rounded-[2.5rem] flex flex-col gap-4 mb-8 shadow-xl ring-8 ring-amber-500/5 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-400 p-3 rounded-2xl text-white shadow-lg shadow-amber-200">
                        <AlertTriangle size={24} strokeWidth={3} />
                      </div>
                      <h4 className="text-[14px] font-black text-amber-950 uppercase tracking-tight leading-none">Atenção: Atleta Convidado</h4>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[12px] font-black text-amber-900 leading-tight">
                        Este torneio é <span className="bg-amber-100 px-1.5 rounded">VALENDO PONTOS</span> para a liga.
                      </p>
                      <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/50">
                        <p className="text-[11px] font-bold text-amber-800 leading-relaxed italic">
                          Atletas <span className="text-amber-950 underline decoration-amber-400 decoration-2 underline-offset-4">não cadastrados</span> na liga podem participar normalmente, mas <span className="text-red-600 font-black">NÃO SOMARÃO PONTOS</span> no ranking global em nenhuma hipótese.
                        </p>
                      </div>
                      <p className="text-[10px] font-bold text-amber-700/60 uppercase tracking-wider">
                        Apenas atletas da lista oficial acumulam pontuação.
                      </p>
                    </div>
                  </div>
                )}
                {(registrationType === 'RANDOM_DRAW' && pendingRankingId) ? (
                  // Selection from Athletes List
                  <div className="space-y-4">
                    <div className="bg-primary/5 p-6 rounded-[2.5rem] border border-primary/10">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Escolher Atletas da Liga</h4>
                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {rankings.find(r => r.id === pendingRankingId)?.leagueAthletes?.map((athlete, idx) => {
                          const isSelected = players.some(p => p.id === athlete.id);
                          return (
                            <button
                              key={`select-athlete-${athlete.id || idx}`}
                              onClick={() => {
                                if (isSelected) {
                                  // Find first empty slot or last one
                                  const idxToRemove = players.findIndex(p => p.id === athlete.id);
                                  if (idxToRemove !== -1) {
                                    const newPlayers = [...players];
                                    newPlayers[idxToRemove] = { id: `p-${idxToRemove}`, name: '' };
                                    setPlayers(newPlayers);
                                  }
                                } else {
                                  // Find first empty name slot
                                  const emptyIdx = players.findIndex(p => !p.name.trim());
                                  if (emptyIdx !== -1) {
                                    const newPlayers = [...players];
                                    newPlayers[emptyIdx] = { id: athlete.id, name: athlete.name.toUpperCase() };
                                    setPlayers(newPlayers);
                                  } else {
                                    setSnackMessage("Limite de atletas atingido.");
                                    setTimeout(() => setSnackMessage(null), 2000);
                                  }
                                }
                              }}
                              className={cn(
                                "w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all",
                                isSelected ? "bg-primary border-primary text-white shadow-lg" : "bg-white border-slate-100 text-slate-700"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span className={cn("w-4 h-4 rounded-full border flex items-center justify-center", isSelected ? "border-white" : "border-slate-300")}>
                                  {isSelected && <Check size={10} />}
                                </span>
                                <span className="text-xs font-black uppercase italic">{athlete.name}</span>
                              </div>
                              <span className="text-[8px] font-mono opacity-50">{athlete.userTag}</span>
                            </button>
                          );
                        }) || (
                          <div className="py-10 text-center opacity-30 text-[9px] font-black uppercase tracking-widest italic">
                            Nenhum atleta na lista da liga.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {players.map((player, idx) => (
                        <div key={player.id} className="space-y-2">
                          <label className="text-[8px] font-black text-on-surface-variant/30 uppercase tracking-widest px-2">Atleta {idx + 1}</label>
                          <input 
                            type="text"
                            placeholder="Nome do atleta"
                            className="w-full bg-surface-container-low border-none rounded-2xl p-4 text-xs font-black text-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                            value={player.name}
                            onChange={(e) => {
                              const newPlayers = [...players];
                              newPlayers[idx].name = e.target.value.toUpperCase();
                              // If they type, it's no longer linked to a specific user unless we match it? No, keeping it simple.
                              setPlayers(newPlayers);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : registrationType === 'RANDOM_DRAW' ? (
                  // Original Individual Registration
                  players.map((player, idx) => (
                    <div key={`player-reg-${player.id}-${idx}`} className="space-y-2">
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
                              newPlayers[idx].name = e.target.value.toUpperCase();
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
                      <div key={`team-reg-${team.id}-${idx}`} className="bg-white p-5 rounded-[2rem] border-2 border-surface-container space-y-4 shadow-sm">
                        {/* ... (keep existing duo logic) ... */}
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
                              newPlayers[idx].name = `${e.target.value.toUpperCase()} / ${p2}`;
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
                              newPlayers[idx].name = `${p1} / ${e.target.value.toUpperCase()}`;
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
                  onClick={() => navigateTo('REGISTRATION_TYPE', { replace: true })}
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

          {isAuthReady && user && step === 'DRAWING' && (
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

          {isAuthReady && user && step === 'GROUPS_DISPLAY' && (
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
                    onClick={() => navigateTo('ATHLETE_REGISTRATION', { replace: true })}
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
                      // Pass drawnGroups to skip shuffling inside generateGroupStage
                      const { matches: groupMatches } = generateGroupStage(teamsToGroup, selectedCourts, { groupsCount, teamsPerGroup, type: groupsMatchPlay }, drawnGroups);
                      
                      const matches = groupMatches;
                      const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
                      
                      const tournamentId = `t-${Date.now()}`;
                      const newTournament: TournamentState = {
                        id: tournamentId,
                        name: tournamentName,
                        players: teamsToGroup,
                        athleteCount: playerCount,
                        matches,
                        matches_group_stage: groupMatches,
                        matches_knockout_stage: [],
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
                        createdAt: Date.now(),
                        rankingId: pendingRankingId || undefined
                      };
                      
                      try {
                        const tournamentData = cleanData({ ...newTournament, uid: user.uid });
                        await setDoc(doc(db, 'tournaments', tournamentId), tournamentData);
                        setPendingRankingId(null);
                        navigateTo('TOURNAMENT', { tournamentId, replace: true });
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

          {isAuthReady && user && step === 'RANKING_CRITERIA' && (
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
                      <div key={`criteria-${c || idx}-${idx}`} className="bg-primary text-on-primary px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
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
                    onClick={() => navigateTo('MATCH_FORMAT', { replace: true })}
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

          {isAuthReady && user && step === 'TABLE_COUNT' && (
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
                    onClick={() => navigateTo('RANKING_CRITERIA', { replace: true })}
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

          {isAuthReady && user && step === 'TOURNAMENT' && activeTournament && (
            <motion.div 
              key={activeTournament.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-2xl mx-auto pt-2"
            >
              <div className="px-4 space-y-6">
                {/* Acesso Rápido Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-on-surface-variant/50">
                    <Zap size={14} className="text-secondary fill-secondary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em]">
                      ACESSO RÁPIDO AOS SEUS TORNEIOS ATIVOS
                    </span>
                  </div>
                  
                  <div className="bg-surface-container-low/50 border border-surface-container rounded-full p-1.5 flex gap-1 shadow-sm overflow-x-auto no-scrollbar">
                    {tournaments.filter(t => !t.isHidden).map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setActiveTournamentId(t.id);
                          if (t.isFinished) {
                            navigateTo('FINISHED', { tournamentId: t.id });
                          } else {
                            navigateTo('TOURNAMENT', { tournamentId: t.id, tab: 'MATCHES' });
                          }
                        }}
                        className={cn(
                          "flex-1 py-3 px-4 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 min-w-fit",
                          t.id === activeTournament.id 
                            ? "bg-secondary text-primary shadow-lg shadow-primary/5" 
                            : "text-on-surface-variant hover:bg-surface-container"
                        )}
                      >
                        {t.isFinished && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tournament Hero Card */}
                <div className="arena-hero-bg rounded-[3rem] p-4 sm:p-6 min-h-[160px] flex flex-col justify-between shadow-2xl mb-4 relative overflow-hidden group transition-all duration-500 hover:shadow-primary/40">
                  {/* Illustrations (Simplified) */}
                  <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden rounded-[3rem]">
                    <div className="absolute bottom-0 right-0 w-48 h-48 -mr-12 -mb-12">
                       <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
                         <path d="M160 180L160 100M120 180L120 100M120 110H160" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                         <circle cx="140" cy="80" r="15" stroke="currentColor" strokeWidth="2" />
                         <path d="M10 180C10 180 30 110 50 110C70 110 90 180 90 180" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
                       </svg>
                    </div>
                  </div>

                  <div className="flex justify-between items-start relative z-10 w-full gap-4">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 shrink-0">
                       <Sparkles size={12} className="text-secondary" />
                       <span className="text-[9px] font-black text-white uppercase tracking-widest truncate max-w-[100px]">
                         {(() => {
                            const formats: { [key: string]: string } = {
                              'REI_DA_QUADRA': 'REI DA QUADRA',
                              'SUPER_8_INDIVIDUAL': 'SUPER 8 IND',
                              'SUPER_6_INDIVIDUAL': 'SUPER 6 IND',
                              'SUPER_4_FIXED': 'SUPER 4 DUPLAS',
                              'SUPER_10_INDIVIDUAL': 'SUPER 10 IND',
                              'SUPER_12_INDIVIDUAL': 'SUPER 12 IND',
                              'SUPER_6_FIXED': 'SUPER 6 DUPLAS',
                              'SUPER_8_FIXED': 'SUPER_ 8 DUPLAS',
                              'SUPER_10_FIXED': 'SUPER 10 DUPLAS',
                              'SUPER_12_FIXED': 'SUPER 12 DUPLAS',
                              'GROUPS_MATA_MATA': 'GRUPOS + MATA-MATA',
                            };
                            return formats[activeTournament.format] || 'TORNEIO';
                         })()}
                       </span>
                    </div>

                    <button 
                      onClick={() => setTournamentToDelete(activeTournament.id)}
                      className="group flex items-center gap-1.5 border border-red-500/20 bg-black/10 backdrop-blur-md px-2.5 py-1 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm shrink-0"
                    >
                      <X size={10} className="bg-red-500 text-white rounded-full p-0.5" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Encerrar</span>
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col justify-center relative z-10 py-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-white italic tracking-tighter uppercase leading-tight drop-shadow-md break-words max-w-full">
                        {activeTournament.name}
                      </h1>
                      {activeTournament.isFinished && (
                        <div className="bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1 rounded-full flex items-center gap-2 shadow-lg h-fit">
                          <CheckCircle2 size={12} className="text-secondary" />
                          <span className="text-[9px] font-black text-white uppercase tracking-widest italic">FINALIZADO</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center relative z-10">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-0.5 rounded-full flex items-center shadow-xl">
                      <div className="bg-primary/30 px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/5">
                        <div className="relative">
                          <History size={12} className="text-secondary" />
                          <div className="absolute -top-1 -right-1 w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                        </div>
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">
                          {activeTournament.currentRound >= 100 ? (
                            (() => {
                              const types: { [key: number]: string } = {
                                100: 'OITAVAS',
                                101: 'QUARTAS',
                                102: 'SEMI-FINAL',
                                103: 'FINAL'
                              };
                              return types[activeTournament.currentRound] || `FASE ${activeTournament.currentRound}`;
                            })()
                          ) : (
                            <>RODADA <span className="text-secondary">{String(activeTournament.currentRound).padStart(2, '0')}</span></>
                          )}
                        </span>
                      </div>
                      
                      {activeTournament.currentRound < 100 && (
                        <div className="px-3">
                          <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">
                            DE <span className="text-white/60">{String(Math.max(...activeTournament.matches.map(m => m.round).filter(r => r < 100), 0) || activeTournament.totalRounds).padStart(2, '0')}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Navigation Tabs - New Style */}
                <div className="bg-white rounded-[2rem] border border-surface-container flex shadow-sm overflow-hidden mb-2">
                  <button 
                    onClick={() => navigateTo('TOURNAMENT', { tab: 'MATCHES' })}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-2 py-4 px-2 transition-all relative border-r border-surface-container",
                      tournamentTab === 'MATCHES' ? "bg-surface-container-low text-primary" : "text-on-surface-variant/40 hover:bg-surface-container-lowest"
                    )}
                  >
                    <LayoutGrid size={20} className={tournamentTab === 'MATCHES' ? "fill-primary/10" : ""} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Partidas</span>
                    {tournamentTab === 'MATCHES' && <div className="absolute bottom-0 left-4 right-4 h-1 bg-primary rounded-t-full" />}
                  </button>
                  <button 
                    onClick={() => navigateTo('TOURNAMENT', { tab: 'RANKING' })}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-2 py-4 px-2 transition-all relative border-r border-surface-container",
                      tournamentTab === 'RANKING' ? "bg-surface-container-low text-primary" : "text-on-surface-variant/40 hover:bg-surface-container-lowest"
                    )}
                  >
                    <TrophyIcon size={20} className={tournamentTab === 'RANKING' ? "fill-primary/10" : ""} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Ranking</span>
                    {tournamentTab === 'RANKING' && <div className="absolute bottom-0 left-4 right-4 h-1 bg-primary rounded-t-full" />}
                  </button>
                  <button 
                    onClick={() => navigateTo('TOURNAMENT', { tab: 'ROUNDS' })}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-2 py-4 px-2 transition-all relative",
                      tournamentTab === 'ROUNDS' ? "bg-surface-container-low text-primary" : "text-on-surface-variant/40 hover:bg-surface-container-lowest"
                    )}
                  >
                    <History size={20} className={tournamentTab === 'ROUNDS' ? "fill-primary/10" : ""} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Rodadas</span>
                    {tournamentTab === 'ROUNDS' && <div className="absolute bottom-0 left-4 right-4 h-1 bg-primary rounded-t-full" />}
                  </button>
                </div>
              </div>

              <div className="px-4 space-y-2">
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest p-3 rounded-2xl border border-red-100 flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{error}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-4 px-4 pb-32">
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
                        <h2 className="text-xs font-black text-on-surface font-display uppercase tracking-widest">
                          QUADRA {court.padStart(2, '0')}{matches[0]?.groupId ? ` - GRUPO ${matches[0].groupId}` : ''}
                        </h2>
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
                                    <div className="flex flex-1 items-center justify-center relative min-h-[3.5rem]">
                                      <div className="absolute left-0 flex flex-col items-center justify-center gap-1.5 h-full">
                                        <button 
                                          onClick={() => updateMatchScore(match.id, 1, 1)} 
                                          disabled={match.isCompleted}
                                          className={cn(
                                            "w-6 h-6 rounded-md flex items-center justify-center transition-all shadow-sm active:scale-95",
                                            match.isCompleted 
                                              ? "bg-slate-100 text-slate-300 opacity-40 cursor-not-allowed shadow-none" 
                                              : "bg-primary text-white hover:bg-primary-dim shadow-primary/20"
                                          )}
                                        >
                                          <Plus size={12} strokeWidth={4} />
                                        </button>
                                        <button 
                                          onClick={() => updateMatchScore(match.id, 1, -1)} 
                                          disabled={match.isCompleted}
                                          className={cn(
                                            "w-6 h-6 rounded-md flex items-center justify-center transition-all shadow-sm active:scale-95",
                                            match.isCompleted
                                              ? "bg-slate-50 text-slate-200 opacity-40 cursor-not-allowed shadow-none"
                                              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                                          )}
                                        >
                                          <Minus size={12} strokeWidth={4} />
                                        </button>
                                      </div>
                                      <span className="text-3xl font-black text-on-surface font-display tracking-tighter">
                                        {p1Games}
                                      </span>
                                    </div>

                                    {/* Vertical Divider */}
                                    <div className="h-8 w-[1px] bg-surface-container-highest/20"></div>

                                    {/* Team 2 Area */}
                                    <div className="flex flex-1 items-center justify-center relative min-h-[3.5rem]">
                                      <span className="text-3xl font-black text-on-surface font-display tracking-tighter">
                                        {p2Games}
                                      </span>
                                      <div className="absolute right-0 flex flex-col items-center justify-center gap-1.5 h-full text-right">
                                        <button 
                                          onClick={() => updateMatchScore(match.id, 2, 1)} 
                                          disabled={match.isCompleted}
                                          className={cn(
                                            "w-6 h-6 rounded-md flex items-center justify-center transition-all shadow-sm active:scale-95",
                                            match.isCompleted 
                                              ? "bg-slate-100 text-slate-300 opacity-40 cursor-not-allowed shadow-none" 
                                              : "bg-primary text-white hover:bg-primary-dim shadow-primary/20"
                                          )}
                                        >
                                          <Plus size={12} strokeWidth={4} />
                                        </button>
                                        <button 
                                          onClick={() => updateMatchScore(match.id, 2, -1)} 
                                          disabled={match.isCompleted}
                                          className={cn(
                                            "w-6 h-6 rounded-md flex items-center justify-center transition-all shadow-sm active:scale-95",
                                            match.isCompleted
                                              ? "bg-slate-50 text-slate-200 opacity-40 cursor-not-allowed shadow-none"
                                              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                                          )}
                                        >
                                          <Minus size={12} strokeWidth={4} />
                                        </button>
                                      </div>
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
                              onClick={() => {
                                const availableRounds = Array.from(new Set(activeTournament.matches.map(m => m.round))).sort((a, b) => a - b);
                                const currentIndex = availableRounds.indexOf(activeTournament.currentRound);
                                const nextRoundNum = currentIndex !== -1 && currentIndex < availableRounds.length - 1 ? availableRounds[currentIndex + 1] : activeTournament.currentRound;
                                
                                nextRound();
                                navigateTo('TOURNAMENT', { round: nextRoundNum });
                              }}
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
                              onClick={() => {
                                const availableRounds = Array.from(new Set(activeTournament.matches.map(m => m.round))).sort((a, b) => a - b);
                                const currentIndex = availableRounds.indexOf(activeTournament.currentRound);
                                const prevRoundNum = currentIndex > 0 ? availableRounds[currentIndex - 1] : activeTournament.currentRound;

                                prevRound();
                                navigateTo('TOURNAMENT', { round: prevRoundNum });
                              }}
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
                              <div key={`tournament-rank-${p.id || idx}`} className="bg-white p-4 rounded-xl flex items-center gap-4 border border-surface-container shadow-sm">
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
                            const p1Name = getPlayerName(m.player1Id);
                            const p2Name = getPlayerName(m.player2Id);
                            const p1p = m.player1PartnerId ? (activeTournament.players.find(p => p.id === m.player1PartnerId) || { id: m.player1PartnerId, name: '' }) : null;
                            const p2p = m.player2PartnerId ? (activeTournament.players.find(p => p.id === m.player2PartnerId) || { id: m.player2PartnerId, name: '' }) : null;
                            const p1Games = m.isCompleted ? m.sets[0].player1 : m.currentSet.player1;
                            const p2Games = m.isCompleted ? m.sets[0].player2 : m.currentSet.player2;

                            return (
                              <div key={m.id} className="bg-white p-3 rounded-xl flex items-center justify-between gap-3 border border-surface-container/30">
                                <div className="flex-1 text-right min-w-0">
                                  <div className="text-[9px] font-black text-primary uppercase leading-tight break-words">
                                    <p>{p1Name}{p1p ? ` / ${p1p.name}` : ''}</p>
                                  </div>
                                </div>
                                  
                                  <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1 rounded-full border border-surface-container scale-90">
                                    <span className={cn("text-xs font-black font-display", m.isCompleted && p1Games < p2Games ? "text-on-surface-variant/20" : "text-primary")}>{p1Games}</span>
                                    <span className="text-on-surface-variant/20 font-black italic text-[7px] tracking-widest shrink-0">VS</span>
                                    <span className={cn("text-xs font-black font-display", m.isCompleted && p2Games < p1Games ? "text-on-surface-variant/20" : "text-primary")}>{p2Games}</span>
                                  </div>

                                  <div className="flex-1 text-left min-w-0">
                                    <div className="text-[9px] font-black text-primary uppercase leading-tight break-words">
                                      <p>{p2Name}{p2p ? ` / ${p2p.name}` : ''}</p>
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
              className="w-full max-w-2xl mx-auto space-y-6 pt-16 px-4"
            >
              <div className="flex items-center justify-between gap-4 mb-2">
                <button onClick={goBack} className="p-3 bg-surface-container rounded-2xl text-on-surface-variant active:scale-95 transition-all">
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-0 flex-1 text-right">
                  <h2 className="text-[10px] font-black text-on-surface-variant/70 uppercase tracking-widest truncate">
                    {activeTournament.name}
                  </h2>
                  <h1 className="text-2xl font-extrabold text-on-surface tracking-tighter font-display uppercase italic">
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
                            const p1Name = getPlayerName(m.player1Id);
                            const p2Name = getPlayerName(m.player2Id);
                            const fp1p = m.player1PartnerId ? (activeTournament.players.find(p => p.id === m.player1PartnerId) || { id: m.player1PartnerId, name: '' }) : null;
                            const fp2p = m.player2PartnerId ? (activeTournament.players.find(p => p.id === m.player2PartnerId) || { id: m.player2PartnerId, name: '' }) : null;
                            const p1Games = m.isCompleted ? m.sets[0].player1 : m.currentSet.player1;
                            const p2Games = m.isCompleted ? m.sets[0].player2 : m.currentSet.player2;

                            return (
                              <div key={m.id} className="bg-surface-container-low p-4 rounded-2xl shadow-sm flex items-center justify-between gap-4 border border-surface-container/50">
                                <div className="flex-1 text-right min-w-0">
                                    <div className="text-[10px] font-bold text-primary leading-tight break-words">
                                      {p1Name}{fp1p?.name ? ` / ${fp1p.name}` : ''}
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
                                    {p2Name}{fp2p?.name ? ` / ${fp2p.name}` : ''}
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
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="bg-tertiary-container text-on-tertiary-container px-4 py-1 rounded-full font-black text-[10px] tracking-widest uppercase">
                    {activeTournament.format === 'SUPER_8_INDIVIDUAL' ? 'SUPER 8' : 'TORNEIO'}
                  </span>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-black text-[10px] tracking-widest uppercase flex items-center gap-1.5 border border-primary/20">
                    <CheckCircle2 size={10} />
                    FINALIZADO
                  </span>
                </div>
                <h2 className="font-display text-4xl md:text-5xl font-black tracking-tighter text-on-surface italic">
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
                        {rankings.slice(1).map((p, idx) => (
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
                    navigateTo('ALL_ROUNDS');
                  }}
                  className="w-full py-5 bg-white border-2 border-primary/20 text-primary rounded-full font-black text-sm uppercase tracking-widest hover:bg-primary/5 transition-all flex items-center justify-center gap-3"
                >
                  VER RODADAS E RESULTADOS
                  <History size={20} />
                </button>

                <button 
                  onClick={() => {
                    setShowFinishConfirmPopup(true);
                  }}
                  className="w-full py-5 bg-primary text-on-primary rounded-full font-black text-sm uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3"
                >
                  {activeTournament.id === activeTournamentId ? "FINALIZAR TORNEIO" : "VOLTAR AO INÍCIO"}
                  <CheckCircle2 size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {isAuthReady && user && step === 'PROFILE' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full pb-32"
            >
              {/* 1. Cabeçalho do Perfil (Foto e Nome) */}
              <div className="arena-hero-bg pt-10 pb-16 px-8 flex flex-col items-center text-center relative overflow-hidden">
                <div className="relative mb-6">
                  {/* Foto de Perfil Circular */}
                  <div className={cn(
                    "w-28 h-28 rounded-full border-4 shadow-2xl relative z-10 bg-white/20 backdrop-blur-md flex items-center justify-center overflow-hidden",
                    isPremium ? "border-amber-400" : "border-white"
                  )}>
                    {isPremium && (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 z-0 opacity-40"
                        style={{
                          background: 'conic-gradient(from 0deg, transparent, #fbbf24, transparent, #fbbf24, transparent)'
                        }}
                      />
                    )}
                    <div className="absolute inset-1 rounded-full bg-slate-900 z-0" />
                    <div className="relative z-10 w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                      {(userProfile?.photoURL || user?.photoURL) ? (
                        <Image 
                          src={userProfile?.photoURL || user?.photoURL} 
                          alt={user?.displayName || 'User'} 
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-white font-display font-black text-4xl italic">
                          {user?.email?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {isProfileUpdating && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                        <RefreshCw className="text-white animate-spin" size={24} />
                      </div>
                    )}
                  </div>
                  
                  {/* Botão de Upload (Badge) */}
                    <label htmlFor="avatar-upload" className="absolute bottom-1 right-1 w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-20 cursor-pointer hover:scale-110 active:scale-95 transition-all">
                    <Camera size={18} />
                    <input 
                      id="avatar-upload"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file && user) {
                          try {
                            setIsProfileUpdating(true);
                            
                            // 1. Compress and convert to Base64
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = async (event) => {
                              const img = new window.Image();
                              img.src = event.target?.result as string;
                              img.onload = async () => {
                                const canvas = document.createElement('canvas');
                                const MAX_WIDTH = 400;
                                const MAX_HEIGHT = 400;
                                let width = img.width;
                                let height = img.height;

                                if (width > height) {
                                  if (width > MAX_WIDTH) {
                                    height *= MAX_WIDTH / width;
                                    width = MAX_WIDTH;
                                  }
                                } else {
                                  if (height > MAX_HEIGHT) {
                                    width *= MAX_HEIGHT / height;
                                    height = MAX_HEIGHT;
                                  }
                                }

                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx?.drawImage(img, 0, 0, width, height);
                                
                                const base64String = canvas.toDataURL('image/jpeg', 0.8);

                                // 1. Update Firestore (Exclusively for Base64 since Auth photoURL has length limits)
                                await updateDoc(doc(db, 'users', user.uid), { photoURL: base64String });

                                // 2. Update local state
                                setUserProfile((prev: any) => ({ ...prev, photoURL: base64String }));
                                
                                setSnackMessage("Foto atualizada com sucesso");
                                setTimeout(() => setSnackMessage(null), 3000);
                                setIsProfileUpdating(false);
                              };
                            };
                          } catch (err) {
                            console.error("Error uploading image:", err);
                            setAuthError("Erro ao processar imagem.");
                            setIsProfileUpdating(false);
                          }
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                  <h2 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter leading-none mb-1 flex items-center gap-2">
                    {user?.displayName || 'Organizador Beach'}
                    {isPremium && (
                      <motion.span 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 text-[10px] px-2 py-0.5 rounded-md font-black flex items-center gap-1 not-italic tracking-normal shadow-lg shadow-amber-500/20"
                      >
                        PRO <Zap size={10} className="fill-slate-900" />
                      </motion.span>
                    )}
                  </h2>
                  {userProfile?.userNumericId && (
                    <div className="text-[11px] font-black text-white/70 uppercase tracking-widest mb-1">
                      ID #{userProfile.userNumericId}
                    </div>
                  )}
                  {userProfile?.userTag && (
                    <div className="mb-2 px-3 py-1 bg-white text-primary text-sm font-mono font-bold rounded-full tracking-wider shadow-md">
                      {userProfile.userTag}
                    </div>
                  )}
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="wave-container px-6 pt-10 pb-32">
                <div className="max-w-xl mx-auto space-y-6">
                  {/* 2. Call to Action de Monetização (DESTAQUE MÁXIMO) */}
                  <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      if (!isPremium) setUpgradeReason('VERIFIED_BADGE');
                      setShowUpgradeModal(true);
                    }}
                    className={cn(
                      "w-full relative overflow-hidden p-6 rounded-[2rem] shadow-xl group flex items-center justify-between transition-all",
                      isPremium 
                        ? "bg-slate-900 border border-amber-500/30 shadow-amber-900/10" 
                        : "bg-[#cdf03b] shadow-secondary/10"
                    )}
                  >
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {isPremium && (
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl" />
                    )}

                    <div className="relative z-10 flex items-center gap-4">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm relative overflow-hidden",
                        isPremium ? "bg-amber-500 text-slate-950" : "bg-primary/10 text-primary"
                      )}>
                        {isPremium && (
                          <motion.div 
                            animate={{ x: [-20, 100] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
                          />
                        )}
                        {isPremium ? <TrophyIcon size={28} /> : <Sparkles size={28} className="fill-primary" />}
                      </div>
                      <div className="text-left">
                        <p className={cn(
                          "font-black text-xs uppercase italic tracking-tighter leading-none mb-1",
                          isPremium ? "text-amber-400" : "text-primary"
                        )}>
                          {isPremium ? "STATUS: BEACH PRO PREMIUM" : "SEJA BEACH PRÓ PREMIUM"}
                        </p>
                        <p className={cn(
                          "text-[8px] font-black uppercase tracking-widest leading-none",
                          isPremium ? "text-slate-400" : "text-primary/60"
                        )}>
                          {isPremium ? "SUA EXPERIÊNCIA É ILIMITADA" : "CRIE TORNEIOS E RANKINGS SEM LIMITES"}
                        </p>
                      </div>
                    </div>
                    {isPremium ? (
                      <div className="relative z-10 flex flex-col items-end">
                        <div className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase">
                          ATIVO
                        </div>
                      </div>
                    ) : (
                      <div className="relative z-10 bg-primary/10 p-2 rounded-full text-primary">
                        <ChevronRight size={20} />
                      </div>
                    )}
                  </motion.button>

                  <div className="bg-white rounded-[2.5rem] p-4 border border-surface-container shadow-sm space-y-1">
                    <button 
                      onClick={() => {
                        setEditName(user?.displayName || '');
                        setEditEmail(user?.email || '');
                        setNewPassword('');
                        setAuthError(null);
                        navigateTo('EDIT_PROFILE');
                      }}
                      className="w-full flex items-center justify-between p-4 hover:bg-surface-container-lowest rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                          <Settings size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-on-surface font-black text-xs uppercase tracking-widest leading-none mb-1">Editar Perfil</p>
                          <p className="text-on-surface-variant/40 text-[9px] font-black uppercase tracking-widest">Nome, e-mail e dados</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-on-surface-variant/20" />
                    </button>
                  </div>

                  {/* 4. Rodapé (Ação Destrutiva) */}
                  <div className="pt-4 flex justify-center">
                    <button 
                      onClick={() => signOut(auth)}
                      className="flex items-center gap-2 px-8 py-4 text-red-500 hover:bg-red-50 rounded-full transition-all group"
                    >
                      <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em]">Sair do Aplicativo</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {isAuthReady && user && step === 'EDIT_PROFILE' && (
            <motion.div 
              key="edit-profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full pb-32"
            >
              <div className="arena-hero-bg pt-6 pb-12 px-8 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-8">
                  <button 
                    onClick={() => goBack()}
                    className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 text-white"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h1 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter">
                    Editar Perfil
                  </h1>
                  <div className="w-10" /> {/* Spacer */}
                </div>
              </div>

              <div className="wave-container px-6 pt-10">
                <div className="max-w-xl mx-auto space-y-6">
                  {/* Nome */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest px-1">Nome Completo</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                        <UserIcon size={20} />
                      </div>
                      <input 
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full bg-white border border-surface-container rounded-2xl py-4 pl-12 pr-4 text-on-surface font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest px-1">E-mail de Acesso</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                        <Users size={20} />
                      </div>
                      <input 
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="seu@e-mail.com"
                        className="w-full bg-white border border-surface-container rounded-2xl py-4 pl-12 pr-4 text-on-surface font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* Nova Senha */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest px-1">Nova Senha (opcional)</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                        <Lock size={20} />
                      </div>
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Deixe em branco para não alterar"
                        className="w-full bg-white border border-surface-container rounded-2xl py-4 pl-12 pr-12 text-on-surface font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {authError && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3 text-error"
                    >
                      <AlertCircle size={18} />
                      <p className="text-[10px] font-black uppercase tracking-widest">{authError}</p>
                    </motion.div>
                  )}

                  <button 
                    onClick={() => handleSaveProfile()}
                    disabled={isProfileUpdating}
                    className="w-full bg-primary text-on-primary py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isProfileUpdating ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : (
                      "SALVAR ALTERAÇÕES"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {isAuthReady && user && step === 'TOURNAMENTS_LIST' && (
            <motion.div 
              key="tournaments-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
                  {tournaments.filter(t => !t.isHidden).length > 0 ? (
                    tournaments.filter(t => !t.isHidden).sort((a, b) => b.createdAt - a.createdAt).map(t => (
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
                                   className="p-3 text-rose-500/20 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                   title="Excluir Torneio"
                                >
                                  <Trash2 size={20} />
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
                                    navigateTo('TOURNAMENT', { tournamentId: t.id, tab: 'MATCHES', round: null });
                                  }}
                                  className="flex-1 py-3 bg-surface-container-low rounded-full font-black text-[9px] text-primary hover:bg-surface-container-high transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                  <Users size={14} />
                                  Partidas
                                </button>
                                <button 
                                  onClick={() => {
                                    navigateTo('TOURNAMENT', { tournamentId: t.id, tab: 'ROUNDS', round: null });
                                  }}
                                  className="flex-1 py-3 bg-surface-container-low rounded-full font-black text-[9px] text-primary hover:bg-surface-container-high transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                  <History size={14} />
                                  Rodadas
                                </button>
                                <button 
                                  onClick={() => {
                                    navigateTo('TOURNAMENT', { tournamentId: t.id, tab: 'RANKING', round: null });
                                  }}
                                  className="flex-1 py-3 bg-surface-container-low rounded-full font-black text-[9px] text-primary hover:bg-surface-container-high transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                  <BarChart size={14} />
                                  Ranking
                                </button>
                              </div>
                              <button 
                                onClick={() => {
                                  navigateTo(t.isFinished ? 'FINISHED' : 'TOURNAMENT', { tournamentId: t.id, tab: 'MATCHES', round: null });
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

        {/* Finish Tournament Confirmation Popup */}
        <AnimatePresence>
          {showFinishConfirmPopup && activeTournament && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-surface-container"
              >
                <div className="bg-primary/5 w-20 h-20 rounded-[2rem] flex items-center justify-center text-primary mb-8 mx-auto shadow-sm">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-xs font-black text-primary text-center mb-2 uppercase tracking-widest">Finalizar Torneio?</h3>
                <p className="text-[10px] font-black text-on-surface-variant/40 text-center mb-10 uppercase tracking-tight leading-relaxed">
                  O que você deseja fazer? <br/>
                  <span className="text-primary italic">&quot;Excluir&quot; removerá das listas (Home e Global) mas manterá os resultados no Histórico da Liga.</span>
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      if (activeRankingId) {
                        navigateTo('RANKING_DETAILS', { rankingId: activeRankingId, replace: true });
                      } else {
                        navigateTo('HOME', { replace: true });
                      }
                      setShowFinishConfirmPopup(false);
                    }}
                    className="w-full py-5 bg-primary text-on-primary rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
                  >
                    MANTER TORNEIO ABERTO
                  </button>
                  <button 
                    onClick={() => {
                      deleteTournament(activeTournament.id);
                      setShowFinishConfirmPopup(false);
                      navigateTo('HOME', { replace: true });
                    }}
                    className="w-full py-5 bg-red-50 text-red-500 rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all border border-red-500/10"
                  >
                    FINALIZAR E EXCLUIR
                  </button>
                  <button 
                    onClick={() => setShowFinishConfirmPopup(false)}
                    className="w-full py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    CANCELAR
                  </button>
                </div>
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
                <h3 className="text-xs font-black text-primary text-center mb-2 uppercase tracking-widest">
                  {(() => {
                    const t = tournaments.find(x => x.id === tournamentToDelete);
                    return t?.isFinished ? "Arquivar Torneio?" : "Excluir Torneio?";
                  })()}
                </h3>
                <p className="text-[10px] font-black text-on-surface-variant/40 text-center mb-10 uppercase tracking-tight leading-relaxed">
                  {(() => {
                    const t = tournaments.find(x => x.id === tournamentToDelete);
                    if (t?.isFinished) {
                      return (
                        <>
                          Deseja remover este torneio das listas públicas? <br/>
                          <span className="text-primary italic">Ele continuará disponível no Histórico da Liga e os pontos serão mantidos.</span>
                        </>
                      );
                    }
                    return (
                      <>
                        Tem certeza que deseja apagar este torneio? <br/>
                        <span className="text-red-500 font-bold italic">Esta ação é irreversível e os pontos calculados no ranking serão revertidos.</span>
                      </>
                    );
                  })()}
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      deleteTournament(tournamentToDelete);
                      setTournamentToDelete(null);
                    }}
                    className="w-full py-5 bg-red-500 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                  >
                    {(() => {
                      const t = tournaments.find(x => x.id === tournamentToDelete);
                      return t?.isFinished ? "SIM, MOVER PARA O HISTÓRICO" : "SIM, APAGAR DEFINITIVAMENTE";
                    })()}
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
        
        {/* Reauthentication Modal */}
        <AnimatePresence>
          {showReauthModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-surface-container"
              >
                <div className="bg-primary/5 w-20 h-20 rounded-[2rem] flex items-center justify-center text-primary mb-8 mx-auto shadow-sm">
                  <Lock size={40} />
                </div>
                <h3 className="text-xs font-black text-primary text-center mb-2 uppercase tracking-widest">Segurança</h3>
                <p className="text-[10px] font-black text-on-surface-variant/40 text-center mb-8 uppercase tracking-tight leading-relaxed">
                  Para alterar dados sensíveis, confirme sua <span className="text-primary">senha atual</span> abaixo.
                </p>
                <div className="space-y-6">
                  <input 
                    type="password"
                    value={reauthPassword}
                    onChange={(e) => setReauthPassword(e.target.value)}
                    placeholder="Sua senha atual"
                    className="w-full bg-surface-container rounded-2xl py-4 px-6 text-on-surface font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  
                  {authError && (
                    <p className="text-[9px] font-black text-error text-center uppercase tracking-widest">{authError}</p>
                  )}

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => handleSaveProfile(true)}
                      disabled={isProfileUpdating}
                      className="w-full py-5 bg-primary text-on-primary rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-dim transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      {isProfileUpdating ? <RefreshCw size={18} className="animate-spin" /> : "CONFIRMAR E SALVAR"}
                    </button>
                    <button 
                      onClick={() => {
                        setShowReauthModal(false);
                        setAuthError(null);
                        setReauthPassword('');
                      }}
                      className="w-full py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                    >
                      CANCELAR
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* League Delete Confirmation Popup */}
        <AnimatePresence>
          {leagueToDelete && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-surface-container"
              >
                <div className="bg-rose-50 w-20 h-20 rounded-[2rem] flex items-center justify-center text-rose-500 mb-8 mx-auto shadow-sm">
                  <Trash2 size={40} />
                </div>
                <h3 className="text-xs font-black text-primary text-center mb-2 uppercase tracking-widest">Excluir Liga?</h3>
                <p className="text-[10px] font-black text-on-surface-variant/40 text-center mb-10 uppercase tracking-tight leading-relaxed">
                  Tem certeza que deseja excluir esta liga? <span className="text-rose-500">Esta ação é irreversível. Todos os rankings, torneios e históricos serão perdidos permanentemente.</span>
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      deleteRanking(leagueToDelete);
                      setLeagueToDelete(null);
                    }}
                    className="w-full py-5 bg-rose-500 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                  >
                    SIM, EXCLUIR DEFINITIVAMENTE
                  </button>
                  <button 
                    onClick={() => setLeagueToDelete(null)}
                    className="w-full py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    CANCELAR
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Exit League Popup */}
        <AnimatePresence>
          {leagueToExit && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-surface-container"
              >
                <div className="bg-amber-50 w-20 h-20 rounded-[2rem] flex items-center justify-center text-amber-500 mb-8 mx-auto shadow-sm">
                  <LogOut size={40} />
                </div>
                <h3 className="text-xs font-black text-primary text-center mb-2 uppercase tracking-widest">Sair da Liga?</h3>
                <p className="text-[10px] font-black text-on-surface-variant/40 text-center mb-10 uppercase tracking-tight leading-relaxed">
                  Tem certeza que deseja sair desta liga? <span className="text-amber-600">Seus pontos acumulados serão perdidos e você não terá mais acesso aos torneios desta liga.</span>
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      exitRanking(leagueToExit);
                      setLeagueToExit(null);
                    }}
                    className="w-full py-5 bg-amber-500 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                  >
                    SIM, SAIR DA LIGA
                  </button>
                  <button 
                    onClick={() => setLeagueToExit(null)}
                    className="w-full py-4 bg-surface-container rounded-full font-black text-xs text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high transition-all"
                  >
                    CANCELAR
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showDuplicatePopup && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDuplicatePopup(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 relative z-10 shadow-2xl text-center"
              >
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-6">
                  <AlertCircle size={40} />
                </div>
                <h3 className="text-sm font-black text-on-surface uppercase tracking-widest mb-2 italic">Atleta já cadastrado</h3>
                <p className="text-[10px] text-on-surface-variant/60 font-medium uppercase tracking-tight leading-relaxed mb-8">
                  Este atleta já faz parte da sua liga. <br/>Não é necessário adicioná-lo novamente.
                </p>
                <button 
                  onClick={() => setShowDuplicatePopup(false)}
                  className="w-full py-4 bg-primary text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  ENTENDI
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Athlete Confirmation */}
        <AnimatePresence>
          {athleteToRemove && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAthleteToRemove(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 relative z-10 shadow-2xl text-center"
              >
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6">
                  <Trash2 size={40} />
                </div>
                <h3 className="text-sm font-black text-on-surface uppercase tracking-widest mb-2 italic">Remover Atleta?</h3>
                <p className="text-[10px] text-on-surface-variant/60 font-medium uppercase tracking-tight leading-relaxed mb-8">
                  Você tem certeza que deseja remover este atleta da liga? Ele perderá sua pontuação atual.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setAthleteToRemove(null)}
                    className="flex-1 py-4 bg-surface-container rounded-full font-black text-[10px] uppercase tracking-widest text-on-surface-variant"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={() => removeAthleteFromLeague(athleteToRemove)}
                    className="flex-1 py-4 bg-rose-500 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200"
                  >
                    REMOVER
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Global SnackBar */}
        <AnimatePresence>
          {snackMessage && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-green-500 text-white px-8 py-4 rounded-full shadow-xl shadow-green-500/20 flex items-center gap-3 border border-white/20 whitespace-nowrap"
            >
              <CheckCircle2 size={24} />
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">{snackMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium Upgrade Modal */}
        {showUpgradeModal && user && (
          <PremiumUpgrade 
            uid={user.uid} 
            reason={upgradeReason}
            onClose={() => setShowUpgradeModal(false)} 
            onSuccess={() => {
              setShowUpgradeModal(false);
              setUpgradeReason('GENERIC');
              setSnackMessage("Parabéns! Agora você é Beach Pró Premium!");
              setTimeout(() => setSnackMessage(null), 5000);
            }}
          />
        )}
    </div>

    <BottomNav 
      activeStep={step} 
      setStep={navigateTo} 
      isVisible={!isKeyboardVisible && user !== null} 
      resetApp={resetApp}
    />
  </main>
);
}
