import type { z } from "zod";

export type RepairValidationSuccess<TProps extends Record<string, unknown>> = {
  ok: true;
  props: TProps;
};

export type RepairValidationFailure = {
  ok: false;
  error: string;
};

export type RepairValidationResult<TProps extends Record<string, unknown>> =
  | RepairValidationSuccess<TProps>
  | RepairValidationFailure;

export function validateMappedProps<TProps extends Record<string, unknown>>(
  schema: z.ZodType<TProps>,
  candidate: unknown
): RepairValidationResult<TProps> {
  const result = schema.safeParse(candidate);
  if (result.success) {
    return { ok: true, props: result.data };
  }

  const error = result.error.issues
    .map((issue) => {
      const path = issue.path.map(String).join(".") || "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

  return { ok: false, error };
}
