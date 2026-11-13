/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChemicalSpecies {
  id: string;
  name: string;
  formula: string;
  subscriptFormula?: string;
  color: string;
  coefficient: number;
  isReactant: boolean;
  initialConcentration: number; // mol/L
  particleColor: string;
  radius: number;
}

export interface ReactionConfig {
  id: string;
  title: string;
  equation: string;
  deltaH: number; // kJ/mol (+ for endothermic, - for exothermic)
  standardTemp: number; // Kelvin (e.g. 700 K or 298 K)
  standardKc: number; // Equilibrium constant at standardTemp
  description: string;
  deltaN: number; // delta n_g = sum(prod_coeff) - sum(react_coeff)
  pressureSensitive: boolean;
  colorEffect?: {
    speciesId: string;
    description: string;
  };
  species: ChemicalSpecies[];
  defaultVolume: number; // Liters
  defaultTemp: number; // Kelvin
  rateConstantForward: number; // base k_f at standardTemp
}

export interface TimePoint {
  t: number;
  concentrations: Record<string, number>;
  rates: {
    forward: number;
    reverse: number;
  };
  Qc: number;
  Kc: number;
  isEquilibrium: boolean;
  event?: string;
  volume: number;
  temperature: number;
  pressure: number;
}

export type PerturbationType =
  | 'conc_add'
  | 'conc_remove'
  | 'temp_up'
  | 'temp_down'
  | 'pressure_up' // compress (half volume)
  | 'pressure_down' // expand (double volume)
  | 'catalyst'
  | 'inert_gas';

export interface PerturbationEvent {
  id: string;
  t: number;
  type: PerturbationType;
  title: string;
  description: string;
  direction: 'right' | 'left' | 'none';
  detail: string;
}
