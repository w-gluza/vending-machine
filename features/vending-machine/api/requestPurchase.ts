import { machineSnapshotSchema } from "../domain/schemas";
import type { MachineSnapshot, PurchaseResult } from "../domain/types";
import {
  parsePurchaseResponse,
  UNCONFIRMED_MESSAGE,
} from "./parsePurchaseResponse";

export { UNCONFIRMED_MESSAGE } from "./parsePurchaseResponse";

export type PurchaseRequestInput = {
  customerId: string;
  productId: string;
  paidInPence: number;
};

export const REQUEST_TIMEOUT_MS = 10_000;

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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error(UNCONFIRMED_MESSAGE);
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
  readSnapshot(
    await fetch("/api/machine", {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
  );

export const resetMachine = async (): Promise<MachineSnapshot> => {
  let response: Response;
  try {
    response = await fetch("/api/machine/reset", {
      method: "POST",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error("Could not reach the machine to reset it.");
  }
  return readSnapshot(response);
};
