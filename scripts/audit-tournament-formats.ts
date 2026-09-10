import assert from 'node:assert/strict';
import {
  advancePlayoffWinner,
  calculateRankings,
  checkPlayoffPossibility,
  canIncrementScore,
  generateGroupStage,
  generateIndividualDoubles,
  generatePlayoffs,
  generateRoundRobin,
  getPossibleGroupStructures,
  getKnockoutQualifiedTeams,
  getTournamentScheduleIntegrityErrors,
  invalidatePlayoffDescendants,
  normalizePlayoffRounds,
  validateSetScore,
} from '../lib/tournament-logic';
import type { Match, MatchFormat, Player, PlayoffRound } from '../types';
import type { TournamentFormat } from '../types';

const players = (count: number, prefix = 'p'): Player[] =>
  Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index + 1}`, name: `${prefix.toUpperCase()} ${index + 1}` }));

const pairKey = (left: string, right: string) => [left, right].sort().join('|');
const matchParticipants = (match: Match) => [match.player1Id, match.player1PartnerId, match.player2Id, match.player2PartnerId].filter(Boolean) as string[];

function validateGeneralSchedule(schedule: Match[], competitors: Player[], courts: number[], allowTbd = false) {
  assert(schedule.length > 0, 'o gerador retornou zero partidas');
  assert.equal(new Set(schedule.map(match => match.id)).size, schedule.length, 'há IDs de partida duplicados');
  const knownIds = new Set(competitors.map(player => player.id));
  const usedByRound = new Map<number, Set<string>>();

  for (const match of schedule) {
    assert(Number.isInteger(match.round) && match.round > 0, `rodada inválida em ${match.id}`);
    assert(courts.includes(match.table), `quadra inválida em ${match.id}`);
    const participants = matchParticipants(match);
    assert.equal(new Set(participants).size, participants.length, `atleta/dupla repetido dentro de ${match.id}`);
    participants.forEach(id => assert(knownIds.has(id) || (allowTbd && id.startsWith('TBD')), `participante desconhecido ${id}`));

    const used = usedByRound.get(match.round) || new Set<string>();
    participants.filter(id => !id.startsWith('TBD')).forEach(id => {
      assert(!used.has(id), `${id} foi escalado duas vezes na rodada ${match.round}`);
      used.add(id);
    });
    usedByRound.set(match.round, used);
  }
}

function auditIndividualModes() {
  const cases = [
    { format: 'REI_DA_QUADRA', name: 'Rei da Quadra', count: 4, rounds: 3, matches: 3, appearances: [3, 3, 3, 3], completePartners: true, minOpponents: 3, maxOpponentRepeat: 2 },
    { format: 'SUPER_8_INDIVIDUAL', name: 'Super 8 individual', count: 8, rounds: 7, matches: 14, appearances: Array(8).fill(7), completePartners: true, minOpponents: 7, maxOpponentRepeat: 2 },
    { format: 'SUPER_12_INDIVIDUAL', name: 'Super 12 individual', count: 12, rounds: 11, matches: 33, appearances: Array(12).fill(11), completePartners: true, minOpponents: 11, maxOpponentRepeat: 2 },
    { format: 'SUPER_16_INDIVIDUAL', name: 'Super 16 individual', count: 16, rounds: 15, matches: 60, appearances: Array(16).fill(15), completePartners: true, minOpponents: 15, maxOpponentRepeat: 2 },
  ];

  for (const testCase of cases) {
    for (let repetition = 0; repetition < 40; repetition++) {
      for (const courts of [[1], [1, 2], [2, 4, 6]]) {
        const competitors = players(testCase.count);
        const schedule = generateIndividualDoubles(competitors, courts);
        validateGeneralSchedule(schedule, competitors, courts);
        assert.deepEqual(getTournamentScheduleIntegrityErrors(testCase.format as TournamentFormat, competitors, schedule, courts), [], `${testCase.name}: barreira em tempo de execução`);
        assert.equal(Math.max(...schedule.map(match => match.round)), testCase.rounds, `${testCase.name}: total de rodadas`);
        assert.equal(new Set(schedule.map(match => match.round)).size, testCase.rounds, `${testCase.name}: rodadas vazias`);
        assert.equal(schedule.length, testCase.matches, `${testCase.name}: total de partidas`);

        const partnershipKeys = schedule.flatMap(match => [
          pairKey(match.player1Id, match.player1PartnerId!),
          pairKey(match.player2Id, match.player2PartnerId!),
        ]);
        assert.equal(new Set(partnershipKeys).size, partnershipKeys.length, `${testCase.name}: parceria repetida`);
        if (testCase.completePartners) {
          assert.equal(partnershipKeys.length, testCase.count * (testCase.count - 1) / 2, `${testCase.name}: faltou alguma parceria`);
        }
        competitors.forEach(player => {
          const opponentCounts = new Map<string, number>();
          schedule.forEach(match => {
            const left = [match.player1Id, match.player1PartnerId!];
            const right = [match.player2Id, match.player2PartnerId!];
            const opponents = left.includes(player.id) ? right : right.includes(player.id) ? left : [];
            opponents.forEach(opponent => opponentCounts.set(opponent, (opponentCounts.get(opponent) || 0) + 1));
          });
          assert(opponentCounts.size >= testCase.minOpponents, `${testCase.name}: ${player.id} teve pouca variedade de adversários`);
          assert(Math.max(...opponentCounts.values()) <= testCase.maxOpponentRepeat, `${testCase.name}: ${player.id} enfrentou alguém vezes demais`);
          if (testCase.completePartners) {
            competitors.filter(opponent => opponent.id !== player.id).forEach(opponent => {
              assert.equal(opponentCounts.get(opponent.id), 2, `${testCase.name}: ${player.id} não enfrentou ${opponent.id} exatamente 2 vezes`);
            });
          }
        });

        competitors.forEach(player => {
          const restingRounds = Array.from({ length: testCase.rounds }, (_, index) => index + 1)
            .filter(round => !schedule.filter(match => match.round === round).some(match => matchParticipants(match).includes(player.id)));
          for (let index = 1; index < restingRounds.length; index++) {
            assert(restingRounds[index] - restingRounds[index - 1] > 1, `${testCase.name}: ${player.id} descansou em rodadas consecutivas`);
          }
        });

        const appearances = competitors.map(player => schedule.filter(match => matchParticipants(match).includes(player.id)).length).sort((a, b) => a - b);
        assert.deepEqual(appearances, testCase.appearances, `${testCase.name}: participação desequilibrada`);
      }
    }
  }
}

function auditFixedTeamModes() {
  const formatByTeamCount: Record<number, TournamentFormat> = { 3: 'SUPER_3_FIXED', 4: 'SUPER_4_FIXED', 5: 'SUPER_5_FIXED', 6: 'SUPER_6_FIXED', 8: 'SUPER_8_FIXED', 10: 'SUPER_10_FIXED', 12: 'SUPER_12_FIXED' };
  for (const teamCount of [3, 4, 5, 6, 8, 10, 12]) {
    for (let repetition = 0; repetition < 30; repetition++) {
      const competitors = players(teamCount, 't');
      const courts = [1, 3, 5];
      const schedule = generateRoundRobin(competitors, courts);
      validateGeneralSchedule(schedule, competitors, courts);
      assert.deepEqual(getTournamentScheduleIntegrityErrors(formatByTeamCount[teamCount], competitors, schedule, courts), [], `Super ${teamCount} fixo: barreira em tempo de execução`);
      assert.equal(schedule.length, teamCount * (teamCount - 1) / 2, `Super ${teamCount} fixo: partidas`);
      assert.equal(Math.max(...schedule.map(match => match.round)), teamCount % 2 === 0 ? teamCount - 1 : teamCount, `Super ${teamCount} fixo: rodadas`);
      const confrontations = schedule.map(match => pairKey(match.player1Id, match.player2Id));
      assert.equal(new Set(confrontations).size, confrontations.length, `Super ${teamCount} fixo: confronto repetido`);
    }
  }
}

function auditGroupModes() {
  for (const teamCount of [4, 6, 8, 10, 12, 16]) {
    const competitors = players(teamCount, 'g');
    for (const structure of getPossibleGroupStructures(teamCount)) {
      const intra = generateGroupStage(competitors, [1, 2, 3, 4], { ...structure, type: 'INTRA' });
      validateGeneralSchedule(intra.matches, competitors, [1, 2, 3, 4]);
      assert.equal(intra.groups.flatMap(group => group.teams).length, teamCount, 'grupos perderam equipes');
      assert.equal(new Set(intra.groups.flatMap(group => group.teams.map(team => team.id))).size, teamCount, 'equipe duplicada nos grupos');
      const expectedIntra = intra.groups.reduce((total, group) => total + group.teams.length * (group.teams.length - 1) / 2, 0);
      assert.equal(intra.matches.length, expectedIntra, 'quantidade errada de partidas dentro dos grupos');
      assert.equal(new Set(intra.matches.map(match => `${match.groupId}:${pairKey(match.player1Id, match.player2Id)}`)).size, intra.matches.length, 'confronto intragrupo repetido');

      if (structure.groupsCount % 2 === 0) {
        const inter = generateGroupStage(competitors, [1, 2, 3, 4], { ...structure, type: 'INTER' });
        validateGeneralSchedule(inter.matches, competitors, [1, 2, 3, 4]);
        let expectedInter = 0;
        for (let index = 0; index < inter.groups.length; index += 2) {
          expectedInter += inter.groups[index].teams.length * inter.groups[index + 1].teams.length;
        }
        assert.equal(inter.matches.length, expectedInter, 'quantidade errada de partidas intergrupos');
        assert.equal(new Set(inter.matches.map(match => pairKey(match.player1Id, match.player2Id))).size, inter.matches.length, 'confronto intergrupos repetido');
      }
    }
  }
}

function auditPlayoffs() {
  const cases: { start: PlayoffRound; teams: number; matches: number; rounds: number[] }[] = [
    { start: 'FINAL', teams: 2, matches: 1, rounds: [103] },
    { start: 'SEMI_FINALS', teams: 4, matches: 3, rounds: [102, 103] },
    { start: 'QUARTER_FINALS', teams: 8, matches: 7, rounds: [101, 102, 103] },
    { start: 'ROUND_OF_16', teams: 16, matches: 15, rounds: [100, 101, 102, 103] },
  ];
  for (const testCase of cases) {
    assert.equal(checkPlayoffPossibility(testCase.teams * 2, [testCase.start]).possible, true, `${testCase.start}: limite válido recusado`);
    assert.equal(checkPlayoffPossibility(testCase.teams * 2 - 2, [testCase.start]).possible, false, `${testCase.start}: limite insuficiente aceito`);
    const normalized = normalizePlayoffRounds([testCase.start]);
    const competitors = players(testCase.teams, 'k');
    let schedule = generatePlayoffs(competitors, [1, 2, 3, 4], normalized);
    validateGeneralSchedule(schedule, competitors, [1, 2, 3, 4], true);
    assert.equal(schedule.length, testCase.matches, `${testCase.start}: partidas do mata-mata`);
    assert.deepEqual([...new Set(schedule.map(match => match.round))], testCase.rounds, `${testCase.start}: fases do mata-mata`);

    if (normalized.length > 1) {
      const opening = schedule.find(match => match.round === testCase.rounds[0])!;
      schedule = advancePlayoffWinner(schedule, opening.id, opening.player1Id, normalized);
      const next = schedule.find(match => match.round === testCase.rounds[1] && [match.player1Id, match.player2Id].includes(opening.player1Id));
      assert(next, 'vencedor não avançou no chaveamento');
      const invalidated = invalidatePlayoffDescendants(schedule, opening.id, normalized);
      assert(!invalidated.some(match => match.round > opening.round && [match.player1Id, match.player2Id].includes(opening.player1Id)), 'descendente não foi invalidado');
    }
  }
}

function auditRankingsAndQualification() {
  const competitors = players(8, 'q');
  const generated = generateGroupStage(competitors, [1, 2], { groupsCount: 2, teamsPerGroup: 4, type: 'INTRA' });
  const completed = generated.matches.map((match, index) => ({
    ...match,
    isCompleted: true,
    winnerId: index % 2 === 0 ? match.player1Id : match.player2Id,
    sets: [{ player1: index % 2 === 0 ? 6 : 3, player2: index % 2 === 0 ? 3 : 6 }],
  }));
  const ranking = calculateRankings(competitors, completed, ['WINS', 'HEAD_TO_HEAD', 'GAME_BALANCE', 'GAMES_WON']);
  assert.equal(ranking.length, competitors.length, 'classificação perdeu competidor');
  assert.equal(new Set(ranking.map(item => item.id)).size, competitors.length, 'classificação duplicou competidor');
  assert.equal(ranking.reduce((total, item) => total + item.wins, 0), completed.length, 'total de vitórias inconsistente');
  assert.equal(ranking.reduce((total, item) => total + item.losses, 0), completed.length, 'total de derrotas inconsistente');
  ranking.forEach(item => {
    assert.equal(item.gameBalance, item.gamesWon - item.gamesLost, 'saldo de games inconsistente');
    assert.equal(item.wins + item.losses, 3, 'equipe não disputou todas as partidas do grupo');
  });

  const qualified = getKnockoutQualifiedTeams(competitors, completed, ['WINS', 'HEAD_TO_HEAD', 'GAME_BALANCE'], generated.groups, ['SEMI_FINALS']);
  assert.equal(qualified.length, 4, 'semifinal não recebeu quatro classificados');
  assert.equal(new Set(qualified.map(item => item.id)).size, 4, 'classificado duplicado');
  const groupByTeam = new Map(generated.groups.flatMap(group => group.teams.map(team => [team.id, group.id] as const)));
  assert.notEqual(groupByTeam.get(qualified[0].id), groupByTeam.get(qualified[1].id), 'semifinal 1 colocou equipes do mesmo grupo');
  assert.notEqual(groupByTeam.get(qualified[2].id), groupByTeam.get(qualified[3].id), 'semifinal 2 colocou equipes do mesmo grupo');
}

function auditScoreModes() {
  const formats: MatchFormat[] = ['6_GAMES_TIEBREAK', '8_GAMES_MAX', '6_GAMES_MAX', '5_GAMES_MAX', 'SUM_9_GAMES', 'SUM_7_GAMES', 'SUM_5_GAMES'];
  const expected = (left: number, right: number, format: MatchFormat) => {
    const max = Math.max(left, right), min = Math.min(left, right), sum = left + right;
    if (format === '6_GAMES_TIEBREAK') return (max === 6 && min <= 4) || (max === 7 && (min === 5 || min === 6));
    if (format === '8_GAMES_MAX') return max === 8 && min < 8;
    if (format === '6_GAMES_MAX') return max === 6 && min < 6;
    if (format === '5_GAMES_MAX') return max === 5 && min < 5;
    if (format === 'SUM_9_GAMES') return sum === 9;
    if (format === 'SUM_7_GAMES') return sum === 7;
    return sum === 5;
  };
  formats.forEach(format => {
    for (let left = 0; left <= 12; left++) for (let right = 0; right <= 12; right++) {
      assert.equal(validateSetScore(left, right, format).isValid, expected(left, right, format), `${format}: validação de ${left}x${right}`);
      if (canIncrementScore(left, right, 1, format)) assert(left < 12, `${format}: incremento ilimitado do lado 1`);
      if (canIncrementScore(left, right, 2, format)) assert(right < 12, `${format}: incremento ilimitado do lado 2`);
    }
  });
}

auditIndividualModes();
auditFixedTeamModes();
auditGroupModes();
auditPlayoffs();
auditRankingsAndQualification();
auditScoreModes();

console.log('AUDITORIA APROVADA: todos os formatos, rodadas, confrontos, parcerias, mata-mata e placares passaram.');
