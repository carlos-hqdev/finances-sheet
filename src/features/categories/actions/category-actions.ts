"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/db";
import { auth } from "@/shared/lib/auth";
import { headers } from "next/headers";

export async function createCategory(data: {
  name: string;
  color?: string;
  userId: string;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    await prisma.category.create({
      data: {
        name: data.name,
        color: data.color,
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
  data: {
    name: string;
    color?: string;
    userId: string;
  },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    await prisma.category.update({
      where: { id, userId: session.user.id },
      data: {
        name: data.name,
        color: data.color,
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
