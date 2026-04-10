import { Match, Player, MatchFormat, RankingCriterion } from "@/types";

/**
 * Generates a Round Robin schedule using the Circle Method.
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

  for (let round = 1; round <= numRounds; round++) {
    const roundMatches: {p1: Player, p2: Player}[] = [];
    
    for (let i = 0; i < numTeams / 2; i++) {
      const p1 = tempTeams[teamIndices[i]];
      const p2 = tempTeams[teamIndices[numTeams - 1 - i]];
      
      if (p1.id !== 'BYE' && p2.id !== 'BYE') {
        roundMatches.push({ p1, p2 });
      }
    }

    // Assign courts for this round
    roundMatches.forEach((m, idx) => {
      const courtIndex = idx % selectedCourts.length;
      const table = selectedCourts[courtIndex];
      
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
 * Generates matches for a group stage.
 */
export function generateGroupStage(teams: Player[], selectedCourts: number[], groupsCount: number): Match[] {
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const groups: Player[][] = Array.from({ length: groupsCount }, () => []);
  
  shuffled.forEach((team, i) => {
    groups[i % groupsCount].push(team);
  });

  let allMatches: Match[] = [];
  let maxRound = 0;

  groups.forEach((groupTeams, groupIdx) => {
    const groupMatches = generateRoundRobin(groupTeams, selectedCourts);
    const groupId = String.fromCharCode(65 + groupIdx); // A, B, C...
    
    groupMatches.forEach(m => {
      m.groupId = groupId;
      m.id = `group-${groupId}-${m.id}`;
      if (m.round > maxRound) maxRound = m.round;
    });
    
    allMatches = [...allMatches, ...groupMatches];
  });

  return allMatches;
}

/**
 * Generates an Individual Doubles schedule where players rotate partners.
 */
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

export function calculateRankings(players: Player[], matches: Match[], criteria: RankingCriterion[] = ['WINS', 'GAME_BALANCE', 'HEAD_TO_HEAD']) {
  const stats = players.map(p => ({
    ...p,
    wins: 0,
    losses: 0,
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

    const team1Wins = m.winnerId === m.player1Id || m.winnerId === 'TEAM1'; // Handle both cases
    
    if (team1Wins) {
      p1.wins++;
      if (p1p) p1p.wins++;
      p2.losses++;
      if (p2p) p2p.losses++;
    } else {
      p2.wins++;
      if (p2p) p2p.wins++;
      p1.losses++;
      if (p1p) p1p.losses++;
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
    s.gameBalance = s.gamesWon - s.gamesLost;
  });

  return stats.sort((a, b) => {
    for (const criterion of criteria) {
      if (criterion === 'WINS') {
        if (b.wins !== a.wins) return b.wins - a.wins;
      }
      if (criterion === 'GAME_BALANCE') {
        if (b.gameBalance !== a.gameBalance) return b.gameBalance - a.gameBalance;
      }
      if (criterion === 'GAMES_WON') {
        if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      }
      if (criterion === 'HEAD_TO_HEAD') {
        const directMatch = matches.find(m => 
          m.isCompleted && 
          ((m.player1Id === a.id && m.player2Id === b.id) || 
           (m.player1Id === b.id && m.player2Id === a.id))
        );

        if (directMatch) {
          if (directMatch.winnerId === a.id) return -1;
          if (directMatch.winnerId === b.id) return 1;
        }
      }
    }
    return 0;
  });
}
