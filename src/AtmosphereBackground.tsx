import { useEffect, useRef } from "react";
import type { WeatherCondition, TimeOfDay } from "./types";
import { getWeatherTheme } from "./weatherUtils";

interface Cloud {
  x: number; y: number;
  scale: number; speed: number;
  opacity: number; blur: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  life: number; maxLife: number;
}

interface Star {
  x: number; y: number;
  r: number; twinklePhase: number; twinkleSpeed: number;
}

interface Props {
  condition: WeatherCondition;
  timeOfDay: TimeOfDay;
}

function setupCanvas(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function AtmosphereBackground({ condition, timeOfDay }: Props) {
  const cloudCanvasRef   = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const condRef   = useRef(condition);
  const timeRef   = useRef(timeOfDay);

  useEffect(() => {
    condRef.current = condition;
    timeRef.current = timeOfDay;
  }, [condition, timeOfDay]);

  useEffect(() => {
    const cloudCanvas    = cloudCanvasRef.current;
    const particleCanvas = particleCanvasRef.current;
    if (!cloudCanvas || !particleCanvas) return;
    const cloudCtx    = cloudCanvas.getContext("2d");
    const particleCtx = particleCanvas.getContext("2d");
    if (!cloudCtx || !particleCtx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let raf = 0;

    setupCanvas(cloudCanvas,    W, H);
    setupCanvas(particleCanvas, W, H);

    // ── Clouds ────────────────────────────────────────
    const makeCloud = (randomX = true): Cloud => ({
      x: randomX ? Math.random() * W : -200,
      y: Math.random() * H * 0.55,
      scale: 0.7 + Math.random() * 1.6,
      speed: 0.07 + Math.random() * 0.22,
      opacity: 0.15 + Math.random() * 0.28,
      blur: 22 + Math.random() * 32,
    });

    const clouds: Cloud[] = Array.from({ length: 7 }, () => makeCloud(true));

    const drawCloud = (ctx: CanvasRenderingContext2D, c: Cloud, color: string, opacity: number) => {
      const r = 60 * c.scale;
      ctx.save();
      ctx.filter = `blur(${c.blur}px)`;
      ctx.globalAlpha = Math.min(1, opacity);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(c.x,            c.y,           r,        0, Math.PI * 2);
      ctx.arc(c.x + r * .8,  c.y - r * .2,  r * .72,  0, Math.PI * 2);
      ctx.arc(c.x + r * 1.5, c.y,           r * .82,  0, Math.PI * 2);
      ctx.arc(c.x + r * .4,  c.y + r * .3,  r * .6,   0, Math.PI * 2);
      ctx.arc(c.x - r * .5,  c.y + r * .1,  r * .65,  0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // ── Stars (clear-night only) ───────────────────────
    const stars: Star[] = Array.from({ length: 160 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.7,
      r: 0.4 + Math.random() * 1.2,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.008 + Math.random() * 0.018,
    }));

    // ── Particles ─────────────────────────────────────
    const makeParticle = (spawnTop: boolean): Particle => ({
      x: Math.random() * W,
      y: spawnTop ? -20 : Math.random() * H,
      vx: -0.8 + Math.random() * 0.4,
      vy: 5 + Math.random() * 9,
      size: 1 + Math.random() * 2,
      opacity: 0.25 + Math.random() * 0.45,
      life: 0,
      maxLife: H + 40,
    });

    const makeSnowParticle = (spawnTop: boolean): Particle => ({
      x: Math.random() * W,
      y: spawnTop ? -10 : Math.random() * H,
      vx: -0.4 + Math.random() * 0.8,
      vy: 0.6 + Math.random() * 1.6,
      size: 1.5 + Math.random() * 3.5,
      opacity: 0.45 + Math.random() * 0.5,
      life: 0,
      maxLife: H + 20,
    });

    const isRaining  = ["rain", "drizzle", "thunderstorm"].includes(condition);
    const isSnowing  = condition === "snow";
    const isThunder  = condition === "thunderstorm";
    const numP       = isRaining ? 90 : isSnowing ? 55 : 0;

    const particles: Particle[] = isSnowing
      ? Array.from({ length: numP }, () => makeSnowParticle(false))
      : Array.from({ length: numP }, () => makeParticle(false));

    let lightningTimer = 0;
    let flashOpacity   = 0;
    let frameCount     = 0;

    const animate = () => {
      const cond = condRef.current;
      const tod  = timeRef.current;
      const theme = getWeatherTheme(cond, tod);
      const isNight = tod === "night";
      const isClearNight = cond === "clear" && isNight;
      frameCount++;

      // ── Cloud canvas ─────────────────────────────────
      cloudCtx.clearRect(0, 0, W, H);

      // Stars (only when clear-night)
      if (isClearNight) {
        for (const s of stars) {
          s.twinklePhase += s.twinkleSpeed;
          const alpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(s.twinklePhase));
          cloudCtx.save();
          cloudCtx.globalAlpha = alpha;
          cloudCtx.fillStyle   = "#b0c8ff";
          cloudCtx.beginPath();
          cloudCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          cloudCtx.fill();
          cloudCtx.restore();
        }
      }

      // Cloud count driven by condition
      const targetClouds = cond === "clear" ? 2 : cond === "clouds" ? 7 : 5;
      for (let i = 0; i < Math.min(clouds.length, targetClouds); i++) {
        const c = clouds[i];
        c.x += c.speed;
        if (c.x - 200 * c.scale > W) {
          c.x = -200 * c.scale;
          c.y = Math.random() * H * 0.55;
        }
        drawCloud(cloudCtx, c, theme.cloudColor, c.opacity * theme.cloudOpacity);
      }

      // ── Particle canvas ───────────────────────────────
      particleCtx.clearRect(0, 0, W, H);

      if (isRaining || isSnowing) {
        const isRain = isRaining;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx; p.y += p.vy; p.life++;
          if (p.y > H + 20 || p.life > p.maxLife) {
            particles[i] = isSnowing ? makeSnowParticle(true) : makeParticle(true);
            continue;
          }
          particleCtx.save();
          particleCtx.globalAlpha = p.opacity;
          if (isRain) {
            particleCtx.strokeStyle = theme.particleColor;
            particleCtx.lineWidth   = p.size;
            particleCtx.beginPath();
            particleCtx.moveTo(p.x, p.y);
            particleCtx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
            particleCtx.stroke();
          } else {
            particleCtx.fillStyle = theme.particleColor;
            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            particleCtx.fill();
          }
          particleCtx.restore();
        }
      }

      // Lightning flashes
      if (isThunder) {
        lightningTimer++;
        if (lightningTimer > 130 + Math.random() * 180) {
          flashOpacity   = 0.28;
          lightningTimer = 0;
        }
        if (flashOpacity > 0) {
          particleCtx.save();
          particleCtx.fillStyle = `rgba(200,180,255,${flashOpacity})`;
          particleCtx.fillRect(0, 0, W, H);
          particleCtx.restore();
          flashOpacity = Math.max(0, flashOpacity - 0.025);
        }
      }

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    animRef.current = raf;

    const onResize = () => {
      cancelAnimationFrame(animRef.current);
      W = window.innerWidth;
      H = window.innerHeight;
      setupCanvas(cloudCanvas,    W, H);
      setupCanvas(particleCanvas, W, H);
      animRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once; condition/timeOfDay changes are read through refs

  const theme = getWeatherTheme(condition, timeOfDay);

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0,
          background: theme.gradient,
          zIndex: 0,
          transition: "background 1.8s ease",
        }}
      />
      <canvas
        ref={cloudCanvasRef}
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }}
      />
      <canvas
        ref={particleCanvasRef}
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none" }}
      />
    </>
  );
}
