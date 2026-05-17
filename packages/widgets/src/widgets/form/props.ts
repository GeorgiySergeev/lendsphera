import { z } from "zod";

export const formPropsSchema = z.object({
  buttonLabel: z.string().min(1).default("Send"),
  consentLabel: z.string().min(1).default("I agree to processing personal data"),
  fields: z.array(z.string().min(1)).min(1).default(["name", "phone"]),
  title: z.string().min(1).default("Leave your request")
});

export type FormProps = z.infer<typeof formPropsSchema>;
