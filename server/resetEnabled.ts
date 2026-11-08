import "server-only";

export const isResetEnabled = (): boolean =>
  process.env.VENDING_RESET_ENABLED === "true" ||
  process.env.NODE_ENV === "development";
