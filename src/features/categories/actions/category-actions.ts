"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/db";

export async function createCategory(data: {
  name: string;
  color?: string;
  userId: string;
}) {
  try {
    await prisma.category.create({
      data: {
        name: data.name,
        color: data.color,
        userId: data.userId,
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
  data: {
    name: string;
    color?: string;
    userId: string;
  },
) {
  try {
    await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        color: data.color,
        userId: data.userId,
      },
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
    await prisma.category.delete({
      where: { id },
    });
    revalidatePath("/categories");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete category:", error);
    return { error: "Failed to delete category" };
  }
}
