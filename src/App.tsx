/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PRESET_REACTIONS } from './data/reactions';
import { ReactionConfig, TimePoint, PerturbationEvent, PerturbationType } from './types/equilibrium';
import {
  calculateKc,
  calculateQc,
  calculateRates,
  stepKineticsRK4,
  calculatePressure,
  checkEquilibrium,
  solveEquilibriumConcentrations,
  getLeChatelierExplanation,
} from './utils/chemistry';

import { EquilibriumChart } from './components/EquilibriumChart';
import { ReactorPiston } from './components/ReactorPiston';
import { QcKcBalance } from './components/QcKcBalance';
import { LeChatelierControls } from './components/LeChatelierControls';
import { RiceTable } from './components/RiceTable';
import { PressureComparisonView } from './components/PressureComparisonView';
import { LeChatelierQuiz } from './components/LeChatelierQuiz';
import { TheoryModal } from './components/TheoryModal';

import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Zap,
  FlaskConical,
  GitCompare,
  HelpCircle,
  BookOpen,
  Info,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'simulator' | 'pressure-compare' | 'quiz'>('simulator');
  const [isTheoryOpen, setIsTheoryOpen] = useState<boolean>(false);

  // Selected Reaction
  const [selectedReaction, setSelectedReaction] = useState<ReactionConfig>(PRESET_REACTIONS[0]);

  // Thermodynamic & Container Variables
  const [temperature, setTemperature] = useState<number>(selectedReaction.defaultTemp);
  const [volume, setVolume] = useState<number>(selectedReaction.defaultVolume);
  const [catalystActive, setCatalystActive] = useState<boolean>(false);

  // Concentrations state
  const [initialConcentrations, setInitialConcentrations] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const s of selectedReaction.species) {
      init[s.id] = s.initialConcentration;
    }
    return init;
  });

  const [currentConcentrations, setCurrentConcentrations] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const s of selectedReaction.species) {
      init[s.id] = s.initialConcentration;
    }
    return init;
  });

  // Simulation state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [simTime, setSimTime] = useState<number>(0);
  const [history, setHistory] = useState<TimePoint[]>([]);
  const [perturbations, setPerturbations] = useState<PerturbationEvent[]>([]);
  const [lastExplanation, setLastExplanation] = useState<{
    title: string;
    description: string;
    direction: 'right' | 'left' | 'none';
    detail: string;
  } | null>(null);

  const timerRef = useRef<number | null>(null);

  // Dynamic equilibrium constant Kc(T)
  const currentKc = useMemo(() => {
    return calculateKc(selectedReaction, temperature);
  }, [selectedReaction, temperature]);

  // Current quotient Qc
  const currentQc = useMemo(() => {
    return calculateQc(selectedReaction, currentConcentrations);
  }, [selectedReaction, currentConcentrations]);

  // Current rates
  const currentRates = useMemo(() => {
    const cat = catalystActive ? 3.0 : 1.0;
    return calculateRates(selectedReaction, currentConcentrations, currentKc, cat);
  }, [selectedReaction, currentConcentrations, currentKc, catalystActive]);

  // Pressure
  const currentPressure = useMemo(() => {
    return calculatePressure(currentConcentrations, temperature, volume);
  }, [currentConcentrations, temperature, volume]);

  // Equilibrium flag
  const isEquilibrium = useMemo(() => {
    return checkEquilibrium(currentRates, currentQc, currentKc);
  }, [currentRates, currentQc, currentKc]);

  // Switch reaction handler
  const handleSelectReaction = (rx: ReactionConfig) => {
    setSelectedReaction(rx);
    setTemperature(rx.defaultTemp);
    setVolume(rx.defaultVolume);
    setCatalystActive(false);

    const initC: Record<string, number> = {};
    for (const s of rx.species) {
      initC[s.id] = s.initialConcentration;
    }
    setInitialConcentrations(initC);
    setCurrentConcentrations(initC);
    setSimTime(0);
    setHistory([]);
    setPerturbations([]);
    setLastExplanation(null);
    setIsPlaying(true);
  };

  // Reset current reaction to initial values
  const handleReset = () => {
    setCurrentConcentrations({ ...initialConcentrations });
    setVolume(selectedReaction.defaultVolume);
    setTemperature(selectedReaction.defaultTemp);
    setCatalystActive(false);
    setSimTime(0);
    setHistory([]);
    setPerturbations([]);
    setLastExplanation(null);
    setIsPlaying(true);
  };

  // Instant jump to theoretical equilibrium
  const handleJumpToEquilibrium = () => {
    const { concentrations: eqC } = solveEquilibriumConcentrations(
      selectedReaction,
      currentConcentrations,
      currentKc
    );
    setCurrentConcentrations(eqC);
    const rates = calculateRates(selectedReaction, eqC, currentKc, catalystActive ? 3.0 : 1.0);
    const qc = calculateQc(selectedReaction, eqC);
    const p = calculatePressure(eqC, temperature, volume);

    setHistory((prev) => [
      ...prev,
      {
        t: simTime + 0.5,
        concentrations: eqC,
        rates,
        Qc: qc,
        Kc: currentKc,
        isEquilibrium: true,
        volume,
        temperature,
        pressure: p,
      },
    ]);
    setSimTime((t) => t + 0.5);
  };

  // Perturbation Handlers
  const handleModifyConcentration = (speciesId: string, delta: number) => {
    setCurrentConcentrations((prev) => {
      const current = prev[speciesId] ?? 0;
      const nextVal = Math.max(0.001, current + delta);
      const nextC = { ...prev, [speciesId]: nextVal };

      const pertType: PerturbationType = delta > 0 ? 'conc_add' : 'conc_remove';
      const expl = getLeChatelierExplanation(selectedReaction, pertType, { speciesId });
      setLastExplanation(expl);

      setPerturbations((p) => [
        ...p,
        {
          id: `pert-${Date.now()}`,
          t: simTime,
          type: pertType,
          title: expl.title,
          description: expl.description,
          direction: expl.direction,
          detail: expl.detail,
        },
      ]);

      return nextC;
    });
    setIsPlaying(true);
  };

  const handleModifyTemperature = (deltaT: number) => {
    const newT = Math.max(150, Math.min(1500, temperature + deltaT));
    setTemperature(newT);
    const pertType: PerturbationType = deltaT > 0 ? 'temp_up' : 'temp_down';
    const expl = getLeChatelierExplanation(selectedReaction, pertType);
    setLastExplanation(expl);

    setPerturbations((p) => [
      ...p,
      {
        id: `pert-${Date.now()}`,
        t: simTime,
        type: pertType,
        title: expl.title,
        description: expl.description,
        direction: expl.direction,
        detail: expl.detail,
      },
    ]);
    setIsPlaying(true);
  };

  const handleSetTemperature = (newT: number) => {
    const deltaT = newT - temperature;
    setTemperature(newT);
    if (Math.abs(deltaT) > 10) {
      const pertType: PerturbationType = deltaT > 0 ? 'temp_up' : 'temp_down';
      const expl = getLeChatelierExplanation(selectedReaction, pertType);
      setLastExplanation(expl);
      setPerturbations((p) => [
        ...p,
        {
          id: `pert-${Date.now()}`,
          t: simTime,
          type: pertType,
          title: expl.title,
          description: expl.description,
          direction: expl.direction,
          detail: expl.detail,
        },
      ]);
    }
  };

  const handleModifyVolume = (multiplier: number) => {
    const newVol = Math.max(0.3, Math.min(2.5, volume * multiplier));
    const factor = volume / newVol;

    // Instantaneous scaling of all concentrations
    setCurrentConcentrations((prev) => {
      const nextC: Record<string, number> = {};
      for (const [k, v] of Object.entries(prev)) {
        nextC[k] = v * factor;
      }
      return nextC;
    });

    setVolume(newVol);
    const pertType: PerturbationType = multiplier < 1 ? 'pressure_up' : 'pressure_down';
    const expl = getLeChatelierExplanation(selectedReaction, pertType);
    setLastExplanation(expl);

    setPerturbations((p) => [
      ...p,
      {
        id: `pert-${Date.now()}`,
        t: simTime,
        type: pertType,
        title: expl.title,
        description: expl.description,
        direction: expl.direction,
        detail: expl.detail,
      },
    ]);
    setIsPlaying(true);
  };

  const handleSetVolume = (newVol: number) => {
    const factor = volume / newVol;
    setCurrentConcentrations((prev) => {
      const nextC: Record<string, number> = {};
      for (const [k, v] of Object.entries(prev)) {
        nextC[k] = v * factor;
      }
      return nextC;
    });
    setVolume(newVol);
  };

  const handleToggleCatalyst = () => {
    const nextState = !catalystActive;
    setCatalystActive(nextState);
    if (nextState) {
      const expl = getLeChatelierExplanation(selectedReaction, 'catalyst');
      setLastExplanation(expl);
      setPerturbations((p) => [
        ...p,
        {
          id: `pert-${Date.now()}`,
          t: simTime,
          type: 'catalyst',
          title: expl.title,
          description: expl.description,
          direction: expl.direction,
          detail: expl.detail,
        },
      ]);
    }
    setIsPlaying(true);
  };

  const handleAddInertGas = () => {
    const expl = getLeChatelierExplanation(selectedReaction, 'inert_gas');
    setLastExplanation(expl);
    setPerturbations((p) => [
      ...p,
      {
        id: `pert-${Date.now()}`,
        t: simTime,
        type: 'inert_gas',
        title: expl.title,
        description: expl.description,
        direction: expl.direction,
        detail: expl.detail,
      },
    ]);
  };

  // Change initial concentration before start
  const handleUpdateInitialConcentration = (spId: string, val: number) => {
    const safeVal = Math.max(0, val);
    setInitialConcentrations((prev) => ({ ...prev, [spId]: safeVal }));
    if (simTime === 0) {
      setCurrentConcentrations((prev) => ({ ...prev, [spId]: safeVal }));
    }
  };

  // Simulation Loop
  useEffect(() => {
    if (!isPlaying) return;

    const dt = 0.08 * simSpeed;
    const intervalMs = 50;

    timerRef.current = window.setInterval(() => {
      setSimTime((prevTime) => {
        const nextTime = prevTime + dt;

        setCurrentConcentrations((prevC) => {
          const cat = catalystActive ? 3.0 : 1.0;
          const nextC = stepKineticsRK4(selectedReaction, prevC, dt, currentKc, cat);
          const rates = calculateRates(selectedReaction, nextC, currentKc, cat);
          const qc = calculateQc(selectedReaction, nextC);
          const isEq = checkEquilibrium(rates, qc, currentKc);
          const p = calculatePressure(nextC, temperature, volume);

          setHistory((prevH) => {
            const nextHistory = [
              ...prevH.slice(-180),
              {
                t: nextTime,
                concentrations: nextC,
                rates,
                Qc: qc,
                Kc: currentKc,
                isEquilibrium: isEq,
                volume,
                temperature,
                pressure: p,
              },
            ];
            return nextHistory;
          });

          return nextC;
        });

        return nextTime;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, simSpeed, selectedReaction, currentKc, catalystActive, temperature, volume]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                EquilibrioQuímico<span className="text-indigo-400">Lab</span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Simulador de Procesos Reversibles y Principio de Le Châtelier
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              Simulador Interactivo
            </button>
            <button
              onClick={() => setActiveTab('pressure-compare')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'pressure-compare'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              Comparativa de Presión (Δn)
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Test de Autoevaluación
            </button>
          </div>

          {/* Theory button */}
          <button
            onClick={() => setIsTheoryOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Guía Teórica y Fórmulas
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 space-y-6">
        {activeTab === 'simulator' && (
          <>
            {/* Reaction Selector Carousel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Selecciona el Sistema Químico en Equilibrio:</span>
                <span className="text-[11px] text-indigo-400 font-normal">
                  4 reacciones de estequiometría y termodinámica diversa
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PRESET_REACTIONS.map((rx) => {
                  const isSelected = selectedReaction.id === rx.id;
                  return (
                    <button
                      key={rx.id}
                      onClick={() => handleSelectReaction(rx)}
                      className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {rx.species.length} especies
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              rx.deltaN === 0
                                ? 'bg-slate-800 text-slate-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            Δn = {rx.deltaN > 0 ? `+${rx.deltaN}` : rx.deltaN}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white mb-1">{rx.title}</h4>
                        <div className="text-xs font-mono text-indigo-300 font-bold mb-2">
                          {rx.equation}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>ΔH = {rx.deltaH} kJ</span>
                        <span className="text-slate-300 font-sans">
                          {rx.deltaH < 0 ? 'Exotérmica' : 'Endotérmica'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulation Control Bar & Initial Reactants Customization */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
              {/* Playback buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                    isPlaying
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pausar Simulación' : 'Iniciar / Reanudar'}
                </button>

                <button
                  onClick={handleJumpToEquilibrium}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-700/80 hover:bg-indigo-600 text-indigo-100 border border-indigo-500/40 text-xs font-semibold transition-all shadow-sm"
                  title="Calcula el estado analítico y salta inmediatamente al equilibrio"
                >
                  <FastForward className="w-3.5 h-3.5 text-indigo-300" />
                  Ir al Equilibrio
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all"
                  title="Reiniciar a t = 0 con concentraciones iniciales"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reiniciar
                </button>
              </div>

              {/* Speed control */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Velocidad:</span>
                {[0.5, 1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSimSpeed(spd)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-all ${
                      simSpeed === spd
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Initial concentrations modification drawer */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-slate-400 font-medium">Concentraciones Iniciales [X]₀:</span>
                {selectedReaction.species.map((sp) => (
                  <div
                    key={sp.id}
                    className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sp.color }} />
                    <span className="text-slate-300">{sp.formula}:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={initialConcentrations[sp.id] ?? 0}
                      onChange={(e) =>
                        handleUpdateInitialConcentration(sp.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white text-center font-bold focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-slate-500 text-[10px]">M</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Explanation Banner if perturbation was applied */}
            {lastExplanation && (
              <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-2xl p-4 shadow-lg flex items-start gap-3 animate-fade-in">
                <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 shrink-0">
                  <Zap className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      Respuesta del Sistema (Le Châtelier)
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        lastExplanation.direction === 'right'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : lastExplanation.direction === 'left'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {lastExplanation.direction === 'right'
                        ? 'Desplazamiento a Productos (→)'
                        : lastExplanation.direction === 'left'
                        ? 'Desplazamiento a Reactivos (←)'
                        : 'Sin Desplazamiento (Inalterado)'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{lastExplanation.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {lastExplanation.description}
                  </p>
                  <p className="text-xs font-semibold text-emerald-400">{lastExplanation.detail}</p>
                </div>
              </div>
            )}

            {/* Main Visual Row: Chart (Left) + Reactor & Balance (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Interactive Graph (takes 8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                <EquilibriumChart
                  reaction={selectedReaction}
                  history={history}
                  perturbations={perturbations}
                  currentTime={simTime}
                  isEquilibrium={isEquilibrium}
                />
              </div>

              {/* Right Column: Reactor Piston & Qc/Kc Balance (takes 4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                <ReactorPiston
                  reaction={selectedReaction}
                  concentrations={currentConcentrations}
                  volume={volume}
                  temperature={temperature}
                  pressure={currentPressure}
                  isEquilibrium={isEquilibrium}
                />

                <QcKcBalance
                  reaction={selectedReaction}
                  Qc={currentQc}
                  Kc={currentKc}
                  temperature={temperature}
                  isEquilibrium={isEquilibrium}
                />
              </div>
            </div>

            {/* Le Châtelier Interactive Perturbation Controls */}
            <LeChatelierControls
              reaction={selectedReaction}
              temperature={temperature}
              volume={volume}
              catalystActive={catalystActive}
              onModifyConcentration={handleModifyConcentration}
              onModifyTemperature={handleModifyTemperature}
              onSetTemperature={handleSetTemperature}
              onModifyVolume={handleModifyVolume}
              onSetVolume={handleSetVolume}
              onToggleCatalyst={handleToggleCatalyst}
              onAddInertGas={handleAddInertGas}
              onResetToInitial={handleReset}
            />

            {/* Detailed RICE / ICE Stoichiometric Table */}
            <RiceTable
              reaction={selectedReaction}
              initialConcentrations={initialConcentrations}
              currentConcentrations={currentConcentrations}
              temperature={temperature}
              volume={volume}
              pressure={currentPressure}
            />
          </>
        )}

        {/* Tab 2: Comparative Pressure View */}
        {activeTab === 'pressure-compare' && <PressureComparisonView />}

        {/* Tab 3: Interactive Quiz */}
        {activeTab === 'quiz' && <LeChatelierQuiz />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <span>
            EquilibrioQuímicoLab · Simulador físico-químico con integración cinética RK4 y principios de Le Châtelier
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsTheoryOpen(true)}
              className="text-slate-400 hover:text-indigo-400 transition-colors"
            >
              Fórmulas y Ley de Masas
            </button>
            <span>·</span>
            <span>Guldberg & Waage (1864) / Van 't Hoff (1884)</span>
          </div>
        </div>
      </footer>

      {/* Theory Reference Modal */}
      <TheoryModal isOpen={isTheoryOpen} onClose={() => setIsTheoryOpen(false)} />
    </div>
  );
}
