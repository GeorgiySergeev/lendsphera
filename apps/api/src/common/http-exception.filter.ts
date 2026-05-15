import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Response } from "express";

import { env } from "../config/env";

function prismaDevHint(exception: unknown): string | undefined {
  if (env.NODE_ENV !== "development") return undefined;
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return `[Prisma ${exception.code}] ${exception.message}`;
  }
  if (exception instanceof Prisma.PrismaClientInitializationError) {
    return `[Prisma] ${exception.message}`;
  }
  if (exception instanceof Prisma.PrismaClientRustPanicError) {
    return `[Prisma engine] ${exception.message}`;
  }
  if (exception instanceof Error) {
    return exception.message;
  }
  return undefined;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    if (!(exception instanceof HttpException)) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        stack ?? (exception === undefined ? "undefined" : JSON.stringify(exception))
      );
    }

    const devHint =
      status === HttpStatus.INTERNAL_SERVER_ERROR ? prismaDevHint(exception) : undefined;

    response.status(status).json({
      statusCode: status,
      error: typeof payload === "string" ? payload : undefined,
      message:
        typeof payload === "object" && payload !== null && "message" in payload
          ? payload.message
          : payload,
      ...(devHint !== undefined ? { details: devHint } : {})
    });
  }
}
