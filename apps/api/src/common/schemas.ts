import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { paginationSchema } from "./pagination";

export const idParamSchema = z.object({
  id: z.string().min(1)
});

export const boolish = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .optional()
  .transform((value) => {
    if (value === undefined || typeof value === "boolean") {
      return value;
    }

    return value === "true";
  });

export const jsonValue = z.unknown();

export class IdParamDto extends createZodDto(idParamSchema) {}
export class PaginationDto extends createZodDto(paginationSchema) {}
