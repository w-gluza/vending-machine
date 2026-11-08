import { useEffect, useEffectEvent } from "react";

export const useAutoClear = <T>(
  value: T | null,
  clear: () => void,
  delayMs: number,
) => {
  const onTimeout = useEffectEvent(clear);

  useEffect(() => {
    if (value === null) return;
    const timer = setTimeout(() => onTimeout(), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
};
