import { z } from "zod";

export const categoryTypeEnum = z.enum([
  "EXPENSE",
  "INCOME",
  "INVESTMENT",
  "TRANSFER",
]);

export const createCategorySchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  type: categoryTypeEnum.default("EXPENSE"),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryType = z.infer<typeof categoryTypeEnum>;
