import type { Instances } from "@/server/instance";
import { getSnapshot } from "@/server/machine/getSnapshot";

export const createResetHandler =
  (instances: Instances, enabled: () => boolean) =>
  async (): Promise<Response> => {
    if (!enabled()) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    await instances.reset();
    return Response.json(await getSnapshot(instances.store));
  };
