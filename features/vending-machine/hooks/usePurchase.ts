"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMachine, requestPurchase } from "../api/requestPurchase";
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
    onSuccess: (result) => {
      queryClient.setQueryData(machineQueryKey, result.machine);
    },
  });

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
    error: mutation.error?.message ?? null,
    isPurchasing: mutation.isPending,
    purchase,
    clearOutcome: mutation.reset,
  };
};
