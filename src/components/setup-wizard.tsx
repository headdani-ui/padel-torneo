'use client';

import React, { useState } from 'react';
import { useTournamentStore, type WizardStep, type ScoringType, type ScoringMode } from '@/store/tournament-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  UserPlus,
  Shuffle,
  Link2,
  Unlink,
  LayoutGrid,
  Calendar,
  Trophy,
  Check,
  ChevronLeft,
  ChevronRight,
  Zap,
  AlertCircle,
} from 'lucide-react';

const STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
  { key: 'num-players', label: 'Giocatori', icon: <Users className="w-4 h-4" /> },
  { key: 'player-names', label: 'Nomi', icon: <UserPlus className="w-4 h-4" /> },
  { key: 'mixed', label: 'Misto', icon: <Shuffle className="w-4 h-4" /> },
  { key: 'fixed-pairs', label: 'Coppie', icon: <Link2 className="w-4 h-4" /> },
  { key: 'define-pairs', label: 'Formazione', icon: <Unlink className="w-4 h-4" /> },
  { key: 'courts-days', label: 'Impianto', icon: <LayoutGrid className="w-4 h-4" /> },
  { key: 'scoring', label: 'Punteggio', icon: <Trophy className="w-4 h-4" /> },
  { key: 'confirm', label: 'Conferma', icon: <Check className="w-4 h-4" /> },
];

function StepIndicator({ current, steps }: { current: WizardStep; steps: typeof STEPS }) {
  const currentIndex = steps.findIndex(s => s.key === current);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-4">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isActive = isCompleted || isCurrent;

        return (
          <React.Fragment key={step.key}>
            {idx > 0 && (
              <div className={`w-4 h-0.5 ${isActive ? 'bg-neon' : 'bg-muted'}`} />
            )}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
                isCurrent
                  ? 'shocking-text-sm bg-shocking/10 border border-shocking'
                  : isCompleted
                  ? 'neon-text-sm bg-neon/10 border border-neon'
                  : 'text-muted-foreground bg-surface border border-border'
              }`}
            >
              {step.icon}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function NumPlayersStep() {
  const { setup, updateSetup, setWizardStep } = useTournamentStore();
  const [error, setError] = useState('');

  const handleNext = () => {
    if (setup.numPlayers < 4) {
      setError('Servono almeno 4 giocatori');
      return;
    }
    if (setup.numPlayers > 100) {
      setError('Massimo 100 giocatori');
      return;
    }
    // Initialize player array
    updateSetup({
      players: Array.from({ length: setup.numPlayers }, () => ({
        name: '',
        gender: 'M' as const,
      })),
    });
    setWizardStep('player-names');
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold neon-text">Quanti giocatori?</h2>
        <p className="text-neon-dim text-sm">Inserisci il numero totale di partecipanti (minimo 4)</p>
      </div>

      <div className="flex justify-center">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="neon-border text-neon hover:bg-neon/10"
            onClick={() => updateSetup({ numPlayers: Math.max(4, setup.numPlayers - 1) })}
          >
            -
          </Button>
          <Input
            type="number"
            value={setup.numPlayers}
            onChange={(e) => updateSetup({ numPlayers: parseInt(e.target.value) || 4 })}
            className="w-24 text-center text-3xl font-bold bg-surface text-neon border-neon"
            min={4}
            max={100}
          />
          <Button
            variant="outline"
            className="neon-border text-neon hover:bg-neon/10"
            onClick={() => updateSetup({ numPlayers: Math.min(100, setup.numPlayers + 1) })}
          >
            +
          </Button>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="grid grid-cols-4 gap-2">
          {[4, 6, 8, 10, 12, 16, 20, 24].map((n) => (
            <Button
              key={n}
              variant="outline"
              className={`text-sm ${
                setup.numPlayers === n
                  ? 'shocking-text-sm shocking-border bg-shocking/10'
                  : 'text-neon-dim border-border hover:border-neon'
              }`}
              onClick={() => updateSetup({ numPlayers: n })}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-center text-destructive flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          className="bg-shocking text-white hover:bg-shocking/80 font-bold neon-border-shocking shocking-pulse"
        >
          Avanti <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function PlayerNamesStep() {
  const { setup, updateSetup, setWizardStep } = useTournamentStore();
  const [error, setError] = useState('');

  const handleNameChange = (index: number, name: string) => {
    const newPlayers = [...setup.players];
    newPlayers[index] = { ...newPlayers[index], name };
    updateSetup({ players: newPlayers });
  };

  const handleGenderChange = (index: number, gender: 'M' | 'F') => {
    const newPlayers = [...setup.players];
    newPlayers[index] = { ...newPlayers[index], gender };
    updateSetup({ players: newPlayers });
  };

  const handleAutoName = () => {
    const newPlayers = setup.players.map((_, i) => ({
      name: `Giocatore ${i + 1}`,
      gender: (i % 2 === 0 ? 'M' : 'F') as 'M' | 'F',
    }));
    updateSetup({ players: newPlayers });
  };

  const handleNext = () => {
    const emptyNames = setup.players.filter((p) => !p.name.trim());
    if (emptyNames.length > 0) {
      setError('Tutti i giocatori devono avere un nome');
      return;
    }
    const duplicateNames = setup.players.filter(
      (p, i) => setup.players.findIndex((q) => q.name.trim().toLowerCase() === p.name.trim().toLowerCase()) !== i
    );
    if (duplicateNames.length > 0) {
      setError('I nomi devono essere univoci');
      return;
    }
    setError('');
    setWizardStep('mixed');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold neon-text">Inserisci i giocatori</h2>
          <p className="text-neon-dim text-sm">Nome e sesso per ogni partecipante</p>
        </div>
        <Button variant="outline" className="text-neon-dim border-border text-xs" onClick={handleAutoName}>
          <Zap className="w-3 h-3 mr-1" /> Auto
        </Button>
      </div>

      <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
        {setup.players.map((player, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-neon-dim text-sm w-8 text-right shrink-0">#{idx + 1}</span>
            <Input
              value={player.name}
              onChange={(e) => handleNameChange(idx, e.target.value)}
              placeholder="Nome..."
              className="flex-1 bg-surface text-neon border-border focus:border-neon"
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={player.gender === 'M' ? 'default' : 'outline'}
                className={
                  player.gender === 'M'
                    ? 'bg-shocking text-white text-xs px-3'
                    : 'text-neon-dim border-border text-xs px-3 hover:border-neon'
                }
                onClick={() => handleGenderChange(idx, 'M')}
              >
                ♂
              </Button>
              <Button
                size="sm"
                variant={player.gender === 'F' ? 'default' : 'outline'}
                className={
                  player.gender === 'F'
                    ? 'bg-shocking text-white text-xs px-3'
                    : 'text-neon-dim border-border text-xs px-3 hover:border-neon'
                }
                onClick={() => handleGenderChange(idx, 'F')}
              >
                ♀
              </Button>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-center text-destructive flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          className="text-neon-dim border-border"
          onClick={() => setWizardStep('num-players')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
        </Button>
        <Button
          onClick={handleNext}
          className="bg-shocking text-white hover:bg-shocking/80 font-bold shocking-pulse"
        >
          Avanti <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function MixedStep() {
  const { setup, updateSetup, setWizardStep } = useTournamentStore();

  const handleNext = (isMixed: boolean) => {
    updateSetup({ isMixed });

    // If mixed, check genders and go to fixed-pairs
    // If not mixed, go to fixed-pairs
    if (isMixed) {
      const males = setup.players.filter((p) => p.gender === 'M').length;
      const females = setup.players.filter((p) => p.gender === 'F').length;
      if (males < 2 || females < 2) {
        // Not enough for mixed - force non-mixed
        updateSetup({ isMixed: false });
        setWizardStep('fixed-pairs');
        return;
      }
    }

    setWizardStep('fixed-pairs');
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold neon-text">Torneo Misto?</h2>
        <p className="text-neon-dim text-sm">
          In un torneo misto, ogni squadra deve essere composta da un uomo e una donna
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <Card
          className="w-44 cursor-pointer transition-all hover:scale-105 neon-border"
          onClick={() => handleNext(true)}
        >
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-3xl">👫</div>
            <h3 className="font-bold text-neon">SI, Misto</h3>
            <p className="text-xs text-neon-dim">Coppie M+F obbligatorie</p>
          </CardContent>
        </Card>
        <Card
          className="w-44 cursor-pointer transition-all hover:scale-105 neon-border"
          onClick={() => handleNext(false)}
        >
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-3xl">🏃</div>
            <h3 className="font-bold text-neon">NO, Non misto</h3>
            <p className="text-xs text-neon-dim">Squadre libere</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-start">
        <Button
          variant="outline"
          className="text-neon-dim border-border"
          onClick={() => setWizardStep('player-names')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
        </Button>
      </div>
    </div>
  );
}

function FixedPairsStep() {
  const { setup, updateSetup, setWizardStep } = useTournamentStore();

  const handleNext = (isFixedPairs: boolean) => {
    updateSetup({ isFixedPairs });
    if (isFixedPairs) {
      // Need to define pairs
      setWizardStep('define-pairs');
    } else {
      setWizardStep('courts-days');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold neon-text">Coppie Fisse?</h2>
        <p className="text-neon-dim text-sm">
          Le coppie restano le stesse per tutto il torneo oppure cambiano ogni partita?
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <Card
          className="w-48 cursor-pointer transition-all hover:scale-105 neon-border"
          onClick={() => handleNext(true)}
        >
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-3xl">🔒</div>
            <h3 className="font-bold text-neon">SI, Fisse</h3>
            <p className="text-xs text-neon-dim">Le squadre non cambiano</p>
            <p className="text-xs text-neon-dim">
              {setup.isFixedPairs ? '(Punteggio alla coppia)' : ''}
            </p>
          </CardContent>
        </Card>
        <Card
          className="w-48 cursor-pointer transition-all hover:scale-105 neon-border"
          onClick={() => handleNext(false)}
        >
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-3xl">🔄</div>
            <h3 className="font-bold text-neon">NO, Mobili</h3>
            <p className="text-xs text-neon-dim">Le squadre cambiano ogni partita</p>
            <p className="text-xs text-neon-dim">(Punteggio individuale)</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-start">
        <Button
          variant="outline"
          className="text-neon-dim border-border"
          onClick={() => setWizardStep('mixed')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
        </Button>
      </div>
    </div>
  );
}

function DefinePairsStep() {
  const { setup, updateSetup, setWizardStep } = useTournamentStore();
  const [error, setError] = useState('');

  const males = setup.players.map((p, i) => ({ ...p, index: i })).filter((p) => p.gender === 'M');
  const females = setup.players.map((p, i) => ({ ...p, index: i })).filter((p) => p.gender === 'F');

  const availableMales = males.filter(
    (m) => !setup.fixedPairs.some((fp) => fp.player1Index === m.index || fp.player2Index === m.index)
  );
  const availableFemales = females.filter(
    (f) => !setup.fixedPairs.some((fp) => fp.player1Index === f.index || fp.player2Index === f.index)
  );

  const totalPairs = Math.floor(setup.players.length / 2);

  const addPair = () => {
    if (setup.fixedPairs.length >= totalPairs) return;

    if (setup.isMixed) {
      if (availableMales.length === 0 || availableFemales.length === 0) return;
      updateSetup({
        fixedPairs: [
          ...setup.fixedPairs,
          { player1Index: availableMales[0].index, player2Index: availableFemales[0].index },
        ],
      });
    } else {
      const allAvailable = setup.players
        .map((p, i) => ({ ...p, index: i }))
        .filter(
          (p) => !setup.fixedPairs.some((fp) => fp.player1Index === p.index || fp.player2Index === p.index)
        );
      if (allAvailable.length < 2) return;
      updateSetup({
        fixedPairs: [
          ...setup.fixedPairs,
          { player1Index: allAvailable[0].index, player2Index: allAvailable[1].index },
        ],
      });
    }
  };

  const removePair = (index: number) => {
    updateSetup({
      fixedPairs: setup.fixedPairs.filter((_, i) => i !== index),
    });
  };

  const handlePlayerChange = (pairIndex: number, position: 'player1' | 'player2', newPlayerIndex: number) => {
    const newPairs = [...setup.fixedPairs];
    newPairs[pairIndex] = { ...newPairs[pairIndex], [`${position}Index`]: newPlayerIndex };
    updateSetup({ fixedPairs: newPairs });
  };

  const handleAutoPair = () => {
    const pairs: { player1Index: number; player2Index: number }[] = [];

    if (setup.isMixed) {
      const availM = [...males];
      const availF = [...females];
      const numPairs = Math.min(availM.length, availF.length);
      for (let i = 0; i < numPairs; i++) {
        pairs.push({ player1Index: availM[i].index, player2Index: availF[i].index });
      }
    } else {
      const allPlayers = setup.players.map((p, i) => ({ ...p, index: i }));
      for (let i = 0; i + 1 < allPlayers.length; i += 2) {
        pairs.push({ player1Index: allPlayers[i].index, player2Index: allPlayers[i + 1].index });
      }
    }

    updateSetup({ fixedPairs: pairs });
  };

  const handleNext = () => {
    const pairedPlayers = new Set<number>();
    for (const fp of setup.fixedPairs) {
      pairedPlayers.add(fp.player1Index);
      pairedPlayers.add(fp.player2Index);
    }

    const unpaired = setup.players.length - pairedPlayers.size;
    if (unpaired > 1) {
      setError(`Ci sono ${unpaired} giocatori senza coppia. Assegnali o rimuovili.`);
      return;
    }

    if (setup.fixedPairs.length < 2) {
      setError('Servono almeno 2 coppie');
      return;
    }

    setError('');
    setWizardStep('courts-days');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold neon-text">Definisci le Coppie</h2>
          <p className="text-neon-dim text-sm">
            {setup.isMixed ? 'Accoppia ogni uomo con una donna' : 'Forma le coppie'}
          </p>
        </div>
        <Button variant="outline" className="text-neon-dim border-border text-xs" onClick={handleAutoPair}>
          <Zap className="w-3 h-3 mr-1" /> Auto
        </Button>
      </div>

      <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-2">
        {setup.fixedPairs.map((pair, idx) => {
          const p1 = setup.players[pair.player1Index];
          const p2 = setup.players[pair.player2Index];

          return (
            <div key={idx} className="flex items-center gap-2 bg-surface p-2 rounded border border-border">
              <Badge className="bg-neon/10 text-neon border border-neon">Coppia {idx + 1}</Badge>
              <div className="flex-1 flex items-center gap-2">
                <select
                  value={pair.player1Index}
                  onChange={(e) => handlePlayerChange(idx, 'player1', parseInt(e.target.value))}
                  className="flex-1 bg-surface text-neon border border-border rounded px-2 py-1 text-sm"
                >
                  {setup.players.map((p, i) => (
                    <option key={i} value={i} className="bg-surface text-neon">
                      {p.name} ({p.gender === 'M' ? '♂' : '♀'})
                    </option>
                  ))}
                </select>
                <span className="text-neon-dim">&</span>
                <select
                  value={pair.player2Index}
                  onChange={(e) => handlePlayerChange(idx, 'player2', parseInt(e.target.value))}
                  className="flex-1 bg-surface text-neon border border-border rounded px-2 py-1 text-sm"
                >
                  {setup.players.map((p, i) => (
                    <option key={i} value={i} className="bg-surface text-neon">
                      {p.name} ({p.gender === 'M' ? '♂' : '♀'})
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/50 hover:bg-destructive/10 text-xs"
                onClick={() => removePair(idx)}
              >
                ✕
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="text-neon-dim border-border"
            onClick={() => setWizardStep('fixed-pairs')}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
          </Button>
        </div>
        <div className="flex gap-2">
          {setup.fixedPairs.length < totalPairs && (
            <Button
              variant="outline"
              className="neon-border text-neon text-sm"
              onClick={addPair}
            >
              + Aggiungi Coppia
            </Button>
          )}
          <Button
            onClick={handleNext}
            className="bg-shocking text-white hover:bg-shocking/80 font-bold shocking-pulse"
          >
            Avanti <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-center text-destructive flex items-center justify-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}
    </div>
  );
}

function CourtsDaysStep() {
  const { setup, updateSetup, setWizardStep } = useTournamentStore();

  const handleNext = () => {
    if (setup.numCourts < 1 || setup.numDays < 1) return;
    setWizardStep('scoring');
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold neon-text">Impianto & Calendario</h2>
        <p className="text-neon-dim text-sm">Quanti campi e quante giornate di gioco?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto">
        <Card className="neon-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-neon text-lg flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" /> Campi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neon-dim text-xs mb-3">Partite simultanee per giornata</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="text-neon border-border"
                onClick={() => updateSetup({ numCourts: Math.max(1, setup.numCourts - 1) })}
              >
                -
              </Button>
              <Input
                type="number"
                value={setup.numCourts}
                onChange={(e) => updateSetup({ numCourts: Math.max(1, Math.min(4, parseInt(e.target.value) || 1)) })}
                className="w-16 text-center bg-surface text-neon border-border"
                min={1}
                max={4}
              />
              <Button
                variant="outline"
                className="text-neon border-border"
                onClick={() => updateSetup({ numCourts: Math.min(4, setup.numCourts + 1) })}
              >
                +
              </Button>
            </div>
            <p className="text-neon-dim text-xs mt-2">Max: 4 campi</p>
          </CardContent>
        </Card>

        <Card className="neon-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-neon text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Giornate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neon-dim text-xs mb-3">Numero totale di giornate</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="text-neon border-border"
                onClick={() => updateSetup({ numDays: Math.max(1, setup.numDays - 1) })}
              >
                -
              </Button>
              <Input
                type="number"
                value={setup.numDays}
                onChange={(e) => updateSetup({ numDays: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-16 text-center bg-surface text-neon border-border"
                min={1}
                max={50}
              />
              <Button
                variant="outline"
                className="text-neon border-border"
                onClick={() => updateSetup({ numDays: setup.numDays + 1 })}
              >
                +
              </Button>
            </div>
            <p className="text-neon-dim text-xs mt-2">
              Max {setup.numCourts * setup.numDays} partite totali
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          className="text-neon-dim border-border"
          onClick={() => setWizardStep(setup.isFixedPairs ? 'define-pairs' : 'fixed-pairs')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
        </Button>
        <Button
          onClick={handleNext}
          className="bg-shocking text-white hover:bg-shocking/80 font-bold shocking-pulse"
        >
          Avanti <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function ScoringStep() {
  const { setup, updateSetup, setWizardStep } = useTournamentStore();

  const handleNext = () => {
    setWizardStep('confirm');
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold neon-text">Sistema di Punteggio</h2>
        <p className="text-neon-dim text-sm">Come si assegnano i punti?</p>
      </div>

      <div className="flex justify-center gap-4">
        <Card
          className={`w-52 cursor-pointer transition-all hover:scale-105 ${
            setup.scoringType === 'SETS' ? 'shocking-border shocking-glow' : 'neon-border'
          }`}
          onClick={() => updateSetup({ scoringType: 'SETS', scoringMode: 'BEST_OF_1' })}
        >
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-3xl">🎾</div>
            <h3 className="font-bold text-neon">A SET</h3>
            <p className="text-xs text-neon-dim">Classico: chi vince più set</p>
          </CardContent>
        </Card>
        <Card
          className={`w-52 cursor-pointer transition-all hover:scale-105 ${
            setup.scoringType === 'POINTS' ? 'shocking-border shocking-glow' : 'neon-border'
          }`}
          onClick={() => updateSetup({ scoringType: 'POINTS', scoringMode: 'POINTS_MAX' })}
        >
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-3xl">🔢</div>
            <h3 className="font-bold text-neon">A PUNTI</h3>
            <p className="text-xs text-neon-dim">Chi raggiunge il punteggio max</p>
          </CardContent>
        </Card>
      </div>

      <Separator className="bg-border" />

      {setup.scoringType === 'SETS' ? (
        <div className="space-y-3">
          <p className="text-center text-neon-dim text-sm">Quanti set per partita?</p>
          <div className="flex justify-center gap-3">
            <Button
              className={
                setup.scoringMode === 'BEST_OF_1'
                  ? 'bg-shocking text-white shocking-border shocking-pulse'
                  : 'text-neon-dim border-border'
              }
              variant={setup.scoringMode === 'BEST_OF_1' ? 'default' : 'outline'}
              onClick={() => updateSetup({ scoringMode: 'BEST_OF_1' })}
            >
              Un solo set
            </Button>
            <Button
              className={
                setup.scoringMode === 'BEST_OF_3'
                  ? 'bg-shocking text-white shocking-border shocking-pulse'
                  : 'text-neon-dim border-border'
              }
              variant={setup.scoringMode === 'BEST_OF_3' ? 'default' : 'outline'}
              onClick={() => updateSetup({ scoringMode: 'BEST_OF_3' })}
            >
              Miglior dei 3
            </Button>
          </div>
        </div>
      ) : (
        <>
        <div className="space-y-3">
          <p className="text-center text-neon-dim text-sm">Punteggio massimo per partita</p>
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              className="text-neon border-border"
              onClick={() => updateSetup({ maxPoints: Math.max(5, setup.maxPoints - 1) })}
            >
              -
            </Button>
            <Input
              type="number"
              value={setup.maxPoints}
              onChange={(e) => updateSetup({ maxPoints: Math.max(5, parseInt(e.target.value) || 16) })}
              className="w-20 text-center bg-surface text-neon border-border"
              min={5}
            />
            <Button
              variant="outline"
              className="text-neon border-border"
              onClick={() => updateSetup({ maxPoints: setup.maxPoints + 1 })}
            >
              +
            </Button>
          </div>
          <p className="text-center text-neon-dim text-xs">
            Es: {setup.maxPoints} a 0, {setup.maxPoints - 1} a 1, {setup.maxPoints - 2} a 2...
            <br />
            In caso di parità ({Math.floor(setup.maxPoints / 2)} a {Math.floor(setup.maxPoints / 2)}) si gioca fino a +1 punto
          </p>
          <div className="flex justify-center gap-2 mt-2">
            {[15, 18, 21, 25, 30].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={setup.maxPoints === n ? 'default' : 'outline'}
                className={
                  setup.maxPoints === n
                    ? 'bg-shocking/80 text-white text-xs'
                    : 'text-neon-dim border-border text-xs'
                }
                onClick={() => updateSetup({ maxPoints: n })}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>

        {/* Win Bonus */}
        <div className="space-y-3 mt-4">
          <Separator className="bg-border" />
          <p className="text-center text-neon-dim text-sm">Punti extra premio per la vittoria</p>
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              className="text-neon border-border"
              onClick={() => updateSetup({ winBonus: Math.max(0, setup.winBonus - 1) })}
            >
              -
            </Button>
            <Input
              type="number"
              value={setup.winBonus}
              onChange={(e) => updateSetup({ winBonus: Math.max(0, parseInt(e.target.value) || 0) })}
              className="w-20 text-center bg-surface text-neon border-border"
              min={0}
            />
            <Button
              variant="outline"
              className="text-neon border-border"
              onClick={() => updateSetup({ winBonus: setup.winBonus + 1 })}
            >
              +
            </Button>
          </div>
          <p className="text-center text-neon-dim text-xs">
            Es: vince {setup.maxPoints - 2} a {2} → vincitore ottiene {setup.maxPoints - 2 + setup.winBonus} pt, perdente {2} pt
          </p>
          <div className="flex justify-center gap-2 mt-2">
            {[0, 1, 2, 3, 5].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={setup.winBonus === n ? 'default' : 'outline'}
                className={
                  setup.winBonus === n
                    ? 'bg-shocking/80 text-white text-xs'
                    : 'text-neon-dim border-border text-xs'
                }
                onClick={() => updateSetup({ winBonus: n })}
              >
                {n === 0 ? '0 (no bonus)' : `+${n}`}
              </Button>
            ))}
          </div>
        </div>
        </>
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          className="text-neon-dim border-border"
          onClick={() => setWizardStep('courts-days')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
        </Button>
        <Button
          onClick={handleNext}
          className="bg-shocking text-white hover:bg-shocking/80 font-bold shocking-pulse"
        >
          Avanti <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function ConfirmStep() {
  const { setup, setWizardStep } = useTournamentStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: setup.players.map((p) => ({ name: p.name, gender: p.gender })),
          isMixed: setup.isMixed,
          isFixedPairs: setup.isFixedPairs,
          fixedPairs: setup.isFixedPairs ? setup.fixedPairs : [],
          numCourts: setup.numCourts,
          numDays: setup.numDays,
          scoringType: setup.scoringType,
          scoringMode: setup.scoringMode,
          maxPoints: setup.maxPoints,
          winBonus: setup.winBonus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Errore nella creazione del torneo');
        setLoading(false);
        return;
      }

      // Refresh tournament data
      const tournamentRes = await fetch('/api/tournament');
      const tournamentData = await tournamentRes.json();

      if (tournamentData.exists) {
        useTournamentStore.getState().setTournament(tournamentData.tournament);
        useTournamentStore.getState().setView('tournament');
      }
    } catch (err) {
      setError('Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  };

  const scoringLabel =
    setup.scoringType === 'SETS'
      ? setup.scoringMode === 'BEST_OF_1'
        ? 'Un set'
        : 'Miglior dei 3 set'
      : `A ${setup.maxPoints} punti (bonus +${setup.winBonus})`;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold neon-text">Conferma Torneo</h2>
        <p className="text-neon-dim text-sm">Rivedi le impostazioni prima di creare</p>
      </div>

      <Card className="neon-border max-w-lg mx-auto">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-neon-dim">Giocatori:</span>
            <span className="text-neon font-bold">{setup.numPlayers}</span>
          </div>
          <Separator className="bg-border" />
          <div className="flex justify-between">
            <span className="text-neon-dim">Misto:</span>
            <Badge className={setup.isMixed ? 'bg-shocking text-white' : 'bg-surface text-neon border border-border'}>
              {setup.isMixed ? 'Sì' : 'No'}
            </Badge>
          </div>
          <Separator className="bg-border" />
          <div className="flex justify-between">
            <span className="text-neon-dim">Coppie:</span>
            <Badge className={setup.isFixedPairs ? 'bg-shocking text-white' : 'bg-surface text-neon border border-border'}>
              {setup.isFixedPairs ? 'Fisse' : 'Mobili'}
            </Badge>
          </div>
          <Separator className="bg-border" />
          <div className="flex justify-between">
            <span className="text-neon-dim">Campi:</span>
            <span className="text-neon font-bold">{setup.numCourts}</span>
          </div>
          <Separator className="bg-border" />
          <div className="flex justify-between">
            <span className="text-neon-dim">Giornate:</span>
            <span className="text-neon font-bold">{setup.numDays}</span>
          </div>
          <Separator className="bg-border" />
          <div className="flex justify-between">
            <span className="text-neon-dim">Punteggio:</span>
            <span className="text-neon font-bold">{scoringLabel}</span>
          </div>

          <Separator className="bg-border" />
          <div>
            <span className="text-neon-dim text-sm">Giocatori:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {setup.players.map((p, i) => (
                <Badge key={i} className="bg-surface text-neon border border-border text-xs">
                  {p.name} {p.gender === 'M' ? '♂' : '♀'}
                </Badge>
              ))}
            </div>
          </div>

          {setup.isFixedPairs && setup.fixedPairs.length > 0 && (
            <>
              <Separator className="bg-border" />
              <div>
                <span className="text-neon-dim text-sm">Coppie:</span>
                <div className="mt-1 space-y-1">
                  {setup.fixedPairs.map((fp, i) => (
                    <div key={i} className="text-neon text-xs">
                      <Badge className="bg-neon/10 text-neon border border-neon mr-1">{i + 1}</Badge>
                      {setup.players[fp.player1Index].name} & {setup.players[fp.player2Index].name}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-center text-destructive flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          className="text-neon-dim border-border"
          onClick={() => setWizardStep('scoring')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
        </Button>
        <Button
          onClick={handleCreate}
          disabled={loading}
          className="bg-neon text-black font-bold hover:bg-neon/80 neon-pulse text-lg px-8"
        >
          {loading ? 'Creazione...' : '⚡ CREA TORNEO'}
        </Button>
      </div>
    </div>
  );
}

export default function SetupWizard() {
  const { wizardStep } = useTournamentStore();

  const getSteps = (): typeof STEPS => {
    const allSteps = [...STEPS];
    const { isFixedPairs } = useTournamentStore.getState().setup;

    // Show/hide define-pairs based on fixed pairs selection
    if (wizardStep === 'mixed' || wizardStep === 'fixed-pairs') {
      return allSteps;
    }

    if (!isFixedPairs && wizardStep !== 'define-pairs') {
      return allSteps.filter((s) => s.key !== 'define-pairs');
    }

    return allSteps;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold neon-text mb-1">🎾 Padel Americano</h1>
          <p className="text-neon-dim text-sm">Configura il tuo torneo</p>
        </div>

        <Card className="neon-border">
          <CardContent className="p-6">
            <StepIndicator current={wizardStep} steps={getSteps()} />
            {wizardStep === 'num-players' && <NumPlayersStep />}
            {wizardStep === 'player-names' && <PlayerNamesStep />}
            {wizardStep === 'mixed' && <MixedStep />}
            {wizardStep === 'fixed-pairs' && <FixedPairsStep />}
            {wizardStep === 'define-pairs' && <DefinePairsStep />}
            {wizardStep === 'courts-days' && <CourtsDaysStep />}
            {wizardStep === 'scoring' && <ScoringStep />}
            {wizardStep === 'confirm' && <ConfirmStep />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
