"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  createInvestment,
  updateInvestment,
} from "@/features/investments/actions/investment-actions";
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
import { Database } from "lucide-react"; // Or another appropriate icon

const formSchema = z.object({
  name: z.string().min(2, "Obrigatório"),
  type: z.string().min(2, "Obrigatório"),
  institution: z.string().optional(),
  balance: z.coerce.number().min(0, "Saldo deve ser positivo"),
  yieldRate: z.coerce.number().min(0, "Taxa deve ser positiva"),
  yieldFrequency: z.enum(["MONTHLY", "YEARLY", "NONE"]),
});

type InvestmentFormValues = z.infer<typeof formSchema>;

interface InvestmentDialogProps {
  initialData?: InvestmentFormValues & { id: string };
  trigger?: React.ReactNode;
}

export function InvestmentDialog({ initialData, trigger }: InvestmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isEditing = !!initialData;

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || "CDB",
      institution: initialData?.institution || "",
      balance: initialData?.balance || 0,
      yieldRate: initialData?.yieldRate || 0,
      yieldFrequency: initialData?.yieldFrequency || "NONE",
    },
  });

  async function onSubmit(values: InvestmentFormValues) {
    startTransition(async () => {
      try {
        if (isEditing && initialData) {
          await updateInvestment(initialData.id, values);
        } else {
          await createInvestment(values);
        }
        setOpen(false);
        if (!isEditing) {
          form.reset();
        }
      } catch (error) {
        console.error("Failed to save investment", error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Database className="w-4 h-4" />
            Novo Investimento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Investimento" : "Novo Investimento"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: CDB Nubank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: CDB, LCI, Ações" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="institution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instituição</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Nubank" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <CurrencyInput
                  label="Saldo Atual"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="yieldRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yieldFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">Nenhum</SelectItem>
                        <SelectItem value="MONTHLY">Mensal</SelectItem>
                        <SelectItem value="YEARLY">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Salvando..." : isEditing ? "Salvar" : "Adicionar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
