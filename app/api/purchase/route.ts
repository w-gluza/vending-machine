import { createPurchaseHandler } from "@/server/api/purchaseHandler";
import { getInstances } from "@/server/instance";

export const POST = createPurchaseHandler(getInstances());
