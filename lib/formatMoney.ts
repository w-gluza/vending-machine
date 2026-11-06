export const formatMoney = (pence: number): string => {
  if (!Number.isSafeInteger(pence) || pence < 0) {
    throw new RangeError(
      `Amount must be a non-negative integer of pence, got ${pence}`,
    );
  }
  return `£${(pence / 100).toFixed(2)}`;
};
