export default {
  semi: true,
  singleQuote: false,
  trailingComma: "none",
  printWidth: 90,
  overrides: [
    {
      files: "*.md",
      options: {
        proseWrap: "always",
        printWidth: 80,
        tabWidth: 2,
        useTabs: false
      }
    }
  ]
};
