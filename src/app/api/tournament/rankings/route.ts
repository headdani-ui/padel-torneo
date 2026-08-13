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
    const isPointsMode = tournament.scoringType === 'POINTS';
    const winBonus = tournament.winBonus || 0;

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
          earnedPoints: number;
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
          earnedPoints: 0,
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

        t2.setsWon += setsWon2;
        t2.setsLost += setsWon1;

        const team1Won = match.winnerId === match.team1Id;
        const team2Won = match.winnerId === match.team2Id;
        const isDraw = !team1Won && !team2Won;

        if (isPointsMode) {
          // Points mode: earned = scored points + win bonus
          if (team1Won) {
            t1.earnedPoints += pointsWon1 + winBonus;
            t2.earnedPoints += pointsWon2;
          } else if (team2Won) {
            t2.earnedPoints += pointsWon2 + winBonus;
            t1.earnedPoints += pointsWon1;
          } else {
            t1.earnedPoints += pointsWon1;
            t2.earnedPoints += pointsWon2;
          }
        } else {
          // Sets mode: earned = wins (each win = points TBD, but for now track wins)
          t1.earnedPoints += pointsWon1;
          t2.earnedPoints += pointsWon2;
        }

        if (team1Won) {
          t1.wins++;
          t2.losses++;
        } else if (team2Won) {
          t2.wins++;
          t1.losses++;
        } else {
          t1.draws++;
          t2.draws++;
        }
      }

      // Sort: by earnedPoints desc, then by wins desc
      const rankings = Object.values(pairRankings).sort((a, b) => {
        if (b.earnedPoints !== a.earnedPoints) return b.earnedPoints - a.earnedPoints;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return 0;
      });

      return NextResponse.json({
        exists: true,
        rankingType: 'PAIRS',
        rankings,
        scoringType: tournament.scoringType,
        winBonus,
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
          earnedPoints: number;
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
          earnedPoints: 0,
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

        // Calculate points for each team member
        let team1Earned: number;
        let team2Earned: number;

        if (isPointsMode) {
          team1Earned = team1Won ? pointsWon1 + winBonus : pointsWon1;
          team2Earned = team2Won ? pointsWon2 + winBonus : pointsWon2;
        } else {
          team1Earned = pointsWon1;
          team2Earned = pointsWon2;
        }

        // Update team1 players
        const p1 = playerRankings[team1.player1Id];
        const p2 = playerRankings[team1.player2Id];
        if (p1) {
          p1.wins += team1Won ? 1 : 0;
          p1.losses += team2Won ? 1 : 0;
          p1.draws += isDraw ? 1 : 0;
          p1.setsWon += setsWon1;
          p1.setsLost += setsWon2;
          p1.earnedPoints += team1Earned;
        }
        if (p2) {
          p2.wins += team1Won ? 1 : 0;
          p2.losses += team2Won ? 1 : 0;
          p2.draws += isDraw ? 1 : 0;
          p2.setsWon += setsWon1;
          p2.setsLost += setsWon2;
          p2.earnedPoints += team1Earned;
        }

        // Update team2 players
        const p3 = playerRankings[team2.player1Id];
        const p4 = playerRankings[team2.player2Id];
        if (p3) {
          p3.wins += team2Won ? 1 : 0;
          p3.losses += team1Won ? 1 : 0;
          p3.draws += isDraw ? 1 : 0;
          p3.setsWon += setsWon2;
          p3.setsLost += setsWon1;
          p3.earnedPoints += team2Earned;
        }
        if (p4) {
          p4.wins += team2Won ? 1 : 0;
          p4.losses += team1Won ? 1 : 0;
          p4.draws += isDraw ? 1 : 0;
          p4.setsWon += setsWon2;
          p4.setsLost += setsWon1;
          p4.earnedPoints += team2Earned;
        }
      }

      // Sort: by earnedPoints desc, then by wins desc
      const rankings = Object.values(playerRankings).sort((a, b) => {
        if (b.earnedPoints !== a.earnedPoints) return b.earnedPoints - a.earnedPoints;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return 0;
      });

      return NextResponse.json({
        exists: true,
        rankingType: 'PLAYERS',
        rankings,
        scoringType: tournament.scoringType,
        winBonus,
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
