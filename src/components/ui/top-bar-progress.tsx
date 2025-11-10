"use client";

import { useEffect, useRef, useState, type FC } from "react";
import useSound from "use-sound";
import { useHaptic } from "use-haptic";

const MINUTE_MS = 60000;
const HAPTIC_WINDOW_START_SECOND = 50;

export const TopBarProgress: FC = () => {
  const [progress, setProgress] = useState<number>(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);
  const lastHapticSecondRef = useRef<number | undefined>(undefined);
  const previousProgressRef = useRef<number>(0);

  const { triggerHaptic } = useHaptic();
  const [playChime] = useSound("/clock-chime.mp3", { interrupt: true });

  useEffect(() => {
    startTimeRef.current = performance.now();

    const animate = () => {
      const elapsed = performance.now() - (startTimeRef.current ?? 0);
      const elapsedInCycle = elapsed % MINUTE_MS;
      const currentProgress = elapsedInCycle / MINUTE_MS;
      const currentSecond = Math.floor(elapsedInCycle / 1000);

      if (currentSecond >= HAPTIC_WINDOW_START_SECOND && currentSecond !== lastHapticSecondRef.current) {
        triggerHaptic();
        lastHapticSecondRef.current = currentSecond;
      } else if (currentSecond < HAPTIC_WINDOW_START_SECOND) {
        lastHapticSecondRef.current = currentSecond;
      }

      if (previousProgressRef.current > currentProgress) {
        playChime();
      }

      previousProgressRef.current = currentProgress;
      setProgress(currentProgress);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playChime, triggerHaptic]);

  return (
    <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
      <div className="h-full bg-white transition-all duration-100" style={{ width: `${progress * 100}%` }} />
    </div>
  );
};
