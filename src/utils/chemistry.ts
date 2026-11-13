/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactionConfig, PerturbationType } from '../types/equilibrium';

export const GAS_CONSTANT_R = 8.314462; // J / (mol * K)
export const GAS_CONSTANT_R_ATM = 0.082057; // atm * L / (mol * K)

/**
 * Calculates equilibrium constant Kc at temperature T (Kelvin) using Van 't Hoff equation.
 * ln(Kc(T) / Kc(T0)) = - (deltaH / R) * (1/T - 1/T0)
 */
export function calculateKc(reaction: ReactionConfig, temperatureK: number): number {
  const T0 = reaction.standardTemp;
  const T = Math.max(100, Math.min(2500, temperatureK));
  const deltaH_Joules = reaction.deltaH * 1000; // kJ to J

  const exponent = (-deltaH_Joules / GAS_CONSTANT_R) * (1 / T - 1 / T0);
  // Cap exponent to prevent numerical overflow/underflow
  const clampedExponent = Math.max(-10, Math.min(10, exponent));
  const Kc = reaction.standardKc * Math.exp(clampedExponent);
  return Math.max(1e-6, Kc);
}

/**
 * Computes Kp from Kc: Kp = Kc * (R * T)^deltaN
 * with R = 0.08206 atm*L/(mol*K)
 */
export function calculateKp(Kc: number, deltaN: number, temperatureK: number): number {
  return Kc * Math.pow(GAS_CONSTANT_R_ATM * temperatureK, deltaN);
}

/**
 * Computes Reaction Quotient Qc:
 * Qc = Prod([Products]^coeff) / Prod([Reactants]^coeff)
 */
export function calculateQc(
  reaction: ReactionConfig,
  concentrations: Record<string, number>
): number {
  let num = 1;
  let den = 1;

  for (const s of reaction.species) {
    const c = Math.max(0, concentrations[s.id] ?? 0);
    const term = Math.pow(c, s.coefficient);
    if (s.isReactant) {
      den *= term;
    } else {
      num *= term;
    }
  }

  if (den <= 1e-12) {
    return num > 0 ? 1e6 : 1;
  }
  return num / den;
}

/**
 * Computes forward and reverse rates:
 * vf = k_f * Prod([Reactants]^coeff)
 * vr = k_r * Prod([Products]^coeff), where k_r = k_f / Kc
 */
export function calculateRates(
  reaction: ReactionConfig,
  concentrations: Record<string, number>,
  Kc: number,
  catalystFactor: number = 1.0
): { forward: number; reverse: number } {
  const kf = reaction.rateConstantForward * catalystFactor;
  const kr = (reaction.rateConstantForward / Kc) * catalystFactor;

  let prodReactants = 1;
  let prodProducts = 1;

  for (const s of reaction.species) {
    const c = Math.max(0, concentrations[s.id] ?? 0);
    const term = Math.pow(c, s.coefficient);
    if (s.isReactant) {
      prodReactants *= term;
    } else {
      prodProducts *= term;
    }
  }

  return {
    forward: kf * prodReactants,
    reverse: kr * prodProducts,
  };
}

/**
 * Single-step RK4 integration for chemical kinetics
 */
export function stepKineticsRK4(
  reaction: ReactionConfig,
  currentConcentrations: Record<string, number>,
  dt: number,
  Kc: number,
  catalystFactor: number = 1.0
): Record<string, number> {
  const getDerivatives = (c: Record<string, number>) => {
    const { forward, reverse } = calculateRates(reaction, c, Kc, catalystFactor);
    const netRate = forward - reverse;
    const derivs: Record<string, number> = {};

    for (const s of reaction.species) {
      if (s.isReactant) {
        derivs[s.id] = -s.coefficient * netRate;
      } else {
        derivs[s.id] = s.coefficient * netRate;
      }
    }
    return derivs;
  };

  const c0 = { ...currentConcentrations };
  const k1 = getDerivatives(c0);

  const c1: Record<string, number> = {};
  for (const key of Object.keys(c0)) {
    c1[key] = Math.max(0, c0[key] + 0.5 * dt * k1[key]);
  }
  const k2 = getDerivatives(c1);

  const c2: Record<string, number> = {};
  for (const key of Object.keys(c0)) {
    c2[key] = Math.max(0, c0[key] + 0.5 * dt * k2[key]);
  }
  const k3 = getDerivatives(c2);

  const c3: Record<string, number> = {};
  for (const key of Object.keys(c0)) {
    c3[key] = Math.max(0, c0[key] + dt * k3[key]);
  }
  const k4 = getDerivatives(c3);

  const result: Record<string, number> = {};
  for (const key of Object.keys(c0)) {
    const delta = (dt / 6) * (k1[key] + 2 * k2[key] + 2 * k3[key] + k4[key]);
    result[key] = Math.max(0, c0[key] + delta);
  }

  return result;
}

/**
 * Total gas pressure in atm (P = n_total * R * T / V)
 */
export function calculatePressure(
  concentrations: Record<string, number>,
  temperatureK: number,
  volumeL: number
): number {
  let totalMoles = 0;
  for (const c of Object.values(concentrations)) {
    totalMoles += c * volumeL;
  }
  if (volumeL <= 0) return 0;
  return (totalMoles * GAS_CONSTANT_R_ATM * temperatureK) / volumeL;
}

/**
 * Checks if system has reached dynamic equilibrium within tolerance
 */
export function checkEquilibrium(
  rates: { forward: number; reverse: number },
  Qc: number,
  Kc: number
): boolean {
  const rateDiff = Math.abs(rates.forward - rates.reverse);
  const maxRate = Math.max(rates.forward, rates.reverse, 1e-5);
  const rateRatio = rateDiff / maxRate;

  const qRatio = Math.abs(Qc - Kc) / Math.max(Kc, 1e-4);

  return rateRatio < 0.015 && qRatio < 0.02;
}

/**
 * Exact analytical solver for equilibrium using bisection on reaction progress extent (xi)
 */
export function solveEquilibriumConcentrations(
  reaction: ReactionConfig,
  initialConcentrations: Record<string, number>,
  Kc: number
): { concentrations: Record<string, number>; xi: number } {
  // Find valid range for xi
  let minXi = -Infinity;
  let maxXi = Infinity;

  for (const s of reaction.species) {
    const c0 = initialConcentrations[s.id] ?? 0;
    if (s.isReactant) {
      // c = c0 - s.coefficient * xi >= 0  =>  xi <= c0 / s.coefficient
      maxXi = Math.min(maxXi, c0 / s.coefficient);
      // reverse reaction limit: xi >= -something, but products cannot go negative
    } else {
      // c = c0 + s.coefficient * xi >= 0  =>  xi >= -c0 / s.coefficient
      minXi = Math.max(minXi, -c0 / s.coefficient);
    }
  }

  // Bound search slightly inside physical limits to prevent 0^power singularity
  const eps = 1e-7;
  let low = minXi + eps;
  let high = maxXi - eps;

  if (low >= high) {
    return { concentrations: { ...initialConcentrations }, xi: 0 };
  }

  const evalQMinusK = (xi: number) => {
    const tempC: Record<string, number> = {};
    for (const s of reaction.species) {
      const delta = s.isReactant ? -s.coefficient * xi : s.coefficient * xi;
      tempC[s.id] = Math.max(1e-9, (initialConcentrations[s.id] ?? 0) + delta);
    }
    const q = calculateQc(reaction, tempC);
    return q - Kc;
  };

  // Bisection search (100 iterations is plenty for machine precision)
  let bestXi = 0.5 * (low + high);
  for (let i = 0; i < 80; i++) {
    const mid = 0.5 * (low + high);
    const fMid = evalQMinusK(mid);

    if (Math.abs(fMid) < 1e-7) {
      bestXi = mid;
      break;
    }

    const fLow = evalQMinusK(low);
    if (Math.sign(fMid) === Math.sign(fLow)) {
      low = mid;
    } else {
      high = mid;
    }
    bestXi = mid;
  }

  const finalC: Record<string, number> = {};
  for (const s of reaction.species) {
    const delta = s.isReactant ? -s.coefficient * bestXi : s.coefficient * bestXi;
    finalC[s.id] = Math.max(0, (initialConcentrations[s.id] ?? 0) + delta);
  }

  return { concentrations: finalC, xi: bestXi };
}

/**
 * Explains Le Châtelier's effect for a perturbation
 */
export function getLeChatelierExplanation(
  reaction: ReactionConfig,
  type: PerturbationType,
  details?: { speciesId?: string; factor?: number }
): {
  title: string;
  description: string;
  direction: 'right' | 'left' | 'none';
  detail: string;
} {
  switch (type) {
    case 'conc_add': {
      const sp = reaction.species.find((s) => s.id === details?.speciesId);
      const name = sp ? sp.formula : 'especie';
      if (sp?.isReactant) {
        return {
          title: `Adición de Reactivo (${name})`,
          description: `Al añadir reactivo [${name}], el cociente Qc < Kc. El sistema reacciona consumiendo reactivos.`,
          direction: 'right',
          detail: `Desplazamiento hacia los PRODUCTOS (Derecha →) para restaurar el equilibrio.`,
        };
      } else {
        return {
          title: `Adición de Producto (${name})`,
          description: `Al añadir producto [${name}], Qc > Kc. El sistema reacciona consumiendo el exceso de producto.`,
          direction: 'left',
          detail: `Desplazamiento hacia los REACTIVOS (Izquierda ←) para restablecer la constante Kc.`,
        };
      }
    }

    case 'conc_remove': {
      const sp = reaction.species.find((s) => s.id === details?.speciesId);
      const name = sp ? sp.formula : 'especie';
      if (sp?.isReactant) {
        return {
          title: `Extracción de Reactivo (${name})`,
          description: `Al retirar reactivo [${name}], Qc > Kc. El sistema responde produciendo más reactivos.`,
          direction: 'left',
          detail: `Desplazamiento hacia los REACTIVOS (Izquierda ←).`,
        };
      } else {
        return {
          title: `Extracción de Producto (${name})`,
          description: `Al retirar producto [${name}], Qc < Kc. El sistema compensa produciendo más producto.`,
          direction: 'right',
          detail: `Desplazamiento hacia los PRODUCTOS (Derecha →). Esta técnica se usa en la industria para aumentar el rendimiento.`,
        };
      }
    }

    case 'temp_up': {
      const isExo = reaction.deltaH < 0;
      if (isExo) {
        return {
          title: 'Aumento de Temperatura (Calentamiento)',
          description: `La reacción es EXOTÉRMICA (ΔH = ${reaction.deltaH} kJ/mol, libera calor). El calor actúa como un producto.`,
          direction: 'left',
          detail: `Al calentar, el sistema se desplaza hacia la IZQUIERDA (Reactivos) para absorber el calor aportado. Kc DISMINUYE.`,
        };
      } else {
        return {
          title: 'Aumento de Temperatura (Calentamiento)',
          description: `La reacción es ENDOTÉRMICA (ΔH = +${reaction.deltaH} kJ/mol, absorbe calor).`,
          direction: 'right',
          detail: `Al calentar, el sistema se desplaza hacia la DERECHA (Productos) para absorber calor. Kc AUMENTA.`,
        };
      }
    }

    case 'temp_down': {
      const isExo = reaction.deltaH < 0;
      if (isExo) {
        return {
          title: 'Disminución de Temperatura (Enfriamiento)',
          description: `Reacción EXOTÉRMICA. Al enfriar, el sistema compensa liberando calor.`,
          direction: 'right',
          detail: `Se desplaza hacia la DERECHA (Productos). Kc AUMENTA a menor temperatura.`,
        };
      } else {
        return {
          title: 'Disminución de Temperatura (Enfriamiento)',
          description: `Reacción ENDOTÉRMICA. Al enfriar, el sistema reduce la absorción de calor.`,
          direction: 'left',
          detail: `Se desplaza hacia la IZQUIERDA (Reactivos). Kc DISMINUYE.`,
        };
      }
    }

    case 'pressure_up': {
      if (reaction.deltaN === 0) {
        return {
          title: 'Aumento de Presión (Compresión de Volumen)',
          description: `En esta reacción Δn = 0 (${reaction.species.filter((s) => s.isReactant).reduce((a, b) => a + b.coefficient, 0)} mol reactivos = ${reaction.species.filter((s) => !s.isReactant).reduce((a, b) => a + b.coefficient, 0)} mol productos).`,
          direction: 'none',
          detail: `¡NO HAY DESPLAZAMIENTO! Las concentraciones absolutas suben proporcionalmente, pero las fracciones molares y la posición de equilibrio permanecen idénticas (Qc = Kc).`,
        };
      } else if (reaction.deltaN < 0) {
        return {
          title: 'Aumento de Presión (Compresión de Volumen)',
          description: `Δn = ${reaction.deltaN} < 0. Hay menos moles de gas en los productos.`,
          direction: 'right',
          detail: `El sistema se desplaza hacia la DERECHA (Productos) hacia donde hay MENOS MOLES de gas para reducir la presión total impuesta.`,
        };
      } else {
        return {
          title: 'Aumento de Presión (Compresión de Volumen)',
          description: `Δn = +${reaction.deltaN} > 0. Hay menos moles de gas en los reactivos.`,
          direction: 'left',
          detail: `El sistema se desplaza hacia la IZQUIERDA (Reactivos) donde hay menos moles de gas para contrarrestar la compresión.`,
        };
      }
    }

    case 'pressure_down': {
      if (reaction.deltaN === 0) {
        return {
          title: 'Disminución de Presión (Expansión de Volumen)',
          description: `Δn = 0. El número total de moles gaseosos no cambia en la reacción.`,
          direction: 'none',
          detail: `¡NO HAY DESPLAZAMIENTO! Las concentraciones bajan por dilución, pero la composición de equilibrio molar es inalterada.`,
        };
      } else if (reaction.deltaN < 0) {
        return {
          title: 'Disminución de Presión (Expansión de Volumen)',
          description: `Δn = ${reaction.deltaN} < 0. Hay más moles en los reactivos.`,
          direction: 'left',
          detail: `El sistema se desplaza hacia la IZQUIERDA (Reactivos) para generar más moléculas de gas y contrarrestar la caída de presión.`,
        };
      } else {
        return {
          title: 'Disminución de Presión (Expansión de Volumen)',
          description: `Δn = +${reaction.deltaN} > 0. Hay más moles en los productos.`,
          direction: 'right',
          detail: `El sistema se desplaza hacia la DERECHA (Productos) para aumentar el número de partículas y compensar el mayor volumen.`,
        };
      }
    }

    case 'catalyst': {
      return {
        title: 'Adición de un Catalizador',
        description: `Un catalizador reduce la energía de activación tanto de la reacción directa como de la inversa por igual.`,
        direction: 'none',
        detail: `NO modifica el valor de Kc ni la composición final de equilibrio. Solo ACELERA la velocidad con la que se alcanza el equilibrio.`,
      };
    }

    case 'inert_gas': {
      return {
        title: 'Adición de Gas Inerte (a Volumen Constante)',
        description: `Se inyecta un gas que no reacciona (como Argón o Helio) manteniendo el volumen del reactor constante.`,
        direction: 'none',
        detail: `Aumenta la presión total, pero las presiones parciales y las concentraciones molares de reactivos y productos NO cambian. Por tanto, el equilibrio NO se altera.`,
      };
    }
  }
}
