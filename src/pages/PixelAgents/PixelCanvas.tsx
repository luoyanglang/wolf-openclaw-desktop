import { useEffect, useRef, useState } from 'react';
import { OfficeState } from './engine/officeState';
import { startGameLoop } from './engine/gameLoop';
import { renderFrame } from './engine/renderer';
import { ZOOM_MAX, TILE_SIZE } from './pixelConstants';
import { loadPixelAssets } from './assetLoader';

interface PixelCanvasProps {
  officeState: OfficeState;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Simplified canvas component — renders the pixel office auto-fit (no pan/zoom interaction).
 * The office is always centered and scaled to fill the canvas.
 */
export function PixelCanvas({ officeState, style, className }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas size in device pixels
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });

  // Resize observer — recalculates auto-fit on every resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;
      setCanvasSize({ w: Math.round(width * dpr), h: Math.round(height * dpr) });
    });
    obs.observe(container);

    // Initial size
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    setCanvasSize({
      w: Math.round(rect.width * dpr),
      h: Math.round(rect.height * dpr),
    });

    return () => obs.disconnect();
  }, []);

  // Game loop — computes auto-fit zoom fresh each frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stop = startGameLoop(canvas, {
      update: (dt) => {
        officeState.update(dt);
      },
      render: (ctx) => {
        const canvasW = canvas.width;
        const canvasH = canvas.height;
        const worldW = officeState.layout.cols * TILE_SIZE;
        const worldH = officeState.layout.rows * TILE_SIZE;
        const zoom = Math.min(canvasW / worldW, canvasH / worldH) * 0.95;
        const clampedZoom = Math.max(1, Math.min(ZOOM_MAX, zoom));
        renderFrame(
          ctx,
          canvasW,
          canvasH,
          officeState.tileMap,
          officeState.furniture,
          officeState.getCharacters(),
          clampedZoom,
          0,
          0,
          undefined,
          undefined,
          officeState.layout.tileColors,
          officeState.layout.cols,
          officeState.layout.rows,
          undefined, // backgroundImage disabled — using tile-based layout
        );
      },
    });

    return stop;
  }, [officeState, canvasSize]);

  // Load PNG sprite assets on mount
  useEffect(() => {
    loadPixelAssets();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#0a0a14',
        ...style,
      }}
      className={className}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        style={{
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated',
          display: 'block',
        }}
      />
    </div>
  );
}
