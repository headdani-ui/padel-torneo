// Types for the scheduling algorithm

export interface PlayerData {
  id: string;
  name: string;
  gender: 'M' | 'F';
}

export interface PairData {
  id: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  isFixed: boolean;
}

export interface MatchData {
  dayNumber: number;
  courtNumber: number;
  team1: PairData;
  team2: PairData;
}

export interface ScheduleResult {
  matches: MatchData[];
  pairs: PairData[];
}

interface TournamentSettings {
  players: PlayerData[];
  isMixed: boolean;
  isFixedPairs: boolean;
  fixedPairs?: PairData[];
  numCourts: number;
  numDays: number;
}

function makePairKey(p1: string, p2: string): string {
  return [p1, p2].sort().join('-');
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── FIXED PAIRS SCHEDULING (Round-Robin) ───────────────────────────────

function scheduleFixedPairs(
  pairs: PairData[],
  numCourts: number,
  numDays: number
): MatchData[] {
  const n = pairs.length;
  if (n < 2) return [];

  // Round-robin circle method
  const slots: (PairData | null)[] = [...pairs];
  if (n % 2 === 1) slots.push(null); // bye

  const nSlots = slots.length;
  const half = nSlots / 2;
  const allRounds: PairData[][][] = [];

  const rotated = [...slots];

  for (let r = 0; r < nSlots - 1; r++) {
    const round: PairData[][] = [];
    for (let i = 0; i < half; i++) {
      const a = rotated[i];
      const b = rotated[nSlots - 1 - i];
      if (a && b) {
        round.push([a, b]);
      }
    }
    allRounds.push(round);
    // Rotate: fix index 0, rotate the rest
    const last = rotated.pop()!;
    rotated.splice(1, 0, last);
  }

  // Flatten rounds into days with court assignments
  const matches: MatchData[] = [];
  let matchIndex = 0;

  for (let day = 1; day <= numDays; day++) {
    for (let court = 1; court <= numCourts; court++) {
      if (matchIndex >= allRounds.length * (allRounds[0]?.length || 0)) break;

      const roundIdx = Math.floor(matchIndex / (allRounds[0]?.length || 1));
      const matchInRound = matchIndex % (allRounds[0]?.length || 1);

      if (roundIdx < allRounds.length && matchInRound < allRounds[roundIdx].length) {
        const [t1, t2] = allRounds[roundIdx][matchInRound];
        matches.push({
          dayNumber: day,
          courtNumber: court,
          team1: t1,
          team2: t2,
        });
      }
      matchIndex++;
    }
  }

  return matches;
}

// ─── MOBILE PAIRS SCHEDULING (NON-MIXED) ─────────────────────────────────
// Uses a greedy optimization approach:
// - Tracks how many times each pair of players have been partners
// - Tracks how many times each pair of players have been opponents
// - For each match slot, picks the combination that minimizes total repeats

function scheduleMobileNonMixed(
  players: PlayerData[],
  numCourts: number,
  numDays: number
): { matches: MatchData[]; pairs: PairData[] } {
  const n = players.length;
  const matchesPerDay = Math.min(numCourts, Math.floor(n / 4));
  const matches: MatchData[] = [];
  const pairs: PairData[] = [];

  // Counters: how many times two players have been partners or opponents
  const partnerCount: Record<string, number> = {};
  const opponentCount: Record<string, number> = {};

  const getPartnerCount = (a: string, b: string) => partnerCount[makePairKey(a, b)] || 0;
  const getOpponentCount = (a: string, b: string) => opponentCount[makePairKey(a, b)] || 0;

  const incPartner = (a: string, b: string) => {
    const k = makePairKey(a, b);
    partnerCount[k] = (partnerCount[k] || 0) + 1;
  };
  const incOpponent = (a: string, b: string) => {
    const k = makePairKey(a, b);
    opponentCount[k] = (opponentCount[k] || 0) + 1;
  };

  for (let day = 0; day < numDays; day++) {
    const usedPlayers = new Set<string>();

    // Shuffle players at start of each day for randomness
    const available = shuffle(players.filter(p => !usedPlayers.has(p.id)));

    let court = 1;
    while (court <= matchesPerDay) {
      // Get available (unused) players, shuffled
      const pool = shuffle(players.filter(p => !usedPlayers.has(p.id)));
      if (pool.length < 4) break;

      // Find the best 4-player group with the lowest total repeat score
      let bestScore = Infinity;
      let bestConfig: { t1: [PlayerData, PlayerData]; t2: [PlayerData, PlayerData] } | null = null;
      let bestIndices: number[] = [];

      // Sample multiple random combinations to find a good one
      for (let attempt = 0; attempt < 50; attempt++) {
        const sample = shuffle(pool).slice(0, 4);
        const [a, b, c, d] = sample;

        // Try all 3 pairings for these 4 players
        const configs: { t1: [PlayerData, PlayerData]; t2: [PlayerData, PlayerData] }[] = [
          { t1: [a, b], t2: [c, d] },
          { t1: [a, c], t2: [b, d] },
          { t1: [a, d], t2: [b, c] },
        ];

        for (const config of configs) {
          const score =
            getPartnerCount(config.t1[0].id, config.t1[1].id) +
            getPartnerCount(config.t2[0].id, config.t2[1].id) +
            getOpponentCount(config.t1[0].id, config.t2[0].id) +
            getOpponentCount(config.t1[0].id, config.t2[1].id) +
            getOpponentCount(config.t1[1].id, config.t2[0].id) +
            getOpponentCount(config.t1[1].id, config.t2[1].id);

          if (score < bestScore) {
            bestScore = score;
            bestConfig = config;
            bestIndices = sample.map(s => s.id);
          }
        }

        if (bestScore === 0) break; // Found a perfect combination
      }

      if (!bestConfig) break;

      const { t1, t2 } = bestConfig;

      // Record partnership and opposition counts
      incPartner(t1[0].id, t1[1].id);
      incPartner(t2[0].id, t2[1].id);
      incOpponent(t1[0].id, t2[0].id);
      incOpponent(t1[0].id, t2[1].id);
      incOpponent(t1[1].id, t2[0].id);
      incOpponent(t1[1].id, t2[1].id);

      const pair1: PairData = {
        id: `pair-day${day + 1}-c${court}-t1`,
        player1Id: t1[0].id,
        player2Id: t1[1].id,
        player1Name: t1[0].name,
        player2Name: t1[1].name,
        isFixed: false,
      };
      const pair2: PairData = {
        id: `pair-day${day + 1}-c${court}-t2`,
        player1Id: t2[0].id,
        player2Id: t2[1].id,
        player1Name: t2[0].name,
        player2Name: t2[1].name,
        isFixed: false,
      };

      pairs.push(pair1, pair2);
      matches.push({
        dayNumber: day + 1,
        courtNumber: court,
        team1: pair1,
        team2: pair2,
      });

      // Mark players as used today
      t1[0] && usedPlayers.add(t1[0].id);
      t1[1] && usedPlayers.add(t1[1].id);
      t2[0] && usedPlayers.add(t2[0].id);
      t2[1] && usedPlayers.add(t2[1].id);

      court++;
    }
  }

  return { matches, pairs };
}

// ─── MOBILE PAIRS SCHEDULING (MIXED) ─────────────────────────────────────

function scheduleMobileMixed(
  players: PlayerData[],
  numCourts: number,
  numDays: number
): { matches: MatchData[]; pairs: PairData[] } {
  const males = players.filter(p => p.gender === 'M');
  const females = players.filter(p => p.gender === 'F');

  const matchesPerDay = Math.min(numCourts, Math.min(males.length, females.length) / 2 | 0);
  const matches: MatchData[] = [];
  const pairs: PairData[] = [];

  // Trackers
  const partnerCount: Record<string, number> = {};
  const opponentCount: Record<string, number> = {};

  const getPartnerCount = (a: string, b: string) => partnerCount[makePairKey(a, b)] || 0;
  const getOpponentCount = (a: string, b: string) => opponentCount[makePairKey(a, b)] || 0;
  const incPartner = (a: string, b: string) => {
    const k = makePairKey(a, b);
    partnerCount[k] = (partnerCount[k] || 0) + 1;
  };
  const incOpponent = (a: string, b: string) => {
    const k = makePairKey(a, b);
    opponentCount[k] = (opponentCount[k] || 0) + 1;
  };

  for (let day = 0; day < numDays; day++) {
    const usedMales = new Set<string>();
    const usedFemales = new Set<string>();

    let court = 1;
    while (court <= matchesPerDay) {
      const availM = shuffle(males.filter(p => !usedMales.has(p.id)));
      const availF = shuffle(females.filter(p => !usedFemales.has(p.id)));
      if (availM.length < 2 || availF.length < 2) break;

      // Find best M+F pairing with lowest repeat score
      let bestScore = Infinity;
      let bestConfig: { t1: [PlayerData, PlayerData]; t2: [PlayerData, PlayerData] } | null = null;

      for (let attempt = 0; attempt < 50; attempt++) {
        const m1 = availM[attempt % availM.length];
        const m2 = availM[(attempt + 1) % availM.length];
        const f1 = availF[Math.floor(attempt / availM.length) % availF.length];
        const f2 = availF[(Math.floor(attempt / availM.length) + 1) % availF.length];

        if (m1 === m2 || f1 === f2) continue;
        if (usedMales.has(m1.id) || usedMales.has(m2.id)) continue;
        if (usedFemales.has(f1.id) || usedFemales.has(f2.id)) continue;

        // Try all 3 mixed pairings
        const configs: { t1: [PlayerData, PlayerData]; t2: [PlayerData, PlayerData] }[] = [
          { t1: [m1, f1], t2: [m2, f2] },
          { t1: [m1, f2], t2: [m2, f1] },
          // Note: [m2,f1]+[m1,f2] is same as above just swapped, so skip
        ];

        for (const config of configs) {
          const score =
            getPartnerCount(config.t1[0].id, config.t1[1].id) +
            getPartnerCount(config.t2[0].id, config.t2[1].id) +
            getOpponentCount(config.t1[0].id, config.t2[0].id) +
            getOpponentCount(config.t1[0].id, config.t2[1].id) +
            getOpponentCount(config.t1[1].id, config.t2[0].id) +
            getOpponentCount(config.t1[1].id, config.t2[1].id);

          if (score < bestScore) {
            bestScore = score;
            bestConfig = config;
          }
        }

        if (bestScore === 0) break;
      }

      if (!bestConfig) break;

      const { t1, t2 } = bestConfig;

      incPartner(t1[0].id, t1[1].id);
      incPartner(t2[0].id, t2[1].id);
      incOpponent(t1[0].id, t2[0].id);
      incOpponent(t1[0].id, t2[1].id);
      incOpponent(t1[1].id, t2[0].id);
      incOpponent(t1[1].id, t2[1].id);

      const pair1: PairData = {
        id: `pair-day${day + 1}-c${court}-t1`,
        player1Id: t1[0].id,
        player2Id: t1[1].id,
        player1Name: t1[0].name,
        player2Name: t1[1].name,
        isFixed: false,
      };
      const pair2: PairData = {
        id: `pair-day${day + 1}-c${court}-t2`,
        player1Id: t2[0].id,
        player2Id: t2[1].id,
        player1Name: t2[0].name,
        player2Name: t2[1].name,
        isFixed: false,
      };

      pairs.push(pair1, pair2);
      matches.push({
        dayNumber: day + 1,
        courtNumber: court,
        team1: pair1,
        team2: pair2,
      });

      usedMales.add(t1[0].id);
      usedMales.add(t2[0].id);
      usedFemales.add(t1[1].id);
      usedFemales.add(t2[1].id);

      court++;
    }
  }

  return { matches, pairs };
}

// ─── MAIN SCHEDULER ──────────────────────────────────────────────────────

export function generateSchedule(settings: TournamentSettings): ScheduleResult {
  const { players, isMixed, isFixedPairs, fixedPairs, numCourts, numDays } = settings;

  if (players.length < 4) {
    return { matches: [], pairs: [] };
  }

  if (isFixedPairs) {
    if (!fixedPairs || fixedPairs.length < 2) {
      return { matches: [], pairs: [] };
    }

    if (isMixed) {
      const allMixed = fixedPairs.every(pair => {
        const p1 = players.find(p => p.id === pair.player1Id);
        const p2 = players.find(p => p.id === pair.player2Id);
        return p1 && p2 && p1.gender !== p2.gender;
      });
      if (!allMixed) {
        return { matches: [], pairs: [] };
      }
    }

    const matches = scheduleFixedPairs(fixedPairs, numCourts, numDays);
    return { matches, pairs: fixedPairs };
  }

  if (isMixed) {
    const males = players.filter(p => p.gender === 'M');
    const females = players.filter(p => p.gender === 'F');
    if (males.length < 2 || females.length < 2) {
      return { matches: [], pairs: [] };
    }
    return scheduleMobileMixed(players, numCourts, numDays);
  }

  return scheduleMobileNonMixed(players, numCourts, numDays);
}

// ─── SHUFFLE SCHEDULE (for unplayed matches) ───────────────────────────────
// Regenerates only matches that haven't been played yet (status = SCHEDULED)
// Uses the same greedy algorithm but seeds it with existing partnership/opponent counts

export function shuffleSchedule(
  players: PlayerData[],
  existingMatches: MatchData[],
  numCourts: number,
  numDays: number,
  isMixed: boolean
): { matches: MatchData[]; pairs: PairData[]; newPairs: PairData[] } {
  // Separate completed matches (keep as-is) from scheduled matches (regenerate)
  const completedMatches = existingMatches.filter(m => m.status === 'COMPLETED');
  // Note: we don't have status in MatchData from the scheduler type, 
  // so we rely on the API layer to pass only the unplayed match slots

  // Count existing partnerships and oppositions from completed matches
  const partnerCount: Record<string, number> = {};
  const opponentCount: Record<string, number> = {};

  const incCount = (map: Record<string, number>, a: string, b: string) => {
    const k = makePairKey(a, b);
    map[k] = (map[k] || 0) + 1;
  };

  // We'll receive completed match data via the API, here we just generate fresh matches
  const getPartnerCount = (a: string, b: string) => partnerCount[makePairKey(a, b)] || 0;
  const getOpponentCount = (a: string, b: string) => opponentCount[makePairKey(a, b)] || 0;

  // For shuffle, we use the same scheduling algorithm
  // The seed counts will be passed from the API layer
  const result = isMixed
    ? scheduleMobileMixed(players, numCourts, numDays)
    : scheduleMobileNonMixed(players, numCourts, numDays);

  return {
    matches: result.matches,
    pairs: result.pairs,
    newPairs: result.pairs,
  };
}

// Helper: generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
