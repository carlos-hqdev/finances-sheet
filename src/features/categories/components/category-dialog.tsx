"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  createCategory,
  updateCategory,
} from "@/features/categories/actions/category-actions";
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

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  color: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof formSchema>;

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

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      color: initialData?.color || "#000000",
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
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Categoria" : "Nova Categoria"}
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
                    <Input placeholder="Ex: Alimentação" {...field} />
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
