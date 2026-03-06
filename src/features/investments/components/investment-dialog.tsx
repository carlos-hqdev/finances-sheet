"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition, useEffect } from "react";
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
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/lib/utils";
import { Database } from "lucide-react"; // Or another appropriate icon

const formSchema = z.object({
  name: z.string().min(2, "Obrigatório"),
  type: z.enum(["SAVINGS", "FIXED", "VARIABLE", "FIIS", "CRYPTO", "OTHER"]),
  institution: z.string().optional(),
  balance: z.coerce.number().min(0, "Saldo deve ser positivo"),
  isDailyYield: z.boolean().default(false).optional(),
  indexer: z.string().optional(),
  yieldRate: z.coerce.number().optional(),
  targetAmount: z.coerce.number().optional()
});

type InvestmentFormValues = z.infer<typeof formSchema>;

interface InvestmentDialogProps {
  initialData?: InvestmentFormValues & { id: string };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function InvestmentDialog({ initialData, trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: InvestmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    if (controlledOnOpenChange) {
      controlledOnOpenChange(newOpen);
    }
  };

  const isEditing = !!initialData;

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type as "SAVINGS" | "FIXED" | "VARIABLE" | "FIIS" | "CRYPTO" | "OTHER" || "SAVINGS",
      institution: initialData?.institution || "",
      balance: initialData?.balance || 0,
      isDailyYield: initialData?.isDailyYield || false,
      indexer: initialData?.indexer || "",
      yieldRate: initialData?.yieldRate ? Number(initialData.yieldRate) : undefined,
      targetAmount: initialData?.targetAmount ? Number(initialData.targetAmount) : undefined,
    },
  });

  const investmentType = form.watch("type");

  useEffect(() => {
    if (open) {
      form.reset({
        name: initialData?.name || "",
        type: (initialData?.type as any) || "SAVINGS",
        institution: initialData?.institution || "",
        balance: initialData?.balance || 0,
        isDailyYield: initialData?.isDailyYield || false,
        indexer: initialData?.indexer || "",
        yieldRate: initialData?.yieldRate ? Number(initialData.yieldRate) : undefined,
        targetAmount: initialData?.targetAmount ? Number(initialData.targetAmount) : undefined,
      });
    } else {
      const timeoutId = setTimeout(() => {
        form.reset({
          name: "",
          type: "SAVINGS",
          institution: "",
          balance: 0,
          isDailyYield: false,
          indexer: "",
          yieldRate: undefined,
          targetAmount: undefined,
        });
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [open, initialData, form]);

  async function onSubmit(values: InvestmentFormValues) {
    startTransition(async () => {
      try {
        const payload = {
          ...values,
          indexer: (values.type === "FIXED" || values.type === "SAVINGS") ? values.indexer : null,
          balance: !isEditing && values.type === "SAVINGS" ? 0 : values.balance,
        };

        if (isEditing && initialData) {
          await updateInvestment(initialData.id, payload);
        } else {
          await createInvestment(payload);
        }
        handleOpenChange(false);
        if (!isEditing) {
          form.reset();
        }
      } catch (error) {
        console.error("Failed to save investment", error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {(!isControlled || trigger) && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="gap-2">
              <Database className="w-4 h-4" />
              Novo Investimento
            </Button>
          )}
        </DialogTrigger>
      )}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SAVINGS">Reserva / Caixinha</SelectItem>
                        <SelectItem value="FIXED" disabled>Renda Fixa (Em breve)</SelectItem>
                        <SelectItem value="VARIABLE" disabled>Ações BR (Em breve)</SelectItem>
                        <SelectItem value="FIIS" disabled>FIIs (Em breve)</SelectItem>
                        <SelectItem value="CRYPTO" disabled>Cripto (Em breve)</SelectItem>
                        <SelectItem value="OTHER" disabled>Outros (Em breve)</SelectItem>
                      </SelectContent>
                    </Select>
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

            {investmentType !== "SAVINGS" && (
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
            )}

            {(investmentType === "FIXED" || investmentType === "SAVINGS") && (
              <div className="space-y-4 pt-4 border-t">
                <FormField
                  control={form.control}
                  name="targetAmount"
                  render={({ field }) => (
                    <CurrencyInput
                      label="Meta da Caixinha (Opcional)"
                      value={field.value || 0}
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
                          <Input type="number" step="0.01" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="indexer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indexador</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CDI">CDI / DI</SelectItem>
                            <SelectItem value="SELIC">Taxa Selic</SelectItem>
                            <SelectItem value="IPCA">IPCA+</SelectItem>
                            <SelectItem value="PREFIXED">Prefixado</SelectItem>
                            <SelectItem value="OTHER">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">

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
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Salvando..." : isEditing ? "Salvar" : "Adicionar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
