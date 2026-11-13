/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { ReactionConfig } from '../types/equilibrium';
import { Gauge, Thermometer, Box, Flame } from 'lucide-react';

interface ReactorPistonProps {
  reaction: ReactionConfig;
  concentrations: Record<string, number>;
  volume: number; // in Liters (0.3 to 2.5 L)
  temperature: number; // in Kelvin
  pressure: number; // in atm
  isEquilibrium: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  speciesId: string;
}

export const ReactorPiston: React.FC<ReactorPistonProps> = ({
  reaction,
  concentrations,
  volume,
  temperature,
  pressure,
  isEquilibrium,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Vessel height scales with volume: 1.0 L = normal height
  // Min volume 0.3 L (compressed piston), Max volume 2.5 L (high piston)
  const baseVesselHeight = 220;
  const clampedVol = Math.max(0.3, Math.min(2.5, volume));
  const pistonHeight = 40 + (2.5 - clampedVol) * 70; // top coordinate of gas chamber inside canvas

  // Gas ambient color calculation (e.g. NO2 brown gas, I2 purple vapor)
  const getGasTintStyle = () => {
    if (reaction.id === 'no2_dimerization') {
      const cNO2 = concentrations['NO2'] ?? 0;
      const opacity = Math.min(0.85, Math.max(0.05, cNO2 * 0.45));
      return `rgba(180, 50, 20, ${opacity})`;
    }
    if (reaction.id === 'hi_synthesis') {
      const cI2 = concentrations['I2'] ?? 0;
      const opacity = Math.min(0.75, Math.max(0.04, cI2 * 0.35));
      return `rgba(147, 51, 234, ${opacity})`;
    }
    if (reaction.id === 'pcl5_dissociation') {
      const cCl2 = concentrations['Cl2'] ?? 0;
      const opacity = Math.min(0.55, Math.max(0.03, cCl2 * 0.3));
      return `rgba(132, 204, 22, ${opacity})`;
    }
    // Default subtle glow
    return 'rgba(30, 41, 59, 0.4)';
  };

  // Re-seed and manage particles based on moles (Concentration * Volume)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const chamberTop = pistonHeight;
    const chamberBottom = height - 12;

    const targetCounts: Record<string, number> = {};
    const maxParticles = 65;
    let totalMoles = 0;
    for (const s of reaction.species) {
      const moles = (concentrations[s.id] ?? 0) * volume;
      totalMoles += moles;
    }

    for (const s of reaction.species) {
      const moles = (concentrations[s.id] ?? 0) * volume;
      const fraction = totalMoles > 0 ? moles / totalMoles : 0;
      targetCounts[s.id] = Math.round(fraction * maxParticles);
    }

    // Adjust existing particle list towards targetCounts
    const newParticles: Particle[] = [];
    const speedFactor = Math.sqrt(temperature / 300) * 1.5;

    for (const s of reaction.species) {
      const count = targetCounts[s.id] || 0;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.8 + Math.random() * 1.2) * speedFactor;
        newParticles.push({
          x: 20 + Math.random() * (width - 40),
          y: chamberTop + 10 + Math.random() * Math.max(20, chamberBottom - chamberTop - 20),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: s.radius * 0.7,
          color: s.particleColor,
          speciesId: s.id,
        });
      }
    }

    particlesRef.current = newParticles;
  }, [reaction, volume, temperature, concentrations]);

  // Particle physics animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;
      const width = canvas.width;
      const height = canvas.height;
      const chamberTop = pistonHeight;
      const chamberBottom = height - 12;
      const chamberLeft = 14;
      const chamberRight = width - 14;

      ctx.clearRect(0, 0, width, height);

      // Draw gas chamber interior with gas tint
      ctx.fillStyle = getGasTintStyle();
      ctx.fillRect(
        chamberLeft,
        chamberTop,
        chamberRight - chamberLeft,
        Math.max(10, chamberBottom - chamberTop)
      );

      // Update & Draw particles
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        // Bounce horizontally
        if (p.x - p.radius < chamberLeft) {
          p.x = chamberLeft + p.radius;
          p.vx = -p.vx;
        } else if (p.x + p.radius > chamberRight) {
          p.x = chamberRight - p.radius;
          p.vx = -p.vx;
        }

        // Bounce vertically (piston top & cylinder bottom)
        if (p.y - p.radius < chamberTop) {
          p.y = chamberTop + p.radius;
          p.vy = Math.abs(p.vy);
        } else if (p.y + p.radius > chamberBottom) {
          p.y = chamberBottom - p.radius;
          p.vy = -Math.abs(p.vy);
        }

        // Render particle with subtle glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw Piston Head
      ctx.fillStyle = '#475569';
      ctx.fillRect(chamberLeft - 4, chamberTop - 14, chamberRight - chamberLeft + 8, 14);

      // Piston rod
      ctx.fillStyle = '#64748b';
      const rodWidth = 16;
      ctx.fillRect(width / 2 - rodWidth / 2, 0, rodWidth, chamberTop - 14);

      // Piston handle / top plate
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(width / 2 - 28, 0, 56, 8);

      // Cylinder wall outline (glass / steel border)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Left wall
      ctx.moveTo(chamberLeft - 2, 20);
      ctx.lineTo(chamberLeft - 2, chamberBottom + 2);
      // Bottom
      ctx.lineTo(chamberRight + 2, chamberBottom + 2);
      // Right wall
      ctx.lineTo(chamberRight + 2, 20);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [pistonHeight, temperature, concentrations, reaction]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-indigo-400" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Reactor Cerrado y Pistón
          </h4>
        </div>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            isEquilibrium
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          {isEquilibrium ? 'Equilibrio Estable' : 'Relajación Dinámica'}
        </span>
      </div>

      {/* Canvas Cylinder */}
      <div className="relative flex justify-center items-center py-1">
        <canvas
          ref={canvasRef}
          width={280}
          height={220}
          className="rounded-lg bg-slate-950/90 border border-slate-800/80 shadow-inner"
        />

        {/* Dynamic color note if reaction has color effect */}
        {reaction.colorEffect && (
          <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 backdrop-blur border border-slate-800 px-2 py-1 rounded text-[10px] text-slate-300 text-center">
            {reaction.colorEffect.description}
          </div>
        )}
      </div>

      {/* Physical Indicators & Gauges */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-800 text-center">
        {/* Pressure */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[11px] mb-0.5">
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <span>Presión (P)</span>
          </div>
          <div className="font-mono text-sm font-bold text-sky-300">
            {pressure.toFixed(2)}{' '}
            <span className="text-[10px] text-slate-500 font-normal">atm</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {(pressure * 1.01325).toFixed(2)} bar
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[11px] mb-0.5">
            <Thermometer className="w-3.5 h-3.5 text-rose-400" />
            <span>Temp. (T)</span>
          </div>
          <div className="font-mono text-sm font-bold text-rose-300">
            {temperature.toFixed(0)}{' '}
            <span className="text-[10px] text-slate-500 font-normal">K</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {(temperature - 273.15).toFixed(0)} °C
          </div>
        </div>

        {/* Volume */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[11px] mb-0.5">
            <Box className="w-3.5 h-3.5 text-indigo-400" />
            <span>Volumen (V)</span>
          </div>
          <div className="font-mono text-sm font-bold text-indigo-300">
            {volume.toFixed(2)}{' '}
            <span className="text-[10px] text-slate-500 font-normal">L</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {volume < 1 ? 'Comprimido' : volume > 1 ? 'Expandido' : 'Estándar'}
          </div>
        </div>
      </div>
    </div>
  );
};
