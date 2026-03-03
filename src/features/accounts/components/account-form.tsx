"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { CurrencyInput } from "@/shared/components/ui/currency-input";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/lib/utils";
// Alterado de Sheet para Dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { createAccount, updateAccount } from "@/features/accounts/actions/account-actions";
import {
  type AccountFormValues,
  accountSchema,
} from "../schemas/account-schema";

interface AccountDialogProps {
  initialData?: AccountFormValues & { id: string; userId: string; createdAt: Date; updatedAt: Date };
  trigger?: React.ReactNode;
}

export function AccountForm({ initialData, trigger }: AccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isEditing = !!initialData;

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      balance: initialData ? Number(initialData.balance) : 0,
      color: initialData?.color || "#000000",
      institution: initialData?.institution || "",
      yieldRate: initialData?.yieldRate ? Number(initialData.yieldRate) : undefined,
      isDailyYield: initialData?.isDailyYield ?? false,
    },
  });

  const accountType = form.watch("type");

  function onSubmit(data: AccountFormValues) {
    startTransition(async () => {
      let result;
      if (isEditing && initialData) {
        result = await updateAccount(initialData.id, data);
      } else {
        result = await createAccount(data);
      }

      if (result.success) {
        setOpen(false);
        if (!isEditing) form.reset();
      } else {
        console.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Conta
          </Button>
        )}
      </DialogTrigger>
      {/* sm:max-w-[425px] define uma largura agradável para diálogos */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Conta" : "Nova Conta"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da sua conta financeira."
              : "Crie uma nova conta para gerenciar seus gastos."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Conta</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Nubank, Carteira" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CHECKING">Conta Corrente</SelectItem>
                      <SelectItem value="INVESTMENT">Investimento / Caixinha</SelectItem>
                      <SelectItem value="CASH">Dinheiro Vivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <CurrencyInput
                  label="Saldo Inicial"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <FormField
              control={form.control}
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instituição (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Banco do Brasil"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {accountType === "INVESTMENT" && (
              <div className="grid grid-cols-2 gap-4 border border-zinc-800 p-4 rounded-xl bg-zinc-900/30">
                <FormField
                  control={form.control}
                  name="yieldRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Rendimento (% a.a.)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 100"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDailyYield"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between shrink-0 space-y-0 h-full mt-2">
                      <FormLabel className="text-xs">Rendimento<br />Diário?</FormLabel>
                      <FormControl className="h-full mt-0">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className={cn(field.value && "!bg-emerald-500")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Conta"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}