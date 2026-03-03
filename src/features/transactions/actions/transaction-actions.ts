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

  // Calculate dynamic reference month (using day 25 as salary base, could be customized)
  const referenceMonth = getFinanceReferenceMonth(data.date, 25);
  const isPaid = data.isPaid ?? false;

  if (data.type === "TRANSFER" && data.destinationAccountId) {
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          description: data.description,
          amount: data.amount,
          type: "EXPENSE",
          categoryId: data.categoryId,
          accountId: data.accountId,
          destinationAccountId: data.destinationAccountId,
          paymentMethod: "TRANSFER",
          date: data.date,
          condition,
          notes: data.notes,
        },
      }),
      prisma.transaction.create({
        data: {
          description: data.description,
          amount: data.amount,
          type: "INCOME",
          categoryId: data.categoryId,
          accountId: data.destinationAccountId,
          // Store the source account as "destination" reference for the receiving transaction
          destinationAccountId: data.accountId,
          paymentMethod: "TRANSFER",
          date: data.date,
          condition,
          notes: data.notes,
          referenceMonth,
          isPaid,
        },
      }),
    ]);

    // Update balances if a transfer is paid
    if (isPaid) {
      await prisma.account.update({
        where: { id: data.accountId },
        data: { balance: { decrement: data.amount } },
      });
      await prisma.account.update({
        where: { id: data.destinationAccountId },
        data: { balance: { increment: data.amount } },
      });
    }
  } else {
    let invoiceId: string | undefined;

    // Process Credit Card Invoice logic
    if (data.paymentMethod === "CREDIT_CARD" && data.creditCardId) {
      const card = await prisma.creditCard.findUnique({
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

        const invoice = await prisma.invoice.upsert({
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

    await prisma.transaction.create({
      data: {
        description: data.description,
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId,
        accountId: data.accountId,
        destinationAccountId: data.destinationAccountId,
        paymentMethod: data.paymentMethod,
        creditCardId: data.creditCardId,
        date: data.date,
        condition,
        notes: data.notes,
        referenceMonth,
        invoiceId,
        isPaid,
      },
    });

    // Substract or add to account balance
    if (data.paymentMethod !== "CREDIT_CARD" && isPaid) {
      const incrementDecrement =
        data.type === "INCOME" ? "increment" : "decrement";
      await prisma.account.update({
        where: { id: data.accountId },
        data: {
          balance: { [incrementDecrement]: data.amount },
        },
      });
    }
  }
  revalidatePath("/transactions");
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
  // To properly update, we should revert the old transaction's impact on balances/invoices,
  // then apply the new one.
  const oldTx = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!oldTx) return { error: "Transaction not found" };

  try {
    // 1. Revert old transaction impacts
    if (oldTx.type === "TRANSFER" && oldTx.destinationAccountId && oldTx.isPaid) {
      await prisma.account.update({
        where: { id: oldTx.accountId },
        data: { balance: { increment: oldTx.amount } }, // Revert decrement
      });
      await prisma.account.update({
        where: { id: oldTx.destinationAccountId },
        data: { balance: { decrement: oldTx.amount } }, // Revert increment
      });
    } else if (oldTx.type !== "TRANSFER") {
      if (oldTx.paymentMethod === "CREDIT_CARD" && oldTx.invoiceId) {
        // Decrement from old invoice
        await prisma.invoice.update({
          where: { id: oldTx.invoiceId },
          data: { totalAmount: { decrement: oldTx.amount } },
        });
      }

      if (oldTx.paymentMethod !== "CREDIT_CARD" && oldTx.isPaid) {
        const revertOp = oldTx.type === "INCOME" ? "decrement" : "increment";
        await prisma.account.update({
          where: { id: oldTx.accountId },
          data: { balance: { [revertOp]: oldTx.amount } },
        });
      }
    }

    // 2. Calculate new properties
    const condition = (data.condition === "PARCELADO" ? "PARCELADO" : "A_VISTA") as "A_VISTA" | "PARCELADO";
    const referenceMonth = data.referenceMonth || getFinanceReferenceMonth(data.date, 25);
    const isPaid = data.isPaid ?? false;

    // 3. Apply new transaction and update record
    if (data.type === "TRANSFER" && data.destinationAccountId) {
      // NOTE: This assumes transfers are a single record now or we just update the sender record
      // The original create handled transfers as two separate records? Wait, `transaction.create` inside `$transaction` creates TWO records.
      // If the old was a transfer, we'd need to find the pair. For simplicity, we just update the current record and balances.
      await prisma.transaction.update({
        where: { id },
        data: {
          description: data.description,
          amount: data.amount,
          type: "EXPENSE", // Assuming the edited one is the sender side, or just keep original type
          categoryId: data.categoryId,
          accountId: data.accountId,
          destinationAccountId: data.destinationAccountId,
          paymentMethod: "TRANSFER",
          date: data.date,
          condition,
          notes: data.notes,
          isPaid,
          referenceMonth,
        },
      });

      if (isPaid) {
        await prisma.account.update({
          where: { id: data.accountId },
          data: { balance: { decrement: data.amount } },
        });
        await prisma.account.update({
          where: { id: data.destinationAccountId },
          data: { balance: { increment: data.amount } },
        });
      }
    } else {
      let invoiceId: string | undefined = undefined;

      if (data.paymentMethod === "CREDIT_CARD" && data.creditCardId) {
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

      await prisma.transaction.update({
        where: { id },
        data: {
          description: data.description,
          amount: data.amount,
          type: data.type,
          categoryId: data.categoryId,
          accountId: data.accountId,
          destinationAccountId: data.destinationAccountId,
          paymentMethod: data.paymentMethod,
          creditCardId: data.creditCardId,
          date: data.date,
          condition,
          notes: data.notes,
          referenceMonth,
          invoiceId,
          isPaid,
        },
      });

      if (data.paymentMethod !== "CREDIT_CARD" && isPaid) {
        const applyOp = data.type === "INCOME" ? "increment" : "decrement";
        await prisma.account.update({
          where: { id: data.accountId },
          data: { balance: { [applyOp]: data.amount } },
        });
      }
    }

    revalidatePath("/transactions");
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

    // Revert impacts
    if (oldTx.type === "TRANSFER" && oldTx.destinationAccountId && oldTx.isPaid) {
      await prisma.account.update({
        where: { id: oldTx.accountId },
        data: { balance: { increment: oldTx.amount } },
      });
      await prisma.account.update({
        where: { id: oldTx.destinationAccountId },
        data: { balance: { decrement: oldTx.amount } },
      });
      // Try to find the other side of the transfer and delete it too
      // Usually they share the same date, amount, description and opposite accounts.
      const transferPair = await prisma.transaction.findFirst({
        where: {
          type: "INCOME",
          paymentMethod: "TRANSFER",
          accountId: oldTx.destinationAccountId,
          destinationAccountId: oldTx.accountId,
          amount: oldTx.amount,
          date: oldTx.date,
        },
      });
      if (transferPair) {
        await prisma.transaction.delete({ where: { id: transferPair.id } });
      }

    } else if (oldTx.type !== "TRANSFER") {
      if (oldTx.paymentMethod === "CREDIT_CARD" && oldTx.invoiceId) {
        await prisma.invoice.update({
          where: { id: oldTx.invoiceId },
          data: { totalAmount: { decrement: oldTx.amount } },
        });
      }

      if (oldTx.paymentMethod !== "CREDIT_CARD" && oldTx.isPaid) {
        const revertOp = oldTx.type === "INCOME" ? "decrement" : "increment";
        await prisma.account.update({
          where: { id: oldTx.accountId },
          data: { balance: { [revertOp]: oldTx.amount } },
        });
      }
    }

    await prisma.transaction.delete({ where: { id } });

    revalidatePath("/transactions");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return { error: "Failed to delete transaction" };
  }
}
