import { createMachineHandler } from "@/server/api/machineHandler";
import { getInstances } from "@/server/instance";

export const GET = createMachineHandler(getInstances());
