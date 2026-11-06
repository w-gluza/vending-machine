import type { CoinInventory } from "@/features/vending-machine/domain/types";

export type MachineState = {
  readonly coins: Readonly<CoinInventory>;
  readonly cashBoxInPence: number;
};

export type VersionedState = {
  readonly state: MachineState;
  readonly version: number;
};

export type MachineStore = {
  load(): Promise<VersionedState>;
  save(next: MachineState, expectedVersion: number): Promise<boolean>;
};
