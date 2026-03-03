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
  yieldRate: number;
  yieldFrequency: "MONTHLY" | "YEARLY" | "NONE";
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
    } catch (_e) { }
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
    yieldRate: number;
    yieldFrequency: "MONTHLY" | "YEARLY" | "NONE";
  }
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

  await prisma.investment.delete({
    where: { id },
  });
  revalidatePath("/investments");
}
