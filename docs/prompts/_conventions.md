# Shared conventions for every prompt

Every step in `docs/prompts/**` is meant to be fed into an IDE agent (Cursor,
VSCode + Continue, Claude Code). All prompts share this contract.

## Prompt template

    # Phase X · Step Y — <Title>

    ## Context
    Why this step exists, what already exists in the repo.

    ## Goal
    Single sentence stating the outcome.

    ## Inputs
    Files / endpoints / decisions the agent must read before coding.

    ## Files to create or modify
    Bulleted, with intended responsibility per file.

    ## Acceptance criteria
    Concrete, testable bullets. Each one must be verifiable.

    ## Out of scope
    What the agent must NOT touch in this step.

    ## Verification
    Exact shell commands that must pass.

## Hard rules (apply to every step)

1. **No silent schema drift.** Any DB change → a Prisma migration + a seed
   update + a regenerated `packages/api-client`.
2. **Every mutating endpoint emits an `AuditLog` entry** (see Phase 0.5).
3. **Every list endpoint is paginated** (`?take=` + cursor).
4. **No `any`.** Use generated types from `packages/types` / `api-client`.
5. **Server is source of truth.** Never put price math in `apps/web`.
6. **`workspaceId` is required on every domain table and every query.**
7. **Legacy folders are read-only.** The agent must never edit
   `landing-legacy-2/**` files. Bridge changes go through the migration script
   in step 2.3 only.
8. **Tests are part of done.** A step without passing tests is not merged.
9. **Conventional commits**: `feat(api): ...`, `feat(web): ...`,
   `chore(prisma): ...`.
10. **Each step = one PR.** PR title = step heading.

## Test layering

| Layer       | Tool                   | Where                            |
| ----------- | ---------------------- | -------------------------------- |
| Unit        | Vitest / Jest          | colocated `*.spec.ts`            |
| Integration | Jest + Testcontainers  | `apps/api/test/integration/`     |
| E2E         | Playwright             | `tests/e2e/` (already exists)    |
| Visual      | Playwright screenshots | `packages/widgets/tests/visual/` |
