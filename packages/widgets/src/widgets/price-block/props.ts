import { z } from "zod";

export const priceBlockPropsSchema = z.object({
  currency: z.string().min(1).default("$"),
  features: z.array(z.string().min(1)).default(["Fast launch", "SSR ready"]),
  oldPrice: z.number().nonnegative().default(199),
  price: z.number().nonnegative().default(99),
  title: z.string().min(1).default("Special offer")
});

export type PriceBlockProps = z.infer<typeof priceBlockPropsSchema>;
