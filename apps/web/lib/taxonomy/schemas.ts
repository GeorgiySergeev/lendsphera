import Papa from "papaparse";
import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.");

const geoFormSchema = z.object({
  code: z.string().trim().min(2, "Code is required.").max(8),
  currency: z.string().trim().min(3, "Currency is required.").max(4),
  flagEmoji: z.string().trim().optional(),
  flagUrl: z.string().trim().url("Use a valid URL.").or(z.literal("")).optional(),
  isActive: z.boolean(),
  language: z.string().trim().min(2, "Language is required.").max(16),
  name: z.string().trim().min(1, "Name is required."),
  timezone: z.string().trim().optional()
});

const categoryFormSchema = z.object({
  color: z.string().trim().optional(),
  description: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  isActive: z.boolean(),
  name: z.string().trim().min(1, "Name is required."),
  slug: slugSchema
});

const variantFormSchema = z.object({
  description: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  isActive: z.boolean(),
  name: z.string().trim().min(1, "Name is required."),
  slug: slugSchema
});

const geoCsvRowSchema = z.object({
  code: z.string().trim().min(2),
  currency: z.string().trim().min(3),
  flagEmoji: z.string().trim().optional(),
  flagUrl: z.string().trim().optional(),
  isActive: z.boolean().optional(),
  language: z.string().trim().min(2),
  name: z.string().trim().min(1),
  sortOrder: z.number().int().optional(),
  timezone: z.string().trim().optional()
});

type GeoFormValues = z.infer<typeof geoFormSchema>;
type CategoryFormValues = z.infer<typeof categoryFormSchema>;
type VariantFormValues = z.infer<typeof variantFormSchema>;
type GeoCsvRow = z.infer<typeof geoCsvRowSchema>;
type TaxonomyFormValues = GeoFormValues | CategoryFormValues | VariantFormValues;

function parseGeoCsvText(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });
  const errors = parsed.errors.map((error) => ({
    message: error.message,
    row: (error.row ?? 0) + 1
  }));
  const rows: GeoCsvRow[] = [];

  parsed.data.forEach((row, index) => {
    const normalized = {
      code: row.code?.trim(),
      currency: row.currency?.trim(),
      flagEmoji: row.flagEmoji?.trim() || undefined,
      flagUrl: row.flagUrl?.trim() || undefined,
      isActive: parseBoolish(row.isActive),
      language: row.language?.trim(),
      name: row.name?.trim(),
      sortOrder: row.sortOrder?.trim() ? Number(row.sortOrder) : undefined,
      timezone: row.timezone?.trim() || undefined
    };
    const result = geoCsvRowSchema.safeParse(normalized);

    if (result.success) {
      rows.push(result.data);
    } else {
      errors.push({
        message: result.error.issues.map((issue) => issue.message).join("; "),
        row: index + 1
      });
    }
  });

  return { errors, rows };
}

function parseBoolish(value?: string) {
  if (!value?.trim()) {
    return undefined;
  }

  return ["1", "true", "yes", "active"].includes(value.trim().toLowerCase());
}

export {
  categoryFormSchema,
  geoCsvRowSchema,
  geoFormSchema,
  parseGeoCsvText,
  variantFormSchema
};
export type {
  CategoryFormValues,
  GeoCsvRow,
  GeoFormValues,
  TaxonomyFormValues,
  VariantFormValues
};
