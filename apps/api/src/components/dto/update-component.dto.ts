import { createZodDto } from "nestjs-zod";

import { createComponentSchema } from "./create-component.dto";

export class UpdateComponentDto extends createZodDto(createComponentSchema.partial()) {}
