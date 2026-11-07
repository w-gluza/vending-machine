import { expect, test } from "@playwright/test";

test("a customer buys ramune with a pound and gets 15p back", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Bob" }).click();
  await page.getByRole("button", { name: /Ramune/ }).click();
  await page.getByRole("button", { name: "Insert £1" }).click();
  await expect(page.getByText("Inserted: £1.00")).toBeVisible();
  await expect(page.getByText("Price: £0.85 Paying: £1.00")).toBeVisible();

  await page.getByRole("button", { name: "Buy" }).click();

  await expect(
    page.getByText("Dispensed. Paid £1.00 for £0.85."),
  ).toBeVisible();
  await expect(page.getByText("Change £0.15:")).toBeVisible();
  await expect(page.getByText("Inserted: £0.00")).toBeVisible();
  await expect(page.getByRole("button", { name: /Ramune/ })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByText(/Cash box: £1\.00\./)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/Cash box: £1\.00\./)).toBeVisible();
  await expect(page.getByText("Inserted: £0.00")).toBeVisible();
  await expect(
    page.getByText("Pick a product, insert coins, press Buy."),
  ).toBeVisible();
});
