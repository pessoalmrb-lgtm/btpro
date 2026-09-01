import { Match, Player, MatchFormat, RankingCriterion, PlayoffRound, TournamentState, Ranking } from "../types";

/**
 * Generates a Round Robin schedule using the Circle Method.
 * Improved to rotate courts better among players.
 */
export function generateRoundRobin(teams: Player[], selectedCourts: number[]): Match[] {
  const n = teams.length;
  const isOdd = n % 2 !== 0;
  const tempTeams = [...teams];
  
  if (isOdd) {
    tempTeams.push({ id: 'BYE', name: 'Folga' });
  }

  const numTeams = tempTeams.length;
  const numRounds = numTeams - 1;
  const matches: Match[] = [];
  
  const teamIndices = tempTeams.map((_, i) => i);
  const courtUsageCount: Record<string, Record<number, number>> = {};
  const globalTableUsage: Record<number, number> = {};
  
  const incUsage = (teamId: string, court: number) => {
    if (teamId === 'BYE') return;
    globalTableUsage[court] = (globalTableUsage[court] || 0) + 1;
    if (!courtUsageCount[teamId]) courtUsageCount[teamId] = {};
    courtUsageCount[teamId][court] = (courtUsageCount[teamId][court] || 0) + 1;
  };

  const getBestCourt = (t1Id: string, t2Id: string, availableCourts: number[]) => {
    const scores = availableCourts.map(court => {
      const u1 = (courtUsageCount[t1Id]?.[court]) || 0;
      const u2 = (courtUsageCount[t2Id]?.[court]) || 0;
      
      // Higher penalty for repeats, biased by individual usage to force rotation
      const playerUsageScore = Math.pow(10, u1) + Math.pow(10, u2);
      const globalScore = (globalTableUsage[court] || 0) * 0.1;
      const tiedRandomScore = Math.random() * 0.01;
      
      return { court, totalScore: playerUsageScore + globalScore + tiedRandomScore };
    });

    scores.sort((a, b) => a.totalScore - b.totalScore);
    return scores[0].court;
  };

  for (let round = 1; round <= numRounds; round++) {
    const roundMatches: {p1: Player, p2: Player}[] = [];
    
    for (let i = 0; i < numTeams / 2; i++) {
      const p1 = tempTeams[teamIndices[i]];
      const p2 = tempTeams[teamIndices[numTeams - 1 - i]];
      
      if (p1.id !== 'BYE' && p2.id !== 'BYE') {
        roundMatches.push({ p1, p2 });
      }
    }

    // Shuffle round matches to avoid systematic bias in court selection
    const shuffledRoundMatches = [...roundMatches].sort(() => Math.random() - 0.5);
    let availableCourtsInRound = [...selectedCourts];
    
    shuffledRoundMatches.forEach((m, idx) => {
      const courtSelection = availableCourtsInRound.length > 0 ? availableCourtsInRound : selectedCourts;
      const table = getBestCourt(m.p1.id, m.p2.id, courtSelection);
      
      incUsage(m.p1.id, table);
      incUsage(m.p2.id, table);
      
      availableCourtsInRound = availableCourtsInRound.filter(c => c !== table);

      matches.push({
        id: `m-${round}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
        player1Id: m.p1.id,
        player2Id: m.p2.id,
        table,
        sets: [],
        currentSet: { player1: 0, player2: 0 },
        isCompleted: false,
        round
      });
    });

    teamIndices.splice(1, 0, teamIndices.pop()!);
  }

  return matches;
}

/**
 * Interface for group structure suggestions
 */
export interface GroupPossibility {
  groupsCount: number;
  teamsPerGroup: number;
  label: string;
}

/**
 * Returns possible group configurations for a given number of teams.
 */
export function getPossibleGroupStructures(totalTeams: number): GroupPossibility[] {
  const possibilities: GroupPossibility[] = [];
  
  // Find divisors
  for (let i = 2; i <= totalTeams / 2; i++) {
    if (totalTeams % i === 0) {
      const groupsCount = i;
      const teamsPerGroup = totalTeams / i;
      if (teamsPerGroup >= 2) {
        possibilities.push({
          groupsCount,
          teamsPerGroup,
          label: `${groupsCount} Grupos de ${teamsPerGroup} Duplas`
        });
      }
    }
  }

  // Fallback if no exact divisors with min 3 teams
  if (possibilities.length === 0) {
    if (totalTeams >= 4) {
       // Estimate best fit
       const suggestedGroups = Math.max(2, Math.floor(totalTeams / 4));
       const avg = totalTeams / suggestedGroups;
       possibilities.push({
         groupsCount: suggestedGroups,
         teamsPerGroup: Math.floor(avg),
         label: `${suggestedGroups} Grupos (Tamanhos Variados)`
       });
    }
  }

  return possibilities;
}

/**
 * Generates matches for a group stage with a sophisticated scheduler.
 * Prioritizes court occupancy, player rest, and group-court isolation.
 */
export function generateGroupStage(
  teams: Player[], 
  selectedCourts: number[], 
  config: { groupsCount: number, teamsPerGroup: number, type: 'INTRA' | 'INTER' },
  predefinedGroups?: { id: string, teams: Player[] }[]
): { matches: Match[], groups: { id: string, teams: Player[] }[] } {
  const orderedCourts = [...selectedCourts].sort((a, b) => a - b);
  const compareGroupIds = (left: string, right: string) =>
    left.localeCompare(right, 'pt-BR', { numeric: true, sensitivity: 'base' });
  // 1. Organize teams into groups
  let groups: { id: string, teams: Player[] }[] = [];
  
  if (predefinedGroups && predefinedGroups.length > 0) {
    groups = predefinedGroups;
  } else {
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    groups = Array.from({ length: config.groupsCount }, (_, i) => ({
      id: String.fromCharCode(65 + i),
      teams: []
    }));
    
    shuffledTeams.forEach((team, i) => {
      groups[i % config.groupsCount].teams.push(team);
    });
  }

  // 2. Collect all raw matches needed
  let pendingMatches: { p1: Player, p2: Player, groupId: string }[] = [];

  if (config.type === 'INTRA') {
    groups.forEach(group => {
      // Basic permutations for each group
      for (let i = 0; i < group.teams.length; i++) {
        for (let j = i + 1; j < group.teams.length; j++) {
          pendingMatches.push({ p1: group.teams[i], p2: group.teams[j], groupId: group.id });
        }
      }
    });
  } else {
    // Inter-group: G1 vs G2, G3 vs G4...
    for (let i = 0; i < groups.length; i += 2) {
      const g1 = groups[i];
      const g2 = groups[i + 1];
      if (!g2) break;
      g1.teams.forEach(p1 => {
        g2.teams.forEach(p2 => {
          pendingMatches.push({ p1, p2, groupId: `${g1.id}${g2.id}` });
        });
      });
    }
  }

  // 3. Scheduling Algorithm (Slot-based)
  const scheduledMatches: Match[] = [];
  const playerLastPlayedSlot: Record<string, number> = {};
  const playerConsecutiveGames: Record<string, number> = {};
  let currentSlot = 1;
  while (pendingMatches.length > 0) {
    const slotMatches: { match: typeof pendingMatches[0], court: number }[] = [];
    const usedPlayersThisSlot = new Set<string>();
    let availableCourtsInSlot = [...orderedCourts];

    // Priority 1: Fill all courts. Try to pick matches for each court.
    while (availableCourtsInSlot.length > 0 && pendingMatches.length > 0) {
      // Filter matches whose players are free
      let candidates = pendingMatches.filter(m => !usedPlayersThisSlot.has(m.p1.id) && !usedPlayersThisSlot.has(m.p2.id));
      
      if (candidates.length === 0) break;

      // Respect "Intervalo Justo" (No 3 in a row) - Priority 2
      const restAwareCandidates = candidates.filter(m => 
        (playerConsecutiveGames[m.p1.id] || 0) < 2 && 
        (playerConsecutiveGames[m.p2.id] || 0) < 2
      );
      
      let finalCandidates = restAwareCandidates.length > 0 ? restAwareCandidates : candidates;
      finalCandidates = [...finalCandidates].sort((a, b) => compareGroupIds(a.groupId, b.groupId));

      // Em todas as rodadas, oferece primeiro uma partida de cada grupo. Isso
      // mantém Grupo A, B, C... nas quadras crescentes sempre que forem elegíveis.
      const usedGroupsThisSlot = new Set(slotMatches.map(sm => sm.match.groupId));
      const diverseGroupCandidates = finalCandidates.filter(m => !usedGroupsThisSlot.has(m.groupId));
      if (diverseGroupCandidates.length > 0) finalCandidates = diverseGroupCandidates;

      // Pick the first candidate
      const selected = finalCandidates[0];
      
      // Os candidatos já estão em ordem de grupo. Usar a menor quadra livre
      // mantém simultaneamente a ordem Quadra 1, 2, 3... e Grupo A, B, C...
      // em cada rodada, sem alterar confrontos, descanso ou pontuação.
      const court = availableCourtsInSlot[0];
      
      slotMatches.push({ match: selected, court });
      
      // Mark players
      usedPlayersThisSlot.add(selected.p1.id);
      usedPlayersThisSlot.add(selected.p2.id);
      
      // Remove court from available in this slot
      availableCourtsInSlot = availableCourtsInSlot.filter(c => c !== court);

      // Remove from pending
      pendingMatches = pendingMatches.filter(m => m !== selected);
    }

    // Process players' resting/consecutive stats
    const playersPlayingThisSlot = new Set<string>();
    slotMatches.forEach(sm => {
      const { m1, m2 } = { m1: sm.match.p1.id, m2: sm.match.p2.id };
      playersPlayingThisSlot.add(m1);
      playersPlayingThisSlot.add(m2);

      playerLastPlayedSlot[m1] = currentSlot;
      playerLastPlayedSlot[m2] = currentSlot;
      
      playerConsecutiveGames[m1] = (playerConsecutiveGames[m1] || 0) + 1;
      playerConsecutiveGames[m2] = (playerConsecutiveGames[m2] || 0) + 1;

      scheduledMatches.push({
        id: `g-${sm.match.groupId}-${currentSlot}-${sm.court}-${Math.random().toString(36).substr(2, 5)}`,
        player1Id: sm.match.p1.id,
        player2Id: sm.match.p2.id,
        table: sm.court,
        sets: [],
        currentSet: { player1: 0, player2: 0 },
        isCompleted: false,
        round: currentSlot,
        groupId: sm.match.groupId
      });
    });

    // Reset consecutive count for those who rested
    Object.keys(playerConsecutiveGames).forEach(pid => {
      if (!playersPlayingThisSlot.has(pid)) {
        playerConsecutiveGames[pid] = 0;
      }
    });

    currentSlot++;
    
    // Safety break
    if (currentSlot > 500) break;
  }

  scheduledMatches.sort((a, b) =>
    a.round - b.round || a.table - b.table || compareGroupIds(a.groupId || '', b.groupId || '') || a.id.localeCompare(b.id)
  );

  return { matches: scheduledMatches, groups };
}

/**
 * Generates playoff matches based on selected rounds and qualified teams.
 */
export function generatePlayoffs(qualifiedTeams: Player[], selectedCourts: number[], selectedRounds: PlayoffRound[]): Match[] {
  const matches: Match[] = [];
  const roundsOrder: PlayoffRound[] = ['ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
  const rounds = normalizePlayoffRounds(selectedRounds);
  
  if (rounds.length === 0 || selectedCourts.length === 0) return [];

  // Determining courts with balancing awareness
  const courtUsageCount: Record<string, Record<number, number>> = {};
  const globalTableUsage: Record<number, number> = {};

  const incUsage = (id: string, court: number) => {
    if (!id || id.startsWith('TBD')) return;
    globalTableUsage[court] = (globalTableUsage[court] || 0) + 1;
    if (!courtUsageCount[id]) courtUsageCount[id] = {};
    courtUsageCount[id][court] = (courtUsageCount[id][court] || 0) + 1;
  };

  const getBestCourt = (p1Id: string, p2Id: string, availableCourts: number[]) => {
    const scores = availableCourts.map(court => {
      const u1 = (p1Id && !p1Id.startsWith('TBD')) ? (courtUsageCount[p1Id]?.[court] || 0) : 0;
      const u2 = (p2Id && !p2Id.startsWith('TBD')) ? (courtUsageCount[p2Id]?.[court] || 0) : 0;
      const playerUsageScore = Math.pow(10, u1) + Math.pow(10, u2);
      const globalScore = (globalTableUsage[court] || 0) * 0.1;
      const tiedRandomScore = Math.random() * 0.01;
      
      return { court, totalScore: playerUsageScore + globalScore + tiedRandomScore };
    });

    scores.sort((a, b) => a.totalScore - b.totalScore);
    return scores[0].court;
  };

  // Create matches
  let currentTeams = [...qualifiedTeams];
  
  rounds.forEach((roundType) => {
    const numMatchesByRound: Record<PlayoffRound, number> = {
      ROUND_OF_16: 8,
      QUARTER_FINALS: 4,
      SEMI_FINALS: 2,
      FINAL: 1,
    };
    const numMatches = numMatchesByRound[roundType];
    let availableCourtsInRound = [...selectedCourts];
    
    for (let i = 0; i < numMatches; i++) {
      let p1Id = `TBD-${roundType}-${i}-1`;
      let p2Id = `TBD-${roundType}-${i}-2`;

      if (roundType === rounds[0] && currentTeams.length > 0) {
        const team1 = currentTeams[i * 2];
        const team2 = currentTeams[i * 2 + 1];
        if (team1) p1Id = team1.id;
        if (team2) p2Id = team2.id;
      }
      
      const courtCandidates = availableCourtsInRound.length > 0 ? availableCourtsInRound : selectedCourts;
      const table = getBestCourt(p1Id, p2Id, courtCandidates);
      
      incUsage(p1Id, table);
      incUsage(p2Id, table);
      availableCourtsInRound = availableCourtsInRound.filter(c => c !== table);
      
      matches.push({
        id: `playoff-${roundType}-${i}`,
        player1Id: p1Id,
        player2Id: p2Id,
        table,
        sets: [],
        currentSet: { player1: 0, player2: 0 },
        isCompleted: false,
        round: 100 + roundsOrder.indexOf(roundType)
      });
    }
  });

  return matches;
}

/**
 * A fase escolhida representa o início do mata-mata. Todas as fases seguintes
 * são obrigatórias para que o chaveamento sempre termine em uma final.
 */
export function normalizePlayoffRounds(selectedRounds: PlayoffRound[]): PlayoffRound[] {
  const roundsOrder: PlayoffRound[] = ['ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
  if (selectedRounds.length === 0) return [];
  const firstIndex = Math.min(...selectedRounds.map(round => roundsOrder.indexOf(round)).filter(index => index >= 0));
  return Number.isFinite(firstIndex) ? roundsOrder.slice(firstIndex) : [];
}

export function getTournamentGroups(tournament: TournamentState): { id: string; teams: Player[] }[] {
  if (tournament.groups?.length) return tournament.groups;

  const groupMatches = tournament.matches.filter(match => match.round < 100 && !!match.groupId);
  const teamById = new Map(tournament.players.map(team => [team.id, team]));
  const teamIdsByGroup = new Map<string, Set<string>>();
  const add = (groupId: string, teamId: string) => {
    if (!teamIdsByGroup.has(groupId)) teamIdsByGroup.set(groupId, new Set());
    teamIdsByGroup.get(groupId)!.add(teamId);
  };

  groupMatches.forEach(match => {
    const label = match.groupId!;
    if (label.length > 1 && /^[A-Z]+$/.test(label)) {
      add(label[0], match.player1Id);
      add(label[1], match.player2Id);
    } else {
      add(label, match.player1Id);
      add(label, match.player2Id);
    }
  });

  return Array.from(teamIdsByGroup.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, teamIds]) => ({
      id,
      teams: Array.from(teamIds).map(teamId => teamById.get(teamId)).filter((team): team is Player => !!team),
    }));
}

export function advancePlayoffWinner(
  matches: Match[],
  matchId: string,
  winnerId: string,
  selectedRounds: PlayoffRound[]
): Match[] {
  if (!matchId.startsWith('playoff-')) return matches;
  const [, roundTypeRaw, matchIndexRaw] = matchId.split('-');
  const roundType = roundTypeRaw as PlayoffRound;
  const matchIndex = Number(matchIndexRaw);
  const rounds = normalizePlayoffRounds(selectedRounds);
  const roundIndex = rounds.indexOf(roundType);
  if (roundIndex < 0 || roundIndex >= rounds.length - 1 || !Number.isFinite(matchIndex)) return matches;

  const nextRound = rounds[roundIndex + 1];
  const nextMatchId = `playoff-${nextRound}-${Math.floor(matchIndex / 2)}`;
  const slot = matchIndex % 2 === 0 ? 'player1Id' : 'player2Id';
  return matches.map(match => match.id === nextMatchId ? { ...match, [slot]: winnerId } : match);
}

export function invalidatePlayoffDescendants(
  matches: Match[],
  matchId: string,
  selectedRounds: PlayoffRound[]
): Match[] {
  if (!matchId.startsWith('playoff-')) return matches;
  const [, roundTypeRaw, matchIndexRaw] = matchId.split('-');
  const rounds = normalizePlayoffRounds(selectedRounds);
  let roundIndex = rounds.indexOf(roundTypeRaw as PlayoffRound);
  let matchIndex = Number(matchIndexRaw);
  if (roundIndex < 0 || !Number.isFinite(matchIndex)) return matches;

  let updated = [...matches];
  while (roundIndex < rounds.length - 1) {
    const nextRound = rounds[roundIndex + 1];
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatchId = `playoff-${nextRound}-${nextMatchIndex}`;
    const slot = matchIndex % 2 === 0 ? 'player1Id' : 'player2Id';
    updated = updated.map(match => {
      if (match.id !== nextMatchId) return match;
      return {
        ...match,
        [slot]: `TBD-${nextRound}-${nextMatchIndex}-${slot === 'player1Id' ? 1 : 2}`,
        sets: [],
        currentSet: { player1: 0, player2: 0 },
        isCompleted: false,
        winnerId: undefined,
      };
    });
    roundIndex++;
    matchIndex = nextMatchIndex;
  }
  return updated;
}

/**
 * Validates if a tournament format and player count support certain playoff rounds.
 */
export function checkPlayoffPossibility(playerCount: number, rounds: PlayoffRound[]): { possible: boolean, message?: string } {
  const teams = playerCount / 2;
  if (rounds.includes('ROUND_OF_16') && teams < 16) return { possible: false, message: "Mínimo 32 atletas (16 duplas) para Oitavas." };
  if (rounds.includes('QUARTER_FINALS') && teams < 8) return { possible: false, message: "Mínimo 16 atletas (8 duplas) para Quartas." };
  if (rounds.includes('SEMI_FINALS') && teams < 4) return { possible: false, message: "Mínimo 8 atletas (4 duplas) para Semi." };
  if (rounds.includes('FINAL') && teams < 2) return { possible: false, message: "Mínimo 4 atletas (2 duplas) para Final." };
  return { possible: true };
}

/**
 * Generates an Individual Doubles (Super) schedule.
 * Goal: Every player partners with every other player exactly once.
 * For N players, this means N-1 matches per player.
 * Total matches required = N * (N-1) / 4.
 */
export function generateIndividualDoubles(players: Player[], selectedCourts: number[]): Match[] {
  const n = players.length;
  const tempPlayers = [...players];
  if (n % 2 !== 0) {
    tempPlayers.push({ id: 'BYE', name: 'Folga' });
  }
  const numPlayers = tempPlayers.length;
  
  const courtUsageCount: Record<string, Record<number, number>> = {};
  const globalTableUsage: Record<number, number> = {};

  const incUsage = (pIds: string[], court: number) => {
    globalTableUsage[court] = (globalTableUsage[court] || 0) + 1;
    pIds.forEach(id => {
      if (id === 'BYE') return;
      if (!courtUsageCount[id]) courtUsageCount[id] = {};
      courtUsageCount[id][court] = (courtUsageCount[id][court] || 0) + 1;
    });
  };

  const getBestCourt = (pIds: string[], availableCourts: number[]) => {
    const scores = availableCourts.map(court => {
      let playerUsageScore = 0;
      pIds.forEach(id => {
        if (id !== 'BYE') {
          const usage = (courtUsageCount[id]?.[court] || 0);
          playerUsageScore += Math.pow(10, usage);
        }
      });
      const globalScore = (globalTableUsage[court] || 0) * 0.1;
      const tiedRandomScore = Math.random() * 0.01;
      
      return { court, totalScore: playerUsageScore + globalScore + tiedRandomScore };
    });

    scores.sort((a, b) => a.totalScore - b.totalScore);
    return scores[0].court;
  };

  // Custom fixed matrix for Super 6 (6 players)
  if (numPlayers === 6) {
    const matrix = [
      { r: 1, p1: 0, p1p: 1, p2: 2, p2p: 3 },
      { r: 2, p1: 0, p1p: 2, p2: 4, p2p: 5 },
      { r: 3, p1: 0, p1p: 3, p2: 1, p2p: 4 },
      { r: 4, p1: 1, p1p: 5, p2: 2, p2p: 4 },
      { r: 5, p1: 0, p1p: 5, p2: 1, p2p: 3 },
    ];

    const matches: Match[] = [];
    const rounds = [1, 2, 3, 4, 5];
    rounds.forEach(r => {
      const roundMatches = matrix.filter(m => m.r === r).sort(() => Math.random() - 0.5);
      let availableCourtsInRound = [...selectedCourts];
      roundMatches.forEach((m, idx) => {
        const pIds = [tempPlayers[m.p1].id, tempPlayers[m.p1p].id, tempPlayers[m.p2].id, tempPlayers[m.p2p].id];
        const courtCandidates = availableCourtsInRound.length > 0 ? availableCourtsInRound : selectedCourts;
        const table = getBestCourt(pIds, courtCandidates);
        
        incUsage(pIds, table);
        availableCourtsInRound = availableCourtsInRound.filter(c => c !== table);

        matches.push({
          id: `super-6-${r}-${idx}`,
          player1Id: tempPlayers[m.p1].id,
          player1PartnerId: tempPlayers[m.p1p].id,
          player2Id: tempPlayers[m.p2].id,
          player2PartnerId: tempPlayers[m.p2p].id,
          table,
          sets: [],
          currentSet: { player1: 0, player2: 0 },
          isCompleted: false,
          round: r
        });
      });
    });
    return matches;
  }

  // Custom fixed matrix for Super 8 (8 players)
  if (numPlayers === 8) {
    const matrix = [
      // Round 1
      { r: 1, p1: 0, p1p: 1, p2: 2, p2p: 3 },
      { r: 1, p1: 4, p1p: 5, p2: 6, p2p: 7 },
      // Round 2
      { r: 2, p1: 0, p1p: 2, p2: 5, p2p: 6 },
      { r: 2, p1: 1, p1p: 3, p2: 4, p2p: 7 },
      // Round 3
      { r: 3, p1: 0, p1p: 6, p2: 1, p2p: 7 },
      { r: 3, p1: 2, p1p: 5, p2: 3, p2p: 4 },
      // Round 4
      { r: 4, p1: 0, p1p: 3, p2: 4, p2p: 6 },
      { r: 4, p1: 1, p1p: 2, p2: 5, p2p: 7 },
      // Round 5
      { r: 5, p1: 0, p1p: 5, p2: 1, p2p: 4 },
      { r: 5, p1: 2, p1p: 6, p2: 3, p2p: 7 },
      // Round 6
      { r: 6, p1: 0, p1p: 4, p2: 2, p2p: 7 },
      { r: 6, p1: 1, p1p: 5, p2: 3, p2p: 6 },
      // Round 7
      { r: 7, p1: 0, p1p: 7, p2: 3, p2p: 5 },
      { r: 7, p1: 1, p1p: 6, p2: 2, p2p: 4 },
    ];
    const matches: Match[] = [];
    const rounds = [1, 2, 3, 4, 5, 6, 7];
    rounds.forEach(r => {
      const roundMatches = matrix.filter(m => m.r === r).sort(() => Math.random() - 0.5);
      let availableCourtsInRound = [...selectedCourts];
      roundMatches.forEach((m, idx) => {
        const pIds = [tempPlayers[m.p1].id, tempPlayers[m.p1p].id, tempPlayers[m.p2].id, tempPlayers[m.p2p].id];
        const courtCandidates = availableCourtsInRound.length > 0 ? availableCourtsInRound : selectedCourts;
        const table = getBestCourt(pIds, courtCandidates);
        
        incUsage(pIds, table);
        availableCourtsInRound = availableCourtsInRound.filter(c => c !== table);

        matches.push({
          id: `super-8-${r}-${idx}`,
          player1Id: tempPlayers[m.p1].id,
          player1PartnerId: tempPlayers[m.p1p].id,
          player2Id: tempPlayers[m.p2].id,
          player2PartnerId: tempPlayers[m.p2p].id,
          table,
          sets: [],
          currentSet: { player1: 0, player2: 0 },
          isCompleted: false,
          round: r
        });
      });
    });
    return matches;
  }

  // Custom fixed matrix for Super 10 (10 players)
  // Optimized: 36 unique partnerships, players 0-1 rest 1x, players 2-9 rest 2x.
  // Each round includes restA/restB indicating which player indices rest.
  if (numPlayers === 10) {
    const matrix = [
      // Round 1 — rest: atleta 0 e atleta 3
      { r:1, p1:1, p1p:4, p2:5, p2p:8, restA:0, restB:3 },
      { r:1, p1:2, p1p:6, p2:7, p2p:9, restA:0, restB:3 },
      // Round 2 — rest: atleta 1 e atleta 5
      { r:2, p1:3, p1p:4, p2:7, p2p:8, restA:1, restB:5 },
      { r:2, p1:0, p1p:2, p2:6, p2p:9, restA:1, restB:5 },
      // Round 3 — rest: atleta 3 e atleta 5
      { r:3, p1:0, p1p:7, p2:2, p2p:8, restA:3, restB:5 },
      { r:3, p1:1, p1p:6, p2:4, p2p:9, restA:3, restB:5 },
      // Round 4 — rest: atleta 7 e atleta 8
      { r:4, p1:0, p1p:1, p2:3, p2p:9, restA:7, restB:8 },
      { r:4, p1:2, p1p:4, p2:5, p2p:6, restA:7, restB:8 },
      // Round 5 — rest: atleta 7 e atleta 8
      { r:5, p1:0, p1p:5, p2:1, p2p:9, restA:7, restB:8 },
      { r:5, p1:2, p1p:3, p2:4, p2p:6, restA:7, restB:8 },
      // Round 6 — rest: atleta 4 e atleta 9
      { r:6, p1:1, p1p:5, p2:6, p2p:8, restA:4, restB:9 },
      { r:6, p1:0, p1p:3, p2:2, p2p:7, restA:4, restB:9 },
      // Round 7 — rest: atleta 4 e atleta 6
      { r:7, p1:0, p1p:9, p2:1, p2p:8, restA:4, restB:6 },
      { r:7, p1:2, p1p:5, p2:3, p2p:7, restA:4, restB:6 },
      // Round 8 — rest: atleta 2 e atleta 6
      { r:8, p1:0, p1p:8, p2:4, p2p:7, restA:2, restB:6 },
      { r:8, p1:1, p1p:3, p2:5, p2p:9, restA:2, restB:6 },
      // Round 9 — rest: atleta 2 e atleta 9
      { r:9, p1:0, p1p:6, p2:1, p2p:7, restA:2, restB:9 },
      { r:9, p1:3, p1p:5, p2:4, p2p:8, restA:2, restB:9 },
    ];
    const matches: Match[] = [];
    const rounds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    rounds.forEach(r => {
      const roundMatches = matrix.filter(m => m.r === r).sort(() => Math.random() - 0.5);
      // Attach resting players to the first match of each round for display
      const restA = roundMatches[0]?.restA ?? -1;
      const restB = roundMatches[0]?.restB ?? -1;
      let availableCourtsInRound = [...selectedCourts];
      roundMatches.forEach((m, idx) => {
        const pIds = [tempPlayers[m.p1].id, tempPlayers[m.p1p].id, tempPlayers[m.p2].id, tempPlayers[m.p2p].id];
        const courtCandidates = availableCourtsInRound.length > 0 ? availableCourtsInRound : selectedCourts;
        const table = getBestCourt(pIds, courtCandidates);
        incUsage(pIds, table);
        availableCourtsInRound = availableCourtsInRound.filter(c => c !== table);
        matches.push({
          id: `super-10-${r}-${idx}`,
          player1Id: tempPlayers[m.p1].id,
          player1PartnerId: tempPlayers[m.p1p].id,
          player2Id: tempPlayers[m.p2].id,
          player2PartnerId: tempPlayers[m.p2p].id,
          // Store resting players on first match of round for UI display
          ...(idx === 0 && restA >= 0 ? {
            restingPlayerIds: [tempPlayers[restA].id, tempPlayers[restB].id]
          } : {}),
          table,
          sets: [],
          currentSet: { player1: 0, player2: 0 },
          isCompleted: false,
          round: r
        });
      });
    });
    return matches;
  }

  const matches: Match[] = [];
  const gamesPlayed: Record<string, number> = {};
  const opponentCount: Record<string, Record<string, number>> = {};

  tempPlayers.forEach(p => {
    gamesPlayed[p.id] = 0;
    opponentCount[p.id] = {};
  });

  // Generate all possible unique partnerships
  const allPossiblePairs: [string, string][] = [];
  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      allPossiblePairs.push([tempPlayers[i].id, tempPlayers[j].id]);
    }
  }

  // Shuffle for variety
  let remainingPairs = allPossiblePairs.sort(() => Math.random() - 0.5);
  
  const maxMatchesPerRound = Math.floor(numPlayers / 4);
  const maxRounds = numPlayers * 3; // Safety limit
  
  for (let r = 1; r <= maxRounds && remainingPairs.length > 0; r++) {
    const playersUsedThisRound = new Set<string>();
    let matchesInRound = 0;
    let availableCourtsInRound = [...selectedCourts];

    // Try to fill matches for this round
    for (let i = 0; i < remainingPairs.length && matchesInRound < maxMatchesPerRound; i++) {
        const pair1 = remainingPairs[i];
        if (playersUsedThisRound.has(pair1[0]) || playersUsedThisRound.has(pair1[1])) continue;

        // Find another pair that hasn't played this round and shares no players
        let bestPair2Idx = -1;
        let minCombinedOpponentWeight = Infinity;

        for (let j = i + 1; j < remainingPairs.length; j++) {
          const pair2 = remainingPairs[j];
          const combined = [...pair1, ...pair2];
          if (new Set(combined).size === 4 && !combined.some(p => playersUsedThisRound.has(p))) {
            let opponentWeight = 0;
            pair1.forEach(p1 => {
              pair2.forEach(p2 => {
                opponentWeight += (opponentCount[p1][p2] || 0);
              });
            });

            if (opponentWeight < minCombinedOpponentWeight) {
              minCombinedOpponentWeight = opponentWeight;
              bestPair2Idx = j;
              if (opponentWeight === 0) break;
            }
          }
        }

        if (bestPair2Idx !== -1) {
          const pair2 = remainingPairs[bestPair2Idx];
          const pIds = [...pair1, ...pair2];
          
          const courtCandidates = availableCourtsInRound.length > 0 ? availableCourtsInRound : selectedCourts;
          const table = getBestCourt(pIds, courtCandidates);
          
          const isByeMatch = pair1.includes('BYE') || pair2.includes('BYE');
          
          if (!isByeMatch) {
            matches.push({
              id: `super-${r}-${matchesInRound}-${Math.random().toString(36).substr(2, 5)}`,
              player1Id: pair1[0],
              player1PartnerId: pair1[1],
              player2Id: pair2[0],
              player2PartnerId: pair2[1],
              table,
              sets: [],
              currentSet: { player1: 0, player2: 0 },
              isCompleted: false,
              round: r
            });
            matchesInRound++;
            
            incUsage(pIds, table);
            availableCourtsInRound = availableCourtsInRound.filter(c => c !== table);

            // Update opponent counts
            pair1.forEach(p1 => {
              pair2.forEach(p2 => {
                if (p1 !== 'BYE' && p2 !== 'BYE') {
                  opponentCount[p1][p2] = (opponentCount[p1][p2] || 0) + 1;
                  opponentCount[p2][p1] = (opponentCount[p2][p1] || 0) + 1;
                }
              });
            });
          }

          // Mark players as used
          pair1.forEach(p => playersUsedThisRound.add(p));
          pair2.forEach(p => playersUsedThisRound.add(p));

          remainingPairs.splice(bestPair2Idx, 1);
          remainingPairs.splice(i, 1);
          i--;
        }
    }

    if (matchesInRound === 0 && remainingPairs.length > 0) {
      remainingPairs.push(remainingPairs.shift()!);
    }
  }

  return matches;
}

export function validateSetScore(s1: number, s2: number, format: MatchFormat): { isValid: boolean; error?: string } {
  if (s1 < 0 || s2 < 0) return { isValid: false, error: "Pontuação não pode ser negativa." };
  
  const max = Math.max(s1, s2);
  const min = Math.min(s1, s2);
  const sum = s1 + s2;

  switch (format) {
    case '6_GAMES_TIEBREAK':
      if (s1 === 7 && s2 === 7) return { isValid: false, error: "Placar de 7x7 não é permitido." };
      if (max < 6) return { isValid: false, error: "O set termina em pelo menos 6 games." };
      if (max === 6) {
        if (min > 4) return { isValid: false, error: "Empate em 5-5 exige 2 games de diferença ou tie-break." };
        return { isValid: true };
      }
      if (max === 7) {
        if (min === 5 || min === 6) return { isValid: true };
        return { isValid: false, error: "Placar de 7 games inválido." };
      }
      return { isValid: false, error: "Placar inválido (Máx: 7)." };

    case '8_GAMES_MAX':
      if (s1 === 8 && s2 === 8) return { isValid: false, error: "Placar de 8x8 não é permitido." };
      if (max === 8) return { isValid: true };
      return { isValid: false, error: "O set termina quando uma dupla faz 8 games." };

    case '6_GAMES_MAX':
      if (s1 === 6 && s2 === 6) return { isValid: false, error: "Placar de 6x6 não é permitido." };
      if (max === 6) return { isValid: true };
      return { isValid: false, error: "O set termina quando uma dupla faz 6 games." };

    case '5_GAMES_MAX':
      if (s1 === 5 && s2 === 5) return { isValid: false, error: "Placar de 5x5 não é permitido." };
      if (max === 5) return { isValid: true };
      return { isValid: false, error: "O set termina quando uma dupla faz 5 games." };

    case 'SUM_9_GAMES':
      if (sum === 9) return { isValid: true };
      return { isValid: false, error: "A soma dos games deve ser exatamente 9." };

    case 'SUM_7_GAMES':
      if (sum === 7) return { isValid: true };
      return { isValid: false, error: "A soma dos games deve ser exatamente 7." };

    case 'SUM_5_GAMES':
      if (sum === 5) return { isValid: true };
      return { isValid: false, error: "A soma dos games deve ser exatamente 5." };

    default:
      return { isValid: false, error: "Formato de jogo não suportado." };
  }
}

/**
 * Checks if a score can be incremented based on the format's strict limits (TRAVA RÍGIDA).
 */
export function canIncrementScore(s1: number, s2: number, player: 1 | 2, format: MatchFormat): boolean {
  switch (format) {
    case '6_GAMES_TIEBREAK':
      // Regra: Máximo 7.
      // Permitir incremento do perdedor até 5 mesmo se o outro já tiver 6.
      // Só travar o vencedor em 6 se o perdedor tiver menos de 5.
      if (player === 1) {
        if (s1 >= 7 || s2 >= 7) return false;
        if (s1 === 6) return s2 >= 5; // Só vai para 7 se estiver 6-5 ou 6-6
        return true; 
      } else {
        if (s2 >= 7 || s1 >= 7) return false;
        if (s2 === 6) return s1 >= 5; // Só vai para 7 se estiver 5-6 ou 6-6
        return true;
      }

    case '8_GAMES_MAX':
      // Regra: Máximo 8. Proibido 8x8.
      if (player === 1) {
        return s1 < 8 && (s1 < 7 || s2 < 8);
      } else {
        return s2 < 8 && (s2 < 7 || s1 < 8);
      }

    case '6_GAMES_MAX':
      // Regra: Máximo 6. Proibido 6x6.
      if (player === 1) {
        return s1 < 6 && (s1 < 5 || s2 < 6);
      } else {
        return s2 < 6 && (s2 < 5 || s1 < 6);
      }

    case '5_GAMES_MAX':
      // Regra: Máximo 5. Proibido 5x5.
      if (player === 1) {
        return s1 < 5 && (s1 < 4 || s2 < 5);
      } else {
        return s2 < 5 && (s2 < 4 || s1 < 5);
      }

    case 'SUM_9_GAMES':
      // Regra: (scoreA + scoreB) < 9
      return (s1 + s2) < 9;

    case 'SUM_7_GAMES':
      // Regra: (scoreA + scoreB) < 7
      return (s1 + s2) < 7;

    case 'SUM_5_GAMES':
      // Regra: (scoreA + scoreB) < 5
      return (s1 + s2) < 5;

    default:
      return true;
  }
}

export function getMatchWinner(match: Match): string | undefined {
  if (match.sets.length === 0) return undefined;
  const lastSet = match.sets[match.sets.length - 1];
  if (lastSet.player1 > lastSet.player2) return match.player1Id;
  if (lastSet.player2 > lastSet.player1) return match.player2Id;
  return undefined;
}

/**
 * Calculates qualified teams for knockout stage from group stage results.
 */
export function getKnockoutQualifiedTeams(
  players: Player[], 
  matches: Match[], 
  criteria: RankingCriterion[], 
  groups: { id: string, teams: Player[] }[],
  selectedRounds: PlayoffRound[]
): Player[] {
  type RankedTeam = ReturnType<typeof calculateRankings>[number] & { groupId: string; groupPosition: number };

  const normalizedRounds = normalizePlayoffRounds(selectedRounds);
  const targetKnockoutSize = normalizedRounds[0] === 'ROUND_OF_16' ? 16 :
                            normalizedRounds[0] === 'QUARTER_FINALS' ? 8 :
                            normalizedRounds[0] === 'SEMI_FINALS' ? 4 :
                            normalizedRounds[0] === 'FINAL' ? 2 : 0;

  if (targetKnockoutSize === 0 || groups.length === 0 || players.length < targetKnockoutSize) return [];

  // No intergrupos uma partida AB pertence à classificação de A e de B.
  // Por isso filtramos pelos participantes originais, e não pelo rótulo composto.
  const rankedGroups = groups.map(group => {
    const teamIds = new Set(group.teams.map(team => team.id));
    const groupMatches = matches.filter(match =>
      teamIds.has(match.player1Id) || teamIds.has(match.player2Id)
    );
    const rankings = calculateRankings(group.teams, groupMatches, criteria).map((team, index) => ({
      ...team,
      groupId: group.id,
      groupPosition: index + 1,
    }));
    return { groupId: group.id, rankings };
  });

  const compareByCriteria = (a: RankedTeam, b: RankedTeam) => {
    for (const criterion of criteria) {
      if (criterion === 'WINS' && b.wins !== a.wins) return b.wins - a.wins;
      if (criterion === 'SET_BALANCE' && b.setBalance !== a.setBalance) return b.setBalance - a.setBalance;
      if (criterion === 'GAME_BALANCE' && b.gameBalance !== a.gameBalance) return b.gameBalance - a.gameBalance;
      if (criterion === 'GAMES_WON' && b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
    }
    return a.name.localeCompare(b.name, 'pt-BR');
  };

  const perGroup = Math.floor(targetKnockoutSize / rankedGroups.length);
  const selected: RankedTeam[] = [];
  const selectedIds = new Set<string>();

  rankedGroups.forEach(group => {
    group.rankings.slice(0, perGroup).forEach(team => {
      selected.push(team);
      selectedIds.add(team.id);
    });
  });

  if (selected.length < targetKnockoutSize) {
    const wildcards = rankedGroups
      .flatMap(group => group.rankings.filter(team => !selectedIds.has(team.id)))
      .sort((a, b) => a.groupPosition - b.groupPosition || compareByCriteria(a, b));
    wildcards.slice(0, targetKnockoutSize - selected.length).forEach(team => {
      selected.push(team);
      selectedIds.add(team.id);
    });
  }

  if (selected.length !== targetKnockoutSize) return [];

  const byGroup = rankedGroups.map(group =>
    group.rankings.filter(team => selectedIds.has(team.id))
  );
  const asPlayers = (teams: RankedTeam[]) => teams.map(team => ({ id: team.id, name: team.name }));

  // Cruzamentos esportivos previsíveis para as estruturas mais comuns.
  if (byGroup.length === 2 && targetKnockoutSize === 2) {
    return asPlayers([byGroup[0][0], byGroup[1][0]]);
  }
  if (byGroup.length === 2 && targetKnockoutSize === 4) {
    return asPlayers([byGroup[0][0], byGroup[1][1], byGroup[1][0], byGroup[0][1]]);
  }
  if (byGroup.length === 2 && targetKnockoutSize === 8) {
    return asPlayers([
      byGroup[0][0], byGroup[1][3], byGroup[0][1], byGroup[1][2],
      byGroup[1][0], byGroup[0][3], byGroup[1][1], byGroup[0][2],
    ]);
  }
  if (byGroup.length === 4 && targetKnockoutSize === 8) {
    return asPlayers([
      byGroup[0][0], byGroup[2][1], byGroup[1][0], byGroup[3][1],
      byGroup[2][0], byGroup[0][1], byGroup[3][0], byGroup[1][1],
    ]);
  }

  // Fallback para 3, 5 ou mais grupos: melhores campanhas primeiro e pareamento
  // guloso contra o pior classificado disponível de outro grupo.
  const pool = [...selected].sort((a, b) => a.groupPosition - b.groupPosition || compareByCriteria(a, b));
  const bracketOrder: RankedTeam[] = [];
  while (pool.length > 0) {
    const seed = pool.shift()!;
    let opponentIndex = -1;
    for (let index = pool.length - 1; index >= 0; index--) {
      if (pool[index].groupId !== seed.groupId) {
        opponentIndex = index;
        break;
      }
    }
    if (opponentIndex < 0) opponentIndex = pool.length - 1;
    const opponent = pool.splice(opponentIndex, 1)[0];
    bracketOrder.push(seed, opponent);
  }

  return asPlayers(bracketOrder);
}

export interface FinalRankingResult {
  playerId: string;
  playerName: string;
  placement: number;
  points: number;
  hadPneu: boolean;
}

/**
 * Classificação definitiva. Em grupos + mata-mata, a posição esportiva é
 * definida pela fase alcançada; as estatísticas dos grupos apenas desempатam
 * equipes eliminadas na mesma fase.
 */
export function calculateFinalRankings(
  tournament: TournamentState
): ReturnType<typeof calculateRankings> {
  if (tournament.format !== 'GROUPS_MATA_MATA') {
    return calculateRankings(tournament.players, tournament.matches, tournament.rankingCriteria);
  }

  const groupMatches = tournament.matches.filter(match => match.round < 100);
  const baseRanking = calculateRankings(tournament.players, groupMatches, tournament.rankingCriteria);
  const baseIndex = new Map(baseRanking.map((team, index) => [team.id, index]));
  const byId = new Map(baseRanking.map(team => [team.id, team]));
  const orderedIds: string[] = [];
  const add = (id?: string) => {
    if (id && !id.startsWith('TBD') && byId.has(id) && !orderedIds.includes(id)) orderedIds.push(id);
  };
  const loserOf = (match: Match) => {
    if (!match.isCompleted || !match.winnerId) return undefined;
    return match.winnerId === match.player1Id ? match.player2Id : match.player1Id;
  };

  const finalMatch = tournament.matches.find(match => match.round === 103 && match.isCompleted);
  if (!finalMatch?.winnerId) return baseRanking;

  add(finalMatch.winnerId);
  add(loserOf(finalMatch));

  // Perdedores de uma mesma fase são ordenados pela campanha nos grupos.
  [102, 101, 100].forEach(round => {
    const eliminated = tournament.matches
      .filter(match => match.round === round && match.isCompleted)
      .map(loserOf)
      .filter((id): id is string => !!id)
      .sort((a, b) => (baseIndex.get(a) ?? Number.MAX_SAFE_INTEGER) - (baseIndex.get(b) ?? Number.MAX_SAFE_INTEGER));
    eliminated.forEach(add);
  });

  baseRanking.forEach(team => add(team.id));
  return orderedIds.map(id => byId.get(id)!).filter(Boolean);
}

/**
 * Calculates points for a ranking based on tournament results.
 */
export function calculateTournamentPoints(
  tournament: TournamentState,
  ranking: Ranking
): FinalRankingResult[] {
  const standings = calculateFinalRankings(tournament);
  const results: FinalRankingResult[] = [];

  const { pneu: pneuPenalty, participation: participationPoints, placementPoints, positionsThatScore } = ranking.pointsConfig;

  const playersWhoSufferedPneu = new Set<string>();

  tournament.matches.forEach(m => {
    if (!m.isCompleted) return;
    
    m.sets.forEach(s => {
      if (s.player1 === 0 && s.player2 > 0) {
        playersWhoSufferedPneu.add(m.player1Id);
        if (m.player1PartnerId) playersWhoSufferedPneu.add(m.player1PartnerId);
      }
      if (s.player2 === 0 && s.player1 > 0) {
        playersWhoSufferedPneu.add(m.player2Id);
        if (m.player2PartnerId) playersWhoSufferedPneu.add(m.player2PartnerId);
      }
    });
  });

  const officiallyRegisteredIds = new Set((ranking.leagueAthletes || []).filter(a => !a.isManual).map(a => a.id));

  standings.forEach((player, index) => {
    // Check if the athlete is officially registered in the league (not manual)
    const playerIds = player.memberIds?.length
      ? player.memberIds
      : player.id.startsWith('team-')
        ? player.id.replace('team-', '').split('-')
        : [player.id];
      
    const isOfficiallyRegistered = playerIds.some(id => officiallyRegisteredIds.has(id));
    
    const placement = index + 1;
    let points = 0;

    const hadPneu = playersWhoSufferedPneu.has(player.id) || playerIds.some(pid => playersWhoSufferedPneu.has(pid));

    if (isOfficiallyRegistered) {
      points += (participationPoints || 0);

      if (placement <= positionsThatScore) {
        points += (placementPoints[placement] || 0);
      }

      if (hadPneu) {
        points += (pneuPenalty || 0);
      }
    }

    results.push({
      playerId: player.id,
      playerName: player.name,
      placement,
      points,
      hadPneu
    });
  });

  return results;
}

export function calculateRankings(players: Player[], matches: Match[], criteria: RankingCriterion[] = ['WINS', 'HEAD_TO_HEAD', 'GAME_BALANCE']) {
  const stats = players.map(p => ({
    ...p,
    wins: 0,
    losses: 0,
    setsWon: 0,
    setsLost: 0,
    setBalance: 0,
    gamesWon: 0,
    gamesLost: 0,
    gameBalance: 0
  }));

  matches.forEach(m => {
    if (!m.isCompleted) return;
    
    const p1 = stats.find(s => s.id === m.player1Id);
    const p1p = m.player1PartnerId ? stats.find(s => s.id === m.player1PartnerId) : null;
    const p2 = stats.find(s => s.id === m.player2Id);
    const p2p = m.player2PartnerId ? stats.find(s => s.id === m.player2PartnerId) : null;

    // Permite calcular a classificação de um grupo no modo intergrupos:
    // apenas um dos lados da partida pertence ao grupo que está sendo avaliado.
    if (!p1 && !p1p && !p2 && !p2p) return;

    const team1Wins = m.winnerId === m.player1Id || m.winnerId === 'TEAM1';
    
    if (team1Wins) {
      if (p1) p1.wins++;
      if (p1p) p1p.wins++;
      if (p1) p1.setsWon++;
      if (p1p) p1p.setsWon++;
      
      if (p2) p2.losses++;
      if (p2p) p2p.losses++;
      if (p2) p2.setsLost++;
      if (p2p) p2p.setsLost++;
    } else {
      if (p2) p2.wins++;
      if (p2p) p2p.wins++;
      if (p2) p2.setsWon++;
      if (p2p) p2p.setsWon++;

      if (p1) p1.losses++;
      if (p1p) p1p.losses++;
      if (p1) p1.setsLost++;
      if (p1p) p1p.setsLost++;
    }

    m.sets.forEach(s => {
      if (p1) {
        p1.gamesWon += s.player1;
        p1.gamesLost += s.player2;
      }
      if (p1p) {
        p1p.gamesWon += s.player1;
        p1p.gamesLost += s.player2;
      }
      if (p2) {
        p2.gamesWon += s.player2;
        p2.gamesLost += s.player1;
      }
      if (p2p) {
        p2p.gamesWon += s.player2;
        p2p.gamesLost += s.player1;
      }
    });
  });

  stats.forEach(s => {
    s.setBalance = s.setsWon - s.setsLost;
    s.gameBalance = s.gamesWon - s.gamesLost;
  });

  // Mini-tabela para confronto direto. O comparador par-a-par anterior podia
  // formar ciclos (A > B, B > C, C > A) em empates triplos, violando a ordem
  // exigida por Array.sort. Aqui todos os empatados nas regras anteriores ao
  // confronto direto recebem uma pontuação única e determinística.
  const headToHeadWins = new Map<string, number>();
  const headToHeadIndex = criteria.indexOf('HEAD_TO_HEAD');
  if (headToHeadIndex >= 0) {
    const previousCriteria = criteria.slice(0, headToHeadIndex);
    const valueFor = (team: typeof stats[number], criterion: RankingCriterion) => {
      if (criterion === 'WINS') return team.wins;
      if (criterion === 'SET_BALANCE') return team.setBalance;
      if (criterion === 'GAME_BALANCE') return team.gameBalance;
      if (criterion === 'GAMES_WON') return team.gamesWon;
      return 0;
    };
    const cohorts = new Map<string, Set<string>>();
    stats.forEach(team => {
      const key = previousCriteria.map(criterion => valueFor(team, criterion)).join('|');
      if (!cohorts.has(key)) cohorts.set(key, new Set());
      cohorts.get(key)!.add(team.id);
      headToHeadWins.set(team.id, 0);
    });
    cohorts.forEach(ids => {
      if (ids.size < 2) return;
      matches.filter(match => match.isCompleted).forEach(match => {
        const side1 = [match.player1Id, match.player1PartnerId].filter((id): id is string => !!id);
        const side2 = [match.player2Id, match.player2PartnerId].filter((id): id is string => !!id);
        if (!side1.some(id => ids.has(id)) || !side2.some(id => ids.has(id))) return;
        const winnerSide = match.winnerId === match.player1Id || match.winnerId === 'TEAM1' ? side1 : side2;
        winnerSide.filter(id => ids.has(id)).forEach(id => {
          headToHeadWins.set(id, (headToHeadWins.get(id) || 0) + 1);
        });
      });
    });
  }

  return stats.sort((a, b) => {
    for (const criterion of criteria) {
      if (criterion === 'WINS') {
        if (b.wins !== a.wins) return b.wins - a.wins;
      }
      if (criterion === 'HEAD_TO_HEAD') {
        const aWinsCount = headToHeadWins.get(a.id) || 0;
        const bWinsCount = headToHeadWins.get(b.id) || 0;
        if (aWinsCount !== bWinsCount) return bWinsCount - aWinsCount;
      }
      if (criterion === 'GAME_BALANCE') {
        if (b.gameBalance !== a.gameBalance) return b.gameBalance - a.gameBalance;
      }
      if (criterion === 'SET_BALANCE') {
        if (b.setBalance !== a.setBalance) return b.setBalance - a.setBalance;
      }
      if (criterion === 'GAMES_WON') {
        if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      }
    }
    return a.name.localeCompare(b.name);
  });
}
