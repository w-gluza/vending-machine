import { useEffect, useRef } from "react";

export const useAutoClear = <T>(
  value: T | null,
  clear: () => void,
  delayMs: number,
) => {
  const clearRef = useRef(clear);

  useEffect(() => {
    clearRef.current = clear;
  }, [clear]);

  useEffect(() => {
    if (value === null) return;
    const timer = setTimeout(() => clearRef.current(), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
};
