"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  CalendarIcon,
  ChevronDown,
  Receipt,
  Repeat,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { createTransaction, updateTransaction } from "@/features/transactions/actions/transaction-actions";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { CurrencyInput } from "@/shared/components/ui/currency-input";
import { Switch } from "@/shared/components/ui/switch";

// Schema centralizado
const formSchema = z.object({
  description: z.string().min(2, "Obrigatório"),
  amount: z.coerce.number().positive("Mínimo R$ 0,01"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  creditCardId: z.string().optional(),
  destinationAccountId: z.string().optional(),
  paymentMethod: z.string().optional(),
  date: z.date(),
  period: z.string(),
  condition: z.enum(["A_VISTA", "PARCELADO"]),
  installments: z.coerce.number().min(1).optional(),
  notes: z.string().optional(),
  isPaid: z.boolean().default(true),
});

// Inferência do Tipo para evitar erros de TS
type TransactionFormValues = z.infer<typeof formSchema>;

interface TransactionDialogProps {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  creditCards: { id: string; name: string; accountId: string }[];
  initialData?: TransactionFormValues & { id: string };
  trigger?: React.ReactNode;
}

export function TransactionDialog({
  accounts,
  categories,
  creditCards,
  initialData,
  trigger,
}: TransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isEditing = !!initialData;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialData?.description || "",
      amount: initialData ? Number(initialData.amount) : 0,
      type: initialData?.type || "EXPENSE",
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      paymentMethod: initialData?.paymentMethod || "A_VISTA",
      condition: initialData?.condition || "A_VISTA",
      installments: initialData?.installments || 1,
      period: initialData?.period || format(new Date(), "yyyy-MM"),
      categoryId: initialData?.categoryId || undefined,
      accountId: initialData?.paymentMethod === "CREDIT_CARD" ? initialData.creditCardId : initialData?.accountId,
      destinationAccountId: initialData?.destinationAccountId || undefined,
      creditCardId: initialData?.creditCardId || undefined,
      notes: initialData?.notes || "",
      isPaid: initialData?.isPaid ?? true,
    },
  });

  // Watch tipado corretamente
  const type = useWatch({ control: form.control, name: "type" });
  const paymentMethod = useWatch({
    control: form.control,
    name: "paymentMethod",
  });
  const condition = useWatch({ control: form.control, name: "condition" });
  const date = useWatch({ control: form.control, name: "date" });

  // Sincroniza Período com a Data
  useEffect(() => {
    if (date) {
      form.setValue("period", format(date, "yyyy-MM"));
    }
  }, [date, form]);

  // Força À Vista se for transferência
  useEffect(() => {
    if (type === "TRANSFER" && condition !== "A_VISTA") {
      form.setValue("condition", "A_VISTA");
    }
  }, [type, condition, form]);

  const periods = Array.from({ length: 13 }, (_, i) => {
    const d = addMonths(startOfMonth(new Date()), i - 6);
    return {
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
    };
  });

  async function onSubmit(values: TransactionFormValues) {
    startTransition(async () => {
      try {
        let finalAccountId = values.accountId;
        let finalCreditCardId = values.creditCardId;

        // Logic to handle Credit Card selection which reuses the accountId field in the UI
        if (values.paymentMethod === "CREDIT_CARD") {
          // In the UI, for Credit Card, the 'accountId' field actually holds the Credit Card ID
          // because of the conditional map: creditCards.map(...)
          finalCreditCardId = values.accountId;

          // We need to find the real Wallet Account ID associated with this Credit Card
          const card = creditCards.find((c) => c.id === finalCreditCardId);
          if (card) {
            finalAccountId = card.accountId;
          } else {
            // Fallback if somehow not found (shouldn't happen if data is consistent)
            finalAccountId = undefined;
          }
        }

        if (
          !finalAccountId &&
          values.type !== "TRANSFER" &&
          values.paymentMethod !== "CREDIT_CARD"
        ) {
          // Maybe handle error or rely on server
        }

        const txData = {
          description: values.description,
          amount: values.amount,
          type: values.type,
          categoryId:
            values.categoryId === "none" || !values.categoryId
              ? undefined
              : values.categoryId,
          accountId: finalAccountId || "",
          destinationAccountId:
            values.type === "TRANSFER" ? values.destinationAccountId : undefined,
          creditCardId: finalCreditCardId,
          paymentMethod:
            values.type === "TRANSFER" ? "TRANSFER" : values.paymentMethod,
          date: values.date,
          condition: values.condition as "A_VISTA" | "PARCELADO",
          notes: values.notes,
          isPaid: values.isPaid,
        };

        let result;
        if (isEditing && initialData) {
          result = await updateTransaction(initialData.id, txData);
        } else {
          result = await createTransaction(txData);
        }

        setOpen(false);
        if (!isEditing) {
          form.reset({
            description: "",
            amount: 0,
            type: "EXPENSE",
            date: new Date(),
            paymentMethod: "PIX",
            condition: "A_VISTA",
            installments: 1,
            period: format(new Date(), "yyyy-MM"),
            notes: "",
            categoryId: undefined,
            accountId: undefined,
            destinationAccountId: undefined,
            creditCardId: undefined,
            isPaid: true,
          });
        }
      } catch (error) {
        console.error("Failed to submit transaction", error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 font-semibold">
            <Receipt className="w-4 h-4" /> Novo Lançamento
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="p-0 gap-0 sm:max-w-[460px] border-white/5 bg-zinc-950 text-zinc-200 overflow-hidden shadow-2xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col w-full"
          >
            {/* Header Dinâmico */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-zinc-900/40">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  type === "EXPENSE"
                    ? "bg-red-500/10 text-red-500"
                    : type === "INCOME"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-blue-500/10 text-blue-500",
                )}
              >
                {type === "EXPENSE" && <ArrowDownCircle className="w-4 h-4" />}
                {type === "INCOME" && <ArrowUpCircle className="w-4 h-4" />}
                {type === "TRANSFER" && <Repeat className="w-4 h-4" />}
              </div>
              <DialogTitle className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                {isEditing ? `Editar Lançamento` : (type === "TRANSFER" ? "Transferência" : "Novo Lançamento")}
              </DialogTitle>
            </div>

            <div className="p-5 space-y-5">
              {/* Seletor de Tipo */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Tabs
                    onValueChange={field.onChange}
                    value={field.value}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3 h-10 bg-zinc-900 border border-white/5 p-1">
                      <TabsTrigger
                        value="EXPENSE"
                        className="text-[10px] font-bold"
                      >
                        DESPESA
                      </TabsTrigger>
                      <TabsTrigger
                        value="INCOME"
                        className="text-[10px] font-bold"
                      >
                        RECEITA
                      </TabsTrigger>
                      <TabsTrigger
                        value="TRANSFER"
                        className="text-[10px] font-bold"
                      >
                        TRANSF.
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-[10px] uppercase font-bold text-zinc-500">
                        Descrição
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="O que foi?"
                          {...field}
                          className="h-10 bg-zinc-900 border-white/10 w-full"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-[10px] uppercase font-bold text-zinc-500">
                        Período Referência
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 bg-zinc-900 border-white/10 text-xs w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-950 border-white/10 text-zinc-200">
                          {periods.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-[10px] uppercase font-bold text-zinc-500">
                        Data Transação
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full h-10 justify-start text-xs bg-zinc-900 border-white/10"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />{" "}
                              {format(field.value, "dd/MM/yyyy")}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 bg-zinc-950 border-white/10"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
                {type !== "TRANSFER" && (
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel className="text-[10px] uppercase font-bold text-zinc-500">
                          Categoria
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10 bg-zinc-900 border-white/10 text-xs w-full">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-zinc-900 border-white/10">
                            <SelectItem value="none" className="text-zinc-500 italic">
                              Nenhuma
                            </SelectItem>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Box de Contas */}
              <div className="p-4 bg-zinc-900/30 rounded-xl border border-white/5 space-y-4">
                {type === "TRANSFER" ? (
                  <div className="flex items-center gap-3 w-full">
                    <FormField
                      control={form.control}
                      name="accountId"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-[9px] text-zinc-600 font-bold uppercase">
                            Origem
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9 text-[11px] bg-zinc-950 border-white/5 w-full">
                                <SelectValue placeholder="Conta" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-zinc-900 border-white/10">
                              {accounts.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <ArrowRight className="h-4 w-4 text-zinc-800 mt-5" />
                    <FormField
                      control={form.control}
                      name="destinationAccountId"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-[9px] text-zinc-600 font-bold uppercase">
                            Destino
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9 text-[11px] bg-zinc-950 border-white/5 w-full">
                                <SelectValue placeholder="Conta" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-zinc-900 border-white/10">
                              {accounts.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-[9px] text-zinc-600 font-bold uppercase">
                            Método
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 text-xs bg-zinc-950 border-white/5 w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-zinc-900 border-white/10">
                              <SelectItem value="PIX">Pix</SelectItem>
                              <SelectItem value="CREDIT_CARD">
                                Cartão de Crédito
                              </SelectItem>
                              <SelectItem value="DEBIT_CARD">Débito</SelectItem>
                              <SelectItem value="CASH">Dinheiro</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountId"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-[9px] text-zinc-600 font-bold uppercase">
                            {paymentMethod === "CREDIT_CARD"
                              ? "Cartão"
                              : "Conta"}
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 text-xs bg-zinc-950 border-white/5 w-full">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-zinc-900 border-white/10">
                              {paymentMethod === "CREDIT_CARD"
                                ? creditCards.map((card) => (
                                  <SelectItem key={card.id} value={card.id}>
                                    {card.name}
                                  </SelectItem>
                                ))
                                : accounts.map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id}>
                                    {acc.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <div className={cn("col-span-2", type !== "TRANSFER" && "sm:col-span-1")}>
                      <CurrencyInput
                        label="Valor"
                        value={field.value as number}
                        onChange={field.onChange}
                        placeholder="R$ 0,00"
                        labelClassName="text-[9px] text-zinc-500 font-bold uppercase"
                        className="h-10 bg-zinc-900 border-white/10 w-full text-sm font-normal"
                      />
                    </div>
                  )}
                />

                {type !== "TRANSFER" && (
                  <>
                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-[9px] text-zinc-500 font-bold uppercase">
                            Condição
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 text-[11px] bg-zinc-900 border-white/10 w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-zinc-900 border-white/10">
                              <SelectItem value="A_VISTA">À vista</SelectItem>
                              <SelectItem value="PARCELADO">Parcelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    {condition === "PARCELADO" && (
                      <FormField
                        control={form.control}
                        name="installments"
                        render={({ field }) => (
                          <FormItem className="col-span-2 sm:col-span-1 w-full mt-2 sm:mt-0">
                            <FormLabel className="text-[9px] text-zinc-500 font-bold uppercase">
                              Parcelas
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={field.value as number}
                                className="h-10 bg-zinc-900 border-white/10 w-full"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}
              </div>

              <FormField
                control={form.control}
                name="isPaid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between p-4 bg-zinc-900/30 rounded-xl border border-white/5">
                    <div className="space-y-0.5">
                      <FormLabel className="text-xs font-bold text-zinc-300">
                        {type === "TRANSFER" ? "Efetivada" : "Transação Paga"}
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className={cn(
                          field.value && (
                            type === "EXPENSE" ? "!bg-red-500" :
                              type === "INCOME" ? "!bg-emerald-500" : "!bg-blue-500"
                          )
                        )}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase font-bold hover:text-zinc-300"
              >
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    showNotes && "rotate-180",
                  )}
                />
                Notas
              </button>

              <AnimatePresence>
                {showNotes && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormControl>
                          <Textarea
                            className="h-20 bg-zinc-900 border-white/10 text-xs w-full"
                            {...field}
                          />
                        </FormControl>
                      )}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-4 border-t border-white/5 bg-zinc-900/40">
              <Button
                type="submit"
                disabled={isPending}
                className={cn(
                  "w-full h-12 font-bold rounded-xl",
                  type === "EXPENSE"
                    ? "bg-red-600 hover:bg-red-500"
                    : type === "INCOME"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-blue-600 hover:bg-blue-500",
                )}
              >
                {isPending ? "Confirmando..." : "Confirmar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
