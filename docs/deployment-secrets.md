# Production Secrets Management

## JWT Secrets

When deploying to production, you **MUST** generate and set new JWT secrets.
The application will **refuse to start** if production secrets contain known development values.

### Requirements

| Rule | Detail |
|------|--------|
| Minimum length | 32 characters |
| Uniqueness | `JWT_ACCESS_SECRET` ≠ `JWT_REFRESH_SECRET` |
| Blocked values | Must NOT contain `dev-`, `change-me`, `test-secret`, `temporary`, `default`, `secret` |

### How to generate

```bash
# Generate access secret
ACCESS_SECRET=$(openssl rand -hex 32)
echo "JWT_ACCESS_SECRET=$ACCESS_SECRET"

# Generate refresh secret (MUST be different)
REFRESH_SECRET=$(openssl rand -hex 32)
echo "JWT_REFRESH_SECRET=$REFRESH_SECRET"

# Generate cookie secret
COOKIE_SECRET=$(openssl rand -base64 32)
echo "COOKIE_SECRET=$COOKIE_SECRET"
```

Or with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Where to set (platform-specific)

**Vercel / Netlify:**

- Go to Project Settings → Environment Variables
- Add `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECRET`
- Mark as **sensitive**

**Docker / Kubernetes:**

- Pass as env vars in `docker-compose.yml` or Kubernetes manifests
- Prefer secrets management solutions (HashiCorp Vault, AWS Secrets Manager, etc.)

**GitHub Actions:**

- Add to Repository → Settings → Secrets and variables → Actions
- Reference as `${{ secrets.JWT_ACCESS_SECRET }}` in workflows

### Validation at startup

The `env.ts` schema performs the following checks **when `NODE_ENV=production`**:

1. `JWT_ACCESS_SECRET` must be ≥ 32 characters
2. `JWT_REFRESH_SECRET` must be ≥ 32 characters
3. Neither secret may contain blocked development values (case-insensitive substring match)
4. The two secrets must be **different**
5. `COOKIE_SECRET` must not contain blocked development values

If any check fails, the process exits with code 1 and prints:

```
🔴 [ENV] Configuration validation failed:

  ❌ JWT_ACCESS_SECRET: JWT_ACCESS_SECRET contains a known development value...
```

### Rotation

To rotate secrets:

1. Generate new secrets (see above)
2. Update environment variables in your deployment platform
3. Restart the application
4. All existing JWTs are invalidated — users will need to re-authenticate
