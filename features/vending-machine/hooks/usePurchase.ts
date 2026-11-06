"use client";

import { useCallback, useState } from "react";
import type { MachineSnapshot, PurchaseResult } from "../domain/types";

type Status = "idle" | "loading" | "error";

export const usePurchase = (initialSnapshot: MachineSnapshot) => {
  const [snapshot, setSnapshot] = useState<MachineSnapshot>(initialSnapshot);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const clearOutcome = useCallback(() => {
    setResult(null);
    setError(null);
    setStatus((current) => (current === "loading" ? current : "idle"));
  }, []);

  const purchase = useCallback(
    async (customerId: string, productId: string, paidInPence: number) => {
      setStatus("loading");
      setError(null);
      try {
        const response = await fetch("/api/purchase", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ customerId, productId, paidInPence }),
        });
        const body = await response.json();
        if (response.status === 400) {
          setError(
            body.issues.map((i: { message: string }) => i.message).join(", "),
          );
          setStatus("error");
          return null;
        }
        const outcome = body as PurchaseResult;
        setResult(outcome);
        setSnapshot(outcome.machine);
        setStatus("idle");
        return outcome;
      } catch {
        setError("Could not reach the machine. Your coins are still inserted.");
        setStatus("error");
        return null;
      }
    },
    [],
  );

  return { snapshot, result, status, error, purchase, clearOutcome };
};
