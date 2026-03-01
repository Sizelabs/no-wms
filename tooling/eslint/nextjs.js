import baseConfig from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Next.js specific rules can be added here
    },
  },
];
