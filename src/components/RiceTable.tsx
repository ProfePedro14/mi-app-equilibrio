/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ReactionConfig } from '../types/equilibrium';
import { calculateKp, calculateKc, solveEquilibriumConcentrations, GAS_CONSTANT_R_ATM } from '../utils/chemistry';
import { Table, CheckCircle, Calculator, Info } from 'lucide-react';

interface RiceTableProps {
  reaction: ReactionConfig;
  initialConcentrations: Record<string, number>;
  currentConcentrations: Record<string, number>;
  temperature: number;
  volume: number;
  pressure: number;
}

export const RiceTable: React.FC<RiceTableProps> = ({
  reaction,
  initialConcentrations,
  currentConcentrations,
  temperature,
  volume,
  pressure,
}) => {
  const currentKc = useMemo(() => {
    return calculateKc(reaction, temperature);
  }, [reaction, temperature]);

  const currentKp = useMemo(() => {
    return calculateKp(currentKc, reaction.deltaN, temperature);
  }, [currentKc, reaction.deltaN, temperature]);

  // Theoretical exact equilibrium values
  const { concentrations: eqConcentrations, xi } = useMemo(() => {
    return solveEquilibriumConcentrations(reaction, initialConcentrations, currentKc);
  }, [reaction, initialConcentrations, currentKc]);

  // Compute total moles
  const totalMolesEq = useMemo(() => {
    return Object.values(eqConcentrations).reduce((acc, c) => acc + c * volume, 0);
  }, [eqConcentrations, volume]);

  // Find limiting reactant
  const limitingReactant = useMemo(() => {
    let minRatio = Infinity;
    let limiting = null;
    for (const s of reaction.species) {
      if (s.isReactant) {
        const c0 = initialConcentrations[s.id] ?? 0;
        const ratio = c0 / s.coefficient;
        if (ratio < minRatio) {
          minRatio = ratio;
          limiting = s;
        }
      }
    }
    return limiting;
  }, [reaction, initialConcentrations]);

  // Reaction yield (% de rendimiento respecto al teórico)
  const yieldPercent = useMemo(() => {
    if (!limitingReactant) return 0;
    const maxXi = (initialConcentrations[limitingReactant.id] ?? 0) / limitingReactant.coefficient;
    if (maxXi <= 0) return 0;
    return Math.min(100, Math.max(0, (xi / maxXi) * 100));
  }, [limitingReactant, initialConcentrations, xi]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Title & Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Table className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white tracking-wide">
            Tabla Estequiométrica R.I.C.E. (Reacción - Inicio - Cambio - Equilibrio)
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80 text-emerald-300">
            Kc = {currentKc < 1e4 && currentKc > 1e-3 ? currentKc.toFixed(3) : currentKc.toExponential(2)}
          </span>
          <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80 text-sky-300">
            Kp = {currentKp < 1e4 && currentKp > 1e-3 ? currentKp.toFixed(3) : currentKp.toExponential(2)}
          </span>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-semibold">
              <th className="py-2.5 px-3">Parámetro / Etapa</th>
              {reaction.species.map((s) => (
                <th key={s.id} className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span>{s.formula}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({s.isReactant ? 'Reactivo' : 'Producto'})
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 font-mono">
            {/* R - Coeficiente */}
            <tr className="bg-slate-900/60">
              <td className="py-2.5 px-3 font-sans font-medium text-slate-300">
                <span className="font-bold text-indigo-400 mr-1.5">R</span>
                Coeficiente estequiométrico (ν)
              </td>
              {reaction.species.map((s) => (
                <td key={s.id} className="py-2.5 px-3 font-bold text-white">
                  {s.isReactant ? `-${s.coefficient}` : `+${s.coefficient}`}
                </td>
              ))}
            </tr>

            {/* I - Concentración Inicial */}
            <tr className="bg-slate-900/40">
              <td className="py-2.5 px-3 font-sans font-medium text-slate-300">
                <span className="font-bold text-sky-400 mr-1.5">I</span>
                [X]₀ Inicial (mol/L)
              </td>
              {reaction.species.map((s) => {
                const val = initialConcentrations[s.id] ?? 0;
                return (
                  <td key={s.id} className="py-2.5 px-3 text-sky-300">
                    {val.toFixed(4)} M
                  </td>
                );
              })}
            </tr>

            {/* C - Cambio */}
            <tr className="bg-slate-900/60">
              <td className="py-2.5 px-3 font-sans font-medium text-slate-300">
                <span className="font-bold text-amber-400 mr-1.5">C</span>
                Cambio Δ (mol/L)
              </td>
              {reaction.species.map((s) => {
                const deltaC = s.isReactant ? -s.coefficient * xi : s.coefficient * xi;
                return (
                  <td
                    key={s.id}
                    className={`py-2.5 px-3 font-semibold ${
                      deltaC >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {deltaC >= 0 ? `+${deltaC.toFixed(4)}` : deltaC.toFixed(4)} M
                  </td>
                );
              })}
            </tr>

            {/* E - Concentración en Equilibrio */}
            <tr className="bg-emerald-950/20">
              <td className="py-2.5 px-3 font-sans font-semibold text-emerald-300">
                <span className="font-bold text-emerald-400 mr-1.5">E</span>
                [X]eq Equilibrio Teórico (mol/L)
              </td>
              {reaction.species.map((s) => {
                const eqC = eqConcentrations[s.id] ?? 0;
                return (
                  <td key={s.id} className="py-2.5 px-3 font-bold text-emerald-200">
                    {eqC.toFixed(4)} M
                  </td>
                );
              })}
            </tr>

            {/* Current Real-Time simulated values */}
            <tr className="bg-slate-900/40">
              <td className="py-2.5 px-3 font-sans font-medium text-slate-400">
                ⚡ [X] actual en Simulador (mol/L)
              </td>
              {reaction.species.map((s) => {
                const curC = currentConcentrations[s.id] ?? 0;
                return (
                  <td key={s.id} className="py-2.5 px-3 text-white">
                    {curC.toFixed(4)} M
                  </td>
                );
              })}
            </tr>

            {/* Partial Pressure in equilibrium */}
            <tr className="bg-slate-900/60">
              <td className="py-2.5 px-3 font-sans font-medium text-slate-300">
                Presión Parcial eq. Pi = xi · P (atm)
              </td>
              {reaction.species.map((s) => {
                const moles = (eqConcentrations[s.id] ?? 0) * volume;
                const molFrac = totalMolesEq > 0 ? moles / totalMolesEq : 0;
                const partialP = molFrac * pressure;
                return (
                  <td key={s.id} className="py-2.5 px-3 text-slate-300">
                    {partialP.toFixed(3)} atm
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Thermodynamic Metrics Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs font-mono">
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          <span className="text-slate-400 block font-sans text-[11px] mb-1">
            Grado de Avance en Eq. (ξ)
          </span>
          <span className="text-sm font-bold text-indigo-300">
            {xi.toFixed(4)} <span className="text-[10px] text-slate-500 font-normal">mol/L</span>
          </span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          <span className="text-slate-400 block font-sans text-[11px] mb-1">
            Rendimiento de Reacción (η)
          </span>
          <span className="text-sm font-bold text-emerald-300">
            {yieldPercent.toFixed(1)} %
          </span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          <span className="text-slate-400 block font-sans text-[11px] mb-1">
            Relación Kp vs Kc
          </span>
          <span className="text-sm font-bold text-sky-300">
            Kp = Kc · (RT)<sup>{reaction.deltaN}</sup>
          </span>
        </div>
      </div>
    </div>
  );
};
