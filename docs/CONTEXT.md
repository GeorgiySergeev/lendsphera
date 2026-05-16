---


═══════════════════════════════════════════════════
  PROJECT CONTEXT — READ THIS FULLY BEFORE ACTING
═══════════════════════════════════════════════════

You are working on a production monorepo called "LendSphera".
GitHub: https://github.com/GeorgiySergeev/lendsphera
Read this context carefully before writing any code.

━━━ MONOREPO STRUCTURE ━━━

lendsphera/
├── apps/
│   ├── api/          ← NestJS 11 backend
│   └── web/          ← Next.js 15 frontend
├── packages/
│   ├── ui/           ← Shared Radix UI + Tailwind components (@workspace/ui)
│   ├── env/          ← Shared env validation (t3-env + zod)
│   └── typescript-config/
├── pnpm-workspace.yaml
└── turbo.json

━━━ BACKEND STACK (apps/api) ━━━

- NestJS 11 + TypeScript strict mode
- Prisma 6 + PostgreSQL  (apps/api/prisma/schema.prisma)
- BullMQ queues via @nestjs/bullmq  (pattern: publish.processor.ts)
- S3/MinIO via @aws-sdk/client-s3  (StorageService — apps/api/src/storage/)
- nestjs-zod for DTO validation (createZodDto pattern)
- @nestjs/swagger for API docs (@ApiTags, @ApiBearerAuth, @ApiProperty)
- adm-zip is already installed
- Auth: JwtAuthGuard + RolesGuard + @CurrentUser() decorator
  (READ_ROLES for GET, WRITE_ROLES for POST/PATCH/DELETE)
- Module pattern: every feature = dto + service + controller + module
  Reference module: apps/api/src/landings/ (study it as the gold standard)

━━━ FRONTEND STACK (apps/web) ━━━

- Next.js 15 (App Router) + React 19
- TypeScript strict mode
- TanStack Query v5 (@tanstack/react-query) for server state
- Zustand for client/UI state (apps/web/stores/)
- Axios via shared apiClient (apps/web/lib/api/client.ts)
- Tailwind v4
- Radix UI primitives via @workspace/ui
- lucide-react for icons
- sonner for toasts
- react-hook-form + zod for forms
- Dashboard sidebar config: apps/web/components/dashboard/navigation.ts
- API calls pattern: apps/web/lib/api/landings.ts (gold standard)
- Zustand store pattern: apps/web/stores/auth-store.ts

━━━ KEY EXISTING PATTERNS TO FOLLOW ━━━

1. DTO pattern:
   import { createZodDto } from 'nestjs-zod'
   const schema = z.object({ ... })
   export class MyDto extends createZodDto(schema) {}

2. Service pattern:
   @Injectable() class MyService {
     constructor(private prisma: PrismaService, private storage: StorageService) {}
   }

3. Controller pattern:
   @ApiTags('X') @ApiBearerAuth() @Controller('x')
   @UseGuards(JwtAuthGuard, RolesGuard)
   class MyController { ... }

4. Module pattern:
   @Module({ imports:[StorageModule], controllers:[...], providers:[...], exports:[...] })

5. BullMQ Processor pattern:
   @Processor('queueName') class MyProcessor extends WorkerHost {
     async process(job: Job<{ ... }>) { ... }
   }

6. Frontend API client pattern:
   export async function fetchSomething(params): Promise<Type> {
     const { data } = await apiClient.get('/endpoint', { params })
     return data
   }

7. TanStack Query keys:
   export const QUERY_KEYS = {
     list: (params) => ['feature', 'list', params],
     detail: (id) => ['feature', 'detail', id],
   }

8. Zustand store pattern:
   export const useMyStore = create<State & Actions>()((set, get) => ({
     ...initialState,
     myAction: () => set({ ... }),
   }))

━━━ PRISMA — KEY MODELS THAT ALREADY EXIST ━━━

- User (id, email, name, role, ...)
- Landing (id, title, status, ownerId, ...)
- Asset (id, landingId, uploaderId, type, mimeType, originalName,
         s3Key, s3Bucket, url, size, width, height, folder, tags,
         createdAt, deletedAt)
- PublishJob (id, status, landingId, ...)
- CrawlJob (id, url, status, maxDepth, maxPages, triggeredById,
            zipKey, downloadUrl, error, logs, pagesCrawled,
            createdAt, startedAt, finishedAt)
  — Added in a previous step. CrawlJobStatus enum: QUEUED|RUNNING|SUCCESS|FAILED

- MediaFolder (id, name, slug, parentId, ownerId, createdAt, updatedAt, deletedAt)
  Asset.folderId — FK to MediaFolder
  — Added in Media Library Step 1.
  NOTE: these models may or may not exist yet depending on which steps
  have already been completed. Check schema.prisma first.

━━━ FEATURES BEING BUILT ━━━

Two parallel features are being added to this project:

── FEATURE 1: Site Downloader ──
User provides a URL → backend crawls the site → packs into ZIP → user downloads it.
Steps: 1–11 (backend: CrawlerModule; frontend: DownloadSiteDialog in dashboard)

── FEATURE 2: Media Library ──
Full file manager in the dashboard: upload/browse/organize images and files.
Left sidebar: folder tree. Main area: asset grid + upload dropzone.
Future: format conversion, crop, image editor.
Steps: 1–16 (backend: MediaModule; frontend: /dashboard/media page)

━━━ COMPLETED STEPS SO FAR ━━━

[UPDATE THIS SECTION as you complete steps]
Example format:
  ✅ Feature 1 / Step 1 — crawler.dto.ts — DONE
  ✅ Feature 1 / Step 2 — Prisma CrawlJob — DONE
  ✅ Feature 2 / Step 1 — Prisma MediaFolder — DONE
  🔄 Feature 2 / Step 2 — media.dto.ts — IN PROGRESS (current)
  ⬜ Feature 2 / Step 3 — media.service.ts — TODO

━━━ STRICT RULES FOR THIS PROJECT ━━━

1. NEVER install new npm packages without explicitly stating you're doing so
   and why. Prefer packages already in package.json.

2. NEVER modify files outside the scope of the current step.
   If you notice a bug in another file — mention it, do not fix it.

3. ALWAYS check if a pattern/utility already exists before creating a new one.
   (e.g. slugify, formatFileSize, AuthUser type, apiClient instance)

4. ALWAYS follow the gold-standard reference files listed above.
   Copy their structure, naming, and import style exactly.

5. For Prisma changes: always run migrate after schema edit:
   cd apps/api && pnpm prisma migrate dev --name <descriptive_name>

6. For TypeScript: use strict types everywhere. No `any` unless unavoidable
   (and if unavoidable, add // eslint-disable-next-line @typescript-eslint/no-explicit-any)

7. "use client" directive: add to every Next.js component that uses
   hooks, event handlers, or browser APIs.

8. Every component file exports exactly ONE default export (the component).
   Named exports are only for types and utility functions.

9. Error handling: always use NestJS built-in exceptions
   (NotFoundException, BadRequestException, ForbiddenException, etc.)
   Never throw raw Error objects in services/controllers.

10. After finishing the step: output a short summary:
    ✅ Files created: [list]
    ✅ Files modified: [list]
    ⚠️  Assumptions made: [list any]
    ➡️  Next step requires: [what the next step depends on from this one]

═══════════════════════════════════════════════════
  CURRENT STEP TO IMPLEMENT
═══════════════════════════════════════════════════

[PASTE THE FULL STEP PROMPT HERE]

═══════════════════════════════════════════════════
```

---

## Как использовать

**Перед каждым новым чатом:**

1. Скопируй весь промт выше
2. В секции `COMPLETED STEPS SO FAR` — обнови статусы
3. В секцию `CURRENT STEP TO IMPLEMENT` — вставь нужный шаг из плана
4. Отправь в новый чат

---

## Пример заполненного промта (Step 3 Feature 2)

```
━━━ COMPLETED STEPS SO FAR ━━━
✅ Feature 2 / Step 1 — Prisma MediaFolder — DONE
✅ Feature 2 / Step 2 — media.dto.ts — DONE
🔄 Feature 2 / Step 3 — media.service.ts — IN PROGRESS (current)
⬜ Feature 2 / Step 4 — media.multer.ts — TODO
...

═══════════════════════════════════════════════════
  CURRENT STEP TO IMPLEMENT
═══════════════════════════════════════════════════

[вставляешь полный текст Step 3 сюда]
```

---

> 💡 **Совет:** Заведи отдельный файл `CONTEXT.md` в корне репозитория и
> обновляй `COMPLETED STEPS` там — тогда не нужно помнить что сделано, просто
> копируешь актуальный файл.
