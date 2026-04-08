"use client";

import { Settings2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { InvestmentDialog } from "./investment-dialog";

interface InvestmentDetailActionsProps {
  investment: {
    id: string;
    name: string;
    type: string;
    institution: string | null;
    balance: number;
    targetAmount: number | null;
    yieldRate: number | null;
    amount: number | null;
    isDailyYield: boolean;
    indexer: string | null;
  };
}

export function InvestmentDetailActions({
  investment,
}: InvestmentDetailActionsProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
    // Placeholder for actual delete logic
    console.log("Deleting investment:", investment.id);
    // Simulate async operation
    setTimeout(() => {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      toast.success("Investimento excluído com sucesso (simulado).");
      // In a real app, you'd likely navigate away or refresh data
    }, 1500);
  };

  return (
    <div className="flex gap-2">
      <InvestmentDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialData={{
          ...investment,
          type: investment.type as "SAVINGS" | "FIXED" | "VARIABLE" | "CRYPTO",
          institution: investment.institution ?? undefined,
          targetAmount: investment.targetAmount ?? undefined,
          yieldRate: investment.yieldRate ?? undefined,
          isDailyYield: investment.isDailyYield ?? undefined,
          indexer: investment.indexer ?? undefined,
        }}
        trigger={
          <Button variant="outline" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Editar
          </Button>
        }
      />

      <Button
        variant="destructive"
        className="gap-2"
        onClick={() => setIsDeleteOpen(true)}
        disabled={isDeleting}
      >
        <Trash2 className="w-4 h-4" />
        {isDeleting ? "Excluindo..." : "Excluir"}
      </Button>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem absoluta certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente o investimento{" "}
              <strong>{investment.name}</strong>. Esta operação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Sim, excluir tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
