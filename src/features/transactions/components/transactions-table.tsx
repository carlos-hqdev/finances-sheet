"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  TransactionActions,
  TransactionIsPaidSwitch,
} from "@/features/transactions";
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
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  bulkTogglePaymentStatus,
  deleteTransactions,
} from "../actions/transaction-actions";

const PAYMENT_METHODS_MAP: Record<string, string> = {
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  TRANSFER: "Transferência",
  REDEMPTION: "Resgate",
  APPLICATION: "Aplicação",
  CASH: "Dinheiro",
  PIX: "Pix",
  BOLETO: "Boleto",
  OTHER: "Outros",
};

interface TransactionsTableProps {
  transactions: any[];
  accounts: any[];
  categories: any[];
  creditCards: any[];
  investments: any[];
}

export function TransactionsTable({
  transactions,
  accounts,
  categories,
  creditCards,
  investments,
}: TransactionsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const toggleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map((tx) => tx.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleDeleteBulk = () => {
    startTransition(async () => {
      const result = await deleteTransactions(selectedIds);
      if (result.success) {
        toast.success(`${result.count} transações excluídas com sucesso.`);
        setSelectedIds([]);
        setIsDeleteModalOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleTogglePaidBulk = (isPaid: boolean) => {
    startTransition(async () => {
      const result = await bulkTogglePaymentStatus(selectedIds, isPaid);
      if (result.success) {
        toast.success(`Status das transações atualizado.`);
        setSelectedIds([]);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="relative">
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12 px-4 text-center">
                <Checkbox
                  checked={
                    selectedIds.length === transactions.length &&
                    transactions.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Pago</TableHead>
              <TableHead className="text-center w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow
                key={tx.id}
                className={`${selectedIds.includes(tx.id) ? "bg-primary/5" : ""} transition-colors`}
              >
                <TableCell className="px-4 text-center">
                  <Checkbox
                    checked={selectedIds.includes(tx.id)}
                    onCheckedChange={() => toggleSelectRow(tx.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {format(tx.date, "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell
                  className="max-w-[200px] truncate"
                  title={tx.description}
                >
                  {tx.description}
                </TableCell>
                <TableCell>
                  {tx.category?.name ? (
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border">
                      {tx.category.name}
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {tx.account.name}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {tx.paymentMethod
                    ? PAYMENT_METHODS_MAP[tx.paymentMethod] ||
                      tx.paymentMethod.replace(/_/g, " ")
                    : "-"}
                </TableCell>
                <TableCell
                  className={`text-right font-bold ${tx.type === "EXPENSE" ? "text-red-500" : "text-emerald-500"}`}
                >
                  {tx.type === "EXPENSE" ? "-" : "+"}
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(Number(tx.amount))}
                </TableCell>
                <TableCell className="text-center">
                  <TransactionIsPaidSwitch
                    transactionId={tx.id}
                    isPaid={tx.isPaid}
                    type={tx.type}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <TransactionActions
                    transaction={tx}
                    accounts={accounts}
                    categories={categories}
                    creditCards={creditCards}
                    investments={investments}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0, x: "-50%" }}
            animate={{ y: -20, opacity: 1, x: "-50%" }}
            exit={{ y: 100, opacity: 0, x: "-50%" }}
            className="fixed bottom-4 left-1/2 z-50 flex items-center gap-4 px-6 py-3 bg-card border border-primary/20 
                       rounded-full shadow-2xl backdrop-blur-md dark:bg-zinc-900/90"
          >
            <div className="flex items-center gap-2 pr-4 border-r border-border">
              <span className="flex items-center justify-center w-6 h-6 text-[11px] font-bold text-primary-foreground bg-primary rounded-full">
                {selectedIds.length}
              </span>
              <span className="text-xs font-semibold text-foreground">
                Selecionadas
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-9 gap-2 text-xs font-medium hover:bg-emerald-500/10 hover:text-emerald-500"
                onClick={() => handleTogglePaidBulk(true)}
                disabled={isPending}
              >
                <CheckCircle2 className="h-4 w-4" />
                Marcar como Pago
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-9 gap-2 text-xs font-medium hover:bg-amber-500/10 hover:text-amber-500"
                onClick={() => handleTogglePaidBulk(false)}
                disabled={isPending}
              >
                <XCircle className="h-4 w-4" />
                Marcar Pendente
              </Button>

              <div className="w-[1px] h-6 bg-border mx-1" />

              <Button
                size="sm"
                variant="ghost"
                className="h-9 gap-2 text-xs font-medium hover:bg-red-500/10 hover:text-red-500"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
                Excluir Selecionadas
              </Button>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="ml-2 h-7 w-7 rounded-full hover:bg-muted"
              onClick={() => setSelectedIds([])}
            >
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente{" "}
              <strong>{selectedIds.length} transações</strong> e todos os
              impactos financeiros associados a elas. Esta operação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteBulk();
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
