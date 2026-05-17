# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> authenticate
- Location: tests\e2e\auth.setup.ts:5:6

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "http://localhost:3002/dashboard" until "load"
  navigated to "http://localhost:3002/login"
  navigated to "http://localhost:3002/login"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e1]:
    - main [ref=e2]:
        - generic [ref=e3]:
            - generic [ref=e4]:
                - img [ref=e6]
                - heading "Sign in" [level=3] [ref=e9]
                - paragraph [ref=e10]:
                    Access the LendSphera landing page builder.
            - generic [ref=e11]:
                - generic [ref=e14]: or continue with email
                - generic [ref=e16]:
                    - generic [ref=e17]:
                        - generic [ref=e18]: Email
                        - textbox "Email" [active] [ref=e19]:
                            - /placeholder: you@example.com
                    - generic [ref=e20]:
                        - generic [ref=e21]: Password
                        - textbox "Password" [ref=e22]:
                            - /placeholder: ••••••••
                    - button "Sign in" [ref=e23]
                - paragraph [ref=e24]:
                    - text: Don't have an account?
                    - link "Sign up" [ref=e25] [cursor=pointer]:
                        - /url: /register
    - region "Notifications alt+T"
    - generic [ref=e26]:
        - img [ref=e28]
        - button "Open Tanstack query devtools" [ref=e76] [cursor=pointer]:
            - img [ref=e77]
    - button "Open Next.js Dev Tools" [ref=e130] [cursor=pointer]:
        - img [ref=e131]
    - alert [ref=e134]
```

# Test source

```ts
  1  | import { test as setup, expect } from "@playwright/test";
  2  |
  3  | const authFile = "tests/.auth/user.json";
  4  |
  5  | setup("authenticate", async ({ page }) => {
  6  |   const baseURL = process.env.BASE_URL || "http://localhost:3002";
  7  |   const email = process.env.TEST_USER_EMAIL || "test@example.com";
  8  |   const password = process.env.TEST_USER_PASSWORD || "testpass123";
  9  |
  10 |   // Drive the real UI flow so that:
  11 |   //   • the refresh-token HttpOnly cookie is set on the API origin,
  12 |   //   • the access token + user land in the Zustand store, and
  13 |   //   • the persisted `landing-builder-auth` key is populated.
  14 |   await page.goto(`${baseURL}/login`);
  15 |
  16 |   await page.getByLabel("Email").fill(email);
  17 |   await page.getByLabel("Password").fill(password);
  18 |   await page.getByRole("button", { name: /sign in/i }).click();
  19 |
> 20 |   await page.waitForURL(`${baseURL}/dashboard`);
     |              ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  21 |   await expect(page.locator("body")).toBeVisible();
  22 |
  23 |   await page.context().storageState({ path: authFile });
  24 | });
  25 |
```
