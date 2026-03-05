"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { InvestmentDialog } from "./investment-dialog";
import { Settings2, Trash2 } from "lucide-react";

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

export function InvestmentDetailActions({ investment }: InvestmentDetailActionsProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // Assuming handleDelete and isDeleting are defined elsewhere or will be added
  const [isDeleting, setIsDeleting] = useState(false);
  const handleDelete = () => {
    setIsDeleting(true);
    // Placeholder for actual delete logic
    console.log("Deleting investment:", investment.id);
    // Simulate async operation
    setTimeout(() => {
      setIsDeleting(false);
      alert("Investment deleted (simulated)");
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
          type: investment.type as "FIXED" | "VARIABLE" | "CRYPTO",
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
        onClick={handleDelete}
        disabled={isDeleting}
      >
        <Trash2 className="w-4 h-4" />
        {isDeleting ? "Excluindo..." : "Excluir"}
      </Button>
    </div>
  );
}
