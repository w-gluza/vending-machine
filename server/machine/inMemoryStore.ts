import { createInitialInventory } from "@/features/vending-machine/domain/coinInventory";
import type { MachineState, MachineStore } from "./store";

export const createInMemoryStore = (
  initial: MachineState = {
    coins: createInitialInventory(),
    cashBoxInPence: 0,
  },
): MachineStore => {
  let state = structuredClone(initial);
  let version = 0;

  return {
    async load() {
      return { state: structuredClone(state), version };
    },
    async save(next, expectedVersion) {
      if (expectedVersion !== version) return false;
      state = structuredClone(next);
      version += 1;
      return true;
    },
  };
};
