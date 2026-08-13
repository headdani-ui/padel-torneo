import { create } from 'zustand';

export type WizardStep =
  | 'num-players'
  | 'player-names'
  | 'mixed'
  | 'fixed-pairs'
  | 'define-pairs'
  | 'courts-days'
  | 'scoring'
  | 'confirm';

export type ScoringType = 'SETS' | 'POINTS';
export type ScoringMode = 'BEST_OF_1' | 'BEST_OF_3' | 'POINTS_MAX';
export type ViewTab = 'calendar' | 'results' | 'rankings';

export interface PlayerInput {
  name: string;
  gender: 'M' | 'F';
}

export interface FixedPairInput {
  player1Index: number;
  player2Index: number;
}

export interface TournamentSetup {
  numPlayers: number;
  players: PlayerInput[];
  isMixed: boolean;
  isFixedPairs: boolean;
  fixedPairs: FixedPairInput[];
  numCourts: number;
  numDays: number;
  scoringType: ScoringType;
  scoringMode: ScoringMode;
  maxPoints: number;
  winBonus: number;
}

export interface TournamentData {
  id: string;
  name: string;
  isMixed: boolean;
  isFixedPairs: boolean;
  numCourts: number;
  numDays: number;
  scoringType: ScoringType;
  scoringMode: ScoringMode;
  maxPoints: number;
  winBonus: number;
  players: { id: string; name: string; gender: string }[];
  pairs: {
    id: string;
    player1Id: string;
    player2Id: string;
    player1Name: string;
    player2Name: string;
    isFixed: boolean;
  }[];
  matches: {
    id: string;
    dayNumber: number;
    courtNumber: number;
    team1Id: string;
    team2Id: string;
    status: string;
    winnerId: string | null;
    setResults: { id: string; setNumber: number; team1Score: number; team2Score: number }[];
  }[];
}

interface TournamentStore {
  // Wizard state
  view: 'setup' | 'tournament';
  wizardStep: WizardStep;
  setup: TournamentSetup;
  setView: (view: 'setup' | 'tournament') => void;
  setWizardStep: (step: WizardStep) => void;
  updateSetup: (partial: Partial<TournamentSetup>) => void;

  // Tournament data
  tournament: TournamentData | null;
  setTournament: (data: TournamentData) => void;
  refreshTournament: () => Promise<void>;

  // Active tab
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;

  // Reset
  resetAll: () => void;
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  view: 'setup',
  wizardStep: 'num-players',
  setup: {
    numPlayers: 8,
    players: [],
    isMixed: false,
    isFixedPairs: false,
    fixedPairs: [],
    numCourts: 2,
    numDays: 8,
    scoringType: 'SETS',
    scoringMode: 'BEST_OF_1',
    maxPoints: 16,
    winBonus: 2,
  },
  tournament: null,
  activeTab: 'calendar',

  setView: (view) => set({ view }),
  setWizardStep: (wizardStep) => set({ wizardStep }),
  updateSetup: (partial) =>
    set((state) => ({
      setup: { ...state.setup, ...partial },
    })),

  setTournament: (tournament) => set({ tournament }),

  refreshTournament: async () => {
    try {
      const res = await fetch('/api/tournament');
      const data = await res.json();
      if (data.exists) {
        set({ tournament: data.tournament, view: 'tournament' });
      }
    } catch (err) {
      console.error('Failed to refresh tournament:', err);
    }
  },

  setActiveTab: (activeTab) => set({ activeTab }),

  resetAll: () =>
    set({
      view: 'setup',
      wizardStep: 'num-players',
      setup: {
        numPlayers: 8,
        players: [],
        isMixed: false,
        isFixedPairs: false,
        fixedPairs: [],
        numCourts: 2,
        numDays: 8,
        scoringType: 'SETS',
        scoringMode: 'BEST_OF_1',
        maxPoints: 16,
        winBonus: 2,
      },
      tournament: null,
      activeTab: 'calendar',
    }),
}));
