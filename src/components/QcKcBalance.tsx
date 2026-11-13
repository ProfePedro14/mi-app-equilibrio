/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ReactionConfig } from '../types/equilibrium';
import { Scale, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { GAS_CONSTANT_R } from '../utils/chemistry';

interface QcKcBalanceProps {
  reaction: ReactionConfig;
  Qc: number;
  Kc: number;
  temperature: number;
  isEquilibrium: boolean;
}

export const QcKcBalance: React.FC<QcKcBalanceProps> = ({
  reaction,
  Qc,
  Kc,
  temperature,
  isEquilibrium,
}) => {
  // Ratio log scale for balance angle
  // ratio = Qc / Kc
  const ratio = Math.max(1e-4, Math.min(1e4, Qc / Math.max(1e-6, Kc)));
  const logRatio = Math.log10(ratio);
  // Max tilt angle +- 18 degrees
  const tiltAngle = Math.max(-18, Math.min(18, logRatio * 8));

  // Delta G = R * T * ln(Q/K) (in kJ/mol)
  const deltaG = (GAS_CONSTANT_R * temperature * Math.log(ratio)) / 1000;

  // Status diagnosis
  let directionText = '';
  let directionBadge = '';
  let directionIcon = null;

  if (isEquilibrium || Math.abs(logRatio) < 0.04) {
    directionText = 'El sistema se encuentra en EQUILIBRIO DINÁMICO. La velocidad directa es igual a la inversa.';
    directionBadge = 'Qc = Kc (Equilibrio)';
    directionIcon = <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
  } else if (Qc < Kc) {
    directionText = 'Qc < Kc: Hay déficit relativo de productos. El sistema se desplaza hacia la DERECHA (→) para formar más productos.';
    directionBadge = 'Desplazamiento a la DERECHA (→)';
    directionIcon = <ArrowRight className="w-5 h-5 text-sky-400 animate-pulse" />;
  } else {
    directionText = 'Qc > Kc: Hay exceso relativo de productos. El sistema se desplaza hacia la IZQUIERDA (←) regenerando reactivos.';
    directionBadge = 'Desplazamiento a la IZQUIERDA (←)';
    directionIcon = <ArrowLeft className="w-5 h-5 text-amber-400 animate-pulse" />;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-amber-400" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Cociente de Reacción Qc vs Constante Kc
          </h4>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            isEquilibrium
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : Qc < Kc
              ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          {directionIcon}
          <span>{directionBadge}</span>
        </div>
      </div>

      {/* Visual Balance SVG */}
      <div className="relative flex justify-center items-center py-2">
        <svg viewBox="0 0 400 120" className="w-full max-w-sm h-auto select-none">
          {/* Base Stand */}
          <polygon points="190,115 210,115 204,50 196,50" fill="#475569" />
          <rect x="170" y="112" width="60" height="6" rx="2" fill="#64748b" />
          {/* Pivot circle */}
          <circle cx="200" cy="50" r="7" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />

          {/* Tilting Beam */}
          <g transform={`rotate(${tiltAngle}, 200, 50)`} className="transition-transform duration-300">
            {/* Beam rod */}
            <rect x="70" y="47" width="260" height="6" rx="3" fill="#cbd5e1" />

            {/* Left Pan: Qc */}
            <line x1="90" y1="50" x2="90" y2="85" stroke="#94a3b8" strokeWidth="1.5" />
            <polygon points="65,85 115,85 105,95 75,95" fill="#f59e0b" opacity="0.9" />
            <text x="90" y="80" textAnchor="middle" fill="#fef08a" fontSize="12" fontWeight="bold">
              Qc
            </text>

            {/* Right Pan: Kc */}
            <line x1="310" y1="50" x2="310" y2="85" stroke="#94a3b8" strokeWidth="1.5" />
            <polygon points="285,85 335,85 325,95 295,95" fill="#10b981" opacity="0.9" />
            <text x="310" y="80" textAnchor="middle" fill="#a7f3d0" fontSize="12" fontWeight="bold">
              Kc
            </text>
          </g>
        </svg>
      </div>

      {/* Values readout & Thermodynamic indicator */}
      <div className="grid grid-cols-3 gap-2 mt-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center font-mono">
        <div>
          <span className="text-[10px] text-slate-400 block font-sans">Cociente Qc</span>
          <span className="text-sm font-bold text-amber-300">
            {Qc < 1e4 && Qc > 1e-3 ? Qc.toFixed(3) : Qc.toExponential(2)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-sans">Constante Kc(T)</span>
          <span className="text-sm font-bold text-emerald-300">
            {Kc < 1e4 && Kc > 1e-3 ? Kc.toFixed(3) : Kc.toExponential(2)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-sans">ΔG (Espontaneidad)</span>
          <span
            className={`text-sm font-bold ${
              Math.abs(deltaG) < 0.1
                ? 'text-slate-300'
                : deltaG < 0
                ? 'text-sky-300'
                : 'text-rose-300'
            }`}
          >
            {deltaG.toFixed(2)}{' '}
            <span className="text-[10px] text-slate-500 font-normal">kJ/mol</span>
          </span>
        </div>
      </div>

      {/* Explanatory text */}
      <div className="mt-3 text-xs text-slate-300 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">{directionText}</p>
      </div>
    </div>
  );
};
