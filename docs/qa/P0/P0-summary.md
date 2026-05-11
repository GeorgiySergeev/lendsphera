# P0 Summary: Security & Auth Critical Fixes

**Цель этапа P0:** Устранить критические уязвимости безопасности, блокирующие деплой.  
**Время:** ~6 часов суммарно.  
**Порядок выполнения строгий** — каждый пункт зависит от предыдущего.

---

## P0.1 — CORS Whitelist
**Проблема:** `origin: true` отражает любой Origin + `credentials: true` = CSRF/XSS.  
**Файлы:** `apps/api/src/main.ts`, `apps/api/src/config/env.ts`, `.env.example`  
**Ключевое действие:** Заменить `origin: true` на whitelist через env-переменные `WEB_ORIGIN` / `RUNTIME_ORIGIN`.  
**Проверка:** `curl` с запрещённого origin → нет `Access-Control-Allow-Origin`.

---

## P0.2 — Tokens из localStorage в HttpOnly Cookies
**Проблема:** Refresh token в localStorage украден за 1 `eval()` при XSS.  
**Файлы:** `apps/api/src/auth/auth.controller.ts`, `apps/web/stores/auth-store.ts`, `apps/web/lib/api-client.ts`  
**Ключевое действие:**
- Backend: `login`/`refresh`/`logout` — `Set-Cookie: refreshToken` (HttpOnly, Secure, SameSite=Lax).
- Frontend: `auth-store` — только `user` в localStorage, `accessToken` в памяти (Zustand), `api-client` с `credentials: "include"`.
- Добавить `cookie-parser` в API.  
**Проверка:** DevTools → Application → Cookies: `refreshToken` HttpOnly есть; localStorage — токенов нет.

---

## P0.3 — JWT Secrets Validation
**Проблема:** `min(16)` + default `"dev-access-secret-change-me"` = production использует слабый секрет.  
**Файлы:** `apps/api/src/config/env.ts`, `docs/deployment-secrets.md`  
**Ключевое действие:**
- `min(32)` без `.default()`.
- `superRefine()` блокирует dev-значения на production.
- Проверка `ACCESS_SECRET !== REFRESH_SECRET`.  
**Проверка:** `NODE_ENV=production JWT_ACCESS_SECRET="dev-..." pnpm dev` → `process.exit(1)`.

---

## P0.4 — Atomic Redis Locking (Lua)
**Проблема:** `GET → check → EXPIRE` не атомарен → race condition: User A продлевает lock User B.  
**Файлы:** `apps/api/src/redis/redis.service.ts`, `apps/api/src/redis/redis.service.spec.ts`  
**Ключевое действие:** Заменить `releaseLock`/`refreshLock` на Lua-скрипты через `client.eval()`.  
**Проверка:** Unit-тест: User B не может release/refresh lock, принадлежащий User A.

---

## P0.5 — Rate Limiting (Throttler)
**Проблема:** Нет rate limiting → brute-force login / регистрация / password reset.  
**Файлы:** `apps/api/src/app.module.ts`, `apps/api/src/auth/auth.controller.ts`  
**Ключевое действие:**
- Установить `@nestjs/throttler`.
- Global guard: 100 req/60s.
- Auth endpoints: `@Throttle('auth')` → 5 req/60s.
- Password-reset: `@Throttle('password-reset')` → 3 req/3600s.  
**Проверка:** 6-й POST `/auth/login` → `429 Too Many Requests`.

---

## P0.6 — Global JWT Guard + @Public()
**Проблема:** Легко забыть `@UseGuards(JwtAuthGuard)` → endpoint публичен по умолчанию (опасно).  
**Файлы:** `apps/api/src/common/public.decorator.ts`, `apps/api/src/auth/jwt-auth.guard.ts`, `apps/api/src/app.module.ts`, все controllers  
**Ключевое действие:**
- Создать `@Public()` decorator.
- `JwtAuthGuard` глобально как `APP_GUARD` (после `ThrottlerGuard`).
- Все endpoints защищены по умолчанию; `@Public()` только для login, register, refresh, health, public landings.  
**Проверка:** `GET /landings` без JWT → `401`; `GET /health` без JWT → `200`.

---

## Зависимости между задачами

```
P0.1 (CORS whitelist)  ─┐
P0.2 (HttpOnly cookies)─┼→ P0.6 (Global JWT Guard) — JWT guard нужен для корректной работы cookies
                        │
P0.3 (JWT secrets)      ─┘

P0.4 (Redis Lua) — независим, но используется в landings lock/unlock

P0.5 (Rate limiting) — регистрируется ДО JwtAuthGuard в app.module.ts (порядок guards!)
```

---

## Quick-Start Prompt (для нового conversation)

```
@P0-summary.md @P0.X-конкретный-файл.md
Выполни P0.X из P0-summary. Начни с шага 1. Предыдущие задачи P0.1–P0.(X-1) уже выполнены.
```
