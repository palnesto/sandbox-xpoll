import { useEffect, useState } from "react";

const pad2 = (n: number) => String(n).padStart(2, "0");

export function formatTimeLeft(expireAt: string | null | undefined): string {
  if (!expireAt) return "";

  const target = new Date(expireAt).getTime();
  const now = Date.now();
  const diffMs = target - now;

  if (diffMs <= 0) return "Expired";

  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return `${pad2(days)}:${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`;
}

export function useCountdown(expireAt?: string | null) {
  const [timeLeft, setTimeLeft] = useState(() => formatTimeLeft(expireAt));

  useEffect(() => {
    // update immediately on mount / expireAt change
    setTimeLeft(formatTimeLeft(expireAt));
    if (!expireAt) return;

    const interval = window.setInterval(() => {
      setTimeLeft(formatTimeLeft(expireAt));
    }, 1000); // refresh every second

    return () => window.clearInterval(interval);
  }, [expireAt]);

  return timeLeft;
}
