/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactionConfig } from '../types/equilibrium';

export const PRESET_REACTIONS: ReactionConfig[] = [
  {
    id: 'hi_synthesis',
    title: 'Síntesis de Yoduro de Hidrógeno (HI)',
    equation: 'H₂(g) + I₂(g) ⇌ 2 HI(g)',
    deltaH: -9.48, // kJ/mol (ligeramente exotérmica)
    standardTemp: 700, // Kelvin (~427 °C)
    standardKc: 54.0, // A 700 K, Kc aprox 54
    description:
      'Reacción clásica con Δn = 0. Al tener igual número de moles gaseosos en reactivos (1+1=2) y productos (2), las variaciones de presión o volumen NO alteran la posición de equilibrio.',
    deltaN: 0,
    pressureSensitive: false,
    colorEffect: {
      speciesId: 'I2',
      description: 'El vapor de I₂ tiene un color violeta intenso. A mayor [I₂], mayor tonalidad púrpura.',
    },
    defaultVolume: 1.0,
    defaultTemp: 700,
    rateConstantForward: 0.15,
    species: [
      {
        id: 'H2',
        name: 'Hidrógeno',
        formula: 'H₂',
        color: '#38bdf8', // Sky blue
        particleColor: '#60a5fa',
        coefficient: 1,
        isReactant: true,
        initialConcentration: 1.0,
        radius: 6,
      },
      {
        id: 'I2',
        name: 'Yodo molecular',
        formula: 'I₂',
        color: '#a855f7', // Purple/Violet
        particleColor: '#c084fc',
        coefficient: 1,
        isReactant: true,
        initialConcentration: 1.0,
        radius: 10,
      },
      {
        id: 'HI',
        name: 'Yoduro de Hidrógeno',
        formula: 'HI',
        color: '#10b981', // Emerald green
        particleColor: '#34d399',
        coefficient: 2,
        isReactant: false,
        initialConcentration: 0.0,
        radius: 8,
      },
    ],
  },
  {
    id: 'haber_bosch',
    title: 'Proceso Haber-Bosch (Síntesis de Amoniaco)',
    equation: 'N₂(g) + 3 H₂(g) ⇌ 2 NH₃(g)',
    deltaH: -92.2, // kJ/mol (fuertemente exotérmica)
    standardTemp: 673, // Kelvin (400 °C)
    standardKc: 1.6, // a 673 K
    description:
      'Proceso industrial clave. Con Δn = 2 - (1+3) = -2 < 0 moles. Un aumento de presión (reducción de volumen) desplaza decididamente el equilibrio hacia la derecha (formación de NH₃) para aliviar la presión.',
    deltaN: -2,
    pressureSensitive: true,
    defaultVolume: 1.0,
    defaultTemp: 673,
    rateConstantForward: 0.08,
    species: [
      {
        id: 'N2',
        name: 'Nitrógeno molecular',
        formula: 'N₂',
        color: '#2563eb', // Royal blue
        particleColor: '#3b82f6',
        coefficient: 1,
        isReactant: true,
        initialConcentration: 1.0,
        radius: 8,
      },
      {
        id: 'H2',
        name: 'Hidrógeno molecular',
        formula: 'H₂',
        color: '#38bdf8', // Sky blue
        particleColor: '#93c5fd',
        coefficient: 3,
        isReactant: true,
        initialConcentration: 3.0,
        radius: 5,
      },
      {
        id: 'NH3',
        name: 'Amoniaco',
        formula: 'NH₃',
        color: '#f97316', // Amber/Orange
        particleColor: '#fb923c',
        coefficient: 2,
        isReactant: false,
        initialConcentration: 0.0,
        radius: 8,
      },
    ],
  },
  {
    id: 'no2_dimerization',
    title: 'Dimerización de Dióxido de Nitrógeno',
    equation: '2 NO₂(g) ⇌ N₂O₄(g)',
    deltaH: -57.2, // kJ/mol (Exotérmica)
    standardTemp: 298, // 25 °C (298 K)
    standardKc: 170.0, // a 298 K
    description:
      'Reacción visible por excelencia: NO₂ es un gas pardo rojizo tóxico, mientras que N₂O₄ es incoloro. Al enfriar o comprimir, el gas pierde color ya que se forma N₂O₄ incoloro.',
    deltaN: -1,
    pressureSensitive: true,
    colorEffect: {
      speciesId: 'NO2',
      description: 'El gas adquiere un tono pardo rojizo a mayor concentración de NO₂.',
    },
    defaultVolume: 1.0,
    defaultTemp: 298,
    rateConstantForward: 0.25,
    species: [
      {
        id: 'NO2',
        name: 'Dióxido de Nitrógeno (marrón rojizo)',
        formula: 'NO₂',
        color: '#dc2626', // Red-brown
        particleColor: '#ef4444',
        coefficient: 2,
        isReactant: true,
        initialConcentration: 1.5,
        radius: 8,
      },
      {
        id: 'N2O4',
        name: 'Tetróxido de Dinitrógeno (incoloro)',
        formula: 'N₂O₄',
        color: '#0284c7', // Pale translucent blue
        particleColor: '#38bdf8',
        coefficient: 1,
        isReactant: false,
        initialConcentration: 0.0,
        radius: 12,
      },
    ],
  },
  {
    id: 'pcl5_dissociation',
    title: 'Disociación de Pentacloruro de Fósforo',
    equation: 'PCl₅(g) ⇌ PCl₃(g) + Cl₂(g)',
    deltaH: 87.9, // kJ/mol (Endotérmica)
    standardTemp: 523, // 250 °C (523 K)
    standardKc: 0.042, // a 523 K
    description:
      'Reacción endotérmica con Δn = +1 > 0. Al calentar, el equilibrio se desplaza a la derecha (absorbe calor). Al comprimir, se desplaza hacia la izquierda donde hay menos moles (1 mol de PCl₅ frente a 2 moles de productos).',
    deltaN: 1,
    pressureSensitive: true,
    defaultVolume: 1.0,
    defaultTemp: 523,
    rateConstantForward: 0.1,
    species: [
      {
        id: 'PCl5',
        name: 'Pentacloruro de Fósforo',
        formula: 'PCl₅',
        color: '#6366f1', // Indigo
        particleColor: '#818cf8',
        coefficient: 1,
        isReactant: true,
        initialConcentration: 1.0,
        radius: 12,
      },
      {
        id: 'PCl3',
        name: 'Tricloruro de Fósforo',
        formula: 'PCl₃',
        color: '#06b6d4', // Cyan
        particleColor: '#22d3ee',
        coefficient: 1,
        isReactant: false,
        initialConcentration: 0.0,
        radius: 9,
      },
      {
        id: 'Cl2',
        name: 'Cloro molecular',
        formula: 'Cl₂',
        color: '#84cc16', // Lime green
        particleColor: '#a3e635',
        coefficient: 1,
        isReactant: false,
        initialConcentration: 0.0,
        radius: 7,
      },
    ],
  },
];
