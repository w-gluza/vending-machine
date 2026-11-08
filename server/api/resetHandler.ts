import type { Instances } from "@/server/instance";
import { getSnapshot } from "@/server/machine/getSnapshot";

export const createResetHandler =
  ({ store, limiter }: Instances, enabled: () => boolean) =>
  async (): Promise<Response> => {
    if (!enabled()) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    await store.reset();
    await limiter.reset();
    return Response.json(await getSnapshot(store));
  };
