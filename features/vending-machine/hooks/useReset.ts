"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resetMachine } from "../api/requestPurchase";
import { replaceMachineSnapshot } from "./useMachineSnapshot";

export const useReset = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: resetMachine,
    onSuccess: (snapshot) => replaceMachineSnapshot(queryClient, snapshot),
  });

  return {
    error: mutation.error?.message ?? null,
    isPending: mutation.isPending,
    run: () => mutation.mutateAsync().catch(() => null),
    clear: mutation.reset,
  };
};
