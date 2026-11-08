import { createResetHandler } from "@/server/api/resetHandler";
import { getInstances } from "@/server/instance";

export const POST = createResetHandler(getInstances());
