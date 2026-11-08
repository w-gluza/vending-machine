import type { Instances } from "@/server/instance";
import { getSnapshot } from "@/server/machine/getSnapshot";

export const createMachineHandler =
  ({ store }: Pick<Instances, "store">) =>
  async (): Promise<Response> =>
    Response.json(await getSnapshot(store));
