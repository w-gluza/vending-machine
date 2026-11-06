import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/control-has-associated-label": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",
    },
  },
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
