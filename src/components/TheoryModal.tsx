/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, X, Check, Flame, Minimize2, Zap, Scale } from 'lucide-react';

interface TheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoryModal: React.FC<TheoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <div>
              <h2 className="text-lg font-bold text-white">
                Fundamentos Teóricos: Equilibrio Químico y Le Châtelier
              </h2>
              <p className="text-xs text-slate-400">
                Guía completa de principios termodinámicos, cinéticos y matemáticos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-xs leading-relaxed">
          {/* Section 1: Concepto de equilibrio dinámico */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-400" />
              1. El Concepto de Equilibrio Químico Dinámico
            </h3>
            <p className="text-slate-300">
              En una reacción reversible general:
            </p>
            <div className="bg-slate-900 px-3 py-2 rounded-lg font-mono text-center text-white text-sm my-2">
              a A + b B ⇌ c C + d D
            </div>
            <p className="text-slate-300">
              El estado de equilibrio se alcanza cuando la velocidad de la reacción directa (<span className="text-sky-300 font-mono">vd = kd [A]^a [B]^b</span>) se iguala exactamente a la velocidad de la reacción inversa (<span className="text-orange-300 font-mono">vi = ki [C]^c [D]^d</span>).
            </p>
            <p className="text-slate-400">
              <strong>Aspecto crucial:</strong> Macroscópicamente las concentraciones parecen fijas y estáticas, pero microscópicamente el proceso no se detiene; las moléculas continúan transformándose en ambos sentidos a velocidades idénticas (<span className="text-emerald-400 font-mono">vd = vi &gt; 0</span>).
            </p>
          </div>

          {/* Section 2: Constante Kc y Kp */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="text-sm font-bold text-emerald-300">
              2. Constantes de Equilibrio (Kc y Kp) y Cociente Qc
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-center">
                <span className="text-slate-400 block text-[11px] mb-1">Constante Kc</span>
                <span className="text-emerald-300 font-bold">
                  Kc = [C]^c [D]^d / ([A]^a [B]^b)
                </span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-center">
                <span className="text-slate-400 block text-[11px] mb-1">Relación Kp vs Kc</span>
                <span className="text-sky-300 font-bold">
                  Kp = Kc · (R · T)<sup>Δn</sup>
                </span>
              </div>
            </div>
            <p className="text-slate-300">
              Donde <span className="font-mono text-amber-300">Δn = (c + d) - (a + b)</span> es la diferencia en moles gaseosos entre productos y reactivos. Si Δn = 0, entonces <span className="font-mono text-emerald-300">Kp = Kc</span>.
            </p>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px]">
              <strong className="text-slate-200">El Cociente de Reacción (Qc):</strong> Se calcula con las concentraciones instantáneas en cualquier momento:
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
                <li><span className="font-mono text-sky-300">Qc &lt; Kc</span>: Exceso de reactivos. El sistema avanza hacia la <strong>DERECHA (→)</strong>.</li>
                <li><span className="font-mono text-emerald-300">Qc = Kc</span>: Sistema en <strong>EQUILIBRIO DINÁMICO</strong>.</li>
                <li><span className="font-mono text-rose-300">Qc &gt; Kc</span>: Exceso de productos. El sistema retrocede hacia la <strong>IZQUIERDA (←)</strong>.</li>
              </ul>
            </div>
          </div>

          {/* Section 3: Principio de Le Châtelier */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-amber-300">
              3. Principio de Le Châtelier: Factores de Perturbación
            </h3>
            <p className="text-slate-300 italic">
              "Si un sistema químico en equilibrio es perturbado por un cambio en las condiciones (concentración, temperatura o presión), el sistema experimentará un desplazamiento que tenderá a contrarrestar parcialmente dicha perturbación."
            </p>

            <div className="space-y-2 mt-2">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 mt-1 shrink-0" />
                <div>
                  <strong className="text-slate-100">Variación de Concentración:</strong> Al añadir una sustancia, el sistema se desplaza en el sentido que la consume. Al retirar una sustancia, se desplaza en el sentido que la regenera. (El valor de Kc no se altera).
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-100">Efecto de la Temperatura (Ecuación de Van 't Hoff):</strong>
                  <div className="font-mono text-[11px] text-slate-300 my-1 bg-slate-950 p-1.5 rounded">
                    ln(Kc,2 / Kc,1) = - (ΔH° / R) · (1/T2 - 1/T1)
                  </div>
                  La temperatura es el <strong>único factor que altera el valor numérico de Kc</strong>.
                  En reacciones exotérmicas (ΔH &lt; 0), aumentar T disminuye Kc (desplaza a reactivos). En endotérmicas (ΔH &gt; 0), calentar aumenta Kc (desplaza a productos).
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                <Minimize2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-100">Efecto de la Presión y Volumen (según Δn):</strong>
                  Al aumentar la presión (reducir el volumen), el sistema se desplaza hacia el lado con <strong>menor número de moles gaseosos</strong>.
                  <div className="mt-1 text-slate-400">
                    Si <strong>Δn = 0</strong> (como H₂ + I₂ ⇌ 2 HI), la presión <span className="text-amber-300">NO DESPLAZA el equilibrio</span> porque ambos lados tienen igual número de moléculas.
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-100">Función del Catalizador:</strong>
                  Disminuye la energía de activación por igual en ambos sentidos. Acelera la llegada al equilibrio pero <strong>NO modifica ni Kc ni las concentraciones finales de equilibrio</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-5 border-t border-slate-800 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md"
          >
            Entendido, volver al simulador
          </button>
        </div>
      </div>
    </div>
  );
};
