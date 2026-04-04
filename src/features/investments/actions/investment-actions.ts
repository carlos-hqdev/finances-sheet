"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/db";
import { auth } from "@/shared/lib/auth";
import { headers } from "next/headers";

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

  await prisma.investment.create({
    data: {
      ...data,
      userId: userId,
    },
  });
  revalidatePath("/investments");
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

  await prisma.investment.update({
    where: { id, userId: session.user.id },
    data,
  });
  revalidatePath("/investments");
}

export async function deleteInvestment(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Não autorizado");

  const userId = session.user.id;

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
