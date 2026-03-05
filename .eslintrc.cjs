module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: false
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  env: {
    node: true,
    es2022: true
  },
  ignorePatterns: ["dist", ".next", "node_modules", "coverage", "*.config.js"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off"
  }
};

