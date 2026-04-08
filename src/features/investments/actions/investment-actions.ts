"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/db";

export async function createInvestment(data: {
  name: string;
  type: string;
  institution?: string;
  balance: number;
  isDailyYield?: boolean;
  targetAmount?: number;
  yieldRate?: number;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Não autorizado");
  }

  const userId = session.user.id;

  try {
    await prisma.investment.create({
      data: {
        ...data,
        userId: userId,
      },
    });
    revalidatePath("/investments");
    return { success: true };
  } catch (error) {
    console.error("Failed to create investment:", error);
    return { error: "Erro ao criar investimento" };
  }
}

export async function updateInvestment(
  id: string,
  data: {
    name: string;
    type: string;
    institution?: string;
    balance: number;
    isDailyYield?: boolean;
    targetAmount?: number;
    yieldRate?: number;
  },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Não autorizado");

  try {
    await prisma.investment.update({
      where: { id, userId: session.user.id },
      data,
    });
    revalidatePath("/investments");
    return { success: true };
  } catch (error) {
    console.error("Failed to update investment:", error);
    return { error: "Erro ao atualizar investimento" };
  }
}

export async function deleteInvestment(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Não autorizado");

  const userId = session.user.id;

  try {
    // Verifique se precisa deletar o histórico primeiro
    await prisma.investmentHistory.deleteMany({
      where: { investmentId: id, investment: { userId } },
    });

    // Deletar os lotes primeiro
    await prisma.investmentLot.deleteMany({
      where: { investmentId: id, investment: { userId } },
    });

    await prisma.investment.delete({
      where: { id, userId },
    });
    revalidatePath("/investments");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete investment:", error);
    return { error: "Erro ao excluir investimento" };
  }
}

export async function editInvestmentLot(lotId: string, data: any) {
  // Stub: Implementar lógica futura
  console.log("Edit lot", lotId, data);
}

export async function deleteInvestmentLot(lotId: string) {
  // Stub: Implementar exclusão
  // Lembrete: Ao excluir um lote, deve-se re-somar os lotes restantes
  // e atualizar o 'balance' do 'Investment' pai correspondente.
  console.log("Delete lot", lotId);
}
