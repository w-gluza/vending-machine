import {
  createInitialState,
  type MachineState,
  type MachineStore,
} from "./store";

export const createInMemoryStore = (
  initial: MachineState = createInitialState(),
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
    async reset() {
      state = createInitialState();
      version += 1;
    },
  };
};
