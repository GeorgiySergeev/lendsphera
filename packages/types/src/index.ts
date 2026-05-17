import { z } from "zod";

export type * from "./components";
export type * from "./builder";
export type * from "./widget-registry";
export type * from "./i18n";
export type * from "./landing";
export type * from "./price";
export type * from "./runtime-vars";
export type * from "./widget";

export const WidgetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["hero", "features", "cta"]),
  order: z.number().int().nonnegative(),
  props: z.record(z.string(), z.unknown()).default({})
});

export const LandingDocumentSchema = z.object({
  id: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  description: z.string().optional(),
  widgets: z.array(WidgetSchema).default([]),
  publishedAt: z.coerce.date().nullable().default(null)
});

export const PlaceholderFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "number",
  "color",
  "image",
  "select",
  "array",
  "boolean",
  "richtext"
]);

export const PlaceholderOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string()
});

export const PlaceholderValueSchema = z.record(
  z.string().min(1),
  z.union([z.array(z.string()), z.boolean(), z.number(), z.string(), z.null()])
);

export const PlaceholderFieldSchema = z.object({
  defaultValue: z
    .union([z.array(z.string()), z.boolean(), z.number(), z.string(), z.null()])
    .optional(),
  group: z.string().min(1).default("Content"),
  helpText: z.string().optional(),
  key: z
    .string()
    .min(1)
    .regex(/^[A-Za-z][A-Za-z0-9_.-]*$/),
  label: z.string().min(1),
  options: z.array(PlaceholderOptionSchema).optional(),
  required: z.boolean().default(false),
  type: PlaceholderFieldTypeSchema
});

export const PlaceholderSchemaSchema = z.object({
  fields: z.array(PlaceholderFieldSchema).default([])
});

export const LandingEditorLayoutSchema = z.object({
  bodyAttributes: z.record(z.string(), z.string()).optional(),
  bodyClass: z.string().optional(),
  htmlAttributes: z.record(z.string(), z.string()).optional(),
  wrapperClass: z.string().optional()
});

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string().min(1),
  timestamp: z.string().datetime()
});

export type Widget = z.infer<typeof WidgetSchema>;
export type LandingDocument = z.infer<typeof LandingDocumentSchema>;
export type PlaceholderFieldType = z.infer<typeof PlaceholderFieldTypeSchema>;
export type PlaceholderOption = z.infer<typeof PlaceholderOptionSchema>;
export type PlaceholderValue = z.infer<typeof PlaceholderValueSchema>;
export type PlaceholderField = z.infer<typeof PlaceholderFieldSchema>;
export type PlaceholderSchema = z.infer<typeof PlaceholderSchemaSchema>;
export type LandingEditorLayout = z.infer<typeof LandingEditorLayoutSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
