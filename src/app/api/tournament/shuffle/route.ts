import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSchedule, generateId } from '@/lib/scheduler';

// POST: Shuffle only unplayed matches (status = SCHEDULED)
export async function POST() {
  try {
    const tournament = await db.tournament.findFirst({
      include: {
        players: true,
        pairs: true,
        matches: {
          include: { setResults: true },
          orderBy: [{ dayNumber: 'asc' }, { courtNumber: 'asc' }],
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Nessun torneo trovato' }, { status: 404 });
    }

    // Separate completed from scheduled matches
    const completedMatches = tournament.matches.filter(m => m.status === 'COMPLETED');
    const scheduledMatches = tournament.matches.filter(m => m.status === 'SCHEDULED');

    if (scheduledMatches.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nessuna partita da mescolare (tutte già giocate)',
      });
    }

    // Get the days that need rescheduling
    const daysNeedingReschedule = [...new Set(scheduledMatches.map(m => m.dayNumber))].sort((a, b) => a - b);

    // Get player data
    const playerData = tournament.players.map(p => ({
      id: p.id,
      name: p.name,
      gender: p.gender as 'M' | 'F',
    }));

    // Delete old scheduled matches
    const scheduledMatchIds = scheduledMatches.map(m => m.id);
    const scheduledPairIds = new Set<string>();
    for (const m of scheduledMatches) {
      scheduledPairIds.add(m.team1Id);
      scheduledPairIds.add(m.team2Id);
    }

    // Pairs also used in completed matches must NOT be deleted
    const completedPairIds = new Set<string>();
    for (const m of completedMatches) {
      completedPairIds.add(m.team1Id);
      completedPairIds.add(m.team2Id);
    }
    const pairsToDelete = [...scheduledPairIds].filter(id => !completedPairIds.has(id));

    await db.match.deleteMany({ where: { id: { in: scheduledMatchIds } } });
    if (pairsToDelete.length > 0) {
      await db.pair.deleteMany({ where: { id: { in: pairsToDelete } } });
    }

    // Generate a completely new schedule, then filter to only the days we need
    const newSchedule = generateSchedule({
      players: playerData,
      isMixed: tournament.isMixed,
      isFixedPairs: tournament.isFixedPairs,
      fixedPairs: tournament.isFixedPairs
        ? tournament.pairs.filter(p => p.isFixed).map(p => ({
            id: p.id,
            player1Id: p.player1Id,
            player2Id: p.player2Id,
            player1Name: p.player1Name,
            player2Name: p.player2Name,
            isFixed: true,
          }))
        : undefined,
      numCourts: tournament.numCourts,
      numDays: tournament.numDays,
    });

    // Only keep matches for the days that were scheduled
    const newMatchesForDays = newSchedule.matches.filter(m =>
      daysNeedingReschedule.includes(m.dayNumber)
    );

    // Create new pairs in DB (dedup by player1Id+player2Id)
    const newPairMap: Record<string, string> = {};
    for (const m of newMatchesForDays) {
      for (const team of [m.team1, m.team2]) {
        if (!newPairMap[team.id]) {
          const existing = await db.pair.findFirst({
            where: {
              player1Id: team.player1Id,
              player2Id: team.player2Id,
            },
          });
          if (existing) {
            newPairMap[team.id] = existing.id;
          } else {
            const created = await db.pair.create({
              data: {
                id: generateId(),
                player1Id: team.player1Id,
                player2Id: team.player2Id,
                player1Name: team.player1Name,
                player2Name: team.player2Name,
                tournamentId: tournament.id,
                isFixed: false,
              },
            });
            newPairMap[team.id] = created.id;
          }
        }
      }
    }

    // Create new matches in DB
    await Promise.all(
      newMatchesForDays.map(m =>
        db.match.create({
          data: {
            id: generateId(),
            tournamentId: tournament.id,
            dayNumber: m.dayNumber,
            courtNumber: m.courtNumber,
            team1Id: newPairMap[m.team1.id],
            team2Id: newPairMap[m.team2.id],
            status: 'SCHEDULED',
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Calendario mescolato! ${scheduledMatches.length} partite rigenerate, ${completedMatches.length} completate mantenute.`,
      shuffledCount: newMatchesForDays.length,
      keptCount: completedMatches.length,
    });
  } catch (error) {
    console.error('Error shuffling schedule:', error);
    return NextResponse.json(
      { error: 'Errore nel mescolamento del calendario' },
      { status: 500 }
    );
  }
}
