/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HelpCircle, CheckCircle, XCircle, RotateCcw, Award } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  context?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_QUESTIONS: Question[] = [
  {
    id: 1,
    question: 'En la síntesis de amoniaco N₂(g) + 3 H₂(g) ⇌ 2 NH₃(g) (ΔH < 0), ¿qué ocurre al aumentar la presión reduciendo el volumen?',
    context: 'Proceso Haber-Bosch con 4 moles de gas a la izquierda y 2 moles a la derecha.',
    options: [
      'El equilibrio se desplaza a la derecha (→) formando más NH₃ para reducir el número de moléculas.',
      'El equilibrio se desplaza a la izquierda (←) produciendo más N₂ y H₂.',
      'No se produce ningún desplazamiento porque la constante Kc no cambia con la presión.',
      'La reacción se detiene por completo debido a la excesiva compresión.',
    ],
    correctIndex: 0,
    explanation:
      'Según el principio de Le Châtelier, al aumentar la presión el sistema intenta contrarrestar la perturbación desplazándose hacia donde hay MENOR número de moles gaseosos (2 moles de NH₃ frente a 4 de reactivos).',
  },
  {
    id: 2,
    question: 'Para la reacción H₂(g) + I₂(g) ⇌ 2 HI(g), ¿cómo afecta al equilibrio si duplicamos el volumen del reactor a temperatura constante?',
    context: 'Fíjate en los coeficientes estequiométricos de reactivos y productos.',
    options: [
      'Se favorece la formación de más HI.',
      'Se favorece la disociación en H₂ e I₂.',
      'La composición molar de equilibrio NO se altera porque Δn = 2 - (1+1) = 0.',
      'La constante Kc disminuye a la mitad.',
    ],
    correctIndex: 2,
    explanation:
      'Como Δn = 0 (2 moles de reactivos = 2 moles de productos), la relación de presiones parciales y el cociente Qc son independientes del volumen. Aunque las concentraciones caen por dilución, la proporción de equilibrio se mantiene invariable.',
  },
  {
    id: 3,
    question: 'Si una reacción es fuertemente EXOTÉRMICA (ΔH < 0), ¿qué efecto tiene elevar la temperatura sobre el valor de la constante de equilibrio Kc?',
    options: [
      'Kc aumenta linealmente con la temperatura.',
      'Kc DISMINUYE según la ecuación de Van \'t Hoff, desplazando el equilibrio hacia los reactivos.',
      'Kc permanece estrictamente constante porque solo depende de la presión.',
      'Kc oscila cíclicamente.',
    ],
    correctIndex: 1,
    explanation:
      'En una reacción exotérmica, el calor se comporta como un producto. Calentar el sistema equivale a aportar un producto, por lo que el sistema se desplaza hacia la izquierda para absorber calor, y en consecuencia Kc disminuye.',
  },
  {
    id: 4,
    question: '¿Cuál es la función exacta de un catalizador en un sistema en equilibrio químico reversible?',
    options: [
      'Aumenta el rendimiento y desplaza el equilibrio hacia los productos deseados.',
      'Aumenta el valor numérico de la constante de equilibrio Kc.',
      'Acelera tanto la velocidad directa como la inversa por igual, logrando el equilibrio más rápido sin alterar las concentraciones finales.',
      'Consume los subproductos no deseados de la reacción.',
    ],
    correctIndex: 2,
    explanation:
      'Un catalizador reduce la energía de activación de ambas vías (directa e inversa) en la misma proporción. No altera la termodinámica del sistema (ni ΔG, ni Kc, ni el rendimiento en el equilibrio), únicamente la cinética de aproximación.',
  },
  {
    id: 5,
    question: 'Se introduce gas noble Helio (gas inerte) en un reactor rígido a VOLUMEN CONSTANTE que contiene una mezcla en equilibrio. ¿Qué ocurre?',
    options: [
      'El equilibrio no se desplaza en ninguna dirección.',
      'Se desplaza hacia la derecha porque la presión total ha aumentado.',
      'Se desplaza hacia la izquierda para hacer espacio al helio.',
      'La constante Kc aumenta.',
    ],
    correctIndex: 0,
    explanation:
      'A volumen constante, la adición de un gas inerte aumenta la presión total, pero las presiones parciales de los reactivos y productos ([X] = n_i / V) permanecen exactamente iguales. Por tanto, Qc no varía y el equilibrio no se modifica.',
  },
];

export const LeChatelierQuiz: React.FC = () => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState<boolean>(false);

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    if (showResults) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setShowResults(false);
  };

  const score = Object.entries(selectedAnswers).reduce((acc, [qId, ans]) => {
    const q = QUIZ_QUESTIONS.find((item) => item.id === Number(qId));
    return q && q.correctIndex === ans ? acc + 1 : acc;
  }, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Test Interactivo de Autoevaluación: Principio de Le Châtelier
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pon a prueba tus conocimientos sobre factores que perturban el equilibrio químico reversible.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showResults && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 rounded-lg text-indigo-300 font-bold text-xs">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>
                Puntuación: {score} / {QUIZ_QUESTIONS.length}
              </span>
            </div>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar Test
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {QUIZ_QUESTIONS.map((q, idx) => {
          const userChoice = selectedAnswers[q.id];
          const isAnswered = userChoice !== undefined;
          const isCorrect = userChoice === q.correctIndex;

          return (
            <div
              key={q.id}
              className={`p-4 rounded-xl border transition-all ${
                showResults
                  ? isCorrect
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-rose-950/20 border-rose-500/40'
                  : 'bg-slate-950/70 border-slate-800/80'
              }`}
            >
              <div className="flex items-start gap-2.5 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-white leading-relaxed">
                    {q.question}
                  </h4>
                  {q.context && (
                    <p className="text-[11px] text-slate-400 mt-0.5 italic">
                      Pista / Contexto: {q.context}
                    </p>
                  )}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-1.5 mt-3 pl-8">
                {q.options.map((opt, optIdx) => {
                  const isSelected = userChoice === optIdx;
                  let optStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/80';

                  if (showResults) {
                    if (optIdx === q.correctIndex) {
                      optStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      optStyle = 'bg-rose-500/20 border-rose-500/50 text-rose-200 line-through';
                    }
                  } else if (isSelected) {
                    optStyle = 'bg-indigo-600 border-indigo-500 text-white font-medium';
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(q.id, optIdx)}
                      disabled={showResults}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all flex items-center justify-between ${optStyle}`}
                    >
                      <span>{opt}</span>
                      {showResults && optIdx === q.correctIndex && (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                      )}
                      {showResults && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation upon submission */}
              {showResults && (
                <div className="mt-3 pl-8 text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <strong className="text-slate-100">Explicación: </strong>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      {!showResults && (
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setShowResults(true)}
            disabled={Object.keys(selectedAnswers).length === 0}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition-all"
          >
            Comprobar Respuestas
          </button>
        </div>
      )}
    </div>
  );
};
