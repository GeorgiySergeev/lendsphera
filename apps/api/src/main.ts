import "./load-env";
import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc, ZodValidationPipe } from "nestjs-zod";

import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { env } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: true,
    credentials: true
  });
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

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
