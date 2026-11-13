/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ReactionConfig, TimePoint, PerturbationEvent } from '../types/equilibrium';
import { Activity, Clock, Zap, Layers, Maximize2 } from 'lucide-react';

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
  const [timeAxisMode, setTimeAxisMode] = useState<'full' | 'sliding'>('full');
  const [hoveredPoint, setHoveredPoint] = useState<TimePoint | null>(null);

  const SLIDING_WINDOW_SECONDS = 25;

  // Chart dimensions
  const width = 800;
  const height = 350;
  const padding = { top: 36, right: 24, bottom: 44, left: 62 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Compute time bounds and visible points depending on selected time axis mode
  const latestTime = history.length > 0 ? history[history.length - 1].t : currentTime;

  const minTime = useMemo(() => {
    if (timeAxisMode === 'sliding' && latestTime > SLIDING_WINDOW_SECONDS) {
      return latestTime - SLIDING_WINDOW_SECONDS;
    }
    return 0;
  }, [timeAxisMode, latestTime]);

  const maxTime = useMemo(() => {
    if (timeAxisMode === 'sliding') {
      return Math.max(SLIDING_WINDOW_SECONDS, latestTime);
    }
    // In full mode, scale smoothly from 10s upward
    return Math.max(10, latestTime);
  }, [timeAxisMode, latestTime]);

  const visibleHistory = useMemo(() => {
    if (timeAxisMode === 'full') return history;
    return history.filter((pt) => pt.t >= minTime - 0.5);
  }, [history, timeAxisMode, minTime]);

  const maxConcentration = useMemo(() => {
    let maxC = 0.5;
    const source = visibleHistory.length > 0 ? visibleHistory : history;
    for (const p of source) {
      for (const val of Object.values(p.concentrations)) {
        if (val > maxC) maxC = val;
      }
    }
    return Math.ceil(maxC * 1.15 * 10) / 10;
  }, [visibleHistory, history]);

  const maxRate = useMemo(() => {
    let maxR = 0.05;
    const source = visibleHistory.length > 0 ? visibleHistory : history;
    for (const p of source) {
      if (p.rates.forward > maxR) maxR = p.rates.forward;
      if (p.rates.reverse > maxR) maxR = p.rates.reverse;
    }
    return Math.ceil(maxR * 1.25 * 100) / 100;
  }, [visibleHistory, history]);

  // Coordinate transforms
  const timeSpan = Math.max(1e-4, maxTime - minTime);
  const xScale = (t: number) => padding.left + ((t - minTime) / timeSpan) * graphWidth;
  const yConcScale = (c: number) => padding.top + graphHeight - (c / maxConcentration) * graphHeight;
  const yRateScale = (r: number) => padding.top + graphHeight - (r / maxRate) * graphHeight;

  // Find when equilibrium starts in the latest contiguous equilibrium segment
  const equilibriumStartPoint = useMemo(() => {
    const pts = visibleHistory;
    if (pts.length === 0) return undefined;
    // Find the first point of the current equilibrium run (after last non-equilibrium point)
    let lastNonEqIdx = -1;
    for (let i = pts.length - 1; i >= 0; i--) {
      if (!pts[i].isEquilibrium) {
        lastNonEqIdx = i;
        break;
      }
    }
    if (lastNonEqIdx === pts.length - 1) return undefined;
    return pts[lastNonEqIdx + 1];
  }, [visibleHistory]);

  // Generate SVG path for a species concentration
  const generateConcentrationPath = (speciesId: string) => {
    if (visibleHistory.length === 0) return '';
    return visibleHistory.reduce((path, pt, index) => {
      const x = xScale(pt.t);
      const val = pt.concentrations[speciesId] ?? 0;
      const y = yConcScale(val);
      return index === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${path} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  };

  // Generate SVG path for reaction rates
  const generateRatePath = (type: 'forward' | 'reverse') => {
    if (visibleHistory.length === 0) return '';
    return visibleHistory.reduce((path, pt, index) => {
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

    if (svgX < padding.left || svgX > width - padding.right || visibleHistory.length === 0) {
      setHoveredPoint(null);
      return;
    }

    const tHover = minTime + ((svgX - padding.left) / graphWidth) * timeSpan;
    let closest = visibleHistory[0];
    let minDiff = Math.abs(closest.t - tHover);
    for (const pt of visibleHistory) {
      const diff = Math.abs(pt.t - tHover);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }
    setHoveredPoint(closest);
  };

  const currentPoint = hoveredPoint || history[history.length - 1];
  const eqX = equilibriumStartPoint ? xScale(equilibriumStartPoint.t) : null;

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

        {/* View & Time Axis Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time axis mode toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setTimeAxisMode('full')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                timeAxisMode === 'full'
                  ? 'bg-slate-800 text-indigo-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Ajustar la escala para ver toda la reacción desde t = 0 s"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Escala completa
            </button>
            <button
              onClick={() => setTimeAxisMode('sliding')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                timeAxisMode === 'sliding'
                  ? 'bg-slate-800 text-indigo-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Desplazar el eje de tiempo mostrando los últimos 25 segundos"
            >
              <Clock className="w-3.5 h-3.5" />
              Ventana móvil (25s)
            </button>
          </div>

          {/* Series toggle */}
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

      {/* Main SVG Graph (Unobstructed - No floating overlay!) */}
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-950 border border-slate-800">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <clipPath id="chartPlotClip">
              <rect x={padding.left} y={padding.top} width={graphWidth} height={graphHeight} />
            </clipPath>
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

          {/* Zone Shading inside clipped plot area */}
          <g clipPath="url(#chartPlotClip)">
            {eqX !== null ? (
              <>
                {/* Non-equilibrium zone before eqX */}
                {eqX > padding.left && (
                  <g>
                    <rect
                      x={padding.left}
                      y={padding.top}
                      width={Math.max(0, eqX - padding.left)}
                      height={graphHeight}
                      fill="url(#nonEqZoneGradient)"
                    />
                    {eqX - padding.left > 140 && (
                      <text
                        x={padding.left + 8}
                        y={padding.top + 16}
                        fill="#f59e0b"
                        fontSize="10"
                        fontWeight="600"
                      >
                        Fase Cinética (Fuera de Eq.)
                      </text>
                    )}
                  </g>
                )}

                {/* Equilibrium zone after eqX */}
                <g>
                  <rect
                    x={Math.max(padding.left, eqX)}
                    y={padding.top}
                    width={Math.max(0, width - padding.right - Math.max(padding.left, eqX))}
                    height={graphHeight}
                    fill="url(#eqZoneGradient)"
                  />
                  {eqX >= padding.left && eqX <= width - padding.right && (
                    <line
                      x1={eqX}
                      y1={padding.top}
                      x2={eqX}
                      y2={padding.top + graphHeight}
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                  )}
                  <text
                    x={Math.min(Math.max(padding.left + 8, eqX + 6), width - padding.right - 115)}
                    y={padding.top + 16}
                    fill="#10b981"
                    fontSize="10"
                    fontWeight="600"
                  >
                    Equilibrio alcanzado
                  </text>
                </g>
              </>
            ) : (
              /* Whole visible window is outside equilibrium */
              history.length > 0 && (
                <g>
                  <rect
                    x={padding.left}
                    y={padding.top}
                    width={graphWidth}
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
              )
            )}
          </g>

          {/* Y Axis Grid Lines & Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padding.top + graphHeight * (1 - pct);
            const val = viewMode === 'concentrations' ? pct * maxConcentration : pct * maxRate;
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

          {/* X Axis Grid Lines & Labels (Time in s, dynamically scaled from minTime to maxTime) */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct) => {
            const x = padding.left + graphWidth * pct;
            const tVal = minTime + pct * timeSpan;
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
                  {tVal < 10 ? tVal.toFixed(1) : tVal.toFixed(0)}s
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
            {timeAxisMode === 'sliding'
              ? `Tiempo transcurrido — Ventana móvil (${minTime.toFixed(0)}s – ${maxTime.toFixed(0)}s)`
              : 'Tiempo transcurrido (segundos)'}
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

          {/* Clipped Data Curves, Perturbations & Hover Markers */}
          <g clipPath="url(#chartPlotClip)">
            {/* Perturbation vertical markers */}
            {perturbations.map((pert) => {
              const px = xScale(pert.t);
              if (px < padding.left || px > width - padding.right) return null;
              const labelX = px > width - padding.right - 85 ? px - 78 : px + 4;
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
                    x={labelX}
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

            {/* Hover Crosshair and Inspection Dots */}
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
          </g>
        </svg>
      </div>

      {/* Dedicated Non-Overlapping Readout & Legend Panel (Placed cleanly below the SVG) */}
      <div
        className={`mt-3 rounded-xl border p-3 transition-colors ${
          hoveredPoint
            ? 'bg-indigo-950/30 border-indigo-500/40'
            : 'bg-slate-950/70 border-slate-800/80'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {hoveredPoint ? 'Inspección en el gráfico:' : 'Valores actuales en tiempo real:'}
            </span>
            <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
              t = {(currentPoint?.t ?? currentTime).toFixed(1)} s
            </span>
            <span
              className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                currentPoint?.isEquilibrium
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {currentPoint?.isEquilibrium ? 'En Equilibrio' : 'Fuera de Eq.'}
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            Pasa el cursor sobre el gráfico para inspeccionar valores en cada instante
          </span>
        </div>

        {/* Species / Rates Chips */}
        {viewMode === 'concentrations' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {reaction.species.map((sp) => (
              <div
                key={sp.id}
                className="flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: sp.color }}
                  />
                  <div className="truncate">
                    <span className="text-slate-100 font-bold">{sp.formula}</span>
                    <span className="text-slate-500 text-[11px] ml-1.5">
                      ({sp.isReactant ? 'Reactivo' : 'Producto'}, {sp.coefficient} mol)
                    </span>
                  </div>
                </div>
                <span className="font-mono font-bold text-white shrink-0">
                  {(currentPoint?.concentrations[sp.id] ?? 0).toFixed(4)} M
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400 shrink-0" />
                <span className="text-slate-200 font-semibold">vd (Directa: Reactivos → Productos)</span>
              </div>
              <span className="font-mono font-bold text-sky-300">
                {(currentPoint?.rates.forward ?? 0).toFixed(4)} mol/(L·s)
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-400 shrink-0" />
                <span className="text-slate-200 font-semibold">vi (Inversa: Productos → Reactivos)</span>
              </div>
              <span className="font-mono font-bold text-orange-300">
                {(currentPoint?.rates.reverse ?? 0).toFixed(4)} mol/(L·s)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
