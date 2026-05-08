import { test as setup } from "@playwright/test";

const authFile = "tests/.auth/user.json";

setup("authenticate", async ({ page, request }) => {
  const baseURL = process.env.BASE_URL || "http://localhost:3002";
  const apiURL = process.env.API_URL || "http://localhost:4000";

  const loginResponse = await request.post(`${apiURL}/auth/login`, {
    data: {
      email: process.env.TEST_USER_EMAIL || "test@example.com",
      password: process.env.TEST_USER_PASSWORD || "testpass123"
    }
  });

  const { accessToken } = await loginResponse.json();

  await page.goto(baseURL);
  await page.evaluate((token) => {
    localStorage.setItem("auth_token", token);
  }, accessToken);

  await page.context().storageState({ path: authFile });
});
