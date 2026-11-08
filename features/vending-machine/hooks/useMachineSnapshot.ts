"use client";

import { useQuery, type QueryClient } from "@tanstack/react-query";
import { fetchMachine } from "../api/requestPurchase";
import type { MachineSnapshot } from "../domain/types";

export const machineQueryKey = ["machine"] as const;

export const replaceMachineSnapshot = async (
  queryClient: QueryClient,
  snapshot: MachineSnapshot,
) => {
  await queryClient.cancelQueries({ queryKey: machineQueryKey });
  queryClient.setQueryData(machineQueryKey, snapshot);
};

export const useMachineSnapshot = (
  initialSnapshot: MachineSnapshot,
): MachineSnapshot => {
  const { data } = useQuery({
    queryKey: machineQueryKey,
    queryFn: fetchMachine,
    initialData: initialSnapshot,
    staleTime: 5_000,
  });
  return data;
};
