"use client";

import { useCallback, useState } from "react";
import type { MachineSnapshot, PurchaseResult } from "../domain/types";
import { parsePurchaseResponse } from "./parsePurchaseResponse";

type Status = "idle" | "loading" | "error";

const UNREACHABLE_MESSAGE =
  "Could not reach the machine. Your coins are still inserted.";

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

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

  const fail = useCallback((message: string) => {
    setError(message);
    setStatus("error");
    return null;
  }, []);

  const purchase = useCallback(
    async (customerId: string, productId: string, paidInPence: number) => {
      setStatus("loading");
      setError(null);

      let response: Response;
      try {
        response = await fetch("/api/purchase", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ customerId, productId, paidInPence }),
        });
      } catch {
        return fail(UNREACHABLE_MESSAGE);
      }

      const parsed = parsePurchaseResponse(
        response.status,
        await readJson(response),
      );
      if (parsed.kind === "failure") return fail(parsed.message);

      setResult(parsed.result);
      setSnapshot(parsed.result.machine);
      setStatus("idle");
      return parsed.result;
    },
    [fail],
  );

  return { snapshot, result, status, error, purchase, clearOutcome };
};
