import { coinInventorySchema } from "@/features/vending-machine/domain/schemas";
import type { Db } from "@/server/db/client";
import {
  createInitialState,
  type MachineState,
  type MachineStore,
} from "./store";

export const MAX_INTEGER_COLUMN = 2_147_483_647;

export class MachineNotSeededError extends Error {
  constructor() {
    super(
      "The machine table is empty. Apply server/db/migrations/001_initial.sql first.",
    );
    this.name = "MachineNotSeededError";
  }
}

type MachineRow = {
  coins: unknown;
  cash_box_in_pence: number;
  version: number;
};

const assertFitsColumn = (value: number, name: string) => {
  if (value > MAX_INTEGER_COLUMN) {
    throw new RangeError(`${name} exceeds the INTEGER column limit`);
  }
};

const stateParams = (state: MachineState) => [
  JSON.stringify(state.coins),
  state.cashBoxInPence,
];

export const createPostgresStore = (db: Db): MachineStore => ({
  async load() {
    const { rows } = await db.query<MachineRow>(
      "SELECT coins, cash_box_in_pence, version FROM machine WHERE id = 1",
    );
    const row = rows[0];
    if (!row) throw new MachineNotSeededError();
    return {
      state: {
        coins: coinInventorySchema.parse(row.coins),
        cashBoxInPence: row.cash_box_in_pence,
      },
      version: row.version,
    };
  },
  async save(next, expectedVersion) {
    assertFitsColumn(next.cashBoxInPence, "Cash box");
    assertFitsColumn(expectedVersion + 1, "Version");
    const { rowCount } = await db.query(
      `UPDATE machine
       SET coins = $1::jsonb, cash_box_in_pence = $2, version = version + 1
       WHERE id = 1 AND version = $3`,
      [...stateParams(next), expectedVersion],
    );
    return rowCount === 1;
  },
  async reset() {
    await db.query(
      `UPDATE machine
       SET coins = $1::jsonb, cash_box_in_pence = $2, version = version + 1
       WHERE id = 1`,
      stateParams(createInitialState()),
    );
  },
});
