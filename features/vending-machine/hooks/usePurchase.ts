"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestPurchase } from "../api/requestPurchase";
import { machineQueryKey, replaceMachineSnapshot } from "./useMachineSnapshot";

export const usePurchase = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: requestPurchase,
    networkMode: "always",
    onSuccess: (result) => replaceMachineSnapshot(queryClient, result.machine),
    onError: () => queryClient.invalidateQueries({ queryKey: machineQueryKey }),
  });

  const submit = (customerId: string, productId: string, paidInPence: number) =>
    mutation
      .mutateAsync({ customerId, productId, paidInPence })
      .catch(() => null);

  return {
    result: mutation.data ?? null,
    error: mutation.error?.message ?? null,
    isPending: mutation.isPending,
    submit,
    clear: mutation.reset,
  };
};
