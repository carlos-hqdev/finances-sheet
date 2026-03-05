"use client";

import { formatCurrency } from "@/shared/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Button } from "@/shared/components/ui/button";
import { MoreHorizontal, Trash2, Pencil } from "lucide-react";

interface InvestmentLot {
  id: string;
  date: Date;
  originalPrice: number;
  currentBalance: number;
  isFullyWithdrawn: boolean;
}

interface InvestmentLotTableProps {
  lots: InvestmentLot[];
  investmentId: string;
}

export function InvestmentLotTable({ lots, investmentId }: InvestmentLotTableProps) {
  if (lots.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground border rounded-lg bg-card">
        Nenhum aporte/lote registrado para esta caixinha.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data do Aporte</TableHead>
            <TableHead className="text-right">Aporte Original</TableHead>
            <TableHead className="text-right">Saldo Atual (Lote)</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lots.map((lot) => (
            <TableRow key={lot.id}>
              <TableCell className="font-medium whitespace-nowrap">
                {format(new Date(lot.date), "dd 'de' MMM, yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrency(lot.originalPrice)}
              </TableCell>
              <TableCell className="text-right font-bold text-primary">
                {formatCurrency(lot.currentBalance)}
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={lot.isFullyWithdrawn ? "secondary" : "default"}
                  className={lot.isFullyWithdrawn ? "opacity-50" : ""}
                >
                  {lot.isFullyWithdrawn ? "Resgatado" : "Ativo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar Lote
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover Lote
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
