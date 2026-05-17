import { createZodDto } from "nestjs-zod";

import { createProductSchema } from "./create-product.dto";

export const updateProductSchema = createProductSchema.partial();

export class UpdateProductDto extends createZodDto(updateProductSchema) {}
