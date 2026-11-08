# Vending machine

A vending machine built with Next.js 16. Pick a drink, insert coins, and receive exact change using the fewest available coins.

🔗 Live: https://vending-machine-six-mu.vercel.app

It is one shared machine, so you may see purchases made by other people. The ↺ button in the top right resets it.

<details>
<summary>Requirements</summary>

- [x] Next.js app with its own API and customer-facing interface
- [x] Change with the fewest coins, using only the coins the machine holds
- [x] Starts with ten of each UK coin, 1p to £2; the change supply only decreases during a run
- [x] Inserted money goes into a sealed cash box, not into the change supply
- [x] A purchase takes the customer, the item and the amount paid
- [x] Exact payment needs no change
- [x] Refused when the payment is short or change cannot be made, with the coin supply unchanged and the customer keeping their money
- [x] Three purchases per three seconds per customer, checked before the price or the change
- [x] The interface shows the price, the amount paid, the outcome, and the change coins or the reason for refusal
- [x] Instructions for running locally

</details>

<details>
<summary>Assumptions</summary>

- Customers select a product; the server looks up its price rather than accepting a client-supplied price.
- The three customers are simulated users. The API trusts the supplied customer ID; there is no authentication.
- Payment is simulated and declared by the client, with a £10 limit per purchase request.
- All amounts are in GBP, calculated as integer pence.

</details>

## Run it locally

Node 24 LTS or newer.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Without `DATABASE_URL`, the machine keeps its state in memory, so there is nothing else to set up.

<details>
<summary>Run with Postgres</summary>

```sh
export DATABASE_URL='postgres://...'
npm run db:migrate
npm run dev
```

The migration creates the tables and seeds ten of each coin. It is safe to run twice.

If you change files under `server/` while `npm run dev` is running, restart it. The store instance is cached between hot reloads.

</details>

## Tests

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

- Vitest: change calculation checked against exhaustive search, coin inventory, purchase rules, and API integration.
- Playwright: journeys against a production build, including offline, slow, and unreadable responses. First run: `npx playwright install chromium`.
- Lint, typecheck, build: code checks and production compilation.

<details>
<summary>Postgres tests</summary>

Cover persistence, concurrent purchases, and rate limiting across connections. Set `TEST_DATABASE_URL` in `.env.local` or the environment to run them; otherwise they are skipped. Use a throwaway database: these tests delete data.

</details>

## Art direction and assets

The visual direction is loosely inspired by Japanese vending machines and traditional ukiyo-e artwork, particularly Katsushika Hokusai's [_The Great Wave off Kanagawa_](https://en.wikipedia.org/wiki/The_Great_Wave_off_Kanagawa).

The artwork inspired the **colour palette**, with muted blues, warm ivory tones, dusty pinks, and dark outlines bringing the design together.

The illustrations were created with [Recraft](https://www.recraft.ai/), then combined, flattened, and refined as SVG assets.

I wanted the vending machine itself to be the interface, rather than just a decorative illustration. The products, buttons, and other interactive elements are therefore implemented as functional UI components.

## Technical decisions

- Prices come from the server catalogue; customers select products by `ID`.
- Cash payments are simulated. Accepted payments go into the cash box; only the initial coin supply is used for change.
- PostgreSQL shares machine state and rate limits across server instances. Without `DATABASE_URL`, the app uses memory.
- The reset button starts a fresh demo run. It is enabled in development or with `VENDING_RESET_ENABLED=true`.
