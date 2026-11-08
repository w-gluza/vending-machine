import { createResetHandler } from "@/server/api/resetHandler";
import { getInstances } from "@/server/instance";
import { isResetEnabled } from "@/server/resetEnabled";

export const POST = createResetHandler(getInstances(), isResetEnabled);
