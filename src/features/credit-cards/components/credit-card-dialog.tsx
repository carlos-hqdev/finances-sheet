"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { createCreditCard, updateCreditCard } from "@/features/credit-cards/actions/card-actions";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
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

const formSchema = z.object({
  accountId: z.string().min(1, "Conta é obrigatória"),
  limit: z.coerce.number().positive("Limite deve ser positivo"),
  closingDay: z.coerce.number().min(1).max(31),
  dueDay: z.coerce.number().min(1).max(31),
});

type CreditCardFormValues = z.infer<typeof formSchema>;

interface CreditCardDialogProps {
  accounts: { id: string; name: string }[];
  initialData?: CreditCardFormValues & { id: string };
  trigger?: React.ReactNode;
}

export function CreditCardDialog({ accounts, initialData, trigger }: CreditCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEditing = !!initialData;

  const form = useForm<CreditCardFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      accountId: initialData?.accountId || "",
      limit: initialData ? Number(initialData.limit) : 0,
      closingDay: initialData?.closingDay ? Number(initialData.closingDay) : 1,
      dueDay: initialData?.dueDay ? Number(initialData.dueDay) : 10,
    },
  });

  async function onSubmit(values: CreditCardFormValues) {
    startTransition(async () => {
      try {
        if (isEditing && initialData) {
          await updateCreditCard(initialData.id, values);
        } else {
          await createCreditCard(values);
        }
        setOpen(false);
        if (!isEditing) form.reset();
      } catch (error) {
        console.error("Failed to submit credit card", error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Adicionar Cartão</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cartão de Crédito" : "Novo Cartão de Crédito"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta Vinculada</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <CurrencyInput
                  label="Limite"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="closingDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia Fechamento</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        {...field}
                        value={field.value as number}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia Vencimento</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        {...field}
                        value={field.value as number}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Salvando..." : isEditing ? "Salvar Alterações" : "Salvar Cartão"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
