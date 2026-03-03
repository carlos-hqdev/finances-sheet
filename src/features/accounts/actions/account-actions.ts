"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/db";
import {
  type AccountFormValues,
  accountSchema,
} from "../schemas/account-schema";

// Mock User ID for now (Assuming single user or first user in future)
const MOCK_USER_ID = "cm4nt3q2v0000abc123456789";

export async function createAccount(data: AccountFormValues) {
  const result = accountSchema.safeParse(data);

  if (!result.success) {
    return { error: "Invalid data" };
  }

  // Ensure user exists (Mock check/creation if needed for dev)
  // In a real app, we get userId from session
  let user = await prisma.user.findUnique({ where: { id: MOCK_USER_ID } });
  if (!user) {
    // Auto-create mock user for development convience
    try {
      user = await prisma.user.create({
        data: {
          id: MOCK_USER_ID,
          email: "demo@user.com",
          name: "Demo User",
        },
      });
    } catch (_e) {
      // handle race condition or ignore
    }
  }

  try {
    await prisma.account.create({
      data: {
        ...result.data,
        userId: MOCK_USER_ID,
      },
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    console.error("Failed to create account:", error);
    return { error: "Failed to create account" };
  }
}

export async function getAccounts() {
  // Ensure user exists before fetching (logic consistent with create)
  const user = await prisma.user.findUnique({ where: { id: MOCK_USER_ID } });
  if (!user) return [];

  const accounts = await prisma.account.findMany({
    where: { userId: MOCK_USER_ID },
    orderBy: { createdAt: "desc" },
  });
  
  return accounts.map(a => ({
    ...a,
    balance: a.balance.toNumber()
  }));
}

export async function updateAccount(id: string, data: AccountFormValues) {
  const result = accountSchema.safeParse(data);

  if (!result.success) {
    return { error: "Invalid data" };
  }

  try {
    await prisma.account.update({
      where: { id },
      data: result.data,
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    console.error("Failed to update account:", error);
    return { error: "Failed to update account" };
  }
}

export async function deleteAccount(id: string) {
  try {
    // Excluir ou transferir transacoes/cartoes vinculados caso haja cascade,
    // mas por hora faremos a exclusao simples e deixamos o banco lidar com restricoes de chave estrangeira
    await prisma.account.delete({
      where: { id },
    });

    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return { error: "Failed to delete account (verifique se existem transacoes vinculadas)" };
  }
}
