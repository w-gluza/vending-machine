import { inventoryTotal } from "@/features/vending-machine/domain/coinInventory";
import type { MachineSnapshot } from "@/features/vending-machine/domain/types";
import type { MachineState, MachineStore } from "./store";

export const toSnapshot = (state: MachineState): MachineSnapshot => ({
  coins: state.coins,
  changeAvailableInPence: inventoryTotal(state.coins),
  cashBoxInPence: state.cashBoxInPence,
});

export const getSnapshot = async (
  store: MachineStore,
): Promise<MachineSnapshot> => toSnapshot((await store.load()).state);
