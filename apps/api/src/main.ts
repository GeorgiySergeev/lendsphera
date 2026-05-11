import "./load-env";
import "reflect-metadata";

import { Logger } from "@nestjs/common";
import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { cleanupOpenApiDoc, ZodValidationPipe } from "nestjs-zod";

import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { ThrottleExceptionFilter } from "./common/throttle-exception.filter";
import { env } from "./config/env";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  // ============ JWT SECRET VALIDATION STATUS ============
  if (env.NODE_ENV === "production") {
    logger.log("🔐 [STARTUP] Running in PRODUCTION mode");
    logger.log("🔐 [STARTUP] JWT secrets validated — OK");
  } else {
    logger.warn(
      "🛠️  [STARTUP] Running in DEV/TEST mode — default secrets may be in use",
    );
  }

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix("api");

  // ============ COOKIE PARSER ============
  // Must be registered BEFORE any route handler that reads `req.cookies`.
  // The secret is used for signing cookies (optional but recommended).
  app.use(cookieParser(env.COOKIE_SECRET));

  // ============ CORS SECURITY ============
  /**
   * Strict CORS whitelist configuration.
   * Only explicitly allowed origins can make requests to this API.
   *
   * Allowed origins are defined by environment variables:
   * - WEB_ORIGIN: The editor frontend URL (e.g., https://editor.lendsphera.com)
   * - RUNTIME_ORIGIN: The public pages URL (e.g., https://pages.lendsphera.com)
   *
   * @see https://owasp.org/www-community/attacks/csrf
   */
  const allowedOrigins = [
    env.WEB_ORIGIN,
    env.RUNTIME_ORIGIN,
    ...(env.NODE_ENV === "development"
      ? ["http://localhost:3002", "http://localhost:3001", "http://localhost:4000"]
      : []),
  ].filter(Boolean) as string[];

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`[CORS] Rejected request from origin: ${origin}`);
      callback(new Error("Not allowed by CORS policy"));
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 3600,
    preflightContinue: false,
    optionsSuccessStatus: 200,
  };

  app.enableCors(corsOptions);
  // =========================================
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new ThrottleExceptionFilter()
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Landing Builder API")
    .setDescription("REST API for landing builder resources")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, cleanupOpenApiDoc(document));

  try {
    await app.listen(env.PORT);
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "EADDRINUSE") {
      new Logger("NestBootstrap").error(
        `Port ${env.PORT} is already in use. Stop the other Node process (or run \`npx kill-port ${env.PORT}\` from apps/api), then try again.`
      );
      process.exit(1);
    }
    throw error;
  }
}

void bootstrap();
