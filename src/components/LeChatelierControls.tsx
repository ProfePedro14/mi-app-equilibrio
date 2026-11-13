/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ReactionConfig, PerturbationType } from '../types/equilibrium';
import {
  Flame,
  Snowflake,
  Minimize2,
  Maximize2,
  Zap,
  Plus,
  Minus,
  Wind,
  RotateCcw,
  Sliders,
} from 'lucide-react';

interface LeChatelierControlsProps {
  reaction: ReactionConfig;
  temperature: number;
  volume: number;
  catalystActive: boolean;
  onModifyConcentration: (speciesId: string, delta: number) => void;
  onModifyTemperature: (deltaT: number) => void;
  onSetTemperature: (newT: number) => void;
  onModifyVolume: (multiplier: number) => void;
  onSetVolume: (newV: number) => void;
  onToggleCatalyst: () => void;
  onAddInertGas: () => void;
  onResetToInitial: () => void;
}

export const LeChatelierControls: React.FC<LeChatelierControlsProps> = ({
  reaction,
  temperature,
  volume,
  catalystActive,
  onModifyConcentration,
  onModifyTemperature,
  onSetTemperature,
  onModifyVolume,
  onSetVolume,
  onToggleCatalyst,
  onAddInertGas,
  onResetToInitial,
}) => {
  const isExothermic = reaction.deltaH < 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white tracking-wide">
            Panel de Perturbaciones (Principio de Le Châtelier)
          </h3>
        </div>
        <button
          onClick={onResetToInitial}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          title="Restablecer concentraciones y condiciones iniciales"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restablecer Condiciones
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Factor 1: Concentración de Especies */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200">1. Concentración [X]</span>
              <span className="text-[10px] text-slate-400">Inyectar / Retirar</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Alterar la concentración de reactivos o productos fuerza al sistema a consumirlos o regenerarlos.
            </p>
          </div>

          <div className="space-y-2">
            {reaction.species.map((sp) => (
              <div
                key={sp.id}
                className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: sp.color }}
                  />
                  <span className="font-semibold text-white">{sp.formula}</span>
                  <span className="text-[10px] text-slate-500">
                    ({sp.isReactant ? 'R' : 'P'})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onModifyConcentration(sp.id, -0.4)}
                    className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded font-bold hover:scale-105 transition-all text-[11px] flex items-center"
                    title={`Retirar 0.4 M de ${sp.formula}`}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onModifyConcentration(sp.id, +0.5)}
                    className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold hover:scale-105 transition-all text-[11px] flex items-center"
                    title={`Añadir +0.5 M de ${sp.formula}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Factor 2: Temperatura */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-200">2. Temperatura (T)</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  isExothermic
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-indigo-500/20 text-indigo-300'
                }`}
              >
                {isExothermic ? 'Exotérmica (ΔH < 0)' : 'Endotérmica (ΔH > 0)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mb-3">
              ΔH = {reaction.deltaH} kJ/mol.
              <span className="block text-[10px] text-slate-500 mt-0.5">
                {isExothermic
                  ? 'El calor se comporta como producto. Calentar desplaza a reactivos.'
                  : 'El calor se comporta como reactivo. Calentar desplaza a productos.'}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-400">T actual:</span>
              <span className="font-bold text-rose-300">
                {temperature} K ({(temperature - 273.15).toFixed(0)} °C)
              </span>
            </div>

            <input
              type="range"
              min="200"
              max="1100"
              step="25"
              value={temperature}
              onChange={(e) => onSetTemperature(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 mb-3"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onModifyTemperature(-50)}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 rounded-lg text-xs font-medium transition-all"
              >
                <Snowflake className="w-3.5 h-3.5" />
                -50 K (Enfriar)
              </button>
              <button
                onClick={() => onModifyTemperature(+50)}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-medium transition-all"
              >
                <Flame className="w-3.5 h-3.5" />
                +50 K (Calentar)
              </button>
            </div>
          </div>
        </div>

        {/* Factor 3: Presión y Volumen */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-200">3. Presión / Volumen</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  reaction.deltaN === 0
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-sky-500/20 text-sky-300'
                }`}
              >
                Δn = {reaction.deltaN > 0 ? `+${reaction.deltaN}` : reaction.deltaN} mol
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mb-3">
              {reaction.deltaN === 0 ? (
                <span className="text-amber-300/90 font-medium">
                  Δn = 0: ¡La presión NO altera la posición de equilibrio!
                </span>
              ) : reaction.deltaN < 0 ? (
                <span>
                  Al comprimir (↑ P), se desplaza a la <strong className="text-emerald-400">DERECHA</strong> (menos moles).
                </span>
              ) : (
                <span>
                  Al comprimir (↑ P), se desplaza a la <strong className="text-indigo-400">IZQUIERDA</strong> (menos moles).
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-400">Volumen:</span>
              <span className="font-bold text-indigo-300">{volume.toFixed(2)} L</span>
            </div>

            <input
              type="range"
              min="0.4"
              max="2.5"
              step="0.1"
              value={volume}
              onChange={(e) => onSetVolume(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-3"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onModifyVolume(0.5)}
                className="flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-medium transition-all"
                title="Comprimir volumen a la mitad (Duplica la presión)"
              >
                <Minimize2 className="w-3 h-3" />
                Comprimir (x2 P)
              </button>
              <button
                onClick={() => onModifyVolume(2.0)}
                className="flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-medium transition-all"
                title="Expandir volumen al doble (Reduce la presión a la mitad)"
              >
                <Maximize2 className="w-3 h-3" />
                Expandir (/2 P)
              </button>
            </div>
          </div>
        </div>

        {/* Factor 4: Catalizador y Gas Inerte */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200">4. Catalizador y Gases Inertes</span>
              <span className="text-[10px] text-slate-400">Cinética vs Termodinámica</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Un catalizador acelera ambas velocidades por igual (no altera Kc). Un gas inerte a V constante no cambia presiones parciales.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={onToggleCatalyst}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                catalystActive
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className={`w-4 h-4 ${catalystActive ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
                <span>Catalizador (x3 Vel.)</span>
              </div>
              <span className="text-[10px] font-bold">
                {catalystActive ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </button>

            <button
              onClick={onAddInertGas}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all"
              title="Añade gas noble (Argón) a volumen constante. Muestra que el equilibrio no se desplaza."
            >
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-cyan-400" />
                <span>Gas Inerte (Argón a V cte)</span>
              </div>
              <span className="text-[10px] text-slate-500">Inyectar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
