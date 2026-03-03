"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/db";

export async function createCreditCard(data: {
  accountId: string;
  limit: number;
  closingDay: number;
  dueDay: number;
}) {
  try {
    await prisma.creditCard.create({
      data: {
        accountId: data.accountId,
        limit: data.limit,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
      },
    });
    revalidatePath("/credit-cards");
    return { success: true };
  } catch (error) {
    console.error("Failed to create credit card:", error);
    return { error: "Failed to create credit card" };
  }
}

export async function updateCreditCard(
  id: string,
  data: {
    accountId: string;
    limit: number;
    closingDay: number;
    dueDay: number;
  }
) {
  try {
    await prisma.creditCard.update({
      where: { id },
      data: {
        accountId: data.accountId,
        limit: data.limit,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
      },
    });
    revalidatePath("/credit-cards");
    return { success: true };
  } catch (error) {
    console.error("Failed to update credit card:", error);
    return { error: "Failed to update credit card" };
  }
}

export async function deleteCreditCard(id: string) {
  try {
    await prisma.creditCard.delete({
      where: { id },
    });
    revalidatePath("/credit-cards");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete credit card:", error);
    return { error: "Failed to delete credit card" };
  }
}
