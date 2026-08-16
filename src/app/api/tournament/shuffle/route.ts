import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateShuffledSchedule, generateId, buildSeedCounts } from '@/lib/scheduler';

// POST: Shuffle only unplayed matches (status = SCHEDULED)
export async function POST() {
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
          orderBy: [{ dayNumber: 'asc' }, { courtNumber: 'asc' }],
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Nessun torneo trovato' }, { status: 404 });
    }

    const completedMatches = tournament.matches.filter(m => m.status === 'COMPLETED');
    const scheduledMatches = tournament.matches.filter(m => m.status === 'SCHEDULED');

    if (scheduledMatches.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nessuna partita da mescolare (tutte già giocate)',
      });
    }

    const daysNeedingReschedule = [...new Set(scheduledMatches.map(m => m.dayNumber))].sort((a, b) => a - b);

    const playerData = tournament.players.map(p => ({
      id: p.id,
      name: p.name,
      gender: p.gender as 'M' | 'F',
    }));

    // Build seed counts from completed matches
    const seedCounts = buildSeedCounts(
      completedMatches.map(m => ({
        team1Id: m.team1Id,
        team2Id: m.team2Id,
        team1: { player1Id: m.team1.player1Id, player2Id: m.team1.player2Id },
        team2: { player1Id: m.team2.player1Id, player2Id: m.team2.player2Id },
      })),
      tournament.pairs.map(p => ({
        id: p.id,
        player1Id: p.player1Id,
        player2Id: p.player2Id,
      }))
    );

    // Delete old scheduled matches and pairs in parallel
    const scheduledMatchIds = scheduledMatches.map(m => m.id);
    const scheduledPairIds = new Set<string>();
    for (const m of scheduledMatches) {
      scheduledPairIds.add(m.team1Id);
      scheduledPairIds.add(m.team2Id);
    }
    const completedPairIds = new Set<string>();
    for (const m of completedMatches) {
      completedPairIds.add(m.team1Id);
      completedPairIds.add(m.team2Id);
    }
    const pairsToDelete = [...scheduledPairIds].filter(id => !completedPairIds.has(id));

    await Promise.all([
      db.match.deleteMany({ where: { id: { in: scheduledMatchIds } } }),
      pairsToDelete.length > 0
        ? db.pair.deleteMany({ where: { id: { in: pairsToDelete } } })
        : Promise.resolve(),
    ]);

    // Generate new schedule seeded with completed match history
    const newSchedule = generateShuffledSchedule(
      playerData,
      tournament.isMixed,
      tournament.numCourts,
      tournament.numDays,
      daysNeedingReschedule,
      seedCounts
    );

    // Build pair lookups and creates in batch (not sequential!)
    const existingPairs = await db.pair.findMany({
      where: { tournamentId: tournament.id },
    });

    // Create a lookup: "player1Id-player2Id" -> pair id
    const pairLookup = new Map<string, string>();
    for (const p of existingPairs) {
      const key = [p.player1Id, p.player2Id].sort().join('|');
      pairLookup.set(key, p.id);
    }

    // Collect all new pairs to create
    const newPairsToCreate: { id: string; player1Id: string; player2Id: string; player1Name: string; player2Name: string }[] = [];
    const newPairMap: Record<string, string> = {};

    for (const m of newSchedule.matches) {
      for (const team of [m.team1, m.team2]) {
        if (!newPairMap[team.id]) {
          const key = [team.player1Id, team.player2Id].sort().join('|');
          const existingId = pairLookup.get(key);
          if (existingId) {
            newPairMap[team.id] = existingId;
          } else {
            const newId = generateId();
            newPairsToCreate.push({
              id: newId,
              player1Id: team.player1Id,
              player2Id: team.player2Id,
              player1Name: team.player1Name,
              player2Name: team.player2Name,
            });
            newPairMap[team.id] = newId;
          }
        }
      }
    }

    // Create all new pairs in parallel
    if (newPairsToCreate.length > 0) {
      await Promise.all(
        newPairsToCreate.map(p =>
          db.pair.create({
            data: {
              id: p.id,
              player1Id: p.player1Id,
              player2Id: p.player2Id,
              player1Name: p.player1Name,
              player2Name: p.player2Name,
              tournamentId: tournament.id,
              isFixed: false,
            },
          })
        )
      );
    }

    // Create all new matches in parallel
    await Promise.all(
      newSchedule.matches.map(m =>
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
      message: `Calendario mescolato! ${newSchedule.matches.length} partite rigenerate, ${completedMatches.length} completate mantenute.`,
      shuffledCount: newSchedule.matches.length,
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
