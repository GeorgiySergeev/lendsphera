# ADR-004: Redis Atomic Locking via Lua Scripts

| Field     | Value                                |
| --------- | ------------------------------------ |
| Status    | Accepted                             |
| Date      | 2026-05-11                           |
| Authors   | Engineering                          |
| Scope     | `apps/api/src/redis/redis.service.ts`|

---

## Context

The landing-page editor implements a distributed pessimistic lock to prevent concurrent edits by multiple users. The lock is represented as a Redis key (`landing:lock:{landingId}`) whose value is the userId of the lock owner, with a TTL-based automatic expiry.

The previous implementation used a **non-atomic three-step pattern** in JavaScript:

```
GET key → compare in JS → DEL/EXPIRE key
```

Between the `GET` and the subsequent `DEL`/`EXPIRE`, there is a time window during which another client can modify or replace the key, creating a **race condition**.

### Concrete Attack Scenario

```
T0: User A owns lock (key=A, TTL=120s)
T1: User A calls refreshLock() → GET returns "A"
T2: User A's lock expires (TTL → 0)
T3: User B calls acquireLock() → SET NX succeeds → User B now owns the lock
T4: User A's stale refreshLock call → EXPIRE key 120 → Extends User B's lock!

Result: User A unknowingly extends User B's lock (data corruption risk)
```

A similar race exists in `releaseLock`: between `GET` and `DEL`, another user could have acquired the lock.

---

## Decision

Replace the non-atomic `releaseLock` and `refreshLock` implementations with **Redis Lua scripts** that execute atomically on the server.

### Why Lua Scripts?

- Redis executes Lua scripts as a single atomic operation — no other client command can interleave.
- The ownership check (`GET`) and the mutation (`DEL`/`EXPIRE`) happen in the same uninterruptable unit.
- No network round-trip between check and mutation — zero race window.

### Why `defineCommand` (ioredis)?

Instead of raw `eval()`, we use ioredis `defineCommand()`:

- Automatically caches the script SHA via `EVALSHA` for better performance.
- Falls back to `EVAL` on `NOSCRIPT` errors (e.g. after Redis restart).
- Provides a clean API (`client.releaseLockAtomic(key, userId)`).

---

## Implementation

### Lua Scripts

**Release Lock (compare-and-delete):**
```lua
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
```

**Refresh Lock (compare-and-extend):**
```lua
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('expire', KEYS[1], tonumber(ARGV[2]))
else
  return 0
end
```

### Acquire Lock

`acquireLock` continues to use `SET key value EX ttl NX`, which is natively atomic in Redis ≥ 2.6.12. No Lua script needed.

### Landing Service Integration

- **`lock()`**: Attempts `acquireLock` first. If already held by the same user, atomically `refreshLock`. If held by another user, throws `ConflictException`. On DB failure after Redis acquire, rolls back the Redis lock.
- **`unlock()`**: Atomically `releaseLock` via Lua. Admin/Owner can force-unlock another user's lock by using the actual owner's userId for the Lua compare-and-delete.

---

## Testing

- **Unit tests** in `redis.service.spec.ts` — mock ioredis and verify:
  - Successful acquire/release/refresh
  - Cross-user atomicity (User B cannot release/refresh User A's lock)
  - `defineCommand` registration
  - Error propagation
- **E2E tests** (future): Concurrent lock attempts against a real Redis instance.
- **Load tests** (future): 100+ concurrent users on the same landing page.

---

## Consequences

### Positive

- **Eliminates race conditions** in lock release and refresh operations.
- **Data integrity** — impossible to extend/delete another user's lock.
- **Performance** — `EVALSHA` caching means Lua scripts execute with minimal overhead.
- **Auditability** — lock/unlock audit logs now include `isNewAcquisition` and `wasForced` flags.

### Negative

- **Lua script debugging** is harder than debugging JavaScript (no breakpoints, limited logging).
- **Redis Cluster** — Lua scripts referencing multiple keys must use keys on the same hash slot. Our scripts only use `KEYS[1]`, so this is not a concern.

### Risks

- If Redis goes down, lock state is lost. Postgres serves as the fallback source of truth for lock ownership, but the TTL enforcement relies on Redis.

---

## References

- [Redis Lua Scripting](https://redis.io/docs/latest/develop/interact/programmability/eval-intro/)
- [ioredis defineCommand](https://github.com/redis/ioredis#lua-scripting)
- [Distributed Locks with Redis (Redlock)](https://redis.io/docs/latest/develop/use/patterns/distributed-locks/)
