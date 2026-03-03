"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/db";
import { getFinanceReferenceMonth } from "@/shared/lib/finance-utils";

export async function createTransaction(data: {
  description: string;
  amount: number;
  type: string;
  categoryId?: string;
  accountId: string;
  destinationAccountId?: string;
  paymentMethod?: string;
  creditCardId?: string;
  date: Date;
  condition?: "A_VISTA" | "PARCELADO";
  notes?: string;
  isPaid?: boolean;
}) {
  const condition = (
    data.condition === "PARCELADO" ? "PARCELADO" : "A_VISTA"
  ) as "A_VISTA" | "PARCELADO";

  // Calculate dynamic reference month (using day 25 as salary base)
  const referenceMonth = getFinanceReferenceMonth(data.date, 25);
  const isPaid = data.isPaid ?? false;

  await prisma.$transaction(async (tx) => {
    let invoiceId: string | undefined;

    // Process Credit Card Invoice logic (for non-transfers)
    if (data.type !== "TRANSFER" && data.paymentMethod === "CREDIT_CARD" && data.creditCardId) {
      const card = await tx.creditCard.findUnique({
        where: { id: data.creditCardId },
      });
      if (card) {
        const transDate = new Date(data.date);
        let invMonth = transDate.getMonth() + 1;
        let invYear = transDate.getFullYear();

        // If transaction is on or after the closing day, it belongs to next month's invoice
        if (transDate.getDate() >= card.closingDay) {
          invMonth += 1;
          if (invMonth > 12) {
            invMonth = 1;
            invYear += 1;
          }
        }

        const invoice = await tx.invoice.upsert({
          where: {
            creditCardId_month_year: {
              creditCardId: data.creditCardId,
              month: invMonth,
              year: invYear,
            },
          },
          update: {
            totalAmount: { increment: data.amount },
          },
          create: {
            creditCardId: data.creditCardId,
            month: invMonth,
            year: invYear,
            totalAmount: data.amount,
          },
        });

        invoiceId = invoice.id;
      }
    }

    await tx.transaction.create({
      data: {
        description: data.description,
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId,
        accountId: data.accountId,
        destinationAccountId: data.type === "TRANSFER" ? data.destinationAccountId : null,
        paymentMethod: data.type === "TRANSFER" ? "TRANSFER" : data.paymentMethod,
        creditCardId: data.type === "TRANSFER" ? null : data.creditCardId,
        date: data.date,
        condition,
        notes: data.notes,
        referenceMonth,
        invoiceId,
        isPaid,
      },
    });

    // Calculate balance changes
    if (isPaid) {
      if (data.type === "TRANSFER" && data.destinationAccountId) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { balance: { decrement: data.amount } },
        });
        await tx.account.update({
          where: { id: data.destinationAccountId },
          data: { balance: { increment: data.amount } },
        });
      } else if (data.paymentMethod !== "CREDIT_CARD") {
        if (data.type === "INCOME") {
          await tx.account.update({
            where: { id: data.accountId },
            data: { balance: { increment: data.amount } },
          });
        } else if (data.type === "EXPENSE") {
          await tx.account.update({
            where: { id: data.accountId },
            data: { balance: { decrement: data.amount } },
          });
        }
      }
    }
  });

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function updateTransaction(
  id: string,
  data: {
    description: string;
    amount: number;
    type: string;
    categoryId?: string;
    accountId: string;
    destinationAccountId?: string;
    paymentMethod?: string;
    creditCardId?: string;
    date: Date;
    condition?: "A_VISTA" | "PARCELADO";
    notes?: string;
    isPaid?: boolean;
    referenceMonth?: string;
  }
) {
  const oldTx = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!oldTx) return { error: "Transaction not found" };

  try {
    // 1. Revert old transaction impacts on balances/invoices
    if (oldTx.isPaid) {
      if (oldTx.type === "TRANSFER" && oldTx.destinationAccountId) {
        await prisma.account.update({
          where: { id: oldTx.accountId },
          data: { balance: { increment: oldTx.amount } }, // Revert decrement
        });
        await prisma.account.update({
          where: { id: oldTx.destinationAccountId },
          data: { balance: { decrement: oldTx.amount } }, // Revert increment
        });
      } else if (oldTx.paymentMethod !== "CREDIT_CARD") {
        const revertOp = oldTx.type === "INCOME" ? "decrement" : "increment";
        await prisma.account.update({
          where: { id: oldTx.accountId },
          data: { balance: { [revertOp]: oldTx.amount } },
        });
      }
    }

    if (oldTx.type !== "TRANSFER" && oldTx.paymentMethod === "CREDIT_CARD" && oldTx.invoiceId) {
      // Revert from old invoice
      await prisma.invoice.update({
        where: { id: oldTx.invoiceId },
        data: { totalAmount: { decrement: oldTx.amount } },
      });
    }

    // 2. Calculate new properties
    const condition = (data.condition === "PARCELADO" ? "PARCELADO" : "A_VISTA") as "A_VISTA" | "PARCELADO";
    const referenceMonth = data.referenceMonth || getFinanceReferenceMonth(data.date, 25);
    const isPaid = data.isPaid ?? false;

    // 3. Apply logic for new invoice if needed
    let invoiceId: string | undefined = undefined;

    if (data.type !== "TRANSFER" && data.paymentMethod === "CREDIT_CARD" && data.creditCardId) {
      const card = await prisma.creditCard.findUnique({
        where: { id: data.creditCardId },
      });
      if (card) {
        const transDate = new Date(data.date);
        let invMonth = transDate.getMonth() + 1;
        let invYear = transDate.getFullYear();

        if (transDate.getDate() >= card.closingDay) {
          invMonth += 1;
          if (invMonth > 12) {
            invMonth = 1;
            invYear += 1;
          }
        }

        const invoice = await prisma.invoice.upsert({
          where: {
            creditCardId_month_year: {
              creditCardId: data.creditCardId,
              month: invMonth,
              year: invYear,
            },
          },
          update: { totalAmount: { increment: data.amount } },
          create: {
            creditCardId: data.creditCardId,
            month: invMonth,
            year: invYear,
            totalAmount: data.amount,
          },
        });
        invoiceId = invoice.id;
      }
    }

    // 4. Update transaction
    await prisma.transaction.update({
      where: { id },
      data: {
        description: data.description,
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId,
        accountId: data.accountId,
        destinationAccountId: data.type === "TRANSFER" ? data.destinationAccountId : null,
        paymentMethod: data.type === "TRANSFER" ? "TRANSFER" : data.paymentMethod,
        creditCardId: data.type === "TRANSFER" ? null : data.creditCardId,
        date: data.date,
        condition,
        notes: data.notes,
        referenceMonth,
        invoiceId,
        isPaid,
      },
    });

    // 5. Apply new tracking to balances
    if (isPaid) {
      if (data.type === "TRANSFER" && data.destinationAccountId) {
        await prisma.account.update({
          where: { id: data.accountId },
          data: { balance: { decrement: data.amount } },
        });
        await prisma.account.update({
          where: { id: data.destinationAccountId },
          data: { balance: { increment: data.amount } },
        });
      } else if (data.paymentMethod !== "CREDIT_CARD") {
        const applyOp = data.type === "INCOME" ? "increment" : "decrement";
        await prisma.account.update({
          where: { id: data.accountId },
          data: { balance: { [applyOp]: data.amount } },
        });
      }
    }

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update transaction:", error);
    return { error: "Failed to update transaction" };
  }
}

export async function deleteTransaction(id: string) {
  try {
    const oldTx = await prisma.transaction.findUnique({ where: { id } });
    if (!oldTx) return { error: "Transaction not found" };

    // Revert impacts on accounts
    if (oldTx.isPaid) {
      if (oldTx.type === "TRANSFER" && oldTx.destinationAccountId) {
        await prisma.account.update({
          where: { id: oldTx.accountId },
          data: { balance: { increment: oldTx.amount } }, // Revert decrement
        });
        await prisma.account.update({
          where: { id: oldTx.destinationAccountId },
          data: { balance: { decrement: oldTx.amount } }, // Revert increment
        });
      } else if (oldTx.paymentMethod !== "CREDIT_CARD") {
        const revertOp = oldTx.type === "INCOME" ? "decrement" : "increment";
        await prisma.account.update({
          where: { id: oldTx.accountId },
          data: { balance: { [revertOp]: oldTx.amount } },
        });
      }
    }

    // Revert impacts on invoices
    if (oldTx.type !== "TRANSFER" && oldTx.paymentMethod === "CREDIT_CARD" && oldTx.invoiceId) {
      await prisma.invoice.update({
        where: { id: oldTx.invoiceId },
        data: { totalAmount: { decrement: oldTx.amount } },
      });
    }

    await prisma.transaction.delete({ where: { id } });

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return { error: "Failed to delete transaction" };
  }
}

export async function toggleTransactionIsPaid(id: string, isPaid: boolean) {
  const oldTx = await prisma.transaction.findUnique({ where: { id } });
  if (!oldTx) return { error: "Transaction not found" };

  if (oldTx.isPaid === isPaid) return { success: true };

  try {
    await prisma.$transaction(async (tx) => {
      // Se estava paga e agora NÃO está (devemos REVERTER o saldo)
      if (oldTx.isPaid && !isPaid) {
        if (oldTx.type === "TRANSFER" && oldTx.destinationAccountId) {
          await tx.account.update({
            where: { id: oldTx.accountId },
            data: { balance: { increment: oldTx.amount } }, // Revert decrement
          });
          await tx.account.update({
            where: { id: oldTx.destinationAccountId },
            data: { balance: { decrement: oldTx.amount } }, // Revert increment
          });
        } else if (oldTx.paymentMethod !== "CREDIT_CARD") {
          const revertOp = oldTx.type === "INCOME" ? "decrement" : "increment";
          await tx.account.update({
            where: { id: oldTx.accountId },
            data: { balance: { [revertOp]: oldTx.amount } },
          });
        }
      }
      // Se NÃO estava paga e agora ESTÁ (devemos APLICAR o saldo)
      else if (!oldTx.isPaid && isPaid) {
        if (oldTx.type === "TRANSFER" && oldTx.destinationAccountId) {
          await tx.account.update({
            where: { id: oldTx.accountId },
            data: { balance: { decrement: oldTx.amount } },
          });
          await tx.account.update({
            where: { id: oldTx.destinationAccountId },
            data: { balance: { increment: oldTx.amount } },
          });
        } else if (oldTx.paymentMethod !== "CREDIT_CARD") {
          const applyOp = oldTx.type === "INCOME" ? "increment" : "decrement";
          await tx.account.update({
            where: { id: oldTx.accountId },
            data: { balance: { [applyOp]: oldTx.amount } },
          });
        }
      }

      await tx.transaction.update({
        where: { id },
        data: { isPaid },
      });
    });

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle transaction isPaid:", error);
    return { error: "Failed to update transaction status" };
  }
}
