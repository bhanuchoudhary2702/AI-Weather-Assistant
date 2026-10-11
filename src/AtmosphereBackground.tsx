import { useEffect, useRef } from "react";
import type { WeatherCondition, TimeOfDay } from "./types";
import { getWeatherTheme } from "./weatherUtils";

interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
  opacity: number;
  blur: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

interface Props {
  condition: WeatherCondition;
  timeOfDay: TimeOfDay;
}

export function AtmosphereBackground({ condition, timeOfDay }: Props) {
  const cloudCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const themeRef = useRef(getWeatherTheme(condition, timeOfDay));

  // Update theme ref when condition/time changes
  useEffect(() => {
    themeRef.current = getWeatherTheme(condition, timeOfDay);
  }, [condition, timeOfDay]);

  // Cloud + particle animation
  useEffect(() => {
    const cloudCanvas = cloudCanvasRef.current;
    const particleCanvas = particleCanvasRef.current;
    if (!cloudCanvas || !particleCanvas) return;

    const cloudCtx = cloudCanvas.getContext("2d");
    const particleCtx = particleCanvas.getContext("2d");
    if (!cloudCtx || !particleCtx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const setupCanvas = (canvas: HTMLCanvasElement) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setupCanvas(cloudCanvas);
    setupCanvas(particleCanvas);

    // Initialize clouds
    const numClouds = condition === "clear" ? 3 : condition === "clouds" ? 7 : 5;
    const clouds: Cloud[] = [];
    for (let i = 0; i < numClouds; i++) {
      clouds.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.6,
        scale: 0.8 + Math.random() * 1.5,
        speed: 0.08 + Math.random() * 0.25,
        opacity: 0.15 + Math.random() * 0.3,
        blur: 20 + Math.random() * 30,
      });
    }

    // Initialize particles based on condition
    const isRaining = condition === "rain" || condition === "drizzle";
    const isSnowing = condition === "snow";
    const isThunder = condition === "thunderstorm";
    const numParticles = isRaining ? 80 : isSnowing ? 50 : isThunder ? 60 : 0;

    const particles: Particle[] = [];
    const createParticle = (): Particle => {
      if (isRaining || isThunder) {
        return {
          x: Math.random() * width,
          y: -20,
          vx: -1 + Math.random() * 0.5,
          vy: 6 + Math.random() * 8,
          size: 1 + Math.random() * 2,
          opacity: 0.3 + Math.random() * 0.4,
          life: 0,
          maxLife: height + 40,
        };
      }
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: -0.5 + Math.random() * 1,
        vy: 0.3 + Math.random() * 1.2,
        size: 1.5 + Math.random() * 3,
        opacity: 0.4 + Math.random() * 0.5,
        life: 0,
        maxLife: 300 + Math.random() * 200,
      };
    };

    for (let i = 0; i < numParticles; i++) {
      const p = createParticle();
      p.y = Math.random() * height;
      particles.push(p);
    }

    let lightningTimer = 0;
    let lightningFlash = 0;

    const drawCloud = (ctx: CanvasRenderingContext2D, cloud: Cloud, color: string, opacity: number) => {
      const { x, y, scale, blur } = cloud;
      ctx.save();
      ctx.filter = `blur(${blur}px)`;
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;

      const r = 60 * scale;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x + r * 0.8, y - r * 0.2, r * 0.7, 0, Math.PI * 2);
      ctx.arc(x + r * 1.5, y, r * 0.8, 0, Math.PI * 2);
      ctx.arc(x + r * 0.4, y + r * 0.3, r * 0.6, 0, Math.PI * 2);
      ctx.arc(x - r * 0.5, y + r * 0.1, r * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      const theme = themeRef.current;

      // Clouds
      cloudCtx.clearRect(0, 0, width, height);
      for (const cloud of clouds) {
        cloud.x += cloud.speed;
        if (cloud.x - 200 * cloud.scale > width) {
          cloud.x = -200 * cloud.scale;
          cloud.y = Math.random() * height * 0.6;
        }
        drawCloud(cloudCtx, cloud, theme.cloudColor, cloud.opacity * theme.cloudOpacity);
      }

      // Particles
      particleCtx.clearRect(0, 0, width, height);
      if (isRaining || isSnowing || isThunder) {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life++;

          if (p.y > height + 20 || p.life > p.maxLife) {
            particles[i] = createParticle();
            continue;
          }

          particleCtx.save();
          particleCtx.globalAlpha = p.opacity;
          particleCtx.fillStyle = theme.particleColor;

          if (isSnowing) {
            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            particleCtx.fill();
          } else {
            particleCtx.strokeStyle = theme.particleColor;
            particleCtx.lineWidth = p.size;
            particleCtx.beginPath();
            particleCtx.moveTo(p.x, p.y);
            particleCtx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
            particleCtx.stroke();
          }
          particleCtx.restore();
        }
      }

      // Lightning flash for thunderstorms
      if (isThunder) {
        lightningTimer++;
        if (lightningTimer > 120 + Math.random() * 200) {
          lightningFlash = 12;
          lightningTimer = 0;
        }
        if (lightningFlash > 0) {
          particleCtx.save();
          particleCtx.fillStyle = `rgba(200, 180, 255, ${lightningFlash / 24})`;
          particleCtx.fillRect(0, 0, width, height);
          particleCtx.restore();
          lightningFlash--;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      setupCanvas(cloudCanvas);
      setupCanvas(particleCanvas);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [condition, timeOfDay]);

  const theme = getWeatherTheme(condition, timeOfDay);

  return (
    <>
      {/* Base gradient background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: theme.gradient,
          zIndex: 0,
          transition: "background 1.5s ease",
        }}
        aria-hidden="true"
      />
      {/* Cloud layer */}
      <canvas
        ref={cloudCanvasRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
      {/* Particle layer */}
      <canvas
        ref={particleCanvasRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
    </>
  );
}
