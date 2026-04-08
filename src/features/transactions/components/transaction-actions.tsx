"use client";

import { Copy, Edit2, MoreHorizontal, Trash } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteTransaction } from "@/features/transactions/actions/transaction-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { TransactionDialog } from "./transaction-dialog";

interface TransactionActionsProps {
  transaction: any; // We can type this better, but using any for simplicity right now
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  creditCards: { id: string; name: string; accountId: string }[];
  investments: { id: string; name: string }[];
}

export function TransactionActions({
  transaction,
  accounts,
  categories,
  creditCards,
  investments,
}: TransactionActionsProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onCopyId() {
    navigator.clipboard.writeText(transaction.id);
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteTransaction(transaction.id);
      if (result?.success) {
        setIsDeleteOpen(false);
        toast.success("Transação excluída com sucesso.");
      } else if (result?.error) {
        console.error(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          {process.env.NODE_ENV === "development" && (
            <>
              <DropdownMenuItem onClick={onCopyId}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <TransactionDialog
            accounts={accounts}
            categories={categories}
            creditCards={creditCards}
            investments={investments}
            initialData={{
              ...transaction,
              amount: Number(transaction.amount),
              date: new Date(transaction.date),
              categoryId: transaction.categoryId || undefined,
              destinationAccountId:
                transaction.destinationAccountId || undefined,
              investmentId: transaction.investmentId || undefined,
              creditCardId: transaction.creditCardId || undefined,
            }}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Edit2 className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            }
          />

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-700 focus:bg-red-100"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a
              transação <strong>{transaction.description}</strong> e reverterá
              seu Impacto no saldo das contas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                onDelete();
              }}
              disabled={isPending}
            >
              {isPending ? "Excluindo..." : "Sim, Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
