import { z } from "zod";

const testimonialSchema = z.object({
  author: z.string().min(1),
  quote: z.string().min(1)
});

export const testimonialsPropsSchema = z.object({
  items: z
    .array(testimonialSchema)
    .min(1)
    .default([{ author: "Alex", quote: "Great conversion uplift in one week." }]),
  title: z.string().min(1).default("What customers say")
});

export type TestimonialsProps = z.infer<typeof testimonialsPropsSchema>;
