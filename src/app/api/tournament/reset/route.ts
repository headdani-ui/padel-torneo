import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE: Reset tournament
export async function DELETE() {
  try {
    await db.setResult.deleteMany({});
    await db.match.deleteMany({});
    await db.pair.deleteMany({});
    await db.player.deleteMany({});
    await db.tournament.deleteMany({});

    return NextResponse.json({ success: true, message: 'Torneo eliminato!' });
  } catch (error) {
    console.error('Error resetting tournament:', error);
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione del torneo' },
      { status: 500 }
    );
  }
}
