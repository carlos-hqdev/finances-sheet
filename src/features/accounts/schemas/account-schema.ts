import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  type: z.enum(["CHECKING", "INVESTMENT", "CASH"] as const, {
    message: "Type is required",
  }),
  institution: z.string().optional(),
  balance: z.number().default(0),
  color: z
    .string()
    .regex(/^#([0-9A-F]{3}){1,2}$/i, "Invalid color hex")
    .optional(),
  yieldRate: z.number().optional().nullable(),
  isDailyYield: z.boolean().default(false).optional(),
});

export type AccountFormValues = z.infer<typeof accountSchema>;
