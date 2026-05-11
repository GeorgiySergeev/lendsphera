"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthResponseSchema = exports.PlaceholderSchemaSchema = exports.PlaceholderFieldSchema = exports.PlaceholderValueSchema = exports.PlaceholderOptionSchema = exports.PlaceholderFieldTypeSchema = exports.LandingDocumentSchema = exports.WidgetSchema = void 0;
const zod_1 = require("zod");
exports.WidgetSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    type: zod_1.z.enum(["hero", "features", "cta"]),
    order: zod_1.z.number().int().nonnegative(),
    props: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({})
});
exports.LandingDocumentSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    slug: zod_1.z
        .string()
        .min(1)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    widgets: zod_1.z.array(exports.WidgetSchema).default([]),
    publishedAt: zod_1.z.coerce.date().nullable().default(null)
});
exports.PlaceholderFieldTypeSchema = zod_1.z.enum([
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
exports.PlaceholderOptionSchema = zod_1.z.object({
    label: zod_1.z.string().min(1),
    value: zod_1.z.string()
});
exports.PlaceholderValueSchema = zod_1.z.record(zod_1.z.string().min(1), zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.boolean(), zod_1.z.number(), zod_1.z.string(), zod_1.z.null()]));
exports.PlaceholderFieldSchema = zod_1.z.object({
    defaultValue: zod_1.z
        .union([zod_1.z.array(zod_1.z.string()), zod_1.z.boolean(), zod_1.z.number(), zod_1.z.string(), zod_1.z.null()])
        .optional(),
    group: zod_1.z.string().min(1).default("Content"),
    helpText: zod_1.z.string().optional(),
    key: zod_1.z
        .string()
        .min(1)
        .regex(/^[A-Za-z][A-Za-z0-9_.-]*$/),
    label: zod_1.z.string().min(1),
    options: zod_1.z.array(exports.PlaceholderOptionSchema).optional(),
    required: zod_1.z.boolean().default(false),
    type: exports.PlaceholderFieldTypeSchema
});
exports.PlaceholderSchemaSchema = zod_1.z.object({
    fields: zod_1.z.array(exports.PlaceholderFieldSchema).default([])
});
exports.HealthResponseSchema = zod_1.z.object({
    status: zod_1.z.literal("ok"),
    service: zod_1.z.string().min(1),
    timestamp: zod_1.z.string().datetime()
});
//# sourceMappingURL=index.js.map