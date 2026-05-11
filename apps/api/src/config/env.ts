import { z } from "zod";

// ────────────────────────────────────────────────────────────────
// Known dev/test values that must NEVER appear in production secrets.
// We match with case-insensitive `includes()` to catch substrings too.
// ────────────────────────────────────────────────────────────────
const BLOCKED_SECRET_VALUES = [
  "dev-access-secret-change-me",
  "dev-refresh-secret-change-me",
  "dev-cookie-secret",
  "change-me",
  "test-secret",
  "temporary",
  "your-secret-here",
  "replace-me",
] as const;

const isBlockedSecret = (value: string): boolean =>
  BLOCKED_SECRET_VALUES.some((blocked) =>
    value.toLowerCase().includes(blocked.toLowerCase()),
  );

// ────────────────────────────────────────────────────────────────
// Environment schema
// ────────────────────────────────────────────────────────────────
const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().default("redis://localhost:6379"),
    S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
    S3_REGION: z.string().default("us-east-1"),
    S3_BUCKET: z.string().min(1).default("landing-assets"),
    S3_ACCESS_KEY: z.string().min(1).default("minioadmin"),
    S3_SECRET_KEY: z.string().min(1).default("minioadmin"),

    // JWT Secrets — at least 32 characters, NO defaults
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),

    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_DAYS: z.string().default("30"),
    GITHUB_ACCESS_TOKEN: z.string().optional(),

    // CORS — strict whitelist of allowed origins
    WEB_ORIGIN: z
      .string()
      .url("WEB_ORIGIN must be a valid URL (e.g., http://localhost:3002)")
      .optional(),
    RUNTIME_ORIGIN: z
      .string()
      .url("RUNTIME_ORIGIN must be a valid URL (e.g., http://localhost:3001)")
      .optional(),

    // Cookie security — used by cookie-parser to sign cookies
    COOKIE_SECRET: z
      .string()
      .min(16, "COOKIE_SECRET must be at least 16 characters")
      .default("dev-cookie-secret-change-me-in-prod"),

    // Google OAuth — all four must be set together or all omitted
    // Empty strings are treated as "not set" to avoid partial-config errors
    // when .env has defaults for some vars but not others.
    GOOGLE_CLIENT_ID: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().min(1).optional()
    ),
    GOOGLE_CLIENT_SECRET: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().min(1).optional()
    ),
    GOOGLE_CALLBACK_URL: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().url().optional()
    ),
    GOOGLE_OAUTH_SUCCESS_REDIRECT: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().url().optional()
    ),
  })
  .superRefine((data, ctx) => {
    // Ensure Google OAuth vars are all-or-nothing
    const googleVars = [
      data.GOOGLE_CLIENT_ID,
      data.GOOGLE_CLIENT_SECRET,
      data.GOOGLE_CALLBACK_URL,
      data.GOOGLE_OAUTH_SUCCESS_REDIRECT,
    ];
    const setCount = googleVars.filter(Boolean).length;
    if (setCount > 0 && setCount < 4) {
      ctx.addIssue({
        code: "custom",
        path: ["GOOGLE_CLIENT_ID"],
        message:
          "Google OAuth requires all four variables to be set: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, GOOGLE_OAUTH_SUCCESS_REDIRECT",
      });
    }
    // ============ PRODUCTION-SPECIFIC VALIDATION ============
    if (data.NODE_ENV === "production") {
      // Block known dev/test secrets
      if (isBlockedSecret(data.JWT_ACCESS_SECRET)) {
        ctx.addIssue({
          code: "custom",
          path: ["JWT_ACCESS_SECRET"],
          message: [
            "JWT_ACCESS_SECRET contains a known development value.",
            "This MUST be changed for production.",
            `Got: "${data.JWT_ACCESS_SECRET.substring(0, 10)}..."`,
            "",
            "Generate a strong random secret with:",
            '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
          ].join("\n"),
          input: data.JWT_ACCESS_SECRET,
        });
      }

      if (isBlockedSecret(data.JWT_REFRESH_SECRET)) {
        ctx.addIssue({
          code: "custom",
          path: ["JWT_REFRESH_SECRET"],
          message: [
            "JWT_REFRESH_SECRET contains a known development value.",
            "This MUST be changed for production.",
            `Got: "${data.JWT_REFRESH_SECRET.substring(0, 10)}..."`,
            "",
            "Generate a strong random secret with:",
            '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
          ].join("\n"),
          input: data.JWT_REFRESH_SECRET,
        });
      }

      // Ensure ACCESS and REFRESH secrets are distinct
      if (data.JWT_ACCESS_SECRET === data.JWT_REFRESH_SECRET) {
        ctx.addIssue({
          code: "custom",
          path: ["JWT_ACCESS_SECRET"],
          message:
            "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be DIFFERENT values",
          input: data.JWT_ACCESS_SECRET,
        });
      }

      // Block dev cookie secret in production too
      if (isBlockedSecret(data.COOKIE_SECRET)) {
        ctx.addIssue({
          code: "custom",
          path: ["COOKIE_SECRET"],
          message: [
            "COOKIE_SECRET contains a known development value.",
            "This MUST be changed for production.",
            "",
            "Generate with: openssl rand -base64 32",
          ].join("\n"),
          input: data.COOKIE_SECRET,
        });
      }
    }
  });

// ────────────────────────────────────────────────────────────────
// Parse and validate — fail-fast with structured error output
// ────────────────────────────────────────────────────────────────
function parseEnv() {
  const result = EnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/landing_builder?schema=public",
    REDIS_URL: process.env.REDIS_URL,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_DAYS: process.env.JWT_REFRESH_EXPIRES_DAYS,
    GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN,
    WEB_ORIGIN: process.env.WEB_ORIGIN,
    RUNTIME_ORIGIN: process.env.RUNTIME_ORIGIN,
    COOKIE_SECRET: process.env.COOKIE_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
    GOOGLE_OAUTH_SUCCESS_REDIRECT: process.env.GOOGLE_OAUTH_SUCCESS_REDIRECT,
  });

  if (!result.success) {
    console.error("\n🔴 [ENV] Configuration validation failed:\n");
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      console.error(`  ❌ ${path}: ${issue.message}`);
    }
    console.error(""); // blank line for readability
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();

export type Env = typeof env;
