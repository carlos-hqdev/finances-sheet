"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/db";

// Mock User ID for now (Assuming single user or first user in future)
const MOCK_USER_ID = "cm4nt3q2v0000abc123456789";

export async function createInvestment(data: {
  name: string;
  type: string;
  institution?: string;
  balance: number;
  isDailyYield?: boolean;
  targetAmount?: number;
  yieldRate?: number;
}) {
  let user = await prisma.user.findUnique({ where: { id: MOCK_USER_ID } });
  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          id: MOCK_USER_ID,
          email: "demo@user.com",
          name: "Demo User",
        },
      });
    } catch (_e) {}
  }

  await prisma.investment.create({
    data: {
      ...data,
      userId: MOCK_USER_ID,
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
  await prisma.investment.update({
    where: { id },
    data,
  });
  revalidatePath("/investments");
}

export async function deleteInvestment(id: string) {
  // Verifique se precisa deletar o histórico primeiro (cascade no bd não definido, então manual via prisma)
  await prisma.investmentHistory.deleteMany({
    where: { investmentId: id },
  });

  // Deletar os lotes primeiro
  await prisma.investmentLot.deleteMany({
    where: { investmentId: id },
  });

  await prisma.investment.delete({
    where: { id },
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
