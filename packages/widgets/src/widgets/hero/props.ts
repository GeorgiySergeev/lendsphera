import { z } from "zod";

export const heroPropsSchema = z.object({
  ctaLabel: z.string().min(1).default("Start now"),
  ctaUrl: z.string().min(1).default("#form"),
  subtitle: z.string().min(1).default("High-converting landing blocks"),
  title: z.string().min(1).default("Scale Your Widget Runtime")
});

export type HeroProps = z.infer<typeof heroPropsSchema>;
