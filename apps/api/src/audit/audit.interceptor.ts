import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { compare } from "fast-json-patch";
import { Observable, tap } from "rxjs";

import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method?: string;
      params?: Record<string, string>;
      path?: string;
      originalUrl?: string;
      user?: { id?: string };
      ip?: string;
      headers?: Record<string, string>;
    }>();
    const method = req.method ?? "";

    if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
      return next.handle();
    }

    const beforeP = this.snapshotBefore(req);

    return next.handle().pipe(
      tap((responseBody) => {
        setImmediate(async () => {
          try {
            const before = await beforeP;
            const action = this.mapAction(method);
            if (!action) return;

            const { entity, entityId } = this.resolveEntity(req, responseBody);
            const diff = before
              ? compare(before as object, (responseBody ?? {}) as object)
              : [];

            this.auditService.record({
              action,
              entity,
              entityId,
              userId: req.user?.id ?? null,
              ip: req.ip ?? null,
              userAgent: req.headers?.["user-agent"] ?? null,
              diff:
                diff.length > 0 ? (diff as unknown as Prisma.InputJsonValue) : undefined
            });
          } catch (error) {
            console.error("[AuditInterceptor]", error);
          }
        });
      })
    );
  }

  private async snapshotBefore(req: {
    method?: string;
    params?: Record<string, string>;
    path?: string;
    originalUrl?: string;
  }) {
    const method = req.method ?? "";
    const id = req.params?.id;

    if (!["PATCH", "PUT"].includes(method) || !id) {
      return null;
    }

    const modelName = this.resolveModelName(req.path ?? req.originalUrl ?? "");
    if (!modelName) {
      return null;
    }

    const delegate = (
      this.prisma as unknown as Record<
        string,
        { findUnique?: (args: { where: { id: string } }) => Promise<unknown> }
      >
    )[modelName];
    if (!delegate?.findUnique) {
      return null;
    }

    return delegate.findUnique({ where: { id } });
  }

  private mapAction(method: string): AuditAction | null {
    if (method === "POST") return AuditAction.CREATE;
    if (method === "DELETE") return AuditAction.DELETE;
    if (method === "PATCH" || method === "PUT") return AuditAction.UPDATE;
    return null;
  }

  private resolveEntity(
    req: { params?: Record<string, string>; path?: string; originalUrl?: string },
    responseBody: unknown
  ) {
    const path = req.path ?? req.originalUrl ?? "";
    const entity = this.resolveModelName(path) ?? "Unknown";
    const entityId = req.params?.id ?? this.extractResponseId(responseBody) ?? "unknown";

    return { entity, entityId };
  }

  private extractResponseId(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") return null;
    const id = (payload as Record<string, unknown>).id;
    return typeof id === "string" ? id : null;
  }

  private resolveModelName(path: string): string | null {
    const cleanPath = path.split("?")[0];
    const segments = cleanPath
      .split("/")
      .filter(Boolean)
      .filter((segment) => segment !== "api" && segment !== "v1");

    if (!segments.length) return null;

    const resource = segments[0];
    const singular = resource.endsWith("ies")
      ? `${resource.slice(0, -3)}y`
      : resource.endsWith("s")
        ? resource.slice(0, -1)
        : resource;

    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }
}
