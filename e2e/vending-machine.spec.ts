import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/machine/reset");
});

test("a customer buys ramune with a pound and gets 15p back", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Bob" }).click();
  await page.getByRole("button", { name: /Ramune/ }).click();
  await page.getByRole("button", { name: "Insert £1" }).click();
  await expect(page.getByText("Inserted £1.00")).toBeVisible();
  await expect(page.getByText("Ramune £0.85")).toBeVisible();

  await page.getByRole("button", { name: "Buy" }).click();

  await expect(
    page.getByText("Dispensed. Paid £1.00 for £0.85."),
  ).toBeVisible();
  await expect(page.getByText("Change £0.15.")).toBeVisible();
  await expect(page.getByText("Inserted £0.00")).toBeVisible();
  await expect(page.getByRole("button", { name: /Ramune/ })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(await cashBoxValue(page)).toHaveText("£1.00");

  await page.reload();
  await expect(await cashBoxValue(page)).toHaveText("£1.00");
  await expect(page.getByText("Inserted £0.00")).toBeVisible();
  await expect(
    page.getByText("Choose a drink, insert your coins, and press Buy."),
  ).toBeVisible();
});

const cashBoxValue = async (page: import("@playwright/test").Page) => {
  const toggle = page.getByRole("button", { name: "Machine stats" });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }
  return page.locator('dt:has-text("Cash box") + dd');
};

const cashBox = async (page: import("@playwright/test").Page) => {
  const text = await (await cashBoxValue(page)).textContent();
  return Number(/£(\d+\.\d\d)/.exec(text ?? "")?.[1]);
};

test("an offline purchase fails at once and keeps the coins in", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const before = await cashBox(page);
  let purchaseRequests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/purchase")) purchaseRequests += 1;
  });

  await page.getByRole("button", { name: "Chen" }).click();
  await page.getByRole("button", { name: /Ramune/ }).click();
  await page.getByRole("button", { name: "Insert £1" }).click();

  await context.setOffline(true);
  await page.getByRole("button", { name: "Buy" }).click();
  await expect(
    page.getByText(
      "Could not reach the machine. Your coins are still inserted.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Inserted £1.00")).toBeVisible();
  await expect(page.getByRole("button", { name: /Ramune/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const attemptsWhileOffline = purchaseRequests;

  await context.setOffline(false);
  await page.waitForTimeout(1_000);
  expect(purchaseRequests).toBe(attemptsWhileOffline);

  await page.getByRole("button", { name: "Buy" }).click();
  await expect(
    page.getByText("Dispensed. Paid £1.00 for £0.85."),
  ).toBeVisible();
  expect(purchaseRequests).toBe(attemptsWhileOffline + 1);
  expect(await cashBox(page)).toBeCloseTo(before + 1, 2);
});

test("a slow machine read cannot overwrite a newer purchase", async ({
  page,
}) => {
  await page.goto("/");
  const before = await cashBox(page);
  await page.waitForTimeout(5_100);

  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  const captured = new Promise<void>((resolveCaptured) => {
    void page.route("**/api/machine", async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      resolveCaptured();
      await released;
      await route.fulfill({ response, body });
    });
  });

  await page.evaluate(() =>
    window.dispatchEvent(new Event("visibilitychange")),
  );
  await captured;

  await page.getByRole("button", { name: "Alice" }).click();
  await page.getByRole("button", { name: /Ramune/ }).click();
  await page.getByRole("button", { name: "Insert £1" }).click();
  await page.getByRole("button", { name: "Buy" }).click();
  await expect(
    page.getByText("Dispensed. Paid £1.00 for £0.85."),
  ).toBeVisible();
  expect(await cashBox(page)).toBeCloseTo(before + 1, 2);

  const staleLanded = page.waitForResponse("**/api/machine");
  release();
  await staleLanded;
  await page.waitForTimeout(200);
  expect(await cashBox(page)).toBeCloseTo(before + 1, 2);
});
