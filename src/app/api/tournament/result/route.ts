import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Submit match result
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, setResults, scoringType, scoringMode, maxPoints } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID richiesto' },
        { status: 400 }
      );
    }

    const match = await db.match.findUnique({
      where: { id: matchId },
      include: { tournament: true },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Partita non trovata' },
        { status: 404 }
      );
    }

    const effectiveMaxPoints = maxPoints || match.tournament.maxPoints;

    // Validate scores for POINTS mode
    if (scoringType === 'POINTS') {
      const total1 = setResults[0]?.team1Score || 0;
      const total2 = setResults[0]?.team2Score || 0;
      const sum = total1 + total2;

      // Rule: sum must equal maxPoints, OR sum = maxPoints + 1 with diff = 1 (tiebreak)
      const isExact = sum === effectiveMaxPoints;
      const isTiebreak = sum === effectiveMaxPoints + 1 && Math.abs(total1 - total2) === 1;

      if (!isExact && !isTiebreak) {
        return NextResponse.json(
          {
            error: `La somma dei punti deve essere ${effectiveMaxPoints} (oppure ${effectiveMaxPoints + 1} in caso di parità con +1 punto di differenza). Inserito: ${total1}+${total2}=${sum}`,
          },
          { status: 400 }
        );
      }

      // Must have a winner (scores cannot be equal)
      if (total1 === total2) {
        return NextResponse.json(
          { error: 'I punteggi non possono essere pari. Deve esserci un vincitore.' },
          { status: 400 }
        );
      }

      if (total1 < 0 || total2 < 0) {
        return NextResponse.json(
          { error: 'I punteggi non possono essere negativi.' },
          { status: 400 }
        );
      }
    }

    // Determine winner based on scoring type
    let winnerId: string | null = null;

    if (scoringType === 'POINTS') {
      const total1 = setResults[0]?.team1Score || 0;
      const total2 = setResults[0]?.team2Score || 0;
      winnerId = total1 > total2 ? match.team1Id : match.team2Id;
    } else {
      // Set-based: count sets won
      let setsWon1 = 0;
      let setsWon2 = 0;

      for (const sr of setResults) {
        if (sr.team1Score > sr.team2Score) setsWon1++;
        else if (sr.team2Score > sr.team1Score) setsWon2++;
      }

      winnerId = setsWon1 > setsWon2 ? match.team1Id : setsWon2 > setsWon1 ? match.team2Id : null;
    }

    // Delete existing set results
    await db.setResult.deleteMany({ where: { matchId } });

    // Create set results
    if (setResults && setResults.length > 0) {
      await Promise.all(
        setResults.map((sr: { setNumber: number; team1Score: number; team2Score: number }) =>
          db.setResult.create({
            data: {
              matchId,
              setNumber: sr.setNumber,
              team1Score: sr.team1Score,
              team2Score: sr.team2Score,
            },
          })
        )
      );
    }

    // Update match
    await db.match.update({
      where: { id: matchId },
      data: {
        status: 'COMPLETED',
        winnerId: winnerId || null,
      },
    });

    return NextResponse.json({
      success: true,
      winnerId,
      message: 'Risultato registrato!',
    });
  } catch (error) {
    console.error('Error submitting result:', error);
    return NextResponse.json(
      { error: 'Errore nel salvataggio del risultato' },
      { status: 500 }
    );
  }
}
