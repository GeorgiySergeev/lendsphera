import { z } from "zod";

const wheelSegmentSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1)
});

export const wheelPropsSchema = z.object({
  buttonLabel: z.string().min(1).default("Spin"),
  segments: z
    .array(wheelSegmentSchema)
    .min(2)
    .default([
      { label: "10%", value: "10" },
      { label: "20%", value: "20" }
    ]),
  title: z.string().min(1).default("Try your luck")
});

export type WheelProps = z.infer<typeof wheelPropsSchema>;
