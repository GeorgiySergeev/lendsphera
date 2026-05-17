# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: legacy-bridge.spec.ts >> legacy-bridge >> propagates CRM price changes
  to legacy HTML and back
- Location: tests\e2e\legacy-bridge.spec.ts:43:7

# Error details

```
Error: Command failed: cmd.exe /c pnpm --filter @workspace/api exec prisma migrate deploy
node:internal/modules/cjs/loader:1433
  throw err;
  ^

Error: Cannot find module 'D:\APP\landsphera--app\apps\api\node_modules\prisma\build\index.js'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1430:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1040:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1045:22)
    at Function._load (node:internal/modules/cjs/loader:1216:25)
    at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
    at node:internal/main/run_main_module:36:49 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v22.22.3

```
