/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ReactionConfig, TimePoint, PerturbationEvent } from '../types/equilibrium';
import { Activity, Clock, Zap, Layers, Sparkles } from 'lucide-react';

interface EquilibriumChartProps {
  reaction: ReactionConfig;
  history: TimePoint[];
  perturbations: PerturbationEvent[];
  currentTime: number;
  isEquilibrium: boolean;
}

export const EquilibriumChart: React.FC<EquilibriumChartProps> = ({
  reaction,
  history,
  perturbations,
  currentTime,
  isEquilibrium,
}) => {
  const [viewMode, setViewMode] = useState<'concentrations' | 'rates'>('concentrations');
  const [hoveredPoint, setHoveredPoint] = useState<TimePoint | null>(null);

  // Chart dimensions
  const width = 800;
  const height = 360;
  const padding = { top: 40, right: 30, bottom: 45, left: 65 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Compute maximum values for scaling
  const maxTime = Math.max(10, ...history.map((p) => p.t));

  const maxConcentration = useMemo(() => {
    let maxC = 0.5;
    for (const p of history) {
      for (const val of Object.values(p.concentrations)) {
        if (val > maxC) maxC = val;
      }
    }
    return Math.ceil((maxC * 1.15) * 10) / 10;
  }, [history]);

  const maxRate = useMemo(() => {
    let maxR = 0.05;
    for (const p of history) {
      if (p.rates.forward > maxR) maxR = p.rates.forward;
      if (p.rates.reverse > maxR) maxR = p.rates.reverse;
    }
    return Math.ceil((maxR * 1.25) * 100) / 100;
  }, [history]);

  // Coordinate transforms
  const xScale = (t: number) => padding.left + (t / maxTime) * graphWidth;
  const yConcScale = (c: number) => padding.top + graphHeight - (c / maxConcentration) * graphHeight;
  const yRateScale = (r: number) => padding.top + graphHeight - (r / maxRate) * graphHeight;

  // Find when equilibrium was first reached in current segment
  const equilibriumStartPoint = useMemo(() => {
    return history.find((p) => p.isEquilibrium);
  }, [history]);

  // Generate SVG path for a species concentration
  const generateConcentrationPath = (speciesId: string) => {
    if (history.length === 0) return '';
    return history.reduce((path, pt, index) => {
      const x = xScale(pt.t);
      const val = pt.concentrations[speciesId] ?? 0;
      const y = yConcScale(val);
      return index === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${path} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  };

  // Generate SVG path for reaction rates
  const generateRatePath = (type: 'forward' | 'reverse') => {
    if (history.length === 0) return '';
    return history.reduce((path, pt, index) => {
      const x = xScale(pt.t);
      const val = pt.rates[type] ?? 0;
      const y = yRateScale(val);
      return index === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${path} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  };

  // Handle mouse move over chart for inspection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;

    if (svgX < padding.left || svgX > width - padding.right || history.length === 0) {
      setHoveredPoint(null);
      return;
    }

    const tHover = ((svgX - padding.left) / graphWidth) * maxTime;
    // Find closest history point
    let closest = history[0];
    let minDiff = Math.abs(closest.t - tHover);
    for (const pt of history) {
      const diff = Math.abs(pt.t - tHover);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }
    setHoveredPoint(closest);
  };

  const currentPoint = hoveredPoint || history[history.length - 1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              {viewMode === 'concentrations'
                ? 'Evolución de Concentraciones [X] vs Tiempo'
                : 'Cinética: Velocidades de Reacción (vd vs vi)'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Muestra la transición desde el estado fuera de equilibrio hasta el equilibrio dinámico y perturbaciones
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('concentrations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'concentrations'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Concentración [M]
          </button>
          <button
            onClick={() => setViewMode('rates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'rates'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Velocidades (vd / vi)
          </button>
        </div>
      </div>

      {/* Dynamic Zone Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-slate-950/70 border border-slate-800/80 px-3.5 py-2 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Estado actual del sistema:</span>
          {isEquilibrium ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ZONA DE EQUILIBRIO DINÁMICO (vd = vi, Qc ≈ Kc)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              ZONA FUERA DEL EQUILIBRIO (Cinética activa, Qc ≠ Kc)
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
          <div>
            <span className="text-slate-500">t = </span>
            <span className="font-bold text-white">{currentTime.toFixed(1)}s</span>
          </div>
          <div>
            <span className="text-slate-500">Qc = </span>
            <span className="font-bold text-amber-300">
              {currentPoint?.Qc < 1000 ? currentPoint?.Qc.toFixed(3) : currentPoint?.Qc.toExponential(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Kc = </span>
            <span className="font-bold text-emerald-400">
              {currentPoint?.Kc < 1000 ? currentPoint?.Kc.toFixed(3) : currentPoint?.Kc.toExponential(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Main SVG Graph */}
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-950 border border-slate-800">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="eqZoneGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="nonEqZoneGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
            </linearGradient>
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect
            x={padding.left}
            y={padding.top}
            width={graphWidth}
            height={graphHeight}
            fill="url(#gridPattern)"
          />

          {/* Equilibrium shaded region if reached */}
          {equilibriumStartPoint && (
            <g>
              <rect
                x={xScale(equilibriumStartPoint.t)}
                y={padding.top}
                width={width - padding.right - xScale(equilibriumStartPoint.t)}
                height={graphHeight}
                fill="url(#eqZoneGradient)"
              />
              <line
                x1={xScale(equilibriumStartPoint.t)}
                y1={padding.top}
                x2={xScale(equilibriumStartPoint.t)}
                y2={padding.top + graphHeight}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text
                x={xScale(equilibriumStartPoint.t) + 6}
                y={padding.top + 16}
                fill="#10b981"
                fontSize="10"
                fontWeight="600"
              >
                Equilibrio alcanzado
              </text>
            </g>
          )}

          {/* Outside equilibrium region indicator */}
          {equilibriumStartPoint && xScale(equilibriumStartPoint.t) > padding.left + 20 && (
            <g>
              <rect
                x={padding.left}
                y={padding.top}
                width={xScale(equilibriumStartPoint.t) - padding.left}
                height={graphHeight}
                fill="url(#nonEqZoneGradient)"
              />
              <text
                x={padding.left + 8}
                y={padding.top + 16}
                fill="#f59e0b"
                fontSize="10"
                fontWeight="600"
              >
                Fase Cinética (Fuera de Eq.)
              </text>
            </g>
          )}

          {/* Y Axis Grid Lines & Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padding.top + graphHeight * (1 - pct);
            const val =
              viewMode === 'concentrations' ? pct * maxConcentration : pct * maxRate;
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="0.75"
                  strokeDasharray="2 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* X Axis Grid Lines & Labels (Time in s) */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct) => {
            const x = padding.left + graphWidth * pct;
            const tVal = pct * maxTime;
            return (
              <g key={pct}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + graphHeight}
                  stroke="#334155"
                  strokeWidth="0.75"
                  strokeDasharray="2 4"
                />
                <text
                  x={x}
                  y={padding.top + graphHeight + 18}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {tVal.toFixed(0)}s
                </text>
              </g>
            );
          })}

          {/* Axes Lines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + graphHeight}
            stroke="#64748b"
            strokeWidth="1.5"
          />
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={width - padding.right}
            y2={padding.top + graphHeight}
            stroke="#64748b"
            strokeWidth="1.5"
          />

          {/* Axis Titles */}
          <text
            x={width / 2}
            y={height - 8}
            textAnchor="middle"
            fill="#cbd5e1"
            fontSize="11"
            fontWeight="500"
          >
            Tiempo transcurrido (segundos)
          </text>
          <text
            x={-(padding.top + graphHeight / 2)}
            y={16}
            transform="rotate(-90)"
            textAnchor="middle"
            fill="#cbd5e1"
            fontSize="11"
            fontWeight="500"
          >
            {viewMode === 'concentrations' ? 'Concentración molar [mol/L]' : 'Velocidad de reacción [mol/(L·s)]'}
          </text>

          {/* Perturbation vertical markers */}
          {perturbations.map((pert) => {
            const px = xScale(pert.t);
            if (px < padding.left || px > width - padding.right) return null;
            return (
              <g key={pert.id}>
                <line
                  x1={px}
                  y1={padding.top}
                  x2={px}
                  y2={padding.top + graphHeight}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <circle cx={px} cy={padding.top + 10} r="4" fill="#f43f5e" />
                <text
                  x={px + 4}
                  y={padding.top + 32}
                  fill="#f43f5e"
                  fontSize="9"
                  fontWeight="bold"
                >
                  ⚡ Perturbación
                </text>
              </g>
            );
          })}

          {/* Data Lines */}
          {viewMode === 'concentrations' ? (
            // Species concentrations
            reaction.species.map((sp) => {
              const pathStr = generateConcentrationPath(sp.id);
              return (
                <path
                  key={sp.id}
                  d={pathStr}
                  fill="none"
                  stroke={sp.color}
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })
          ) : (
            // Reaction rates (Forward and Reverse)
            <>
              <path
                d={generateRatePath('forward')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={generateRatePath('reverse')}
                fill="none"
                stroke="#f97316"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Hover Crosshair and Inspection Tooltip */}
          {hoveredPoint && (
            <g>
              <line
                x1={xScale(hoveredPoint.t)}
                y1={padding.top}
                x2={xScale(hoveredPoint.t)}
                y2={padding.top + graphHeight}
                stroke="#ffffff"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.7"
              />
              {/* Highlight dots on lines */}
              {viewMode === 'concentrations'
                ? reaction.species.map((sp) => {
                    const c = hoveredPoint.concentrations[sp.id] ?? 0;
                    return (
                      <circle
                        key={sp.id}
                        cx={xScale(hoveredPoint.t)}
                        cy={yConcScale(c)}
                        r="4.5"
                        fill={sp.color}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    );
                  })
                : [
                    { key: 'forward', color: '#38bdf8', val: hoveredPoint.rates.forward },
                    { key: 'reverse', color: '#f97316', val: hoveredPoint.rates.reverse },
                  ].map((item) => (
                    <circle
                      key={item.key}
                      cx={xScale(hoveredPoint.t)}
                      cy={yRateScale(item.val)}
                      r="4.5"
                      fill={item.color}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  ))}
            </g>
          )}
        </svg>

        {/* Hover / Current Tooltip Floating Info */}
        <div className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-lg pointer-events-none text-xs">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5 mb-2">
            <span className="text-slate-400 font-mono">
              t = {currentPoint?.t.toFixed(1)} s
            </span>
            <span
              className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                currentPoint?.isEquilibrium
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {currentPoint?.isEquilibrium ? 'En Equilibrio' : 'Fuera de Eq.'}
            </span>
          </div>

          {viewMode === 'concentrations' ? (
            <div className="space-y-1">
              {reaction.species.map((sp) => (
                <div key={sp.id} className="flex items-center justify-between gap-4 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: sp.color }}
                    />
                    <span className="text-slate-300 font-sans">{sp.formula}:</span>
                  </div>
                  <span className="font-bold text-white">
                    {(currentPoint?.concentrations[sp.id] ?? 0).toFixed(4)} M
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-sky-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span>vd (Directa):</span>
                </div>
                <span className="font-bold text-white">
                  {currentPoint?.rates.forward.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-orange-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                  <span>vi (Inversa):</span>
                </div>
                <span className="font-bold text-white">
                  {currentPoint?.rates.reverse.toFixed(4)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend & Summary Cards */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-400 font-medium">Leyenda:</span>
          {viewMode === 'concentrations' ? (
            reaction.species.map((sp) => (
              <div key={sp.id} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: sp.color }}
                />
                <span className="text-slate-200 font-semibold">{sp.formula}</span>
                <span className="text-slate-500 text-[11px]">
                  ({sp.isReactant ? 'Reactivo' : 'Producto'}, {sp.coefficient} mol)
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400" />
                <span className="text-slate-200 font-semibold">vd (Directa: Reactivos → Productos)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-400" />
                <span className="text-slate-200 font-semibold">vi (Inversa: Productos → Reactivos)</span>
              </div>
            </>
          )}
        </div>

        <div className="text-slate-400 text-[11px]">
          Pasa el cursor sobre el gráfico para ver datos numéricos en cada instante.
        </div>
      </div>
    </div>
  );
};
