"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/db";
import { auth } from "@/shared/lib/auth";
import { headers } from "next/headers";
import { getFinanceReferenceMonth } from "@/shared/lib/finance-utils";

export async function createTransaction(data: {
  description: string;
  amount: number;
  type: string;
  categoryId?: string;
  accountId: string;
  destinationAccountId?: string;
  investmentId?: string;
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

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Não autorizado");
  }

  const userId = session.user.id;
  const referenceMonth = getFinanceReferenceMonth(data.date, 25);
  const isPaid = data.isPaid ?? false;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Validar que a conta pertence ao usuário
      const account = await tx.bankAccount.findUnique({
        where: { id: data.accountId, userId },
      });
      if (!account) throw new Error("Conta não encontrada ou não pertence ao usuário");

      let invoiceId: string | undefined;

      // Process Credit Card Invoice logic
      if (
        data.type !== "TRANSFER" &&
        data.paymentMethod === "CREDIT_CARD" &&
        data.creditCardId
      ) {
        const card = await tx.creditCard.findUnique({
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

          const invoice = await tx.invoice.upsert({
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

      const createdTx = await tx.transaction.create({
        data: {
          description: data.description,
          amount: data.amount,
          type: data.type,
          categoryId: data.categoryId,
          accountId: data.accountId,
          destinationAccountId:
            data.type === "TRANSFER" && data.paymentMethod === "TRANSFER"
              ? data.destinationAccountId
              : null,
          investmentId:
            data.type === "TRANSFER" &&
            (data.paymentMethod === "APPLICATION" ||
              data.paymentMethod === "REDEMPTION")
              ? data.investmentId
              : null,
          paymentMethod:
            data.type === "TRANSFER" ? data.paymentMethod : data.paymentMethod,
          creditCardId: data.type === "TRANSFER" ? null : data.creditCardId,
          date: data.date,
          condition,
          notes: data.notes,
          referenceMonth,
          invoiceId,
          isPaid,
        },
      });

      if (isPaid) {
        if (data.type === "TRANSFER") {
          if (data.paymentMethod === "APPLICATION") {
            await tx.bankAccount.update({
              where: { id: data.accountId },
              data: { balance: { decrement: data.amount } },
            });

            await tx.investment.update({
              where: { id: data.investmentId! },
              data: { balance: { increment: data.amount } },
            });

            await tx.investmentLot.create({
              data: {
                investmentId: data.investmentId!,
                transactionId: createdTx.id,
                date: data.date,
                originalPrice: data.amount,
                currentBalance: data.amount,
                isFullyWithdrawn: false,
              },
            });
          } else if (data.paymentMethod === "REDEMPTION") {
            await tx.bankAccount.update({
              where: { id: data.accountId }, // Destino do resgate
              data: { balance: { increment: data.amount } },
            });

            // PEPS/FIFO REDEMPTION
            let amountToRedeem = new Prisma.Decimal(data.amount);
            const activeLots = await tx.investmentLot.findMany({
              where: {
                investmentId: data.investmentId!,
                isFullyWithdrawn: false,
              },
              orderBy: { date: "asc" },
            });

            for (const lot of activeLots) {
              if (amountToRedeem.lte(0)) break;

              if (lot.currentBalance.gte(amountToRedeem)) {
                const newLotBalance = lot.currentBalance.minus(amountToRedeem);
                await tx.investmentLot.update({
                  where: { id: lot.id },
                  data: {
                    currentBalance: newLotBalance,
                    isFullyWithdrawn: newLotBalance.equals(0),
                  },
                });
                amountToRedeem = new Prisma.Decimal(0);
                break;
              } else {
                amountToRedeem = amountToRedeem.minus(lot.currentBalance);
                await tx.investmentLot.update({
                  where: { id: lot.id },
                  data: { currentBalance: 0, isFullyWithdrawn: true },
                });
              }
            }

            if (amountToRedeem.gt(0)) {
              throw new Error("Saldo em lotes insuficiente para o resgate!");
            }

            const remainingLots = await tx.investmentLot.findMany({
              where: {
                investmentId: data.investmentId!,
                isFullyWithdrawn: false,
              },
            });
            const newGlobalBalance = remainingLots.reduce(
              (acc: Prisma.Decimal, l: any) => acc.add(l.currentBalance),
              new Prisma.Decimal(0),
            );

            await tx.investment.update({
              where: { id: data.investmentId! },
              data: { balance: newGlobalBalance },
            });
          } else {
            // NORMAL TRANSFER
            await tx.bankAccount.update({
              where: { id: data.accountId },
              data: { balance: { decrement: data.amount } },
            });
            if (data.destinationAccountId) {
              await tx.bankAccount.update({
                where: { id: data.destinationAccountId },
                data: { balance: { increment: data.amount } },
              });
            }
          }
        } else if (data.paymentMethod !== "CREDIT_CARD") {
          if (data.type === "INCOME") {
            await tx.bankAccount.update({
              where: { id: data.accountId },
              data: { balance: { increment: data.amount } },
            });
          } else if (data.type === "EXPENSE") {
            await tx.bankAccount.update({
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

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      console.error("Failed to create transaction:", error.message);
      return { error: error.message };
    }
    console.error("Failed to create transaction:", error);
    return { error: "Failed to create transaction" };
  }
}

async function revertTransactionImpacts(
  tx: Prisma.TransactionClient,
  oldTx: any,
) {
  if (!oldTx.isPaid) return;

  if (oldTx.type === "TRANSFER") {
    if (oldTx.paymentMethod === "APPLICATION") {
      // Protect against deleting partially/fully redeemed applications
      const lot = await tx.investmentLot.findFirst({
        where: { transactionId: oldTx.id },
      });
      if (
        lot &&
        (lot.isFullyWithdrawn || lot.currentBalance.lt(lot.originalPrice))
      ) {
        throw new Error(
          "Não é possível alterar/estornar esta aplicação pois parte do seu saldo já foi resgatado.",
        );
      }

      await tx.bankAccount.update({
        where: { id: oldTx.accountId },
        data: { balance: { increment: oldTx.amount } },
      });

      await tx.investmentLot.deleteMany({ where: { transactionId: oldTx.id } });

      const remainingLots = await tx.investmentLot.findMany({
        where: { investmentId: oldTx.investmentId!, isFullyWithdrawn: false },
      });
      const newGlobalBalance = remainingLots.reduce(
        (acc: Prisma.Decimal, l: any) => acc.add(l.currentBalance),
        new Prisma.Decimal(0),
      );
      await tx.investment.update({
        where: { id: oldTx.investmentId! },
        data: { balance: newGlobalBalance },
      });
    } else if (oldTx.paymentMethod === "REDEMPTION") {
      await tx.bankAccount.update({
        where: { id: oldTx.accountId },
        data: { balance: { decrement: oldTx.amount } },
      });

      let amountToRestore = new Prisma.Decimal(oldTx.amount);
      const lotsToRestore = await tx.investmentLot.findMany({
        where: { investmentId: oldTx.investmentId! },
        orderBy: { date: "desc" },
      });

      for (const lot of lotsToRestore) {
        if (amountToRestore.lte(0)) break;
        const spaceInLot = lot.originalPrice.minus(lot.currentBalance);
        if (spaceInLot.gt(0)) {
          if (spaceInLot.gte(amountToRestore)) {
            await tx.investmentLot.update({
              where: { id: lot.id },
              data: {
                currentBalance: lot.currentBalance.add(amountToRestore),
                isFullyWithdrawn: false,
              },
            });
            amountToRestore = new Prisma.Decimal(0);
          } else {
            await tx.investmentLot.update({
              where: { id: lot.id },
              data: {
                currentBalance: lot.originalPrice,
                isFullyWithdrawn: false,
              },
            });
            amountToRestore = amountToRestore.minus(spaceInLot);
          }
        }
      }

      const remainingLots = await tx.investmentLot.findMany({
        where: { investmentId: oldTx.investmentId!, isFullyWithdrawn: false },
      });
      const newGlobalBalance = remainingLots.reduce(
        (acc: Prisma.Decimal, l: any) => acc.add(l.currentBalance),
        new Prisma.Decimal(0),
      );
      await tx.investment.update({
        where: { id: oldTx.investmentId! },
        data: { balance: newGlobalBalance },
      });
    } else {
      await tx.bankAccount.update({
        where: { id: oldTx.accountId },
        data: { balance: { increment: oldTx.amount } },
      });
      if (oldTx.destinationAccountId) {
        await tx.bankAccount.update({
          where: { id: oldTx.destinationAccountId },
          data: { balance: { decrement: oldTx.amount } },
        });
      }
    }
  } else if (oldTx.paymentMethod !== "CREDIT_CARD") {
    const revertOp = oldTx.type === "INCOME" ? "decrement" : "increment";
    await tx.bankAccount.update({
      where: { id: oldTx.accountId },
      data: { balance: { [revertOp]: oldTx.amount } },
    });
  }

  if (
    oldTx.type !== "TRANSFER" &&
    oldTx.paymentMethod === "CREDIT_CARD" &&
    oldTx.invoiceId
  ) {
    await tx.invoice.update({
      where: { id: oldTx.invoiceId },
      data: { totalAmount: { decrement: oldTx.amount } },
    });
  }
}

async function applyTransactionImpacts(
  tx: Prisma.TransactionClient,
  newTx: any,
) {
  if (!newTx.isPaid) return;

  if (newTx.type === "TRANSFER") {
    if (newTx.paymentMethod === "APPLICATION") {
      await tx.bankAccount.update({
        where: { id: newTx.accountId },
        data: { balance: { decrement: newTx.amount } },
      });
      await tx.investment.update({
        where: { id: newTx.investmentId! },
        data: { balance: { increment: newTx.amount } },
      });
      await tx.investmentLot.create({
        data: {
          investmentId: newTx.investmentId!,
          transactionId: newTx.id,
          date: newTx.date,
          originalPrice: newTx.amount,
          currentBalance: newTx.amount,
        },
      });
    } else if (newTx.paymentMethod === "REDEMPTION") {
      await tx.bankAccount.update({
        where: { id: newTx.accountId },
        data: { balance: { increment: newTx.amount } },
      });

      let amountToRedeem = new Prisma.Decimal(newTx.amount);
      const activeLots = await tx.investmentLot.findMany({
        where: { investmentId: newTx.investmentId!, isFullyWithdrawn: false },
        orderBy: { date: "asc" },
      });

      for (const lot of activeLots) {
        if (amountToRedeem.lte(0)) break;

        if (lot.currentBalance.gte(amountToRedeem)) {
          const newLotBalance = lot.currentBalance.minus(amountToRedeem);
          await tx.investmentLot.update({
            where: { id: lot.id },
            data: {
              currentBalance: newLotBalance,
              isFullyWithdrawn: newLotBalance.equals(0),
            },
          });
          amountToRedeem = new Prisma.Decimal(0);
          break;
        } else {
          amountToRedeem = amountToRedeem.minus(lot.currentBalance);
          await tx.investmentLot.update({
            where: { id: lot.id },
            data: { currentBalance: 0, isFullyWithdrawn: true },
          });
        }
      }

      if (amountToRedeem.gt(0)) {
        throw new Error("Saldo em lotes insuficiente para o resgate!");
      }

      const remainingLots = await tx.investmentLot.findMany({
        where: { investmentId: newTx.investmentId!, isFullyWithdrawn: false },
      });
      const newGlobalBalance = remainingLots.reduce(
        (acc: Prisma.Decimal, l: any) => acc.add(l.currentBalance),
        new Prisma.Decimal(0),
      );
      await tx.investment.update({
        where: { id: newTx.investmentId! },
        data: { balance: newGlobalBalance },
      });
    } else {
      await tx.bankAccount.update({
        where: { id: newTx.accountId },
        data: { balance: { decrement: newTx.amount } },
      });
      if (newTx.destinationAccountId) {
        await tx.bankAccount.update({
          where: { id: newTx.destinationAccountId },
          data: { balance: { increment: newTx.amount } },
        });
      }
    }
  } else if (newTx.paymentMethod !== "CREDIT_CARD") {
    const applyOp = newTx.type === "INCOME" ? "increment" : "decrement";
    await tx.bankAccount.update({
      where: { id: newTx.accountId },
      data: { balance: { [applyOp]: newTx.amount } },
    });
  }
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
    investmentId?: string;
    paymentMethod?: string;
    creditCardId?: string;
    date: Date;
    condition?: "A_VISTA" | "PARCELADO";
    notes?: string;
    isPaid?: boolean;
    referenceMonth?: string;
  },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    const userId = session.user.id;

    const oldTx = await prisma.transaction.findFirst({
      where: {
        id,
        account: { userId },
      },
      include: { account: true },
    });

    if (!oldTx) return { error: "Transação não encontrada" };

    await prisma.$transaction(async (tx) => {
      // Validar nova conta se mudou
      if (data.accountId !== oldTx.accountId) {
        const newAccount = await tx.bankAccount.findUnique({
          where: { id: data.accountId, userId },
        });
        if (!newAccount) throw new Error("Nova conta não encontrada");
      }

      // 1. Revert Old Transaction completely
      await revertTransactionImpacts(tx, oldTx);

      // 2. Process Invoice Logic
      const condition = (
        data.condition === "PARCELADO" ? "PARCELADO" : "A_VISTA"
      ) as "A_VISTA" | "PARCELADO";
      const referenceMonth =
        data.referenceMonth || getFinanceReferenceMonth(data.date, 25);
      const isPaid = data.isPaid ?? false;

      let invoiceId: string | undefined;

      if (
        data.type !== "TRANSFER" &&
        data.paymentMethod === "CREDIT_CARD" &&
        data.creditCardId
      ) {
        const card = await tx.creditCard.findUnique({
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

          const invoice = await tx.invoice.upsert({
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

      // 3. Update Transaction Object
      const newTxData = {
        description: data.description,
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId,
        accountId: data.accountId,
        destinationAccountId:
          data.type === "TRANSFER" && data.paymentMethod === "TRANSFER"
            ? data.destinationAccountId
            : null,
        investmentId:
          data.type === "TRANSFER" &&
          (data.paymentMethod === "APPLICATION" ||
            data.paymentMethod === "REDEMPTION")
            ? data.investmentId
            : null,
        paymentMethod:
          data.type === "TRANSFER" ? data.paymentMethod : data.paymentMethod,
        creditCardId: data.type === "TRANSFER" ? null : data.creditCardId,
        date: data.date,
        condition,
        notes: data.notes,
        referenceMonth,
        invoiceId,
        isPaid,
      };

      const updatedTx = await tx.transaction.update({
        where: { id },
        data: newTxData,
      });

      // 4. Apply New Transaction Impacts
      await applyTransactionImpacts(tx, updatedTx);
    });

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      console.error("Failed to update transaction:", error.message);
      return { error: error.message };
    }
    console.error("Failed to update transaction:", error);
    return { error: "Failed to update transaction" };
  }
}

export async function deleteTransaction(id: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    const userId = session.user.id;

    await prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findFirst({
        where: {
          id,
          account: { userId },
        },
      });

      if (!oldTx) throw new Error("Transação não encontrada");

      await revertTransactionImpacts(tx, oldTx);
      await tx.transaction.delete({ where: { id } });
    });

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      console.error("Failed to delete transaction:", error.message);
      return { error: error.message };
    }
    console.error("Failed to delete transaction:", error);
    return { error: "Failed to delete transaction" };
  }
}

export async function toggleTransactionIsPaid(id: string, isPaid: boolean) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    const userId = session.user.id;

    await prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findFirst({
        where: {
          id,
          account: { userId },
        },
      });

      if (!oldTx) throw new Error("Transação não encontrada");

      if (oldTx.isPaid === isPaid) return; // no-op

      if (oldTx.isPaid && !isPaid) {
        await revertTransactionImpacts(tx, oldTx);
      } else if (!oldTx.isPaid && isPaid) {
        // Temporarily mock it as paid so our apply logic works properly given the old properties
        const virtualPaidTx = { ...oldTx, isPaid: true };
        await applyTransactionImpacts(tx, virtualPaidTx);
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
    if (error instanceof Error) {
      console.error("Failed to toggle transaction isPaid:", error.message);
      return { error: error.message };
    }
    console.error("Failed to toggle transaction isPaid:", error);
    return { error: "Failed to update transaction status" };
  }
}
