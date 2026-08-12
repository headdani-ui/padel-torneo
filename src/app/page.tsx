'use client';

import React, { useEffect } from 'react';
import { useTournamentStore } from '@/store/tournament-store';
import SetupWizard from '@/components/setup-wizard';
import TournamentHeader from '@/components/tournament-header';
import CalendarView from '@/components/calendar-view';
import ResultsView from '@/components/results-view';
import RankingsView from '@/components/rankings-view';

export default function Home() {
  const { view, tournament, refreshTournament, activeTab } = useTournamentStore();

  // Check for existing tournament on mount
  useEffect(() => {
    refreshTournament();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {view === 'setup' && <SetupWizard />}

      {view === 'tournament' && (
        <>
          <TournamentHeader />
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4">
            {activeTab === 'calendar' && <CalendarView />}
            {activeTab === 'results' && <ResultsView />}
            {activeTab === 'rankings' && <RankingsView />}
          </main>
        </>
      )}
    </div>
  );
}
