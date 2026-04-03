"use client";

import { useTransition } from "react";
import { toggleTransactionIsPaid } from "@/features/transactions/actions/transaction-actions";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/lib/utils";

interface TransactionIsPaidSwitchProps {
  transactionId: string;
  isPaid: boolean;
  type: string;
}

export function TransactionIsPaidSwitch({
  transactionId,
  isPaid,
  type,
}: TransactionIsPaidSwitchProps) {
  const [isPending, startTransition] = useTransition();

  function onToggle(checked: boolean) {
    startTransition(async () => {
      await toggleTransactionIsPaid(transactionId, checked);
    });
  }

  return (
    <div className="flex items-center justify-center">
      <Switch
        checked={isPaid}
        onCheckedChange={onToggle}
        disabled={isPending}
        className={cn(
          isPaid &&
            (type === "EXPENSE"
              ? "!bg-red-500"
              : type === "INCOME"
                ? "!bg-emerald-500"
                : "!bg-blue-500"),
          isPending && "opacity-50 cursor-not-allowed",
        )}
      />
    </div>
  );
}
