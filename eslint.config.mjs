import next from "eslint-config-next";

/** @type {import('eslint').Linter.Config} */
const config = [
  ...next,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default config;
