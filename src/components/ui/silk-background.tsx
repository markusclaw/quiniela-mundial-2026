"use client";

import { useEffect, useRef } from "react";

/**
 * Animated "silk" canvas, scoped to fill its parent (e.g. the hero card).
 * Tuned to the brand green. Honors prefers-reduced-motion (renders a single
 * static frame) and runs at half-resolution for performance.
 */
type RGB = [number, number, number];

export function SilkBackground({
  className,
  homeColor = [16, 74, 56],
  awayColor = [16, 74, 56],
}: {
  className?: string;
  homeColor?: RGB;
  awayColor?: RGB;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  // Live refs so color changes (new match) apply without restarting the loop.
  const homeRef = useRef<RGB>(homeColor);
  const awayRef = useRef<RGB>(awayColor);
  homeRef.current = homeColor;
  awayRef.current = awayColor;

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const speed = 0.02;
    const scale = 2;
    const noiseIntensity = 0.7;
    const STEP = 2;
    let time = 0;

    const size = () => {
      // Half-resolution internal buffer; CSS stretches it to fill the card.
      canvas.width = Math.max(1, Math.floor(parent.clientWidth / 2));
      canvas.height = Math.max(1, Math.floor(parent.clientHeight / 2));
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(parent);

    const noise = (x: number, y: number) => {
      const G = 2.71828;
      const rx = G * Math.sin(G * x);
      const ry = G * Math.sin(G * y);
      return (rx * ry * (1 + x)) % 1;
    };

    const render = () => {
      const { width, height } = canvas;
      const img = ctx.createImageData(width, height);
      const d = img.data;
      const tOffset = speed * time;
      const home = homeRef.current;
      const away = awayRef.current;
      for (let x = 0; x < width; x += STEP) {
        // Blend home → away color across the width (home on the left).
        const mix = width > 1 ? x / width : 0;
        const cr = home[0] + (away[0] - home[0]) * mix;
        const cg = home[1] + (away[1] - home[1]) * mix;
        const cb = home[2] + (away[2] - home[2]) * mix;
        for (let y = 0; y < height; y += STEP) {
          const u = (x / width) * scale;
          const v = (y / height) * scale;
          const tx = u;
          const ty = v + 0.03 * Math.sin(8.0 * tx - tOffset);
          const pattern =
            0.6 +
            0.4 *
              Math.sin(
                5.0 *
                  (tx + ty + Math.cos(3.0 * tx + 5.0 * ty) + 0.02 * tOffset) +
                  Math.sin(20.0 * (tx + ty - 0.1 * tOffset)),
              );
          const rnd = noise(x, y);
          const intensity = Math.max(0, pattern - (rnd / 15.0) * noiseIntensity);
          // Darken floor so the texture reads, then scale the team color.
          const f = 0.2 + 0.8 * intensity;
          const r = Math.floor(cr * f);
          const g = Math.floor(cg * f);
          const b = Math.floor(cb * f);
          for (let dx = 0; dx < STEP; dx++) {
            for (let dy = 0; dy < STEP; dy++) {
              const ix = ((y + dy) * width + (x + dx)) * 4;
              if (ix + 3 < d.length) {
                d[ix] = r;
                d[ix + 1] = g;
                d[ix + 2] = b;
                d[ix + 3] = 255;
              }
            }
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    if (reduce) {
      render();
    } else {
      const loop = () => {
        render();
        time += 1;
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    }

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
