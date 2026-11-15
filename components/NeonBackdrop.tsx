"use client";

import { useEffect, useRef } from "react";

type Bundle = {
  y: number;
  amplitude: number;
  frequency: number;
  speed: number;
  spread: number;
  count: number;
  tilt: number;
  colors: string[];
  seed: number;
};

const BUNDLES: Bundle[] = [
  {
    y: 0.3,
    amplitude: 0.09,
    frequency: 1.6,
    speed: 0.16,
    spread: 0.012,
    count: 16,
    tilt: -0.12,
    colors: ["#22e3ff", "#5a7dff", "#8b5cff"],
    seed: 0.4,
  },
  {
    y: 0.74,
    amplitude: 0.11,
    frequency: 1.25,
    speed: -0.12,
    spread: 0.014,
    count: 18,
    tilt: 0.1,
    colors: ["#8b5cff", "#c445ff", "#ff3ec8"],
    seed: 2.1,
  },
  {
    y: 0.52,
    amplitude: 0.05,
    frequency: 2.4,
    speed: 0.09,
    spread: 0.02,
    count: 7,
    tilt: 0.04,
    colors: ["#ff3ec8", "#8b5cff", "#22e3ff"],
    seed: 4.3,
  },
];

const STEP = 14;
const FRAME_MS = 1000 / 30;

export default function NeonBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let gradients: CanvasGradient[] = [];
    let frame = 0;
    let last = 0;
    let elapsed = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      gradients = BUNDLES.map((bundle) => {
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        bundle.colors.forEach((color, index) =>
          gradient.addColorStop(index / (bundle.colors.length - 1), color),
        );
        return gradient;
      });
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      const span = Math.max(width, 1);
      BUNDLES.forEach((bundle, b) => {
        ctx.strokeStyle = gradients[b];
        const middle = (bundle.count - 1) / 2;
        for (let i = 0; i < bundle.count; i++) {
          const weight = 1 - Math.abs(i - middle) / (middle + 1);
          const offset = (i - middle) * bundle.spread * height;
          ctx.beginPath();
          for (let x = -STEP; x <= width + STEP; x += STEP) {
            const u = x / span;
            const twist =
              1 + 0.55 * Math.sin(u * 3.1 + time * 0.35 + bundle.seed);
            const y =
              bundle.y * height +
              (u - 0.5) * bundle.tilt * height +
              offset * twist +
              bundle.amplitude *
                height *
                Math.sin(
                  u * Math.PI * bundle.frequency +
                    time * bundle.speed * 6 +
                    bundle.seed +
                    i * 0.035,
                ) +
              bundle.amplitude *
                0.35 *
                height *
                Math.sin(
                  u * Math.PI * bundle.frequency * 2.3 -
                    time * bundle.speed * 4 +
                    bundle.seed * 2,
                );
            if (x === -STEP) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.globalAlpha = 0.05 + 0.07 * weight;
          ctx.lineWidth = 7;
          ctx.stroke();
          ctx.globalAlpha = 0.18 + 0.5 * weight;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const delta = now - last;
      if (delta < FRAME_MS) return;
      elapsed += Math.min(delta, 100) / 1000;
      last = now;
      draw(elapsed);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      if (motion.matches || document.hidden) {
        draw(elapsed);
        return;
      }
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const onResize = () => {
      resize();
      draw(elapsed);
    };

    resize();
    start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", start);
    motion.addEventListener("change", start);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", start);
      motion.removeEventListener("change", start);
    };
  }, []);

  return (
    <div className="neon-backdrop" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
