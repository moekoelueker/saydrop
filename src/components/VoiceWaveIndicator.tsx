import { useEffect, useRef } from "react";

const BAR_COUNT = 16;
// Bar scale relative to the full height set in CSS (.voice-wave-bar).
const MIN_SCALE = 0.12;
// Smoothing time constants: react to speech quickly, settle slowly.
const RISE_MS = 40;
const FALL_MS = 260;
// Small travelling ripple so a steady voice still looks alive. It scales with
// the level, so silence stays still.
const RIPPLE_AMOUNT = 0.18;
const RIPPLE_SPEED = 0.009;

// Mirrored envelope: 1 for the two middle bars, tapering towards the edges.
const BAR_SHAPE = Array.from({ length: BAR_COUNT }, (_, i) => {
  const center = (BAR_COUNT - 1) / 2;
  const distance = Math.abs(i - center) / center;
  return 1 - 0.7 * distance * distance;
});

export function smoothLevel(
  current: number,
  target: number,
  elapsedMs: number,
): number {
  const tau = target > current ? RISE_MS : FALL_MS;
  const alpha = 1 - Math.exp(-Math.max(0, elapsedMs) / tau);
  return current + (target - current) * alpha;
}

export function barScale(index: number, level: number, timeMs: number) {
  const center = (BAR_COUNT - 1) / 2;
  const distance = Math.abs(index - center);
  const ripple =
    1 + RIPPLE_AMOUNT * level * Math.sin(timeMs * RIPPLE_SPEED - distance);
  const scale = MIN_SCALE + (1 - MIN_SCALE) * level * BAR_SHAPE[index] * ripple;
  return Math.min(1, Math.max(MIN_SCALE, scale));
}

export function VoiceWaveIndicator({
  isListening,
  level,
}: {
  isListening: boolean;
  level: number;
}) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const targetRef = useRef(0);
  targetRef.current = isListening ? Math.min(1, Math.max(0, level)) : 0;

  useEffect(() => {
    const applyScales = (smoothed: number, timeMs: number) => {
      barRefs.current.forEach((bar, i) => {
        if (bar) {
          bar.style.transform = `scaleY(${barScale(i, smoothed, timeMs)})`;
        }
      });
    };

    if (!isListening) {
      applyScales(0, 0);
      return;
    }

    let smoothed = 0;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      smoothed = smoothLevel(smoothed, targetRef.current, now - last);
      last = now;
      applyScales(smoothed, now);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [isListening]);

  return (
    <div className="voice-wave">
      {BAR_SHAPE.map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          className={`voice-wave-bar ${isListening ? "active" : ""}`}
        />
      ))}
    </div>
  );
}
