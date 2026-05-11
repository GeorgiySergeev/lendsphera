import { z } from "zod";
export declare const WidgetSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<{
        hero: "hero";
        features: "features";
        cta: "cta";
    }>;
    order: z.ZodNumber;
    props: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const LandingDocumentSchema: z.ZodObject<{
    id: z.ZodString;
    slug: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    widgets: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            hero: "hero";
            features: "features";
            cta: "cta";
        }>;
        order: z.ZodNumber;
        props: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>>;
    publishedAt: z.ZodDefault<z.ZodNullable<z.ZodCoercedDate<unknown>>>;
}, z.core.$strip>;
export declare const PlaceholderFieldTypeSchema: z.ZodEnum<{
    number: "number";
    boolean: "boolean";
    array: "array";
    text: "text";
    textarea: "textarea";
    color: "color";
    image: "image";
    select: "select";
    richtext: "richtext";
}>;
export declare const PlaceholderOptionSchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodString;
}, z.core.$strip>;
export declare const PlaceholderValueSchema: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodNull]>>;
export declare const PlaceholderFieldSchema: z.ZodObject<{
    defaultValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodNull]>>;
    group: z.ZodDefault<z.ZodString>;
    helpText: z.ZodOptional<z.ZodString>;
    key: z.ZodString;
    label: z.ZodString;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, z.core.$strip>>>;
    required: z.ZodDefault<z.ZodBoolean>;
    type: z.ZodEnum<{
        number: "number";
        boolean: "boolean";
        array: "array";
        text: "text";
        textarea: "textarea";
        color: "color";
        image: "image";
        select: "select";
        richtext: "richtext";
    }>;
}, z.core.$strip>;
export declare const PlaceholderSchemaSchema: z.ZodObject<{
    fields: z.ZodDefault<z.ZodArray<z.ZodObject<{
        defaultValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodNull]>>;
        group: z.ZodDefault<z.ZodString>;
        helpText: z.ZodOptional<z.ZodString>;
        key: z.ZodString;
        label: z.ZodString;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, z.core.$strip>>>;
        required: z.ZodDefault<z.ZodBoolean>;
        type: z.ZodEnum<{
            number: "number";
            boolean: "boolean";
            array: "array";
            text: "text";
            textarea: "textarea";
            color: "color";
            image: "image";
            select: "select";
            richtext: "richtext";
        }>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const HealthResponseSchema: z.ZodObject<{
    status: z.ZodLiteral<"ok">;
    service: z.ZodString;
    timestamp: z.ZodString;
}, z.core.$strip>;
export type Widget = z.infer<typeof WidgetSchema>;
export type LandingDocument = z.infer<typeof LandingDocumentSchema>;
export type PlaceholderFieldType = z.infer<typeof PlaceholderFieldTypeSchema>;
export type PlaceholderOption = z.infer<typeof PlaceholderOptionSchema>;
export type PlaceholderValue = z.infer<typeof PlaceholderValueSchema>;
export type PlaceholderField = z.infer<typeof PlaceholderFieldSchema>;
export type PlaceholderSchema = z.infer<typeof PlaceholderSchemaSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
