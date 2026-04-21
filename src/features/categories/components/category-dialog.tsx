"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  createCategory,
  updateCategory,
} from "@/features/categories/actions/category-actions";
import {
  type CategoryType,
  createCategorySchema,
} from "@/features/categories/schemas";
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
import { IconPicker } from "./icon-picker";

const formSchema = createCategorySchema;

type CategoryFormValues = {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
};

const typeLabels: Record<CategoryType, string> = {
  EXPENSE: "Despesa",
  INCOME: "Receita",
  INVESTMENT: "Investimento",
  TRANSFER: "Transferência",
};

const typeOptions: CategoryType[] = [
  "EXPENSE",
  "INCOME",
  "INVESTMENT",
  "TRANSFER",
];

interface CategoryDialogProps {
  userId: string;
  initialData?: CategoryFormValues & { id: string };
  trigger?: React.ReactNode;
}

export function CategoryDialog({
  userId,
  initialData,
  trigger,
}: CategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEditing = !!initialData;
  const [selectedType, setSelectedType] = useState<CategoryType>(
    initialData?.type || "EXPENSE",
  );

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || "EXPENSE",
      color: initialData?.color || "#000000",
      icon: initialData?.icon || "Tag",
    },
  });

  async function onSubmit(values: CategoryFormValues) {
    startTransition(async () => {
      try {
        if (isEditing && initialData) {
          await updateCategory(initialData.id, {
            ...values,
            userId: userId,
          });
        } else {
          await createCategory({
            ...values,
            userId: userId,
          });
        }
        setOpen(false);
        if (!isEditing) form.reset();
      } catch (error) {
        console.error("Failed to submit category", error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Adicionar Categoria</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedType(value as CategoryType);
                    }}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {typeOptions.map((type) => (
                        <SelectItem key={type} value={type}>
                          {typeLabels[type]}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Alimentação" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ícone</FormLabel>
                  <FormControl>
                    <IconPicker
                      value={field.value || "Tag"}
                      onChange={field.onChange}
                      type={selectedType}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="w-12 h-10 p-1"
                        {...field}
                      />
                      <Input
                        type="text"
                        placeholder="#000000"
                        {...field}
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? "Salvando..."
                : isEditing
                  ? "Salvar Alterações"
                  : "Salvar Categoria"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
