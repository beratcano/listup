"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  endsAt: number;
}

export function Timer({ endsAt }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [endsAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLow = timeLeft <= 10;

  return (
    <div
      className={`
        text-4xl font-mono font-bold
        ${isLow ? "text-red-500 animate-pulse" : "text-gray-800"}
      `}
    >
      {minutes}:{seconds.toString().padStart(2, "0")}
    </div>
  );
}
