"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PurchaseError, requestPurchase } from "../api/requestPurchase";
import type { PurchaseResult } from "../domain/types";

export type PurchaseOutcome =
  | { kind: "result"; result: PurchaseResult }
  | { kind: "error"; paymentTaken: boolean };
import { machineQueryKey, replaceMachineSnapshot } from "./useMachineSnapshot";

export const usePurchase = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: requestPurchase,
    networkMode: "always",
    onSuccess: (result) => replaceMachineSnapshot(queryClient, result.machine),
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: machineQueryKey });
    },
  });

  const submit = (
    customerId: string,
    productId: string,
    paidInPence: number,
  ): Promise<PurchaseOutcome> =>
    mutation
      .mutateAsync({ customerId, productId, paidInPence })
      .then((result) => ({ kind: "result" as const, result }))
      .catch((error: unknown) => ({
        kind: "error" as const,
        paymentTaken: error instanceof PurchaseError && error.paymentTaken,
      }));

  return {
    result: mutation.data ?? null,
    error: mutation.error?.message ?? null,
    isPending: mutation.isPending,
    submit,
    clear: mutation.reset,
  };
};
