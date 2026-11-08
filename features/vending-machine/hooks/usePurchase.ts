"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMachine,
  requestPurchase,
  resetMachine,
} from "../api/requestPurchase";
import type { MachineSnapshot } from "../domain/types";

export const machineQueryKey = ["machine"] as const;

export const usePurchase = (initialSnapshot: MachineSnapshot) => {
  const queryClient = useQueryClient();

  const { data: snapshot } = useQuery({
    queryKey: machineQueryKey,
    queryFn: fetchMachine,
    initialData: initialSnapshot,
    staleTime: 5_000,
  });

  const mutation = useMutation({
    mutationFn: requestPurchase,
    networkMode: "always",
    onSuccess: async (result) => {
      await queryClient.cancelQueries({ queryKey: machineQueryKey });
      queryClient.setQueryData(machineQueryKey, result.machine);
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetMachine,
    onSuccess: async (snapshot) => {
      await queryClient.cancelQueries({ queryKey: machineQueryKey });
      queryClient.setQueryData(machineQueryKey, snapshot);
      mutation.reset();
    },
  });

  const reset = () => resetMutation.mutateAsync().catch(() => null);

  const purchase = (
    customerId: string,
    productId: string,
    paidInPence: number,
  ) =>
    mutation
      .mutateAsync({ customerId, productId, paidInPence })
      .catch(() => null);

  return {
    snapshot,
    result: mutation.data ?? null,
    error: mutation.error?.message ?? resetMutation.error?.message ?? null,
    isPurchasing: mutation.isPending,
    isResetting: resetMutation.isPending,
    purchase,
    reset,
    clearOutcome: () => {
      mutation.reset();
      resetMutation.reset();
    },
  };
};
