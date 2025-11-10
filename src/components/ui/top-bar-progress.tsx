"use client";

import { useEffect, useRef, useState, type FC } from "react";
import useSound from "use-sound";
import { useHaptic } from "use-haptic";
import { useGlobalStateRefetch } from "@/hooks/use-global-state";
import { logger } from "@/utils/logger";

const MINUTE_MS = 60000;
const HAPTIC_WINDOW_START_REMAINING_SECOND = 10;

export const TopBarProgress: FC = () => {
  // Hydrationエラーを防ぐため、初期値は0に設定し、クライアント側で実際の値を設定
  const [progress, setProgress] = useState<number>(0);
  const [displaySecond, setDisplaySecond] = useState<number>(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastRemainingRef = useRef<number>(0);
  const previousProgressRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);

  const { triggerHaptic } = useHaptic();
  const [playChime] = useSound("/clock-chime.mp3", { interrupt: true });
  const refetchGlobalState = useGlobalStateRefetch();
  const refetchGlobalStateRef = useRef(refetchGlobalState);

  // refetch関数の参照を最新に保つ
  useEffect(() => {
    refetchGlobalStateRef.current = refetchGlobalState;
  }, [refetchGlobalState]);

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const elapsedInCycle = now % MINUTE_MS;
      const remainingMs = MINUTE_MS - elapsedInCycle;
      const nextRemainingSeconds = Math.floor(remainingMs / 1000);
      const currentElapsedProgress = elapsedInCycle / MINUTE_MS;

      if (!isInitializedRef.current) {
        const initialProgress = currentElapsedProgress;
        const initialDisplaySecond = Math.min(59, nextRemainingSeconds);

        setProgress(initialProgress);
        setDisplaySecond(initialDisplaySecond);
        lastRemainingRef.current = initialDisplaySecond;
        previousProgressRef.current = initialProgress;
        isInitializedRef.current = true;
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const hasWrapped = currentElapsedProgress < previousProgressRef.current;
      const previousRemaining = lastRemainingRef.current;

      if (hasWrapped) {
        if (previousRemaining !== 0) {
          triggerHaptic();
          playChime();
        }
        // 1分経過時にglobal stateを更新して絵画の画像を自動的に変化させる
        refetchGlobalStateRef.current().catch(err => {
          logger.error("top-bar-progress.refetchGlobalState.failed", { error: err });
        });
        setDisplaySecond(0);
        setProgress(0);
        lastRemainingRef.current = 0;
        previousProgressRef.current = 0;
      } else {
        const displaySeconds = Math.min(59, nextRemainingSeconds);
        const progressValue = elapsedInCycle / MINUTE_MS;

        if (displaySeconds !== previousRemaining) {
          if (displaySeconds <= HAPTIC_WINDOW_START_REMAINING_SECOND && displaySeconds > 0) {
            triggerHaptic();
          }
          if (displaySeconds === 0) {
            playChime();
          }
          setDisplaySecond(displaySeconds);
          lastRemainingRef.current = displaySeconds;
        }

        previousProgressRef.current = currentElapsedProgress;
        setProgress(progressValue);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playChime, triggerHaptic]);

  const clampedProgress = Math.min(1, Math.max(0, progress));
  const secondsLabel = displaySecond.toString().padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-mono text-sm text-white/70 tabular-nums">{secondsLabel} s</span>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-white/20">
        <div className="h-full bg-white transition-all duration-100" style={{ width: `${clampedProgress * 100}%` }} />
      </div>
    </div>
  );
};
