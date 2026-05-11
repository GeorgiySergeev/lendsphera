# ADR-005: API Rate Limiting

## Problem

Without rate limiting, attackers can:

1. Brute-force passwords (login endpoint)
2. Spam account creation (register)
3. Flood email send (password reset)

## Solution

Use @nestjs/throttler with memory backend (with plans to use Redis for horizontal scaling):

### Limits

- **Global**: 100 req/min (default)
- **Auth**: 5 req/min (login, register)
- **Reset**: 3 req/hour (password reset)

### Implementation

- Throttler Guard applied globally as `CustomThrottlerGuard`
- Per-endpoint `@Throttle` decorator override (e.g. `@Throttle({ auth: { limit: 5, ttl: 60000 } })`)
- `@CustomThrottle.Skip()` for non-sensitive endpoints like logout

### Metrics

Track via: `app.get(ThrottlerExpires)` hook (planned for future monitoring phase).

## Monitoring

Alert if auth endpoints receive >50 req/sec (DDoS indicator).
