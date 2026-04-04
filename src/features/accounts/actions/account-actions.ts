"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/db";
import { auth } from "@/shared/lib/auth";
import { headers } from "next/headers";
import {
  type AccountFormValues,
  accountSchema,
} from "../schemas/account-schema";

export async function createAccount(data: AccountFormValues) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Não autorizado");
  }

  const userId = session.user.id;

  const result = accountSchema.safeParse(data);

  if (!result.success) {
    return { error: "Dados inválidos" };
  }

  try {
    await prisma.bankAccount.create({
      data: {
        ...result.data,
        userId: userId,
      },
    });

    revalidatePath("/accounts");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to create account:", error);
    return { error: "Failed to create account" };
  }
}

export async function getAccounts() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return [];

  const userId = session.user.id;

  const accounts = await prisma.bankAccount.findMany({
    where: { userId: userId },
    orderBy: { createdAt: "desc" },
  });

  return accounts.map((a) => ({
    ...a,
    balance: a.balance ? a.balance.toNumber() : 0,
  }));
}

export async function updateAccount(id: string, data: AccountFormValues) {
  const result = accountSchema.safeParse(data);

  if (!result.success) {
    return { error: "Invalid data" };
  }

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    await prisma.bankAccount.update({
      where: { id, userId: session.user.id },
      data: result.data,
    });

    revalidatePath("/accounts");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update account:", error);
    return { error: "Failed to update account" };
  }
}

export async function deleteAccount(id: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    await prisma.bankAccount.delete({
      where: { id, userId: session.user.id },
    });

    revalidatePath("/accounts");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return {
      error:
        "Failed to delete account (verifique se existem transacoes vinculadas)",
    };
  }
}
