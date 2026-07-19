import React, { useEffect, useRef } from "react";
import { ThemeConfig, ParticleDefinition } from "../../lib/themes.js";

interface ParticleEngineProps {
  theme: ThemeConfig;
  isActive?: boolean;
  density?: 'low' | 'medium' | 'high';
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  def: ParticleDefinition;
  life: number;
  maxLife: number;
  angle: number;
  spin: number;

  constructor(def: ParticleDefinition, canvasWidth: number, canvasHeight: number) {
    this.def = def;
    this.x = Math.random() * canvasWidth;
    
    // Snow/rain usually falls from top, fireflies can spawn anywhere
    if (def.type === 'rain' || def.type === 'snow') {
      this.y = -Math.random() * 200;
    } else {
      this.y = Math.random() * canvasHeight;
    }

    const speedBase = Math.random() * (def.speed[1] - def.speed[0]) + def.speed[0];
    
    if (def.type === 'rain') {
      this.vy = speedBase * 2;
      this.vx = 0.5; // slight wind
    } else if (def.type === 'snow') {
      this.vy = speedBase;
      this.vx = (Math.random() - 0.5) * 1;
    } else if (def.type === 'firefly' || def.type === 'star') {
      this.vy = (Math.random() - 0.5) * speedBase;
      this.vx = (Math.random() - 0.5) * speedBase;
    } else {
      this.vy = speedBase;
      this.vx = (Math.random() - 0.5) * 2; // petal drift
    }

    this.size = Math.random() * (def.size[1] - def.size[0]) + def.size[0];
    this.maxLife = Math.random() * 200 + 100; // frames
    this.life = this.maxLife;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.1;
  }

  update(canvasWidth: number, canvasHeight: number) {
    if (this.def.drift) {
      this.x += Math.sin(this.life * 0.05) * 0.5;
    }
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.spin;

    if (this.def.type === 'firefly' || this.def.type === 'petal') {
      this.life--;
    }

    // Reset if out of bounds
    if (this.y > canvasHeight + 50 || this.x < -50 || this.x > canvasWidth + 50 || this.life <= 0) {
      this.y = this.def.type === 'rain' || this.def.type === 'snow' ? -10 : Math.random() * canvasHeight;
      this.x = Math.random() * canvasWidth;
      this.life = this.maxLife;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    let opacity = 1;
    if (this.def.type === 'firefly' || this.def.type === 'petal') {
      opacity = Math.max(0, Math.min(1, this.life / 50));
    }

    if (this.def.glow) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(255,255,255,0.8)';
    }

    if (this.def.type === 'petal') {
      ctx.fillStyle = `rgba(255, 180, 200, ${opacity})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.def.type === 'firefly') {
      ctx.fillStyle = `rgba(255, 255, 150, ${opacity})`;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.def.type === 'rain') {
      ctx.strokeStyle = `rgba(150, 200, 255, 0.4)`;
      ctx.lineWidth = this.size;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(this.vx * 2, this.vy * 2);
      ctx.stroke();
    } else if (this.def.type === 'snow' || this.def.type === 'star') {
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export default function ParticleEngine({ theme, isActive = true, density = 'medium' }: ParticleEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isActive || !theme.ambient || theme.ambient.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    // Multiplier based on density setting
    const dMult = density === 'high' ? 1 : density === 'medium' ? 0.5 : 0.2;

    theme.ambient.forEach(def => {
      const pCount = Math.floor(def.count * dMult);
      for (let i = 0; i < pCount; i++) {
        particles.push(new Particle(def, canvas.width, canvas.height));
      }
    });

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update(canvas.width, canvas.height);
        p.draw(ctx);
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, isActive, density]);

  if (!isActive || !theme.ambient) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-40"
      style={{ opacity: 0.8 }}
      aria-hidden="true"
    />
  );
}
