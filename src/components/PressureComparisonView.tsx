/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { PRESET_REACTIONS } from '../data/reactions';
import { calculateKc, calculateQc, stepKineticsRK4, calculatePressure } from '../utils/chemistry';
import { TimePoint } from '../types/equilibrium';
import {
  GitCompare,
  Minimize2,
  Maximize2,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export const PressureComparisonView: React.FC = () => {
  const rxHI = PRESET_REACTIONS.find((r) => r.id === 'hi_synthesis')!;
  const rxHaber = PRESET_REACTIONS.find((r) => r.id === 'haber_bosch')!;

  const [volume, setVolume] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);

  // States for System 1 (HI)
  const [cHI, setCHI] = useState<Record<string, number>>({ H2: 1.0, I2: 1.0, HI: 0.0 });
  const [historyHI, setHistoryHI] = useState<TimePoint[]>([]);

  // States for System 2 (Haber-Bosch NH3)
  const [cNH3, setCNH3] = useState<Record<string, number>>({ N2: 1.0, H2: 3.0, NH3: 0.0 });
  const [historyNH3, setHistoryNH3] = useState<TimePoint[]>([]);

  const [simTime, setSimTime] = useState<number>(0);
  const [perturbationApplied, setPerturbationApplied] = useState<boolean>(false);
  const [perturbationTime, setPerturbationTime] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);

  // Kc values
  const kcHI = calculateKc(rxHI, rxHI.defaultTemp);
  const kcNH3 = calculateKc(rxHaber, rxHaber.defaultTemp);

  // Reset function
  const handleReset = () => {
    setVolume(1.0);
    setCHI({ H2: 1.0, I2: 1.0, HI: 0.0 });
    setCNH3({ N2: 1.0, H2: 3.0, NH3: 0.0 });
    setHistoryHI([]);
    setHistoryNH3([]);
    setSimTime(0);
    setPerturbationApplied(false);
    setPerturbationTime(null);
    setIsPlaying(true);
  };

  // Master perturbation: compress or expand volume simultaneously
  const handleApplyVolumeChange = (newVol: number) => {
    const oldVol = volume;
    const factor = oldVol / newVol;

    // Concentrations change instantaneously by factor
    setCHI((prev) => {
      const next: Record<string, number> = {};
      for (const [k, v] of Object.entries(prev)) {
        next[k] = v * factor;
      }
      return next;
    });

    setCNH3((prev) => {
      const next: Record<string, number> = {};
      for (const [k, v] of Object.entries(prev)) {
        next[k] = v * factor;
      }
      return next;
    });

    setVolume(newVol);
    setPerturbationApplied(true);
    setPerturbationTime(simTime);
    setIsPlaying(true);
  };

  // Physics animation tick
  useEffect(() => {
    if (!isPlaying) return;

    const dt = 0.1 * speed;
    const interval = 60; // ms

    timerRef.current = window.setInterval(() => {
      setSimTime((prevT) => {
        const nextT = prevT + dt;

        // Step HI
        setCHI((prevC) => {
          const nextC = stepKineticsRK4(rxHI, prevC, dt, kcHI);
          const qc = calculateQc(rxHI, nextC);
          const p = calculatePressure(nextC, rxHI.defaultTemp, volume);

          setHistoryHI((h) => [
            ...h.slice(-120),
            {
              t: nextT,
              concentrations: nextC,
              rates: { forward: 0, reverse: 0 },
              Qc: qc,
              Kc: kcHI,
              isEquilibrium: Math.abs(qc - kcHI) / kcHI < 0.02,
              volume,
              temperature: rxHI.defaultTemp,
              pressure: p,
            },
          ]);
          return nextC;
        });

        // Step Haber NH3
        setCNH3((prevC) => {
          const nextC = stepKineticsRK4(rxHaber, prevC, dt, kcNH3);
          const qc = calculateQc(rxHaber, nextC);
          const p = calculatePressure(nextC, rxHaber.defaultTemp, volume);

          setHistoryNH3((h) => [
            ...h.slice(-120),
            {
              t: nextT,
              concentrations: nextC,
              rates: { forward: 0, reverse: 0 },
              Qc: qc,
              Kc: kcNH3,
              isEquilibrium: Math.abs(qc - kcNH3) / kcNH3 < 0.02,
              volume,
              temperature: rxHaber.defaultTemp,
              pressure: p,
            },
          ]);
          return nextC;
        });

        return nextT;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, volume, kcHI, kcNH3, rxHI, rxHaber]);

  // Mini Chart Renderer
  const renderComparisonChart = (
    title: string,
    equation: string,
    deltaN: number,
    history: TimePoint[],
    species: { id: string; formula: string; color: string; isReactant: boolean }[]
  ) => {
    const width = 380;
    const height = 200;
    const pad = { top: 25, right: 15, bottom: 25, left: 45 };
    const gw = width - pad.left - pad.right;
    const gh = height - pad.top - pad.bottom;

    const maxT = Math.max(10, ...history.map((h) => h.t));
    let maxC = 0.5;
    for (const h of history) {
      for (const v of Object.values(h.concentrations)) {
        if (v > maxC) maxC = v;
      }
    }
    maxC = Math.ceil(maxC * 1.15 * 10) / 10;

    const xs = (t: number) => pad.left + (t / maxT) * gw;
    const ys = (c: number) => pad.top + gh - (c / maxC) * gh;

    return (
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-xs font-bold text-white">{title}</h4>
            <div className="text-[11px] font-mono text-slate-300">{equation}</div>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              deltaN === 0
                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            Δn = {deltaN}
          </span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 0.5, 1].map((pct) => (
            <g key={pct}>
              <line
                x1={pad.left}
                y1={pad.top + gh * (1 - pct)}
                x2={width - pad.right}
                y2={pad.top + gh * (1 - pct)}
                stroke="#334155"
                strokeWidth="0.5"
                strokeDasharray="2 3"
              />
              <text
                x={pad.left - 5}
                y={pad.top + gh * (1 - pct) + 3}
                fill="#94a3b8"
                fontSize="9"
                textAnchor="end"
                fontFamily="monospace"
              >
                {(pct * maxC).toFixed(1)}
              </text>
            </g>
          ))}

          {/* Perturbation vertical line */}
          {perturbationTime && (
            <line
              x1={xs(perturbationTime)}
              y1={pad.top}
              x2={xs(perturbationTime)}
              y2={pad.top + gh}
              stroke="#f43f5e"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Species paths */}
          {species.map((sp) => {
            const d = history.reduce((acc, pt, idx) => {
              const x = xs(pt.t);
              const y = ys(pt.concentrations[sp.id] ?? 0);
              return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
            }, '');

            return (
              <path
                key={sp.id}
                d={d}
                fill="none"
                stroke={sp.color}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[10px]">
          {species.map((sp) => (
            <div key={sp.id} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sp.color }} />
              <span className="font-semibold text-slate-300">{sp.formula}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Comparativa de Efecto de la Presión: Δn = 0 vs Δn ≠ 0
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Demostración experimental de por qué la variación de presión afecta a Haber-Bosch (N₂ + 3H₂ ⇌ 2NH₃) pero NO a la síntesis de HI (H₂ + I₂ ⇌ 2HI).
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pausar' : 'Reanudar'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar
          </button>
        </div>
      </div>

      {/* Synchronized Perturbation Control Bar */}
      <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-300">
            Control de Presión Sincronizado:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleApplyVolumeChange(0.5)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-all"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Comprimir V al 50% (Duplicar Presión)
            </button>
            <button
              onClick={() => handleApplyVolumeChange(0.33)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-medium shadow-sm transition-all"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Comprimir V al 33% (Triplicar Presión)
            </button>
            <button
              onClick={() => handleApplyVolumeChange(2.0)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Expandir V al doble (Bajar Presión a 50%)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-400">Volumen V:</span>
          <span className="text-sm font-bold text-indigo-300">{volume.toFixed(2)} L</span>
        </div>
      </div>

      {/* Dual Comparative Side-by-Side Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reaction 1: HI */}
        {renderComparisonChart(
          rxHI.title,
          rxHI.equation,
          rxHI.deltaN,
          historyHI,
          rxHI.species
        )}

        {/* Reaction 2: Haber-Bosch */}
        {renderComparisonChart(
          rxHaber.title,
          rxHaber.equation,
          rxHaber.deltaN,
          historyNH3,
          rxHaber.species
        )}
      </div>

      {/* Scientific Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* HI Card */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl text-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-200 font-bold">
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
            <span>Caso Δn = 0: H₂ + I₂ ⇌ 2 HI</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Hay <strong>2 moles de reactivos</strong> (1 mol H₂ + 1 mol I₂) y <strong>2 moles de producto</strong> (2 mol HI).
          </p>
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
            Qc = [HI]² / ([H₂][I₂]) = (c_HI · f)² / ((c_H2 · f) · (c_I2 · f)) = Qc,₀
          </div>
          <p className="text-amber-300/90 font-medium">
            Resultado: El factor de volumen f² se cancela en numerador y denominador. Las concentraciones suben por compresión, pero la proporción relativa de moles <strong>no cambia en absoluto</strong>.
          </p>
        </div>

        {/* Haber Card */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-300 font-bold">
            <AlertTriangle className="w-4 h-4 text-emerald-400" />
            <span>Caso Δn = -2: N₂ + 3 H₂ ⇌ 2 NH₃ (Haber-Bosch)</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Hay <strong>4 moles de reactivos</strong> (1 mol N₂ + 3 mol H₂) y solo <strong>2 moles de productos</strong> (2 mol NH₃).
          </p>
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
            Qc = [NH₃]² / ([N₂][H₂]³) = (c_NH3·f)² / (c_N2·f · (c_H2·f)³) = Qc,₀ · (1/f)²
          </div>
          <p className="text-emerald-300/90 font-medium">
            Resultado: Al comprimir (f &gt; 1), Qc &lt; Kc. El sistema responde desplazándose fuertemente a la <strong>DERECHA (→)</strong>, formando más NH₃ para reducir el número total de moléculas y aliviar la presión.
          </p>
        </div>
      </div>
    </div>
  );
};
