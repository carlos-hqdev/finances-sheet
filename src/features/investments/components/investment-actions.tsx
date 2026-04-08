"use client";

import type { Prisma } from "@prisma/client";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteInvestment } from "@/features/investments/actions/investment-actions";
import { InvestmentDialog } from "@/features/investments/components/investment-dialog";
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
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

interface InvestmentActionsProps {
  investment: {
    id: string;
    name: string;
    type: string; // The db type is string, but we cast it
    institution: string | null;
    balance: Prisma.Decimal | any;
  };
}

export function InvestmentActions({ investment }: InvestmentActionsProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteInvestment(investment.id);
      if (result?.success) {
        setIsDeleteOpen(false);
        toast.success("Investimento excluído com sucesso.");
      } else if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  // Converter tipos do prisma para compatibilidade com o form
  const formattedInvestment = {
    ...investment,
    type: investment.type as
      | "SAVINGS"
      | "FIXED"
      | "VARIABLE"
      | "FIIS"
      | "CRYPTO"
      | "OTHER",
    balance: Number(investment.balance),
    institution: investment.institution || undefined,
  };

  return (
    <div className="absolute top-2 right-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <InvestmentDialog
            initialData={formattedInvestment}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="mr-2 h-4 w-4" /> Modificar
              </DropdownMenuItem>
            }
          />
          <DropdownMenuItem
            className="text-red-500 focus:text-red-500"
            onClick={() => setIsDeleteOpen(true)}
            disabled={isPending}
          >
            <Trash className="mr-2 h-4 w-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente o investimento{" "}
              <strong>{investment.name}</strong> e todos os seus lotes e
              históricos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isPending}
            >
              {isPending ? "Excluindo..." : "Sim, excluir tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
