export type Customer = {
  readonly id: string;
  readonly name: string;
};

export const customers: readonly Customer[] = [
  { id: "64bc8ee5-b623-4437-87f2-d46b7a86cbe4", name: "Ian" },
  { id: "27a613bd-37d3-401d-abe9-3967312623b4", name: "Mia" },
  { id: "120b8d58-ba47-48c4-9f41-326e4c78230b", name: "Ken" },
];
