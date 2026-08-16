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
  status?: string;
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

// Seed counts from pre-existing (completed) matches - used by shuffle
export interface SeedCounts {
  partnerCount: Record<string, number>;
  opponentCount: Record<string, number>;
  playCount: Record<string, number>;
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

// ─── TRACKERS ──────────────────────────────────────────────────────────────

interface Trackers {
  partnerCount: Record<string, number>;
  opponentCount: Record<string, number>;
  playCount: Record<string, number>;
}

function createTrackers(seed?: SeedCounts): Trackers {
  return {
    partnerCount: { ...(seed?.partnerCount || {}) },
    opponentCount: { ...(seed?.opponentCount || {}) },
    playCount: { ...(seed?.playCount || {}) },
  };
}

const getPC = (t: Trackers, a: string, b: string) => t.partnerCount[makePairKey(a, b)] || 0;
const getOC = (t: Trackers, a: string, b: string) => t.opponentCount[makePairKey(a, b)] || 0;
const getPlay = (t: Trackers, a: string) => t.playCount[a] || 0;

const incPC = (t: Trackers, a: string, b: string) => {
  const k = makePairKey(a, b);
  t.partnerCount[k] = (t.partnerCount[k] || 0) + 1;
};
const incOC = (t: Trackers, a: string, b: string) => {
  const k = makePairKey(a, b);
  t.opponentCount[k] = (t.opponentCount[k] || 0) + 1;
};
const incPlay = (t: Trackers, a: string) => {
  t.playCount[a] = (t.playCount[a] || 0) + 1;
};

// Record a match in the trackers
function recordMatch(t: Trackers, t1: [PlayerData, PlayerData], t2: [PlayerData, PlayerData]) {
  incPC(t, t1[0].id, t1[1].id);
  incPC(t, t2[0].id, t2[1].id);
  incOC(t, t1[0].id, t2[0].id);
  incOC(t, t1[0].id, t2[1].id);
  incOC(t, t1[1].id, t2[0].id);
  incOC(t, t1[1].id, t2[1].id);
  for (const p of [t1[0], t1[1], t2[0], t2[1]]) {
    incPlay(t, p.id);
  }
}

// ─── SCORE A SINGLE MATCH CONFIG ──────────────────────────────────────────
// Lower is better. Weights: opponent diversity > partner diversity > playtime balance

function scoreConfig(
  t: Trackers,
  config: { t1: [PlayerData, PlayerData]; t2: [PlayerData, PlayerData] },
  allPlayerIds: string[],
  avgPlayCount: number
): number {
  const { t1, t2 } = config;

  // Partner repeats (want to minimize - weight 3)
  const partnerScore =
    (getPC(t, t1[0].id, t1[1].id) + 1) * (getPC(t, t1[0].id, t1[1].id) + 1) +
    (getPC(t, t2[0].id, t2[1].id) + 1) * (getPC(t, t2[0].id, t2[1].id) + 1);

  // Opponent repeats (want to minimize even more - weight 5, squared for emphasis)
  const opponentScore =
    (getOC(t, t1[0].id, t2[0].id) + 1) * (getOC(t, t1[0].id, t2[0].id) + 1) +
    (getOC(t, t1[0].id, t2[1].id) + 1) * (getOC(t, t1[0].id, t2[1].id) + 1) +
    (getOC(t, t1[1].id, t2[0].id) + 1) * (getOC(t, t1[1].id, t2[0].id) + 1) +
    (getOC(t, t1[1].id, t2[1].id) + 1) * (getOC(t, t1[1].id, t2[1].id) + 1);

  // Playtime balance: prefer players who've played less (weight 2)
  let playBalance = 0;
  for (const p of [t1[0], t1[1], t2[0], t2[1]]) {
    const diff = getPlay(t, p.id) - avgPlayCount;
    playBalance += diff > 0 ? diff * diff : 0;
  }

  return partnerScore * 3 + opponentScore * 5 + playBalance * 2;
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

  // Shuffle rounds for variety
  const shuffledRounds = shuffle(allRounds);

  // Flatten rounds into days with court assignments
  const matches: MatchData[] = [];
  let matchIndex = 0;

  for (let day = 1; day <= numDays; day++) {
    for (let court = 1; court <= numCourts; court++) {
      if (matchIndex >= shuffledRounds.length * (shuffledRounds[0]?.length || 0)) break;

      const roundIdx = Math.floor(matchIndex / (shuffledRounds[0]?.length || 1));
      const matchInRound = matchIndex % (shuffledRounds[0]?.length || 1);

      if (roundIdx < shuffledRounds.length && matchInRound < shuffledRounds[roundIdx].length) {
        const [t1, t2] = shuffledRounds[roundIdx][matchInRound];
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
// Exhaustive combinatorial search + multi-run optimization

function scheduleMobileNonMixed(
  players: PlayerData[],
  numCourts: number,
  numDays: number,
  seed?: SeedCounts
): { matches: MatchData[]; pairs: PairData[] } {
  const n = players.length;
  const matchesPerDay = Math.min(numCourts, Math.floor(n / 4));
  if (matchesPerDay < 1) return { matches: [], pairs: [] };

  // Run multiple times and pick the best schedule
  const NUM_RUNS = 5;
  let bestSchedule: { matches: MatchData[]; pairs: PairData[] } | null = null;
  let bestOverallScore = Infinity;

  for (let run = 0; run < NUM_RUNS; run++) {
    const { matches, pairs, trackers } = runGreedyNonMixed(players, numCourts, numDays, matchesPerDay, seed);

    // Score the overall schedule quality
    const overallScore = scoreOverallSchedule(matches, players, n);

    if (overallScore < bestOverallScore) {
      bestOverallScore = overallScore;
      bestSchedule = { matches, pairs };
    }
  }

  return bestSchedule || { matches: [], pairs: [] };
}

function runGreedyNonMixed(
  players: PlayerData[],
  numCourts: number,
  numDays: number,
  matchesPerDay: number,
  seed?: SeedCounts
): { matches: MatchData[]; pairs: PairData[]; trackers: Trackers } {
  const n = players.length;
  const t = createTrackers(seed);
  const matches: MatchData[] = [];
  const pairs: PairData[] = [];

  for (let day = 0; day < numDays; day++) {
    const usedPlayers = new Set<string>();

    let court = 1;
    while (court <= matchesPerDay) {
      const pool = players.filter(p => !usedPlayers.has(p.id));
      if (pool.length < 4) break;

      // Calculate average play count for balance scoring
      const totalPlay = pool.reduce((sum, p) => sum + getPlay(t, p.id), 0);
      const avgPlayCount = totalPlay / pool.length;

      // Exhaustive search: try ALL combinations of 4 from pool
      let bestScore = Infinity;
      let bestConfig: { t1: [PlayerData, PlayerData]; t2: [PlayerData, PlayerData] } | null = null;

      // For pools up to 12, exhaustive search is feasible. Beyond that, sample.
      if (pool.length <= 12) {
        for (let i = 0; i < pool.length; i++) {
          for (let j = i + 1; j < pool.length; j++) {
            for (let k = j + 1; k < pool.length; k++) {
              for (let l = k + 1; l < pool.length; l++) {
                const quad = [pool[i], pool[j], pool[k], pool[l]];

                // Try all 3 pairings
                const configs: { t1: [PlayerData, PlayerData]; t2: [PlayerData, PlayerData] }[] = [
                  { t1: [quad[0], quad[1]], t2: [quad[2], quad[3]] },
                  { t1: [quad[0], quad[2]], t2: [quad[1], quad[3]] },
                  { t1: [quad[0], quad[3]], t2: [quad[1], quad[2]] },
                ];

                for (const config of configs) {
                  const score = scoreConfig(t, config, players.map(p => p.id), avgPlayCount);
                  if (score < bestScore) {
                    bestScore = score;
                    bestConfig = config;
                  }
                }
              }
            }
          }
        }
      } else {
        // Fallback: random sampling for very large pools
        for (let attempt = 0; attempt < 200; attempt++) {
          const sample = shuffle(pool).slice(0, 4);
          const configs: { t1: [PlayerData, PlayerData]; t2: [PlayerData, PlayerData] }[] = [
            { t1: [sample[0], sample[1]], t2: [sample[2], sample[3]] },
            { t1: [sample[0], sample[2]], t2: [sample[1], sample[3]] },
            { t1: [sample[0], sample[3]], t2: [sample[1], sample[2]] },
          ];
          for (const config of configs) {
            const score = scoreConfig(t, config, players.map(p => p.id), avgPlayCount);
            if (score < bestScore) {
              bestScore = score;
              bestConfig = config;
            }
          }
        }
      }

      if (!bestConfig) break;

      const { t1, t2 } = bestConfig;
      recordMatch(t, t1, t2);

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

      for (const p of [t1[0], t1[1], t2[0], t2[1]]) {
        usedPlayers.add(p.id);
      }

      court++;
    }
  }

  return { matches, pairs, trackers: t };
}

// ─── MOBILE PAIRS SCHEDULING (MIXED) ─────────────────────────────────────

function scheduleMobileMixed(
  players: PlayerData[],
  numCourts: number,
  numDays: number,
  seed?: SeedCounts
): { matches: MatchData[]; pairs: PairData[] } {
  const males = players.filter(p => p.gender === 'M');
  const females = players.filter(p => p.gender === 'F');

  const matchesPerDay = Math.min(numCourts, Math.min(males.length, females.length) / 2 | 0);
  if (matchesPerDay < 1) return { matches: [], pairs: [] };

  // Multi-run for mixed too
  const NUM_RUNS = 5;
  let bestSchedule: { matches: MatchData[]; pairs: PairData[] } | null = null;
  let bestOverallScore = Infinity;

  for (let run = 0; run < NUM_RUNS; run++) {
    const { matches, pairs } = runGreedyMixed(males, females, numCourts, numDays, matchesPerDay, players, seed);

    const overallScore = scoreOverallSchedule(matches, players, players.length);

    if (overallScore < bestOverallScore) {
      bestOverallScore = overallScore;
      bestSchedule = { matches, pairs };
    }
  }

  return bestSchedule || { matches: [], pairs: [] };
}

function runGreedyMixed(
  males: PlayerData[],
  females: PlayerData[],
  numCourts: number,
  numDays: number,
  matchesPerDay: number,
  allPlayers: PlayerData[],
  seed?: SeedCounts
): { matches: MatchData[]; pairs: PairData[] } {
  const t = createTrackers(seed);
  const matches: MatchData[] = [];
  const pairs: PairData[] = [];

  for (let day = 0; day < numDays; day++) {
    const usedMales = new Set<string>();
    const usedFemales = new Set<string>();

    let court = 1;
    while (court <= matchesPerDay) {
      const availM = males.filter(p => !usedMales.has(p.id));
      const availF = females.filter(p => !usedFemales.has(p.id));
      if (availM.length < 2 || availF.length < 2) break;

      // Calculate average play count
      const totalPlay = [...availM, ...availF].reduce((sum, p) => sum + getPlay(t, p.id), 0);
      const avgPlayCount = totalPlay / (availM.length + availF.length);

      // Exhaustive search: try all combinations of 2M + 2F
      let bestScore = Infinity;
      let bestConfig: { t1: [PlayerData, PlayerData]; t2: [PlayerData, PlayerData] } | null = null;

      const mCombs: [number, number][] = [];
      for (let i = 0; i < availM.length; i++) {
        for (let j = i + 1; j < availM.length; j++) {
          mCombs.push([i, j]);
        }
      }

      const fCombs: [number, number][] = [];
      for (let i = 0; i < availF.length; i++) {
        for (let j = i + 1; j < availF.length; j++) {
          fCombs.push([i, j]);
        }
      }

      // If combinatorial explosion, use sampling
      const maxCombs = mCombs.length * fCombs.length;
      if (maxCombs <= 500) {
        for (const [mi1, mi2] of mCombs) {
          for (const [fi1, fi2] of fCombs) {
            const m1 = availM[mi1], m2 = availM[mi2];
            const f1 = availF[fi1], f2 = availF[fi2];

            // Try 2 mixed pairings (swap females)
            const configs: { t1: [PlayerData, PlayerData]; t2: [PlayerData, PlayerData] }[] = [
              { t1: [m1, f1], t2: [m2, f2] },
              { t1: [m1, f2], t2: [m2, f1] },
            ];

            for (const config of configs) {
              const score = scoreConfig(t, config, allPlayers.map(p => p.id), avgPlayCount);
              if (score < bestScore) {
                bestScore = score;
                bestConfig = config;
              }
            }
          }
        }
      } else {
        // Sampling fallback
        for (let attempt = 0; attempt < 200; attempt++) {
          const shuffledM = shuffle(availM);
          const shuffledF = shuffle(availF);
          const m1 = shuffledM[0], m2 = shuffledM[1];
          const f1 = shuffledF[0], f2 = shuffledF[1];

          const configs: { t1: [PlayerData, PlayerData]; t2: [PlayerData, PlayerData] }[] = [
            { t1: [m1, f1], t2: [m2, f2] },
            { t1: [m1, f2], t2: [m2, f1] },
          ];
          for (const config of configs) {
            const score = scoreConfig(t, config, allPlayers.map(p => p.id), avgPlayCount);
            if (score < bestScore) {
              bestScore = score;
              bestConfig = config;
            }
          }
        }
      }

      if (!bestConfig) break;

      const { t1, t2 } = bestConfig;
      recordMatch(t, t1, t2);

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

// ─── OVERALL SCHEDULE SCORING ──────────────────────────────────────────────
// Lower is better. Evaluates diversity across the entire schedule.

function scoreOverallSchedule(matches: MatchData[], players: PlayerData[], n: number): number {
  const partnerCount: Record<string, number> = {};
  const opponentCount: Record<string, number> = {};
  const playCount: Record<string, number> = {};

  for (const m of matches) {
    const p1a = m.team1.player1Id, p1b = m.team1.player2Id;
    const p2a = m.team2.player1Id, p2b = m.team2.player2Id;

    // Partner counts
    const pk1 = makePairKey(p1a, p1b);
    partnerCount[pk1] = (partnerCount[pk1] || 0) + 1;
    const pk2 = makePairKey(p2a, p2b);
    partnerCount[pk2] = (partnerCount[pk2] || 0) + 1;

    // Opponent counts (cross-team pairs)
    for (const a of [p1a, p1b]) {
      for (const b of [p2a, p2b]) {
        const ok = makePairKey(a, b);
        opponentCount[ok] = (opponentCount[ok] || 0) + 1;
      }
    }

    // Play counts
    for (const pid of [p1a, p1b, p2a, p2b]) {
      playCount[pid] = (playCount[pid] || 0) + 1;
    }
  }

  // Score 1: Partner diversity — penalize uneven distribution (want all partnerships ~equal)
  const partnerValues = Object.values(partnerCount);
  const avgPartner = partnerValues.length > 0 ? partnerValues.reduce((a, b) => a + b, 0) / partnerValues.length : 0;
  const partnerVariance = partnerValues.reduce((sum, v) => sum + (v - avgPartner) * (v - avgPartner), 0);

  // Score 2: Opponent diversity — penalize uneven distribution
  const opponentValues = Object.values(opponentCount);
  const avgOpponent = opponentValues.length > 0 ? opponentValues.reduce((a, b) => a + b, 0) / opponentValues.length : 0;
  const opponentVariance = opponentValues.reduce((sum, v) => sum + (v - avgOpponent) * (v - avgOpponent), 0);

  // Score 3: Unique opponents per player (higher is better → negative penalty)
  const uniqueOpponents: Record<string, Set<string>> = {};
  for (const pid of players.map(p => p.id)) {
    uniqueOpponents[pid] = new Set();
  }
  for (const [key, count] of Object.entries(opponentCount)) {
    const [a, b] = key.split('-');
    if (uniqueOpponents[a]) uniqueOpponents[a].add(b);
    if (uniqueOpponents[b]) uniqueOpponents[b].add(a);
  }
  const minUniqueOpponents = Math.min(...players.map(p => uniqueOpponents[p.id].size));

  // Score 4: Unique partners per player
  const uniquePartners: Record<string, Set<string>> = {};
  for (const pid of players.map(p => p.id)) {
    uniquePartners[pid] = new Set();
  }
  for (const [key] of Object.entries(partnerCount)) {
    const [a, b] = key.split('-');
    if (uniquePartners[a]) uniquePartners[a].add(b);
    if (uniquePartners[b]) uniquePartners[b].add(a);
  }
  const minUniquePartners = Math.min(...players.map(p => uniquePartners[p.id].size));

  // Score 5: Playtime balance
  const avgPlay = Object.values(playCount).reduce((a, b) => a + b, 0) / n;
  const playVariance = Object.values(playCount).reduce((sum, v) => sum + (v - avgPlay) * (v - avgPlay), 0);

  // Lower is better. We reward diversity (negative) and penalize variance (positive)
  return (
    partnerVariance * 10 +
    opponentVariance * 15 +
    playVariance * 5 +
    -minUniqueOpponents * 20 +
    -minUniquePartners * 15
  );
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

// ─── SHUFFLE SCHEDULE (history-aware) ──────────────────────────────────────
// Accepts seed counts from completed matches to ensure continuity

export function generateShuffledSchedule(
  players: PlayerData[],
  isMixed: boolean,
  numCourts: number,
  numDays: number,
  daysToGenerate: number[],
  seed: SeedCounts
): ScheduleResult {
  if (players.length < 4) {
    return { matches: [], pairs: [] };
  }

  let result: { matches: MatchData[]; pairs: PairData[] };

  if (isMixed) {
    const males = players.filter(p => p.gender === 'M');
    const females = players.filter(p => p.gender === 'F');
    if (males.length < 2 || females.length < 2) {
      return { matches: [], pairs: [] };
    }

    // Multi-run with seed
    const NUM_RUNS = 5;
    let bestSchedule: { matches: MatchData[]; pairs: PairData[] } | null = null;
    let bestOverallScore = Infinity;

    for (let run = 0; run < NUM_RUNS; run++) {
      const matchesPerDay = Math.min(numCourts, Math.min(males.length, females.length) / 2 | 0);
      const { matches, pairs } = runGreedyMixed(males, females, numCourts, numDays, matchesPerDay, players, seed);
      // Filter to only the days we need
      const filtered = matches.filter(m => daysToGenerate.includes(m.dayNumber));
      const filteredPairs = new Set<string>();
      for (const m of filtered) {
        filteredPairs.add(m.team1.id);
        filteredPairs.add(m.team2.id);
      }
      const filteredResult = {
        matches: filtered,
        pairs: pairs.filter(p => filteredPairs.has(p.id)),
      };

      const overallScore = scoreOverallSchedule(
        filtered,
        players,
        players.length
      );

      if (overallScore < bestOverallScore) {
        bestOverallScore = overallScore;
        bestSchedule = filteredResult;
      }
    }

    result = bestSchedule || { matches: [], pairs: [] };
  } else {
    // Multi-run with seed for non-mixed
    const NUM_RUNS = 5;
    let bestSchedule: { matches: MatchData[]; pairs: PairData[] } | null = null;
    let bestOverallScore = Infinity;

    for (let run = 0; run < NUM_RUNS; run++) {
      const n = players.length;
      const matchesPerDay = Math.min(numCourts, Math.floor(n / 4));
      const { matches, pairs } = runGreedyNonMixed(players, numCourts, numDays, matchesPerDay, seed);

      const filtered = matches.filter(m => daysToGenerate.includes(m.dayNumber));
      const filteredPairs = new Set<string>();
      for (const m of filtered) {
        filteredPairs.add(m.team1.id);
        filteredPairs.add(m.team2.id);
      }
      const filteredResult = {
        matches: filtered,
        pairs: pairs.filter(p => filteredPairs.has(p.id)),
      };

      const overallScore = scoreOverallSchedule(
        filtered,
        players,
        n
      );

      if (overallScore < bestOverallScore) {
        bestOverallScore = overallScore;
        bestSchedule = filteredResult;
      }
    }

    result = bestSchedule || { matches: [], pairs: [] };
  }

  return result;
}

// ─── BUILD SEED COUNTS FROM COMPLETED MATCHES ────────────────────────────

export function buildSeedCounts(
  completedMatches: { team1Id: string; team2Id: string; team1: { player1Id: string; player2Id: string }; team2: { player1Id: string; player2Id: string } }[],
  allPairs: { id: string; player1Id: string; player2Id: string }[]
): SeedCounts {
  const partnerCount: Record<string, number> = {};
  const opponentCount: Record<string, number> = {};
  const playCount: Record<string, number> = {};

  const pairMap = new Map(allPairs.map(p => [p.id, p]));

  for (const m of completedMatches) {
    const t1 = pairMap.get(m.team1Id);
    const t2 = pairMap.get(m.team2Id);
    if (!t1 || !t2) continue;

    // Partners
    const pk1 = makePairKey(t1.player1Id, t1.player2Id);
    partnerCount[pk1] = (partnerCount[pk1] || 0) + 1;
    const pk2 = makePairKey(t2.player1Id, t2.player2Id);
    partnerCount[pk2] = (partnerCount[pk2] || 0) + 1;

    // Opponents
    for (const a of [t1.player1Id, t1.player2Id]) {
      for (const b of [t2.player1Id, t2.player2Id]) {
        const ok = makePairKey(a, b);
        opponentCount[ok] = (opponentCount[ok] || 0) + 1;
      }
    }

    // Play counts
    for (const pid of [t1.player1Id, t1.player2Id, t2.player1Id, t2.player2Id]) {
      playCount[pid] = (playCount[pid] || 0) + 1;
    }
  }

  return { partnerCount, opponentCount, playCount };
}

// Helper: generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
