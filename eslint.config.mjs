import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/*.d.ts",
      "**/vitest.config.ts",
      "**/generated/**"
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "apps/api/scripts/*.ts",
            "packages/types/tsup.config.ts",
            "packages/widgets/scripts/*.ts",
            "packages/widgets/vite.config.ts",
            "playwright.config.ts",
            "tests/e2e/*.ts"
          ]
        },
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "@next/next": nextPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-undef": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }]
    }
  },
  {
    files: ["**/*.{js,cjs,mjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    files: ["apps/web/**/*.{ts,tsx}", "apps/runtime/**/*.{ts,tsx}"],
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@next/next/no-html-link-for-pages": "off"
    },
    settings: {
      next: {
        rootDir: ["apps/web", "apps/runtime"]
      }
    }
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off"
    }
  },
  prettierConfig
];
