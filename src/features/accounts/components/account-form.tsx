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
    },
  });

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


            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Conta"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}