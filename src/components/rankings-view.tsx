'use client';

import React, { useEffect, useState } from 'react';
import { useTournamentStore } from '@/store/tournament-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RankingEntry {
  id: string;
  name: string;
  gender?: string;
  wins: number;
  losses: number;
  draws: number;
  setsWon: number;
  setsLost: number;
  earnedPoints: number;
}

export default function RankingsView() {
  const { tournament } = useTournamentStore();
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [rankingType, setRankingType] = useState<string>('');
  const [scoringType, setScoringType] = useState<string>('');
  const [winBonus, setWinBonus] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournament) return;

    const fetchRankings = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/tournament/rankings');
        const data = await res.json();
        if (data.exists) {
          setRankings(data.rankings);
          setRankingType(data.rankingType);
          setScoringType(data.scoringType);
          setWinBonus(data.winBonus || 0);
        }
      } catch (err) {
        console.error('Error fetching rankings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [tournament?.matches.filter((m) => m.status === 'COMPLETED').length]);

  if (!tournament) return null;

  const getPositionIcon = (pos: number) => {
    if (pos === 0) return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (pos === 1) return <Medal className="w-6 h-6 text-gray-300" />;
    if (pos === 2) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="text-neon-dim text-sm font-bold w-6 text-center">{pos + 1}</span>;
  };

  const getTrendIcon = (entry: RankingEntry) => {
    const diff = entry.wins - entry.losses;
    if (diff > 0) return <TrendingUp className="w-4 h-4 text-neon" />;
    if (diff < 0) return <TrendingDown className="w-4 h-4 text-shocking" />;
    return <Minus className="w-4 h-4 text-neon-dim" />;
  };

  if (loading) {
    return (
      <Card className="neon-border">
        <CardContent className="p-8 text-center">
          <p className="text-neon-dim">Caricamento classifica...</p>
        </CardContent>
      </Card>
    );
  }

  const completedMatches = tournament.matches.filter((m) => m.status === 'COMPLETED').length;

  if (completedMatches === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold neon-text">📊 Classifica</h2>
        <Card className="neon-border">
          <CardContent className="p-8 text-center space-y-2">
            <Trophy className="w-12 h-12 text-neon-dim mx-auto" />
            <p className="text-neon-dim">Nessun risultato ancora inserito</p>
            <p className="text-neon-dim text-sm">Vai alla sezione &quot;Risultati&quot; per inserire i punteggi</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold neon-text flex items-center gap-2">
          <Trophy className="w-5 h-5" /> Classifica
        </h2>
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-neon/10 text-neon border border-neon text-xs">
            {completedMatches} partite
          </Badge>
          <Badge className="bg-shocking/10 text-shocking border border-shocking text-xs">
            {rankingType === 'PAIRS' ? 'Coppie' : 'Singoli'}
          </Badge>
          {scoringType === 'POINTS' && winBonus > 0 && (
            <Badge className="bg-neon/10 text-neon border border-neon text-xs">
              Bonus vittoria: +{winBonus}
            </Badge>
          )}
        </div>
      </div>

      {/* Podium - Top 3 */}
      {rankings.length >= 3 && (
        <div className="flex items-end justify-center gap-3 py-4">
          {/* 2nd place */}
          <div className="text-center">
            <div className="w-24 h-24 bg-surface rounded-t-lg flex flex-col items-center justify-center neon-border border-b-0">
              <Medal className="w-8 h-8 text-gray-300 mb-1" />
              <p className="text-neon text-xs font-bold truncate w-20">{rankings[1].name}</p>
              <p className="text-neon-dim text-xs">{rankings[1].earnedPoints} pt</p>
            </div>
            <div className="w-24 h-16 bg-neon/5 neon-border border-t-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-300">2°</span>
            </div>
          </div>

          {/* 1st place */}
          <div className="text-center">
            <div className="w-28 h-28 bg-surface rounded-t-lg flex flex-col items-center justify-center neon-border border-b-0 shocking-glow">
              <Trophy className="w-10 h-10 text-yellow-400 mb-1" />
              <p className="text-neon text-sm font-bold truncate w-24">{rankings[0].name}</p>
              <p className="shocking-text-sm text-xs">{rankings[0].earnedPoints} pt</p>
            </div>
            <div className="w-28 h-20 bg-shocking/5 neon-border border-t-0 flex items-center justify-center">
              <span className="text-4xl font-bold shocking-text">1°</span>
            </div>
          </div>

          {/* 3rd place */}
          <div className="text-center">
            <div className="w-24 h-20 bg-surface rounded-t-lg flex flex-col items-center justify-center neon-border border-b-0">
              <Medal className="w-7 h-7 text-amber-600 mb-1" />
              <p className="text-neon text-xs font-bold truncate w-20">{rankings[2].name}</p>
              <p className="text-neon-dim text-xs">{rankings[2].earnedPoints} pt</p>
            </div>
            <div className="w-24 h-12 bg-neon/5 neon-border border-t-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-amber-600">3°</span>
            </div>
          </div>
        </div>
      )}

      {/* Full Rankings Table */}
      <Card className="neon-border">
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 px-4 py-2 border-b border-border text-xs text-neon-dim font-bold">
            <div className="w-8">#</div>
            <div>Nome</div>
            <div className="text-center w-12">V</div>
            <div className="text-center w-12">S</div>
            <div className="text-center w-16">Punti</div>
            <div className="w-8"></div>
          </div>

          {/* Rows */}
          {rankings.map((entry, idx) => (
            <div
              key={entry.id}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 px-4 py-2.5 items-center border-b border-border/50 transition-colors hover:bg-surface ${
                idx === 0 ? 'bg-shocking/5' : ''
              }`}
            >
              <div className="w-8 flex justify-center">{getPositionIcon(idx)}</div>
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <p
                    className={`font-bold text-sm truncate ${
                      idx === 0 ? 'shocking-text-sm' : 'text-neon'
                    }`}
                  >
                    {entry.name}
                  </p>
                  {entry.gender && rankingType === 'PLAYERS' && (
                    <p className="text-neon-dim text-xs">
                      {entry.gender === 'M' ? '♂' : '♀'}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-center w-12">
                <Badge className="bg-neon/10 text-neon border border-neon text-xs px-2">
                  {entry.wins}
                </Badge>
              </div>
              <div className="text-center w-12">
                <Badge className="bg-surface text-neon-dim border border-border text-xs px-2">
                  {entry.losses}
                </Badge>
              </div>
              <div className="text-center w-16 font-mono text-sm font-bold">
                <span className={idx === 0 ? 'shocking-text-sm' : 'neon-text-sm'}>
                  {entry.earnedPoints}
                </span>
              </div>
              <div className="w-8 flex justify-center">{getTrendIcon(entry)}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-neon-dim flex-wrap">
        <span>V = Vittorie</span>
        <span>S = Sconfitte</span>
        <span>Punti = {scoringType === 'POINTS' ? `Punti fatti${winBonus > 0 ? ' + bonus vittoria' : ''}` : 'Punti fatti'}</span>
      </div>
    </div>
  );
}
