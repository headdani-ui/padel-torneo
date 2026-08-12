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

function makePairId(p1: string, p2: string): string {
  return [p1, p2].sort().join('-');
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

function scheduleMobileNonMixed(
  players: PlayerData[],
  numCourts: number,
  numDays: number
): { matches: MatchData[]; pairs: PairData[] } {
  const n = players.length;
  const matchesPerDay = Math.min(numCourts, Math.floor(n / 4));
  const matches: MatchData[] = [];
  const pairs: PairData[] = [];

  // Partnership tracking: minimize repeats
  const partnerCount: Record<string, number> = {};

  // Pairing patterns for groups of 4 [a, b, c, d]
  const patterns = [
    // Pattern 0: (a,b) vs (c,d)
    (g: PlayerData[]) => [[g[0], g[1]], [g[2], g[3]]],
    // Pattern 1: (a,c) vs (b,d)
    (g: PlayerData[]) => [[g[0], g[2]], [g[1], g[3]]],
    // Pattern 2: (a,d) vs (b,c)
    (g: PlayerData[]) => [[g[0], g[3]], [g[1], g[2]]],
  ];

  for (let day = 0; day < numDays; day++) {
    const usedPlayers = new Set<string>();

    // Rotate player order each day
    const ordered = [...players];
    const shift = day % n;
    const shifted = [...ordered.slice(shift), ...ordered.slice(0, shift)];

    const patternIdx = day % 3;
    const pattern = patterns[patternIdx];

    let court = 1;
    for (let i = 0; i + 3 < shifted.length && court <= matchesPerDay; i += 4) {
      const group = shifted.slice(i, i + 4);

      // Skip if any player already used today
      if (group.some(p => usedPlayers.has(p.id))) continue;

      const [team1, team2] = pattern(group);

      // Create pair records
      const pair1: PairData = {
        id: `pair-day${day + 1}-c${court}-t1`,
        player1Id: team1[0].id,
        player2Id: team1[1].id,
        player1Name: team1[0].name,
        player2Name: team1[1].name,
        isFixed: false,
      };
      const pair2: PairData = {
        id: `pair-day${day + 1}-c${court}-t2`,
        player1Id: team2[0].id,
        player2Id: team2[1].id,
        player1Name: team2[0].name,
        player2Name: team2[1].name,
        isFixed: false,
      };

      pairs.push(pair1, pair2);
      matches.push({
        dayNumber: day + 1,
        courtNumber: court,
        team1: pair1,
        team2: pair2,
      });

      group.forEach(p => usedPlayers.add(p.id));
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

  const mFPartnerCount: Record<string, number> = {};

  for (let day = 0; day < numDays; day++) {
    const usedMales = new Set<string>();
    const usedFemales = new Set<string>();

    // Rotate orders
    const shiftM = day % males.length;
    const shiftF = day % females.length;
    const shiftedM = [...males.slice(shiftM), ...males.slice(0, shiftM)];
    const shiftedF = [...females.slice(shiftF), ...females.slice(0, shiftF)];

    // Pairing pattern changes each day
    const patternType = day % 3;

    let court = 1;
    for (let i = 0; i + 1 < shiftedM.length && i + 1 < shiftedF.length && court <= matchesPerDay; i += 2) {
      const m1 = shiftedM[i];
      const m2 = shiftedM[i + 1];
      const f1 = shiftedF[i];
      const f2 = shiftedF[i + 1];

      if (usedMales.has(m1.id) || usedMales.has(m2.id) || usedFemales.has(f1.id) || usedFemales.has(f2.id)) continue;

      let team1: [PlayerData, PlayerData];
      let team2: [PlayerData, PlayerData];

      if (patternType === 0) {
        team1 = [m1, f1];
        team2 = [m2, f2];
      } else if (patternType === 1) {
        team1 = [m1, f2];
        team2 = [m2, f1];
      } else {
        team1 = [m2, f1];
        team2 = [m1, f2];
      }

      const pair1: PairData = {
        id: `pair-day${day + 1}-c${court}-t1`,
        player1Id: team1[0].id,
        player2Id: team1[1].id,
        player1Name: team1[0].name,
        player2Name: team1[1].name,
        isFixed: false,
      };
      const pair2: PairData = {
        id: `pair-day${day + 1}-c${court}-t2`,
        player1Id: team2[0].id,
        player2Id: team2[1].id,
        player1Name: team2[0].name,
        player2Name: team2[1].name,
        isFixed: false,
      };

      pairs.push(pair1, pair2);
      matches.push({
        dayNumber: day + 1,
        courtNumber: court,
        team1: pair1,
        team2: pair2,
      });

      usedMales.add(m1.id);
      usedMales.add(m2.id);
      usedFemales.add(f1.id);
      usedFemales.add(f2.id);

      court++;
    }
  }

  return { matches, pairs };
}

// ─── MAIN SCHEDULER ──────────────────────────────────────────────────────

export function generateSchedule(settings: TournamentSettings): ScheduleResult {
  const { players, isMixed, isFixedPairs, fixedPairs, numCourts, numDays } = settings;

  // Validate
  if (players.length < 4) {
    return { matches: [], pairs: [] };
  }

  if (isFixedPairs) {
    if (!fixedPairs || fixedPairs.length < 2) {
      return { matches: [], pairs: [] };
    }

    if (isMixed) {
      // Validate all fixed pairs are M+F
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

  // Mobile pairs
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

// Helper: generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
