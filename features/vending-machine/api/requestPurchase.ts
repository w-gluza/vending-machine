import { machineSnapshotSchema } from "../domain/schemas";
import type { MachineSnapshot, PurchaseResult } from "../domain/types";
import { parsePurchaseResponse } from "./parsePurchaseResponse";

export type PurchaseRequestInput = {
  customerId: string;
  productId: string;
  paidInPence: number;
};

const UNREACHABLE_MESSAGE =
  "Could not reach the machine. Your coins are still inserted.";

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const requestPurchase = async (
  input: PurchaseRequestInput,
): Promise<PurchaseResult> => {
  let response: Response;
  try {
    response = await fetch("/api/purchase", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error(UNREACHABLE_MESSAGE);
  }

  const parsed = parsePurchaseResponse(
    response.status,
    await readJson(response),
  );
  if (parsed.kind === "failure") throw new Error(parsed.message);
  return parsed.result;
};

const readSnapshot = async (response: Response): Promise<MachineSnapshot> => {
  const parsed = machineSnapshotSchema.safeParse(await readJson(response));
  if (!response.ok || !parsed.success) {
    throw new Error("The machine gave an unexpected answer.");
  }
  return parsed.data;
};

export const fetchMachine = async (): Promise<MachineSnapshot> =>
  readSnapshot(await fetch("/api/machine"));

export const resetMachine = async (): Promise<MachineSnapshot> => {
  let response: Response;
  try {
    response = await fetch("/api/machine/reset", { method: "POST" });
  } catch {
    throw new Error("Could not reach the machine to reset it.");
  }
  return readSnapshot(response);
};
