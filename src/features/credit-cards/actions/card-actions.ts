"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/db";
import { auth } from "@/shared/lib/auth";
import { headers } from "next/headers";

export async function createCreditCard(data: {
  accountId: string;
  limit: number;
  closingDay: number;
  dueDay: number;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    const userId = session.user.id;

    // Verificar se a conta pertence ao usuário
    const account = await prisma.bankAccount.findUnique({
      where: { id: data.accountId, userId },
    });
    if (!account) throw new Error("Conta não encontrada ou não pertence ao usuário");

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
  },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    const userId = session.user.id;

    // Verificar se o cartão pertence ao usuário (via conta)
    const card = await prisma.creditCard.findFirst({
      where: { id, account: { userId } },
    });
    if (!card) throw new Error("Cartão não encontrado ou não pertence ao usuário");

    // Se mudou a conta, verificar a nova conta
    if (data.accountId !== card.accountId) {
      const account = await prisma.bankAccount.findUnique({
        where: { id: data.accountId, userId },
      });
      if (!account) throw new Error("Nova conta não encontrada ou não pertence ao usuário");
    }

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
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    const userId = session.user.id;

    // Verificar se o cartão pertence ao usuário (via conta)
    const card = await prisma.creditCard.findFirst({
      where: { id, account: { userId } },
    });
    if (!card) throw new Error("Cartão não encontrado ou não pertence ao usuário");

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
