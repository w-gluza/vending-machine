import type { Instances } from "@/server/instance";
import { getSnapshot } from "@/server/machine/getSnapshot";

export const createResetHandler =
  ({ store, limiter }: Instances) =>
  async (): Promise<Response> => {
    await store.reset();
    await limiter.reset();
    return Response.json(await getSnapshot(store));
  };
