export type Player = {
  id: string;
  name: string;
};

export type SetScore = {
  player1: number;
  player2: number;
};

export type Match = {
  id: string;
  player1Id: string;
  player1PartnerId?: string; // For individual formats
  player2Id: string;
  player2PartnerId?: string; // For individual formats
  table: number;
  sets: SetScore[];
  currentSet: SetScore;
  winnerId?: string;
  isCompleted: boolean;
  round: number;
  groupId?: string; // For group stage
};

export type TournamentFormat = 
  | 'REI_DA_QUADRA' 
  | 'SUPER_6_INDIVIDUAL' 
  | 'SUPER_6_FIXED'
  | 'SUPER_8_INDIVIDUAL' 
  | 'SUPER_4_FIXED' 
  | 'SUPER_10_INDIVIDUAL' 
  | 'SUPER_8_FIXED' 
  | 'SUPER_10_FIXED' 
  | 'SUPER_12_FIXED' 
  | 'SUPER_3_FIXED'
  | 'SUPER_5_FIXED'
  | 'SUPER_12_INDIVIDUAL'
  | 'GROUPS_MATA_MATA'
  | 'INDIVIDUAL'
  | 'GROUPS'
  | 'SUPER_12'
  | 'SUPER_16'
  | 'SUPER_20'
  | 'SUPER_24';

export type MatchFormat = 
  | '6_GAMES_TIEBREAK' 
  | '6_GAMES_MAX' 
  | '5_GAMES_MAX' 
  | 'SUM_9_GAMES' 
  | 'SUM_7_GAMES'
  | 'SUM_5_GAMES';

export type TeamRegistrationType = 'RANDOM_DRAW' | 'DEFINED_TEAMS';

export type RankingCriterion = 'WINS' | 'GAME_BALANCE' | 'HEAD_TO_HEAD' | 'GAMES_WON' | 'SET_BALANCE';

export type PlayoffRound = 'ROUND_OF_16' | 'QUARTER_FINALS' | 'SEMI_FINALS' | 'FINAL';

export type TournamentState = {
  id: string;
  name: string;
  players: Player[];
  athleteCount: number;
  matches: Match[];
  currentRound: number;
  totalRounds: number;
  tables: number[];
  format: TournamentFormat;
  matchFormat: MatchFormat;
  registrationType: TeamRegistrationType;
  rankingCriteria: RankingCriterion[];
  teamsPerGroup?: number;
  playoffRounds?: PlayoffRound[];
  isFinished: boolean;
  createdAt: number;
};

export type AppStep = 
  | 'HOME' 
  | 'TOURNAMENT_NAME'
  | 'PLAYER_COUNT' 
  | 'FORMAT_SELECTION' 
  | 'MATCH_FORMAT'
  | 'REGISTRATION_TYPE'
  | 'ATHLETE_REGISTRATION' 
  | 'DRAWING'
  | 'GROUP_CONFIG'
  | 'PLAYOFF_CONFIG'
  | 'GROUPS_DISPLAY'
  | 'RANKING_CRITERIA'
  | 'TABLE_COUNT' 
  | 'TOURNAMENT' 
  | 'FINISHED'
  | 'ALL_ROUNDS'
  | 'DASHBOARD'
  | 'PROFILE'
  | 'TOURNAMENTS_LIST';
