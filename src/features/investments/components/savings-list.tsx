"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Landmark, PiggyBank, MoreVertical, Pencil, Trash2, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Button } from "@/shared/components/ui/button";
import { InvestmentDialog } from "./investment-dialog";

// Types based on the Prisma schema
interface Investment {
  id: string;
  name: string;
  type: string;
  amount: number | null; // using numbers for Decimal in frontend
  balance: number;
  targetAmount: number | null;
  institution: string | null;
  indexer: string | null;
  yieldRate?: number | null;
  isDailyYield?: boolean;
}

interface SavingsListProps {
  investments: Investment[];
}

export function SavingsList({ investments }: SavingsListProps) {
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const groupedSavings = useMemo(() => {
    return investments.reduce((acc, investment) => {
      const institution = investment.institution || "Outros";
      if (!acc[institution]) {
        acc[institution] = [];
      }
      acc[institution].push(investment);
      return acc;
    }, {} as Record<string, Investment[]>);
  }, [investments]);

  if (Object.keys(groupedSavings).length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6 text-muted-foreground">
          <PiggyBank className="h-12 w-12 mb-4 opacity-50" />
          <p>Você ainda não possui investimentos deste tipo.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {Object.entries(groupedSavings).map(([institution, savings]) => (
          <div key={institution} className="space-y-4">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold tracking-tight">{institution}</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savings.map((saving) => {
                let progressPercentage = 0;
                if (saving.targetAmount && saving.targetAmount > 0) {
                  progressPercentage = Math.min(100, Math.max(0, (saving.balance / saving.targetAmount) * 100));
                }

                return (
                  <Card key={saving.id} className="relative overflow-hidden transition-all hover:shadow-md flex flex-col group">
                    <div className="absolute top-3 right-3 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingInvestment(saving);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Stub for delete functionality (to be handled later or via another dialog)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Link href={`/investments/${saving.id}`} className="flex-1 flex flex-col">
                      <CardHeader className="p-4 pb-2 pr-12">
                        <CardTitle className="text-base flex justify-between items-center pr-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="truncate">{saving.name}</span>
                            {(saving.type === "FIXED" || saving.type === "SAVINGS") && saving.indexer && saving.indexer !== "OTHER" && (
                              <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm shrink-0">
                                {saving.indexer === "PREFIXED" ? "PRÉ" : saving.indexer}
                              </span>
                            )}
                          </div>
                          <PiggyBank className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-between">
                        <div className="flex flex-col gap-3">
                          <div>
                            <p className="text-2xl font-bold text-primary">
                              {formatCurrency(saving.balance)}
                            </p>
                          </div>

                          {saving.targetAmount && saving.targetAmount > 0 && (
                            <div className="space-y-1.5 mt-2">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Progresso</span>
                                <span>{Math.round(progressPercentage)}%</span>
                              </div>
                              <Progress value={progressPercentage} className="h-2" />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{formatCurrency(saving.balance)}</span>
                                <span>Meta: {formatCurrency(saving.targetAmount)}</span>
                              </div>
                            </div>
                          )}

                          <div className="mt-4 flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 cursor-pointer">
                            Ver detalhes <ArrowRight className="ml-1 h-3 w-3" />
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <InvestmentDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setTimeout(() => setEditingInvestment(null), 300);
          }
        }}
        initialData={
          editingInvestment
            ? {
              ...editingInvestment,
              type: editingInvestment.type as "SAVINGS" | "FIXED" | "VARIABLE" | "FIIS" | "CRYPTO" | "OTHER",
              institution: editingInvestment.institution ?? undefined,
              targetAmount: editingInvestment.targetAmount ?? undefined,
              indexer: editingInvestment.indexer ?? undefined,
              yieldRate: editingInvestment.yieldRate ?? undefined,
              isDailyYield: editingInvestment.isDailyYield ?? undefined,
            }
            : undefined
        }
      />
    </>
  );
}
