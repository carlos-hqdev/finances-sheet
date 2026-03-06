"use client";

import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { useTransition } from "react";
import { deleteInvestment } from "@/features/investments/actions/investment-actions";
import { InvestmentDialog } from "@/features/investments/components/investment-dialog";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import { Prisma } from "@prisma/client";

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
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (confirm("Tem certeza que deseja excluir este investimento?")) {
      startTransition(async () => {
        await deleteInvestment(investment.id);
      });
    }
  }

  // Converter tipos do prisma para compatibilidade com o form
  const formattedInvestment = {
    ...investment,
    type: investment.type as "SAVINGS" | "FIXED" | "VARIABLE" | "CRYPTO",
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
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash className="mr-2 h-4 w-4" />{" "}
            {isPending ? "Excluindo..." : "Excluir"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
