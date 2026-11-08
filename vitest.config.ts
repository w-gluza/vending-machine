import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const localEnv = (name: string): string | undefined => {
  try {
    const file = readFileSync(new URL("./.env.local", import.meta.url), "utf8");
    return file.match(new RegExp(`^${name}="?([^"\n]+)"?$`, "m"))?.[1];
  } catch {
    return undefined;
  }
};

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next"],
    env: {
      TEST_DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? localEnv("TEST_DATABASE_URL") ?? "",
    },
  },
});
