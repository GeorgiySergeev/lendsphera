import { z } from "zod";

const publicIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createLandingWizardSchema = z.object({
  geoId: z.string().min(1, "Select a GEO."),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(120, "Name must be 120 characters or less."),
  publicId: z
    .string()
    .trim()
    .min(1, "Public ID is required.")
    .regex(publicIdPattern, "Use lowercase letters, numbers, and hyphens."),
  templateId: z.string().min(1, "Select a template."),
  variantId: z.string().min(1, "Select a variant.")
});

type CreateLandingWizardValues = z.infer<typeof createLandingWizardSchema>;

const createLandingStepFields = [
  ["name"],
  ["geoId"],
  ["templateId"],
  ["variantId"],
  ["publicId"]
] as const satisfies readonly (readonly (keyof CreateLandingWizardValues)[])[];

export { createLandingStepFields, createLandingWizardSchema, publicIdPattern };
export type { CreateLandingWizardValues };
