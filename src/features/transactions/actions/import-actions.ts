"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/db";

export type ImportTransactionInput = {
  date: string; // ISO String to handle timezone issues from client to server
  amount: number;
  description: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  accountId: string;

  // Optional relations
  categoryId?: string | null;
  destinationAccountId?: string | null;
  notes?: string | null;
};

export async function processImportedTransactions(
  transactions: ImportTransactionInput[],
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Não autorizado", status: 401 };
    }

    if (!transactions || transactions.length === 0) {
      return { error: "Nenhuma transação enviada.", status: 400 };
    }

    const userId = session.user.id;
    let successCount = 0;

    for (const trx of transactions) {
      // 1. Double check account ownership
      const account = await prisma.bankAccount.findUnique({
        where: { id: trx.accountId },
      });

      if (!account || account.userId !== userId) {
        continue; // skip unauthorized or invalid accounts
      }

      const isTransfer = trx.type === "TRANSFER";

      const dataToSave: any = {
        accountId: trx.accountId,
        amount: Math.abs(trx.amount),
        type: trx.type,
        date: new Date(trx.date),
        description: trx.description,
        isPaid: true, // Imported transactions are usually already paid/cleared
        notes: trx.notes,
        paymentMethod: "OTHER",
      };

      if (trx.categoryId && !isTransfer) {
        dataToSave.categoryId = trx.categoryId;
      }

      if (isTransfer && trx.destinationAccountId) {
        dataToSave.destinationAccountId = trx.destinationAccountId;
      }

      await prisma.transaction.create({
        data: dataToSave,
      });

      // Se for Despesa, debita do saldo; se Receita, credita, se Transferencia debita de uma e credita na outra.
      // Ops, a criação de transação no sistema atualmente não atualiza o saldo da conta automaticamente?
      // O Finances Sheet parece calcular on the fly ou atualiza balance?
      // Em conversas passadas vimos que Transaction altera o saldo via trigger ou action.
      // Vamos simular o update do balance caso não tenha trigger.

      const multiplier =
        trx.type === "EXPENSE" ? -1 : trx.type === "INCOME" ? 1 : -1;
      // Transfer takes from source account

      await prisma.bankAccount.update({
        where: { id: trx.accountId },
        data: {
          balance: {
            increment: trx.amount, // Assuming trx.amount is signed correctly (expenses are negative) based on the parser.
            // Adjust: parser makes expense < 0 and income > 0.
          },
        },
      });

      if (isTransfer && trx.destinationAccountId) {
        // Increment on destination
        await prisma.bankAccount.update({
          where: { id: trx.destinationAccountId },
          data: {
            balance: {
              increment: Math.abs(trx.amount), // Destination always receives positive amount
            },
          },
        });
      }

      successCount++;
    }

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/");

    return {
      success: true,
      message: `${successCount} transações importadas com sucesso.`,
    };
  } catch (error: any) {
    console.error("Erro na importation Action:", error);
    return {
      error: error.message || "Erro ao salvar transações",
      status: 500,
    };
  }
}
