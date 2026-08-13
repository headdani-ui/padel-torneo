'use client';

import React, { useState } from 'react';
import { useTournamentStore, type ViewTab } from '@/store/tournament-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Calendar,
  Trophy,
  ClipboardEdit,
  RotateCcw,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';

function TournamentHeader() {
  const { tournament, activeTab, setActiveTab, resetAll } = useTournamentStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = async () => {
    setShowResetConfirm(false);
    await fetch('/api/tournament/reset', { method: 'DELETE' });
    resetAll();
  };

  const tabs: { key: ViewTab; label: string; icon: React.ReactNode }[] = [
    { key: 'calendar', label: 'Calendario', icon: <Calendar className="w-4 h-4" /> },
    { key: 'results', label: 'Risultati', icon: <ClipboardEdit className="w-4 h-4" /> },
    { key: 'rankings', label: 'Classifica', icon: <Trophy className="w-4 h-4" /> },
  ];

  if (!tournament) return null;

  const scoringLabel =
    tournament.scoringType === 'SETS'
      ? tournament.scoringMode === 'BEST_OF_1'
        ? 'Un set'
        : 'Miglior dei 3'
      : `A ${tournament.maxPoints} pt (bonus +${tournament.winBonus || 0})`;

  return (
    <div className="bg-surface border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold neon-text flex items-center gap-2">
              🎾 {tournament.name}
            </h1>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge className="bg-neon/10 text-neon border border-neon text-xs">
                <Users className="w-3 h-3 mr-1" /> {tournament.players.length} giocatori
              </Badge>
              <Badge className="bg-neon/10 text-neon border border-neon text-xs">
                <LayoutGrid className="w-3 h-3 mr-1" /> {tournament.numCourts} campi
              </Badge>
              <Badge className="bg-neon/10 text-neon border border-neon text-xs">
                <Calendar className="w-3 h-3 mr-1" /> {tournament.numDays} giornate
              </Badge>
              <Badge className="bg-neon/10 text-neon border border-neon text-xs">
                {scoringLabel}
              </Badge>
              {tournament.isMixed && (
                <Badge className="bg-shocking/10 text-shocking border border-shocking text-xs">
                  Misto
                </Badge>
              )}
              {tournament.isFixedPairs ? (
                <Badge className="bg-shocking/10 text-shocking border border-shocking text-xs">
                  Coppie fisse
                </Badge>
              ) : (
                <Badge className="bg-neon/10 text-neon border border-neon text-xs">
                  Coppie mobili
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showResetConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-destructive text-xs">Eliminare?</span>
                <Button size="sm" className="bg-destructive text-white text-xs" onClick={handleReset}>
                  Sì
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-neon-dim border-border text-xs"
                  onClick={() => setShowResetConfirm(false)}
                >
                  No
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/50 text-xs"
                onClick={() => setShowResetConfirm(true)}
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Nuovo Torneo
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mt-3">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={activeTab === tab.key ? 'default' : 'outline'}
              className={
                activeTab === tab.key
                  ? 'bg-shocking text-white shocking-border shocking-pulse text-xs'
                  : 'text-neon-dim border-border text-xs hover:border-neon'
              }
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              <span className="ml-1 hidden sm:inline">{tab.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TournamentHeader;
