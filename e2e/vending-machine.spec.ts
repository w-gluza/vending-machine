import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/machine/reset");
});

test("a customer buys ramune with a pound and gets 15p back", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Mia" }).click();
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

  await page.getByRole("button", { name: "Ken" }).click();
  await page.getByRole("button", { name: /Ramune/ }).click();
  await page.getByRole("button", { name: "Insert £1" }).click();

  await context.setOffline(true);
  await page.getByRole("button", { name: "Buy" }).click();
  await expect(
    page.getByText("Purchase not confirmed. It may have gone through."),
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

  await page.getByRole("button", { name: "Ian" }).click();
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

test("every control is locked while a reset is pending", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Insert £1" }).click();
  await expect(page.getByText("Inserted £1.00")).toBeVisible();

  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/machine/reset", async (route) => {
    await held;
    await route.continue();
  });

  await page.getByRole("button", { name: "Service visit" }).click();
  await expect(page.getByRole("button", { name: "Insert £1" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Buy" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Ramune/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Ian" })).toBeDisabled();

  release();
  await expect(page.getByRole("button", { name: "Insert £1" })).toBeEnabled();
  await expect(page.getByText("Inserted £0.00")).toBeVisible();
});

test("a stalled machine refresh does not hide a failed purchase", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Ramune/ }).click();
  await page.getByRole("button", { name: "Insert £1" }).click();
  await page.route("**/api/purchase", (route) => route.abort("failed"));
  await page.route("**/api/machine", () => new Promise<void>(() => {}));

  await page.getByRole("button", { name: "Buy" }).click();

  await expect(
    page.getByText("Purchase not confirmed. It may have gone through."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Buy" })).toBeEnabled();
  await expect(page.getByText("Inserted £1.00")).toBeVisible();
});

test("an unreadable success takes the payment instead of offering it again", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Ramune/ }).click();
  await page.getByRole("button", { name: "Insert £1" }).click();
  await page.route("**/api/purchase", (route) =>
    route.fulfill({ status: 200, body: "<html>" }),
  );

  await page.getByRole("button", { name: "Buy" }).click();

  await expect(
    page.getByText(
      "Purchase went through, but the machine's reply could not be read.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Inserted £0.00")).toBeVisible();
  await expect(page.getByRole("button", { name: /Ramune/ })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
