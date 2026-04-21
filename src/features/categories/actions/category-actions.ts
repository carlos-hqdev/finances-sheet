"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/db";
import type { CreateCategoryInput, UpdateCategoryInput } from "../schemas";

const defaultIcons: Record<string, string> = {
  EXPENSE: "ShoppingCart",
  INCOME: "Briefcase",
  INVESTMENT: "TrendingUp",
  TRANSFER: "ArrowLeftRight",
};

export async function createCategory(
  data: CreateCategoryInput & { userId: string },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    const icon = data.icon || defaultIcons[data.type] || "Tag";

    await prisma.category.create({
      data: {
        name: data.name,
        type: data.type,
        color: data.color,
        icon,
        userId: session.user.id,
      },
    });
    revalidatePath("/categories");
    return { success: true };
  } catch (error) {
    console.error("Failed to create category:", error);
    return { error: "Failed to create category" };
  }
}

export async function updateCategory(
  id: string,
  data: UpdateCategoryInput & { userId: string },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;

    await prisma.category.update({
      where: { id, userId: session.user.id },
      data: updateData,
    });
    revalidatePath("/categories");
    return { success: true };
  } catch (error) {
    console.error("Failed to update category:", error);
    return { error: "Failed to update category" };
  }
}

export async function deleteCategory(id: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    await prisma.category.delete({
      where: { id, userId: session.user.id },
    });
    revalidatePath("/categories");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete category:", error);
    return { error: "Failed to delete category" };
  }
}
