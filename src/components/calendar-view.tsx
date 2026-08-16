'use client';

import React, { useState } from 'react';
import { useTournamentStore } from '@/store/tournament-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, MapPin, Clock, Shuffle, Loader2 } from 'lucide-react';

export default function CalendarView() {
  const { tournament, refreshTournament } = useTournamentStore();
  const [selectedDay, setSelectedDay] = useState(1);
  const [shuffling, setShuffling] = useState(false);
  const [shuffleMessage, setShuffleMessage] = useState('');

  if (!tournament) return null;

  // Helper: get player gender by ID
  const playerMap = new Map(tournament.players.map(p => [p.id, p.gender]));
  const getGenderColor = (playerId: string, isWinner: boolean) => {
    const gender = playerMap.get(playerId);
    const base = gender === 'M' ? 'male-text' : 'female-text';
    return isWinner ? `${base} winner-glow` : base;
  };

  const days = tournament.numDays;
  const dayMatches = tournament.matches.filter((m) => m.dayNumber === selectedDay);
  const courts = tournament.numCourts;

  // Count unplayed matches
  const unplayedCount = tournament.matches.filter((m) => m.status === 'SCHEDULED').length;

  // Group matches by court
  const matchesByCourt: Record<number, typeof dayMatches> = {};
  for (let c = 1; c <= courts; c++) {
    matchesByCourt[c] = dayMatches.filter((m) => m.courtNumber === c);
  }

  const handleShuffle = async () => {
    setShuffling(true);
    setShuffleMessage('');
    try {
      const res = await fetch('/api/tournament/shuffle', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setShuffleMessage(data.message);
        await refreshTournament();
      } else {
        setShuffleMessage(data.message || 'Errore');
      }
    } catch {
      setShuffleMessage('Errore di connessione');
    } finally {
      setShuffling(false);
      setTimeout(() => setShuffleMessage(''), 4000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Day Navigation + Shuffle */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-neon border-border"
          onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
          disabled={selectedDay <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <ScrollArea className="flex-1">
          <div className="flex gap-1 pb-1">
            {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
              const dayM = tournament.matches.filter((m) => m.dayNumber === day);
              const completed = dayM.filter((m) => m.status === 'COMPLETED').length;

              return (
                <Button
                  key={day}
                  size="sm"
                  variant={selectedDay === day ? 'default' : 'outline'}
                  className={
                    selectedDay === day
                      ? 'bg-shocking text-white shocking-border min-w-[60px]'
                      : completed === dayM.length && dayM.length > 0
                      ? 'bg-neon/10 text-neon border-neon min-w-[60px]'
                      : 'text-neon-dim border-border min-w-[60px]'
                  }
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="text-xs">G{day}</span>
                  {completed === dayM.length && dayM.length > 0 && (
                    <span className="ml-1">✓</span>
                  )}
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <Button
          size="sm"
          variant="outline"
          className="text-neon border-border"
          onClick={() => setSelectedDay(Math.min(days, selectedDay + 1))}
          disabled={selectedDay >= days}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Shuffle button */}
        {unplayedCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="bg-neon/10 text-neon border-neon hover:bg-neon/20 text-xs whitespace-nowrap"
            onClick={handleShuffle}
            disabled={shuffling}
          >
            {shuffling ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Shuffle className="w-3 h-3 mr-1" />
            )}
            Shuffle
          </Button>
        )}
      </div>

      {/* Shuffle message */}
      {shuffleMessage && (
        <p className="text-neon text-xs text-center animate-pulse">{shuffleMessage}</p>
      )}

      {/* Day Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold neon-text flex items-center gap-2">
          <Clock className="w-5 h-5" /> Giornata {selectedDay}
        </h2>
        <div className="flex gap-2">
          <Badge className="bg-neon/10 text-neon border border-neon text-xs">
            {dayMatches.length} partite
          </Badge>
          {unplayedCount > 0 && (
            <Badge className="bg-shocking/10 text-shocking border border-shocking text-xs">
              <Shuffle className="w-3 h-3 mr-1" /> {unplayedCount} da giocare
            </Badge>
          )}
        </div>
      </div>

      {/* Courts Grid */}
      {dayMatches.length === 0 ? (
        <Card className="neon-border">
          <CardContent className="p-8 text-center">
            <p className="text-neon-dim">Nessuna partita programmata per questa giornata</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(matchesByCourt).map(([courtNum, matches]) => {
            const court = parseInt(courtNum);
            const match = matches[0];

            if (!match) {
              return (
                <Card key={court} className="neon-border border-dashed opacity-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-neon-dim text-sm">Campo {court} - Libero</p>
                  </CardContent>
                </Card>
              );
            }

            const team1 = tournament.pairs.find((p) => p.id === match.team1Id);
            const team2 = tournament.pairs.find((p) => p.id === match.team2Id);
            const isCompleted = match.status === 'COMPLETED';

            return (
              <Card
                key={court}
                className={`transition-all ${
                  isCompleted
                    ? 'neon-border neon-glow'
                    : 'border-border hover:border-neon/50'
                }`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-neon-dim">
                    <MapPin className="w-4 h-4 text-shocking" />
                    <span> Campo {court}</span>
                    {isCompleted && (
                      <Badge className="ml-auto bg-neon/10 text-neon border border-neon text-xs">
                        Completata
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-center justify-between gap-2">
                    {/* Team 1 */}
                    <div className="flex-1 text-right space-y-1">
                      {team1 && (
                        <>
                          <p
                            className={`font-bold text-sm ${getGenderColor(team1.player1Id, match.winnerId === team1.id)}`}
                          >
                            {team1.player1Name}
                          </p>
                          <p
                            className={`font-semibold text-sm ${getGenderColor(team1.player2Id, match.winnerId === team1.id)}`}
                          >
                            {team1.player2Name}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Score or VS */}
                    <div className="px-3">
                      {isCompleted && match.setResults.length > 0 ? (
                        <div className="text-center space-y-0.5">
                          {match.setResults.map((sr) => (
                            <div
                              key={sr.id}
                              className="text-xs font-mono whitespace-nowrap"
                            >
                              <span
                                className={
                                  sr.team1Score > sr.team2Score
                                    ? 'shocking-text-sm font-bold'
                                    : 'text-neon-dim'
                                }
                              >
                                {sr.team1Score}
                              </span>
                              <span className="text-muted-foreground mx-0.5">-</span>
                              <span
                                className={
                                  sr.team2Score > sr.team1Score
                                    ? 'shocking-text-sm font-bold'
                                    : 'text-neon-dim'
                                }
                              >
                                {sr.team2Score}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-neon-dim font-bold text-xs">VS</span>
                      )}
                    </div>

                    {/* Team 2 */}
                    <div className="flex-1 text-left space-y-1">
                      {team2 && (
                        <>
                          <p
                            className={`font-bold text-sm ${getGenderColor(team2.player1Id, match.winnerId === team2.id)}`}
                          >
                            {team2.player1Name}
                          </p>
                          <p
                            className={`font-semibold text-sm ${getGenderColor(team2.player2Id, match.winnerId === team2.id)}`}
                          >
                            {team2.player2Name}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
