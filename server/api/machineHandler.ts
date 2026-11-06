import type { Instances } from "@/server/instance";
import { getSnapshot } from "@/server/machine/getSnapshot";

export const createMachineHandler =
  ({ store }: Instances) =>
  async (): Promise<Response> =>
    Response.json(await getSnapshot(store));
