import { Match, Player, MatchFormat, RankingCriterion, PlayoffRound } from "../types";

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
  
  // Track usage
  const incUsage = (teamId: string, court: number) => {
    if (!courtUsageCount[teamId]) courtUsageCount[teamId] = {};
    courtUsageCount[teamId][court] = (courtUsageCount[teamId][court] || 0) + 1;
  };

  const getBestCourt = (t1Id: string, t2Id: string, availableCourts: number[]) => {
    let bestCourt = availableCourts[0];
    let minCombinedUsage = Infinity;

    for (const court of availableCourts) {
      const u1 = (courtUsageCount[t1Id] && courtUsageCount[t1Id][court]) || 0;
      const u2 = (courtUsageCount[t2Id] && courtUsageCount[t2Id][court]) || 0;
      const combined = u1 + u2;
      if (combined < minCombinedUsage) {
        minCombinedUsage = combined;
        bestCourt = court;
      }
    }
    return bestCourt;
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

    // Assign courts for this round with rotation awareness
    let availableCourts = [...selectedCourts];
    roundMatches.forEach((m, idx) => {
      // If we have more matches than courts, we reuse courts but still try to rotate
      const courtSelection = availableCourts.length > 0 ? availableCourts : selectedCourts;
      const table = getBestCourt(m.p1.id, m.p2.id, courtSelection);
      
      incUsage(m.p1.id, table);
      incUsage(m.p2.id, table);
      
      // Remove from available if possible to avoid same-round overlap
      availableCourts = availableCourts.filter(c => c !== table);

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

    // Rotate indices (keep first index fixed)
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
      if (teamsPerGroup >= 3) {
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
    if (totalTeams >= 6) {
       // Estimate best fit
       const suggestedGroups = Math.floor(totalTeams / 4) || 2;
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
 * Generates matches for a group stage.
 * Can handle both intra-group (everyone against everyone in group)
 * and inter-group (Group A vs Group B) if requested.
 */
export function generateGroupStage(
  teams: Player[], 
  selectedCourts: number[], 
  config: { groupsCount: number, teamsPerGroup: number, type: 'INTRA' | 'INTER' }
): { matches: Match[], groups: { id: string, teams: Player[] }[] } {
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const groups: { id: string, teams: Player[] }[] = Array.from({ length: config.groupsCount }, (_, i) => ({
    id: String.fromCharCode(65 + i),
    teams: []
  }));
  
  shuffled.forEach((team, i) => {
    groups[i % config.groupsCount].teams.push(team);
  });

  let allMatches: Match[] = [];

  if (config.type === 'INTRA') {
    groups.forEach((group) => {
      const groupMatches = generateRoundRobin(group.teams, selectedCourts);
      groupMatches.forEach(m => {
        m.groupId = group.id;
        m.id = `group-${group.id}-${m.id}`;
      });
      allMatches = [...allMatches, ...groupMatches];
    });
  } else {
    // Inter-group: Group 1 vs Group 2, Group 3 vs Group 4, etc.
    // Only works if groupsCount is even
    for (let i = 0; i < groups.length; i += 2) {
      const g1 = groups[i];
      const g2 = groups[i + 1];
      if (!g2) break; // Should not happen if count is even

      // Simple rotation: Team j of G1 vs Team (j+r) % n of G2
      const n = Math.max(g1.teams.length, g2.teams.length);
      for (let round = 1; round <= n; round++) {
        for (let j = 0; j < g1.teams.length; j++) {
          const opponentIndex = (j + round - 1) % g2.teams.length;
          const p1 = g1.teams[j];
          const p2 = g2.teams[opponentIndex];

          const courtIndex = (i + j) % selectedCourts.length;
          const table = selectedCourts[courtIndex];

          allMatches.push({
            id: `inter-${g1.id}${g2.id}-${round}-${j}`,
            player1Id: p1.id,
            player2Id: p2.id,
            table,
            sets: [],
            currentSet: { player1: 0, player2: 0 },
            isCompleted: false,
            round,
            groupId: `${g1.id}${g2.id}`
          });
        }
      }
    }
  }

  return { matches: allMatches, groups };
}

/**
 * Generates playoff matches based on selected rounds and qualified teams.
 */
export function generatePlayoffs(qualifiedTeams: Player[], selectedCourts: number[], selectedRounds: PlayoffRound[]): Match[] {
  const matches: Match[] = [];
  const roundsOrder: PlayoffRound[] = ['ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
  const rounds = roundsOrder.filter(r => selectedRounds.includes(r));
  
  const numRounds = rounds.length;
  if (numRounds === 0) return [];

  // Determine starting teams (if any)
  let currentTeams = [...qualifiedTeams];
  
  // Create all matches for all rounds
  rounds.forEach((roundType, roundIdx) => {
    // numMatches is (initial slots) / 2^(roundIdx + 1)
    // Wait, the bracket size is determined by the FIRST round.
    const firstRoundSize = Math.pow(2, numRounds);
    const numMatches = Math.pow(2, numRounds - 1 - roundIdx);
    
    for (let i = 0; i < numMatches; i++) {
      let p1Id = `TBD-${roundType}-${i}-1`;
      let p2Id = `TBD-${roundType}-${i}-2`;

      // If it's the first round and we have qualified teams, place them
      if (roundIdx === 0 && currentTeams.length > 0) {
        const team1 = currentTeams[i * 2];
        const team2 = currentTeams[i * 2 + 1];
        if (team1) p1Id = team1.id;
        if (team2) p2Id = team2.id;
      }
      
      const courtIndex = i % selectedCourts.length;
      const table = selectedCourts[courtIndex];
      
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

export function generateIndividualDoubles(players: Player[], selectedCourts: number[]): Match[] {
  const n = players.length;
  const isOdd = n % 2 !== 0;
  const tempPlayers = [...players];
  
  if (isOdd) {
    tempPlayers.push({ id: 'BYE', name: 'Folga' });
  }

  const numPlayers = tempPlayers.length;
  const numRounds = numPlayers - 1;
  const matches: Match[] = [];
  
  const playerIndices = tempPlayers.map((_, i) => i);

  for (let round = 1; round <= numRounds; round++) {
    const roundPairs: {p1: Player, p2: Player}[] = [];
    
    for (let i = 0; i < numPlayers / 2; i++) {
      const p1 = tempPlayers[playerIndices[i]];
      const p2 = tempPlayers[playerIndices[numPlayers - 1 - i]];
      
      if (p1.id !== 'BYE' && p2.id !== 'BYE') {
        roundPairs.push({ p1, p2 });
      }
    }

    // Group pairs into matches (2 pairs per match)
    for (let i = 0; i < Math.floor(roundPairs.length / 2); i++) {
      const pair1 = roundPairs[i * 2];
      const pair2 = roundPairs[i * 2 + 1];
      
      const courtIndex = i % selectedCourts.length;
      const table = selectedCourts[courtIndex];
      
      matches.push({
        id: `ind-${round}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        player1Id: pair1.p1.id,
        player1PartnerId: pair1.p2.id,
        player2Id: pair2.p1.id,
        player2PartnerId: pair2.p2.id,
        table,
        sets: [],
        currentSet: { player1: 0, player2: 0 },
        isCompleted: false,
        round
      });
    }

    // Rotate indices (keep first index fixed)
    playerIndices.splice(1, 0, playerIndices.pop()!);
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
      if (max < 6) return { isValid: false, error: "O set termina em pelo menos 6 games." };
      if (max === 6) {
        if (min > 4) return { isValid: false, error: "Empate em 5-5 exige 2 games de diferença ou tie-break." };
        return { isValid: true };
      }
      if (max === 7) {
        if (min === 5 || min === 6) return { isValid: true };
        return { isValid: false, error: "Placar de 7 games inválido." };
      }
      return { isValid: false, error: "Placar inválido para 6 games com tie-break." };

    case '6_GAMES_MAX':
      if (max === 6) return { isValid: true };
      return { isValid: false, error: "Ganha quem fizer 6 games primeiro." };

    case '5_GAMES_MAX':
      if (max === 5) return { isValid: true };
      return { isValid: false, error: "Ganha quem fizer 5 games primeiro." };

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

export function getMatchWinner(match: Match): string | undefined {
  if (match.sets.length === 0) return undefined;
  const lastSet = match.sets[match.sets.length - 1];
  if (lastSet.player1 > lastSet.player2) return match.player1Id;
  if (lastSet.player2 > lastSet.player1) return match.player2Id;
  return undefined;
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

    if (!p1 || !p2) return;

    const team1Wins = m.winnerId === m.player1Id || m.winnerId === 'TEAM1';
    
    if (team1Wins) {
      p1.wins++;
      if (p1p) p1p.wins++;
      p1.setsWon++;
      if (p1p) p1p.setsWon++;
      
      p2.losses++;
      if (p2p) p2p.losses++;
      p2.setsLost++;
      if (p2p) p2p.setsLost++;
    } else {
      p2.wins++;
      if (p2p) p2p.wins++;
      p2.setsWon++;
      if (p2p) p2p.setsWon++;

      p1.losses++;
      if (p1p) p1p.losses++;
      p1.setsLost++;
      if (p1p) p1p.setsLost++;
    }

    m.sets.forEach(s => {
      p1.gamesWon += s.player1;
      p1.gamesLost += s.player2;
      if (p1p) {
        p1p.gamesWon += s.player1;
        p1p.gamesLost += s.player2;
      }
      p2.gamesWon += s.player2;
      p2.gamesLost += s.player1;
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

  return stats.sort((a, b) => {
    for (const criterion of criteria) {
      if (criterion === 'WINS') {
        if (b.wins !== a.wins) return b.wins - a.wins;
      }
      if (criterion === 'HEAD_TO_HEAD') {
        const directMatches = matches.filter(m => 
          m.isCompleted && 
          ((m.player1Id === a.id && m.player2Id === b.id) || 
           (m.player1Id === b.id && m.player2Id === a.id) ||
           (m.player1Id === a.id && m.player2PartnerId === b.id) ||
           (m.player1PartnerId === a.id && m.player2Id === b.id) ||
           (m.player1PartnerId === a.id && m.player2PartnerId === b.id) ||
           (m.player2Id === a.id && m.player1PartnerId === b.id) ||
           (m.player2PartnerId === a.id && m.player1Id === b.id) ||
           (m.player2PartnerId === a.id && m.player1PartnerId === b.id))
        );

        if (directMatches.length > 0) {
          let aWinsCount = 0;
          let bWinsCount = 0;
          directMatches.forEach(dm => {
            const aInT1 = dm.player1Id === a.id || dm.player1PartnerId === a.id;
            const bInT1 = dm.player1Id === b.id || dm.player1PartnerId === b.id;
            const aInT2 = dm.player2Id === a.id || dm.player2PartnerId === a.id;
            const bInT2 = dm.player2Id === b.id || dm.player2PartnerId === b.id;
            
            const winnerIsT1 = dm.winnerId === dm.player1Id || dm.winnerId === 'TEAM1';
            
            if (aInT1 && bInT2) {
              if (winnerIsT1) aWinsCount++; else bWinsCount++;
            } else if (aInT2 && bInT1) {
              if (winnerIsT1) bWinsCount++; else aWinsCount++;
            }
          });
          if (aWinsCount !== bWinsCount) return bWinsCount - aWinsCount;
        }
      }
      if (criterion === 'GAME_BALANCE') {
        if (b.gameBalance !== a.gameBalance) return b.gameBalance - a.gameBalance;
      }
      if (criterion === 'GAMES_WON') {
        if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      }
    }
    return a.name.localeCompare(b.name);
  });
}
