import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Calculate and return rankings
export async function GET() {
  try {
    const tournament = await db.tournament.findFirst({
      include: {
        players: true,
        pairs: true,
        matches: {
          include: {
            setResults: true,
            team1: true,
            team2: true,
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ exists: false });
    }

    const completedMatches = tournament.matches.filter(m => m.status === 'COMPLETED');

    if (tournament.isFixedPairs) {
      // Rankings by pair
      const pairRankings: Record<
        string,
        {
          id: string;
          name: string;
          wins: number;
          losses: number;
          draws: number;
          setsWon: number;
          setsLost: number;
          pointsWon: number;
          pointsLost: number;
        }
      > = {};

      // Initialize all pairs
      for (const pair of tournament.pairs) {
        pairRankings[pair.id] = {
          id: pair.id,
          name: `${pair.player1Name} & ${pair.player2Name}`,
          wins: 0,
          losses: 0,
          draws: 0,
          setsWon: 0,
          setsLost: 0,
          pointsWon: 0,
          pointsLost: 0,
        };
      }

      // Process completed matches
      for (const match of completedMatches) {
        const t1 = pairRankings[match.team1Id];
        const t2 = pairRankings[match.team2Id];

        if (!t1 || !t2) continue;

        let setsWon1 = 0;
        let setsWon2 = 0;
        let pointsWon1 = 0;
        let pointsWon2 = 0;

        for (const sr of match.setResults) {
          pointsWon1 += sr.team1Score;
          pointsWon2 += sr.team2Score;
          if (sr.team1Score > sr.team2Score) setsWon1++;
          else if (sr.team2Score > sr.team1Score) setsWon2++;
        }

        t1.setsWon += setsWon1;
        t1.setsLost += setsWon2;
        t1.pointsWon += pointsWon1;
        t1.pointsLost += pointsWon2;

        t2.setsWon += setsWon2;
        t2.setsLost += setsWon1;
        t2.pointsWon += pointsWon2;
        t2.pointsLost += pointsWon1;

        if (match.winnerId === match.team1Id) {
          t1.wins++;
          t2.losses++;
        } else if (match.winnerId === match.team2Id) {
          t2.wins++;
          t1.losses++;
        } else {
          t1.draws++;
          t2.draws++;
        }
      }

      // Sort by wins, then sets difference, then points difference
      const rankings = Object.values(pairRankings).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const setDiffA = a.setsWon - a.setsLost;
        const setDiffB = b.setsWon - b.setsLost;
        if (setDiffB !== setDiffA) return setDiffB - setDiffA;
        const pointDiffA = a.pointsWon - a.pointsLost;
        const pointDiffB = b.pointsWon - b.pointsLost;
        return pointDiffB - pointDiffA;
      });

      return NextResponse.json({
        exists: true,
        rankingType: 'PAIRS',
        rankings,
        scoringType: tournament.scoringType,
      });
    } else {
      // Rankings by individual player
      const playerRankings: Record<
        string,
        {
          id: string;
          name: string;
          gender: string;
          wins: number;
          losses: number;
          draws: number;
          setsWon: number;
          setsLost: number;
          pointsWon: number;
          pointsLost: number;
        }
      > = {};

      // Initialize all players
      for (const player of tournament.players) {
        playerRankings[player.id] = {
          id: player.id,
          name: player.name,
          gender: player.gender,
          wins: 0,
          losses: 0,
          draws: 0,
          setsWon: 0,
          setsLost: 0,
          pointsWon: 0,
          pointsLost: 0,
        };
      }

      // Process completed matches
      for (const match of completedMatches) {
        const team1 = tournament.pairs.find(p => p.id === match.team1Id);
        const team2 = tournament.pairs.find(p => p.id === match.team2Id);

        if (!team1 || !team2) continue;

        let setsWon1 = 0;
        let setsWon2 = 0;
        let pointsWon1 = 0;
        let pointsWon2 = 0;

        for (const sr of match.setResults) {
          pointsWon1 += sr.team1Score;
          pointsWon2 += sr.team2Score;
          if (sr.team1Score > sr.team2Score) setsWon1++;
          else if (sr.team2Score > sr.team1Score) setsWon2++;
        }

        const team1Won = match.winnerId === match.team1Id;
        const team2Won = match.winnerId === match.team2Id;
        const isDraw = !team1Won && !team2Won;

        // Update stats for team1 players
        const p1 = playerRankings[team1.player1Id];
        const p2 = playerRankings[team1.player2Id];
        if (p1) {
          p1.wins += team1Won ? 1 : 0;
          p1.losses += team2Won ? 1 : 0;
          p1.draws += isDraw ? 1 : 0;
          p1.setsWon += setsWon1;
          p1.setsLost += setsWon2;
          p1.pointsWon += pointsWon1;
          p1.pointsLost += pointsWon2;
        }
        if (p2) {
          p2.wins += team1Won ? 1 : 0;
          p2.losses += team2Won ? 1 : 0;
          p2.draws += isDraw ? 1 : 0;
          p2.setsWon += setsWon1;
          p2.setsLost += setsWon2;
          p2.pointsWon += pointsWon1;
          p2.pointsLost += pointsWon2;
        }

        // Update stats for team2 players
        const p3 = playerRankings[team2.player1Id];
        const p4 = playerRankings[team2.player2Id];
        if (p3) {
          p3.wins += team2Won ? 1 : 0;
          p3.losses += team1Won ? 1 : 0;
          p3.draws += isDraw ? 1 : 0;
          p3.setsWon += setsWon2;
          p3.setsLost += setsWon1;
          p3.pointsWon += pointsWon2;
          p3.pointsLost += pointsWon1;
        }
        if (p4) {
          p4.wins += team2Won ? 1 : 0;
          p4.losses += team1Won ? 1 : 0;
          p4.draws += isDraw ? 1 : 0;
          p4.setsWon += setsWon2;
          p4.setsLost += setsWon1;
          p4.pointsWon += pointsWon2;
          p4.pointsLost += pointsWon1;
        }
      }

      // Sort by wins, then sets difference, then points difference
      const rankings = Object.values(playerRankings).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const setDiffA = a.setsWon - a.setsLost;
        const setDiffB = b.setsWon - b.setsLost;
        if (setDiffB !== setDiffA) return setDiffB - setDiffA;
        const pointDiffA = a.pointsWon - a.pointsLost;
        const pointDiffB = b.pointsWon - b.pointsLost;
        return pointDiffB - pointDiffA;
      });

      return NextResponse.json({
        exists: true,
        rankingType: 'PLAYERS',
        rankings,
        scoringType: tournament.scoringType,
      });
    }
  } catch (error) {
    console.error('Error calculating rankings:', error);
    return NextResponse.json(
      { error: 'Errore nel calcolo della classifica' },
      { status: 500 }
    );
  }
}
