'use client';

import React, { useState } from 'react';
import { useTournamentStore } from '@/store/tournament-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Check,
  AlertCircle,
  Save,
} from 'lucide-react';

export default function ResultsView() {
  const { tournament, refreshTournament } = useTournamentStore();
  const [selectedDay, setSelectedDay] = useState(1);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Track form state for scores
  const [scores, setScores] = useState<Record<string, { setNumber: number; team1Score: number; team2Score: number }[]>>({});

  if (!tournament) return null;

  const days = tournament.numDays;
  const dayMatches = tournament.matches.filter((m) => m.dayNumber === selectedDay);

  const scoringLabel =
    tournament.scoringType === 'SETS'
      ? tournament.scoringMode === 'BEST_OF_1'
        ? '1 set'
        : 'Miglior dei 3'
      : `A ${tournament.maxPoints} punti`;

  const getMatchScores = (matchId: string) => {
    // If match is completed, use saved results
    const match = tournament.matches.find((m) => m.id === matchId);
    if (match && match.status === 'COMPLETED' && match.setResults.length > 0) {
      return match.setResults.map((sr) => ({
        setNumber: sr.setNumber,
        team1Score: sr.team1Score,
        team2Score: sr.team2Score,
      }));
    }

    // Use form state or initialize default
    if (scores[matchId]) return scores[matchId];

    const numSets =
      tournament.scoringType === 'SETS'
        ? tournament.scoringMode === 'BEST_OF_3'
          ? 3
          : 1
        : 1;

    const defaultScores = Array.from({ length: numSets }, (_, i) => ({
      setNumber: i + 1,
      team1Score: 0,
      team2Score: 0,
    }));

    setScores((prev) => ({ ...prev, [matchId]: defaultScores }));
    return defaultScores;
  };

  const updateScore = (
    matchId: string,
    setNumber: number,
    team: 'team1Score' | 'team2Score',
    value: number
  ) => {
    setScores((prev) => {
      const current = prev[matchId] || getMatchScores(matchId);
      return {
        ...prev,
        [matchId]: current.map((s) =>
          s.setNumber === setNumber ? { ...s, [team]: Math.max(0, value) } : s
        ),
      };
    });
  };

  const handleSave = async (matchId: string) => {
    setSaving(matchId);
    setError('');

    try {
      const matchScores = scores[matchId] || getMatchScores(matchId);

      // Validate
      if (tournament.scoringType === 'POINTS') {
        const s = matchScores[0];
        if (!s || (s.team1Score === 0 && s.team2Score === 0)) {
          setError('Inserisci il punteggio');
          setSaving(null);
          return;
        }
      } else {
        for (const s of matchScores) {
          if (s.team1Score === 0 && s.team2Score === 0) {
            setError('Compila tutti i set');
            setSaving(null);
            return;
          }
        }
      }

      const res = await fetch('/api/tournament/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          setResults: matchScores,
          scoringType: tournament.scoringType,
          scoringMode: tournament.scoringMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Errore nel salvataggio');
        setSaving(null);
        return;
      }

      // Refresh tournament data
      await refreshTournament();
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Day Navigation */}
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
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold neon-text">
          Risultati - Giornata {selectedDay}
        </h2>
        <Badge className="bg-neon/10 text-neon border border-neon text-xs">{scoringLabel}</Badge>
      </div>

      {error && (
        <p className="text-destructive flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}

      {dayMatches.length === 0 ? (
        <Card className="neon-border">
          <CardContent className="p-8 text-center">
            <p className="text-neon-dim">Nessuna partita per questa giornata</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {dayMatches.map((match) => {
            const team1 = tournament.pairs.find((p) => p.id === match.team1Id);
            const team2 = tournament.pairs.find((p) => p.id === match.team2Id);
            const matchScores = getMatchScores(match.id);
            const isCompleted = match.status === 'COMPLETED';
            const isSaving = saving === match.id;

            return (
              <Card
                key={match.id}
                className={
                  isCompleted
                    ? 'neon-border neon-glow'
                    : 'border-border hover:border-neon/50'
                }
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-neon-dim">
                    <MapPin className="w-4 h-4 text-shocking" />
                    <span>Campo {match.courtNumber}</span>
                    {isCompleted && (
                      <Badge className="ml-auto bg-neon/10 text-neon border border-neon text-xs">
                        <Check className="w-3 h-3 mr-1" /> Salvato
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {/* Teams and Score Inputs */}
                  <div className="flex items-start gap-3">
                    {/* Team 1 */}
                    <div className="flex-1 text-right space-y-2">
                      <div>
                        <p className="font-bold text-sm text-neon">
                          {team1?.player1Name}
                        </p>
                        <p className="text-xs text-neon-dim">{team1?.player2Name}</p>
                      </div>

                      {matchScores.map((s) => (
                        <Input
                          key={`t1-${s.setNumber}`}
                          type="number"
                          value={s.team1Score}
                          onChange={(e) =>
                            updateScore(match.id, s.setNumber, 'team1Score', parseInt(e.target.value) || 0)
                          }
                          className="w-16 ml-auto text-center bg-surface text-neon border-border text-sm"
                          disabled={isCompleted}
                          min={0}
                          max={tournament.scoringType === 'POINTS' ? tournament.maxPoints : 99}
                        />
                      ))}
                    </div>

                    {/* Set Label / VS */}
                    <div className="flex flex-col items-center gap-2 pt-4">
                      {matchScores.map((s) => (
                        <Badge
                          key={`label-${s.setNumber}`}
                          className="bg-surface text-neon-dim border border-border text-xs px-2"
                        >
                          {tournament.scoringType === 'POINTS' ? 'PTS' : `S${s.setNumber}`}
                        </Badge>
                      ))}
                    </div>

                    {/* Team 2 */}
                    <div className="flex-1 text-left space-y-2">
                      <div>
                        <p className="font-bold text-sm text-neon">
                          {team2?.player1Name}
                        </p>
                        <p className="text-xs text-neon-dim">{team2?.player2Name}</p>
                      </div>

                      {matchScores.map((s) => (
                        <Input
                          key={`t2-${s.setNumber}`}
                          type="number"
                          value={s.team2Score}
                          onChange={(e) =>
                            updateScore(match.id, s.setNumber, 'team2Score', parseInt(e.target.value) || 0)
                          }
                          className="w-16 text-center bg-surface text-neon border-border text-sm"
                          disabled={isCompleted}
                          min={0}
                          max={tournament.scoringType === 'POINTS' ? tournament.maxPoints : 99}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Save Button */}
                  {!isCompleted && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleSave(match.id)}
                        disabled={isSaving}
                        className="bg-neon text-black font-bold hover:bg-neon/80 neon-pulse text-xs"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {isSaving ? 'Salvataggio...' : 'Salva Risultato'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
