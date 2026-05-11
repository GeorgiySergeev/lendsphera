# P1 Summary: Architecture, Performance & DevEx Improvements

**Цель этапа P1:** Рефакторинг архитектуры, оптимизация производительности, стандартизация CI/CD и документация.  
**Время:** ~15.5 часов суммарно.  
**Порядок выполнения:** P1.1 и P1.2 можно параллельно; P1.3 зависит от P1.1; P1.4 независим; P1.5 и P1.6 — финальные шаги.

---

## P1.1 — Декомпозиция God Component (landing-editor-shell.tsx)
**Проблема:** 500+ строк в одном компоненте, 12 concerns перемешаны, невозможно тестировать, лишние re-renders.  
**Файлы:** `apps/web/components/editor/landing-editor-shell.tsx`, `apps/web/hooks/editor/*`, `apps/web/context/editor-context.tsx`  
**Ключевое действие:**
- Разбить на 6 хуков: `useEditorLock`, `useEditorAutosave`, `useEditorDocument`, `useEditorKeyboard`, `useEditorCustomCss`, `useEditorUi`.
- Создать `EditorProvider` (React Context) для агрегации состояния.
- Упростить `LandingEditorShell` до ~50 строк, дочерние компоненты получают данные из `useEditor()`.
- Barrel export: `apps/web/hooks/editor/index.ts`.  
**Проверка:** Компонент < 100 строк, хуки тестируются изолированно, нет prop drilling.

---

## P1.2 — Autosave с Dirty Flag (вместо stringify каждые 10s)
**Проблема:** JSON.stringify на 5-50 MB каждые 10s блокирует main thread (100-500ms freeze).  
**Файлы:** `apps/web/components/editor/grapes-canvas.tsx`, `apps/web/hooks/editor/use-grapes-serialize.ts`, `apps/web/context/editor-context.tsx`  
**Ключевое действие:**
- Подписаться на события GrapesJS (`component:update`, `style:update`, `undo`, `redo`) → `markDirty()` (O(1)).
- Autosave интервал проверяет только `isDirty` flag, а не сериализует каждый раз.
- Создать `useGrapesSerialize` для lazy-сериализации.
- Wire-up: `EditorProvider` передает `serialize` функцию в `useEditorAutosave`.  
**Проверка:** DevTools Performance — main thread < 50ms на 10 изменений; Network — меньше POST-запросов.

---

## P1.3 — Type-Safe GrapesJSON Parsing (убрать `as any`)
**Проблема:** `grapesJson as any` — нет валидации, нет типов, GrapesJS падает на malformed data.  
**Файлы:** `packages/types/src/grapes-document.schema.ts`, `apps/api/src/landings/landings.service.ts`, `apps/web/hooks/editor/use-editor-document.ts`  
**Ключевое действие:**
- Создать Zod схемы: `GrapesAssetSchema`, `GrapesComponentSchema`, `GrapesStyleSchema`, `GrapesDocumentSchema`.
- `parseGrapesDocument()` / `validateGrapesDocument()` для строгой валидации.
- API: `landingsService.editor()` парсит `grapesJson` через Zod.
- Frontend: `useEditorDocument` валидирует ответ API.
- Migration script для исправления существующих bad documents.  
**Проверка:** TypeScript без `as any` для grapesJson; migration script проходит.

---

## P1.4 — Оптимизация landings.list() Query
**Проблема:** `findMany` с `include: { currentVersion: true }` → 50 landings × 5-50 MB = до 2.5 GB over-the-wire.  
**Файлы:** `apps/api/src/landings/landings.service.ts`, `apps/api/src/landings/dto/landing-list.dto.ts`, `apps/api/src/landings/landings.controller.ts`, `prisma/schema.prisma`  
**Ключевое действие:**
- Создать `LandingListItemDto` / `LandingListResponseDto` с только нужными полями.
- `select` вместо `include`; `currentVersion` не включается в list.
- Параллельно: `findMany` + `count` через `Promise.all`.
- Prisma migration: `@@index([ownerId])`, `@@index([ownerId, deletedAt])`.  
**Проверка:** Payload list < 1 MB (вместо 100+ MB); время < 100ms на 50 landings.

---

## P1.5 — Стандартизация CI/CD Workflows
**Проблема:** `ci.yml` → Node 22 + pnpm 10, `e2e-tests.yml` → Node 20 + pnpm 8 + action-setup@v2. Несовместимые lockfile.  
**Файлы:** `.github/actions/setup-env/action.yml`, `.github/workflows/ci.yml`, `.github/workflows/e2e-tests.yml`  
**Ключевое действие:**
- Composite action `setup-env` с едиными версиями Node 22.x и pnpm 10.32.1 + кэш.
- `ci.yml` → typecheck, lint, test, build, docker-build (параллельные jobs).
- `e2e-tests.yml` → использует тот же `setup-env`, запускается после CI success, сервисы postgres/redis, `wait-on` health checks.
- GitHub secrets для E2E, status badge в README.  
**Проверка:** Push в main → все workflows проходят, E2E запускается автоматически.

---

## P1.6 — Создание README + Architecture Documentation
**Проблема:** Нет onboarding-документации, новые разработчики теряются.  
**Файлы:** `README.md`, `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`, `docs/API.md`, `docs/adr/`  
**Ключевое действие:**
- `README.md`: overview, stack, quickstart, project structure, env setup, development commands, API endpoints, deployment, FAQ.
- `ARCHITECTURE.md`: system context (C4), services (api/web/runtime), data model, data flows (edit/publish/lock), concurrency, auth, performance, security, deployment, monitoring.
- `CONTRIBUTING.md`: dev setup, naming conventions, conventional commits, git workflow, PR checklist, testing guidelines.
- ADR папка + badges в README.  
**Проверка:** Новый разработчик разворачивает проект за < 15 минут по README.

---

## Зависимости между задачами

```
P1.1 (Decompose God Component) ──┐
                                 ├──→ P1.2 (Dirty Flag) — GrapesCanvas события и serialize hook
                                 │
P1.3 (GrapesJSON Types) ────────┘     — Парсинг данных из P1.1 hooks

P1.4 (Optimize List Query) — независим (backend only)

P1.5 (CI Standardization) — независим (DevOps)

P1.6 (Docs) — финальный шаг, лучше после P1.1–P1.5 (отражает финальную архитектуру)
```

---

## Quick-Start Prompt (для нового conversation)

```
@P1-summary.md @P1.X-конкретный-файл.md
Выполни P1.X из P1-summary. Начни с шага 1. Предыдущие задачи P1.1–P1.(X-1) уже выполнены.
```
