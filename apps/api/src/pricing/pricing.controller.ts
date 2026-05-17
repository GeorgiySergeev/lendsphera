import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { PricingService } from "./pricing.service";

const dateValueSchema = z.union([
  z.string().datetime({ offset: true }),
  z.string().datetime()
]);
const decimalInputSchema = z.union([z.number().finite(), z.string().trim().min(1)]);

const resolveActivePriceQuerySchema = z.object({
  productId: z.string().min(1),
  geoCode: z.string().trim().toUpperCase().optional(),
  at: dateValueSchema.optional()
});

const listPriceHistoryQuerySchema = z.object({
  geoCode: z.string().trim().toUpperCase().optional(),
  cursor: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(200).default(50)
});

const createPricePeriodBodySchema = z.object({
  geoCode: z.string().trim().toUpperCase().optional(),
  validFrom: dateValueSchema,
  price: decimalInputSchema,
  oldPrice: decimalInputSchema.optional(),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
  notes: z.string().max(5000).optional()
});

const bulkOperationSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1),
  geoCodes: z.array(z.string().trim().toUpperCase()).min(1),
  operation: z.enum(["set", "percent"]),
  value: decimalInputSchema,
  validFrom: dateValueSchema,
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .optional(),
  notes: z.string().max(5000).optional()
});

export class ResolveActivePriceQueryDto extends createZodDto(
  resolveActivePriceQuerySchema
) {}
export class ListPriceHistoryQueryDto extends createZodDto(listPriceHistoryQuerySchema) {}
export class CreatePricePeriodBodyDto extends createZodDto(createPricePeriodBodySchema) {}
export class BulkPricingBodyDto extends createZodDto(bulkOperationSchema) {}

@ApiTags("Pricing")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Roles(...READ_ROLES)
  @Get("prices")
  resolveActive(@Query() query: ResolveActivePriceQueryDto) {
    return this.pricing.resolveActive(query.productId, query.geoCode ?? null, query.at);
  }

  @Roles(...READ_ROLES)
  @Get("products/:id/prices")
  history(@Param("id") productId: string, @Query() query: ListPriceHistoryQueryDto) {
    return this.pricing.listHistory(
      productId,
      query.geoCode ?? null,
      query.cursor,
      query.take
    );
  }

  @Roles(...WRITE_ROLES)
  @Post("products/:id/prices")
  createPeriod(
    @Param("id") productId: string,
    @Body() body: CreatePricePeriodBodyDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.pricing.createPeriod(
      {
        productId,
        geoCode: body.geoCode ?? null,
        validFrom: body.validFrom,
        price: body.price,
        oldPrice: body.oldPrice,
        currency: body.currency,
        notes: body.notes
      },
      user.id
    );
  }

  @Roles(...WRITE_ROLES)
  @Post("pricing/bulk")
  bulk(@Body() body: BulkPricingBodyDto, @CurrentUser() user: AuthUser) {
    return this.pricing.bulkApply(body, user.id);
  }
}
